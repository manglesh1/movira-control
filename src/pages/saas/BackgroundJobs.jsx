import { useEffect, useRef, useState } from "react";
import { baseApi } from "../../api/baseApi";

const root = "/saas/background-jobs";
const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    backgroundJobRegions: builder.query({ query: () => root + "/regions" }),
    backgroundJobs: builder.query({ query: (region) => root + "/" + region }),
    backgroundJobRuns: builder.query({
      query: ({ region, key, before }) => ({
        url: root + "/" + region + "/" + key + "/runs",
        params: before ? { before } : undefined,
      }),
    }),
    changeBackgroundJob: builder.mutation({
      query: ({ region, key, enabled }) => ({
        url: root + "/" + region + "/" + key, method: "PATCH", body: { enabled },
      }),
    }),
    runBackgroundJob: builder.mutation({
      query: ({ region, key }) => ({ url: root + "/" + region + "/" + key + "/run", method: "POST" }),
    }),
  }),
});

const jobInformation = {
  "booking-maintenance": {
    summary: "Processes pending schedules, unpaid booking deadlines and customer reminders.",
    steps: [
      "Find Reserved, Pending, or Confirmed bookings in the Bookings table that are fully unpaid, have a balance due, and have automatic cancellation enabled. Skip imported bookings.",
      "Check whether the booking’s configured cancellation deadline has passed.",
      "Lock the booking and check again for payments. Keep the booking if a payment has already been recorded or captured.",
      "Cancel the eligible booking and its active items, release its capacity, and record the change in booking history.",
      "Attempt to send the cancellation notification after the database update succeeds.",
    ],
    stepsLabel: "Unpaid booking cancellation steps",
    impact: "Eligible unpaid bookings may keep holding capacity past their deadline. Waiver expiry and upcoming session reminders may arrive late.",
  },
  "booking-summary": {
    summary: "Processes the queue that refreshes booking item summaries.",
    impact: "Booking lists may show stale item information, guest counts or visit dates until the queue catches up.",
  },
  "customer-experience": {
    summary: "Processes due feedback requests and retries failed handoffs.",
    impact: "Customers may receive feedback requests late, and failed handoffs can remain unresolved.",
  },
  "voucher-expiry": {
    summary: "Marks eligible vouchers and related entitlements expired.",
    impact: "Expiry status and downstream reporting can lag.",
  },
  "membership-daily": {
    summary: "Resets daily membership usage counters and expires memberships that have reached their end date.",
    impact: "Daily usage limits may carry over, and membership expiry status can lag.",
  },
  "membership-renewal": {
    summary: "Processes due automatic membership renewals.",
    impact: "Renewal processing and related charges can be delayed.",
  },
  "saas-invoices": {
    summary: "Generates due platform invoices, marks overdue invoices, sends reminders and applies collection policy.",
    impact: "Venue invoices, reminders and collection actions can be delayed.",
  },
  "session-cleanup": {
    summary: "Deletes expired session records and old employee password recovery challenges.",
    impact: "Expired records accumulate in the database. Expiry checks still apply when credentials are used.",
  },
  "guest-ai-retention": {
    summary: "Removes Guest AI data that has passed its configured retention period.",
    impact: "Eligible data remains stored beyond the configured retention period until cleanup resumes.",
  },
  "guest-ai-leads": {
    summary: "Processes pending Guest AI lead deliveries.",
    impact: "Staff may receive lead notifications late and miss timely follow-up.",
  },
  "terminal-reconcile": {
    summary: "Checks unresolved terminal payments and reconciles their recorded status.",
    impact: "Completed or failed terminal payments can remain pending in the app and require follow-up.",
  },
  "refund-recovery": {
    summary: "Reconciles due refunds whose provider outcome needs confirmation.",
    impact: "Refund records can remain pending after the provider has processed them.",
  },
  "terminal-returns": {
    summary: "Refreshes terminal return outcomes and processes due refund work handled by this worker.",
    impact: "Returns and refunds can sit in a pending state longer.",
  },
  "authorized-capture": {
    summary: "Processes eligible payment authorizations that still need capture or reconciliation.",
    impact: "Authorized payments can remain uncaptured, and some authorizations may expire before processing resumes.",
  },
  "capacity-hold-expiry": {
    summary: "Releases expired tentative booking holds and other expired capacity holds.",
    steps: [
      "Find Created bookings in the Bookings table that are still holding capacity.",
      "Check whether each booking’s configured tentative hold expiry time has passed.",
      "Release the hold and keep an unpaid booking in Created status. If payment was received, confirm the booking instead.",
      "Sweep other expired capacity holds so the released places can be booked again.",
    ],
    impact: "Expired holds may keep capacity unavailable for new bookings.",
  },
  "booking-completion": {
    summary: "Marks eligible bookings complete after their scheduled visit has ended.",
    impact: "Finished visits can retain their earlier status in booking lists and reports.",
  },
  "capacity-blocks": {
    summary: "Creates upcoming occurrences of recurring area and capacity blocks.",
    impact: "Future closures or reserved capacity may be missing from availability until the occurrences are created.",
  },
  "capacity-integrity": {
    summary: "Checks capacity records for mismatches and reports them without modifying bookings.",
    impact: "Capacity inconsistencies can go undetected until staff spot them or the monitor resumes.",
  },
  "historical-import-recovery": {
    summary: "Recovers interrupted historical import work.",
    impact: "Interrupted imports and their follow-up steps may stay incomplete.",
  },
  "waiver-delivery": {
    summary: "Sends pending outbound waiver submissions to the configured provider.",
    impact: "Completed waivers may take longer to appear in the provider system.",
  },
  "public-checkout-recovery": {
    summary: "Reconciles pending online checkout payments and resumes eligible checkout finalization.",
    impact: "A captured payment can take longer to appear as a confirmed booking.",
  },
  "customer-updates": {
    summary: "Drains the customer update queue to refresh customer data and derived statistics.",
    impact: "Customer profiles and lists may show stale activity or totals while updates are queued.",
  },
  "promo-issuance": {
    summary: "Processes queued promotional rewards earned through qualifying purchases.",
    impact: "Customers may have to wait for earned rewards to appear.",
  },
  "slot-generation": {
    summary: "Creates bookable session slots for schedules that are pending or still generating.",
    impact: "New or updated schedules may have gaps in bookable times until generation finishes.",
  },
  "slot-auto-extend": {
    summary: "Creates additional slots as eligible schedules move through their rolling booking window.",
    impact: "Farther-out dates gradually stop becoming available for booking.",
  },
  "crm-sender-warmup": {
    summary: "Runs eligible sender warmup activity in CRM.",
    impact: "Sender warmup progress can stall and delay readiness for planned sending volume.",
  },
  "crm-domain-cleanup": {
    summary: "Cleans up eligible unverified sending domains in CRM.",
    impact: "Stale unverified domains can stay listed until cleanup resumes.",
  },
};

const dateTime = (date) => date ? new Date(date).toLocaleString() : "—";
function frequencyLabel(schedule) {
  if (!schedule) return "—";

  const fields = schedule.trim().split(/\s+/);
  const [minute, hour, day, month, weekday] = fields.slice(-5);
  if (day !== "*" || month !== "*" || weekday !== "*") return schedule;

  if (fields.length === 5 && /^\d+$/.test(minute)) {
    return hour === "*" ? "Hourly" : /^\d+$/.test(hour) ? "Daily" : schedule;
  }
  if (fields.length === 6 ? fields.slice(1).some((field) => field !== "*") : hour !== "*") return schedule;
  const step = /^(?:\*|\*\/(\d+))$/.exec(fields[0]);
  if (!step) return schedule;

  const interval = Number(step[1] || 1);
  const unit = fields.length === 6 ? "second" : "minute";
  return interval === 1 ? "Every " + unit : "Every " + interval + " " + unit + "s";
}

const names = {
  succeeded: "Completed", failed: "Failed", interrupted: "Interrupted", queued: "Queued",
  running: "Running", cancelled: "Cancelled", disabled: "Disabled", ready: "Awaiting first run",
  unavailable: "Unavailable",
};
const failureLabels = {
  LEASE_EXPIRED: "Worker stopped reporting progress",
  IMPORT_RECOVERY_FAILED: "One or more import recovery steps failed",
  SLOT_GENERATION_FAILED: "Slot generation failed",
  SLOT_EXTENSION_FAILED: "Slot auto-extension failed",
};
const failureLabel = (code) => failureLabels[code] || code || "—";

const durationSeconds = (run) => run.started_at && run.finished_at
  ? (new Date(run.finished_at) - new Date(run.started_at)) / 1000
  : null;
const durationLabel = (run) => durationSeconds(run)?.toFixed(1) ?? "—";
const historyColumns = [
  { key: "id", label: "Run", display: (run) => "#" + run.id + (run.scope ? " · Schedule " + run.scope : "") },
  { key: "trigger", label: "Trigger", display: (run) => run.trigger === "manual" ? "Manual · " + run.requested_by : "Scheduled" },
  { key: "status", label: "Status", display: (run) => names[run.status] || run.status },
  { key: "started_at", label: "Started", display: (run) => dateTime(run.started_at), sort: (run) => run.started_at && Date.parse(run.started_at) },
  { key: "finished_at", label: "Finished", display: (run) => dateTime(run.finished_at), sort: (run) => run.finished_at && Date.parse(run.finished_at) },
  { key: "duration", label: "Duration", display: (run) => durationSeconds(run) == null ? "—" : durationLabel(run) + " s", sort: durationSeconds },
  { key: "failure_code", label: "Failure", display: (run) => failureLabel(run.failure_code) },
];
const historyCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function RunHistory({ region, job, onClose }) {
  const dialogRef = useRef(null);
  const [cursors, setCursors] = useState([null]);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: "id", direction: "descending" });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);
  const before = cursors.at(-1);
  const { currentData, isFetching, isError } = jobsApi.useBackgroundJobRunsQuery(
    { region, key: job.key, before }, { pollingInterval: before ? 0 : 5000 },
  );
  const rows = currentData?.data ?? [];
  const sortColumn = historyColumns.find((column) => column.key === sort.key);
  const sortValue = sortColumn.sort || sortColumn.display;
  const visibleRows = rows.filter((run) => historyColumns.every(({ key, display }) =>
    display(run).toLowerCase().includes((filters[key] || "").trim().toLowerCase()),
  )).sort((left, right) => {
    const a = sortValue(left);
    const b = sortValue(right);
    if (a == null || b == null) return Number(a == null) - Number(b == null);
    const comparison = typeof a === "number" && typeof b === "number"
      ? a - b
      : historyCollator.compare(String(a), String(b));
    return sort.direction === "ascending" ? comparison : -comparison;
  });

  function changeSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "ascending" ? "descending" : "ascending",
    }));
  }


  return (
    <dialog ref={dialogRef} onClose={onClose} aria-labelledby="job-history-title"
      className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-xl border border-stone-200 bg-[var(--surface-app)] p-5 text-[var(--text-strong)] shadow-xl backdrop:bg-black/40">
      <div className="flex items-start justify-between gap-4">
        <h2 id="job-history-title" className="text-lg font-semibold">{job.name} run history</h2>
        <form method="dialog"><button type="submit" className="rounded border px-2 py-0.5 text-xs">Close</button></form>
      </div>
      <p className="text-sm text-[var(--text-muted)]">Runs are kept for 14 days. Sorting and filters apply to the current page.</p>
      {isError && <p role="alert">Run history could not be loaded.</p>}
      {!isError && !rows.length && <p>{isFetching ? "Loading runs…" : "No runs recorded."}</p>}
      {!!rows.length && (
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-left text-xs">
            <thead>
              <tr>
                {historyColumns.map(({ key, label }) => (
                  <th key={key} className="px-2 pb-1" aria-sort={sort.key === key ? sort.direction : undefined}>
                    <button type="button" className="whitespace-nowrap underline" onClick={() => changeSort(key)}>
                      {label}{sort.key === key && <span aria-hidden="true">{sort.direction === "ascending" ? " ↑" : " ↓"}</span>}
                    </button>
                  </th>
                ))}
              </tr>
              <tr>
                {historyColumns.map(({ key, label }) => (
                  <td key={key} className="px-2 pb-2">
                    <input type="search" aria-label={"Filter " + label} placeholder="Filter"
                      className="w-full min-w-24 rounded border px-2 py-1"
                      value={filters[key] || ""}
                      onChange={(event) => setFilters({ ...filters, [key]: event.target.value })} />
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((run) => (
                <tr key={run.id} className="border-t border-stone-200">
                  {historyColumns.map(({ key, display }) => <td key={key} className="p-2">{display(run)}</td>)}
                </tr>
              ))}
              {!visibleRows.length && (
                <tr><td colSpan={historyColumns.length} className="p-2">No runs on this page match the filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex gap-3">
        <button type="button" className="underline disabled:no-underline disabled:opacity-50" disabled={!Object.values(filters).some(Boolean)} onClick={() => setFilters({})}>Clear filters</button>
        <button type="button" className="underline disabled:no-underline disabled:opacity-50" disabled={cursors.length === 1} onClick={() => setCursors(cursors.slice(0, -1))}>Newer</button>
        <button type="button" className="underline disabled:no-underline disabled:opacity-50" disabled={rows.length < 50 || isFetching} onClick={() => setCursors([...cursors, rows.at(-1).id])}>Older</button>
      </div>
    </dialog>
  );
}

export default function BackgroundJobs() {
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [notice, setNotice] = useState(null);
  const { data: regionData, isError: regionsFailed } = jobsApi.useBackgroundJobRegionsQuery();
  const regions = regionData?.data ?? [];
  const region = selectedRegion || regions[0];
  const { currentData, isFetching, isError, refetch } = jobsApi.useBackgroundJobsQuery(region, {
    skip: !region, pollingInterval: 5000,
  });
  const [change, { isLoading: changing }] = jobsApi.useChangeBackgroundJobMutation();
  const [run, { isLoading: requesting }] = jobsApi.useRunBackgroundJobMutation();
  const jobs = currentData?.data ?? [];
  const job = jobs.find(({ key }) => key === selectedJob);

  async function update(job, manual) {
    setNotice(null);
    try {
      if (manual) await run({ region, key: job.key }).unwrap();
      else await change({ region, key: job.key, enabled: !job.enabled }).unwrap();
      setNotice({ text: manual ? job.name + " queued." : job.name + (job.enabled ? " disabled." : " enabled.") });
      void refetch();
    } catch (error) {
      setNotice({ error: true, text: error?.data?.message || "The job action failed." });
    }
  }

  return (
    <main className="space-y-5 p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Background Jobs</h1>
        {!!regions.length && (
          <label className="flex items-center gap-2">
            Region
            <select className="rounded-lg border border-stone-300 bg-transparent px-3 py-2" value={region} onChange={(event) => {
              setSelectedRegion(event.target.value);
              setSelectedJob("");
              setNotice(null);
            }}>
              {regions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        )}
      </div>
      {notice && <p role={notice.error ? "alert" : "status"}>{notice.text}</p>}
      {(regionsFailed || isError) && <p role="alert">Could not load background jobs. Check regional service availability and your access.</p>}
      {!regionsFailed && !isError && !jobs.length && <p>{isFetching || !regionData ? "Loading background jobs…" : "No jobs registered in this region."}</p>}
      {!!jobs.length && (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead><tr><th className="p-2">Job</th><th>Status</th><th>Frequency</th><th>Last start</th><th>Last end</th><th>Last completion</th><th>Last failure</th><th>Next run</th><th>Actions</th></tr></thead>
            <tbody>
              {jobs.map((job) => {
                const information = jobInformation[job.key];
                const status = job.running ? "running" : !job.available ? "unavailable" : !job.enabled ? "disabled" : job.queued ? "queued" : job.status || "ready";
                return (
                  <tr key={job.key} className="border-t border-stone-200">
                    <td className="min-w-56 p-2 align-top">
                      <span className="font-semibold">{job.name}</span>
                      {information && (
                        <>
                          <p className="mt-0.5">{information.summary}</p>
                          <details className="mt-1">
                            <summary className="cursor-pointer underline">{information.steps ? "Steps and impact" : "Impact if it stops"}</summary>
                            {information.steps && (
                              <>
                                {information.stepsLabel && <p className="mt-1 font-semibold">{information.stepsLabel}</p>}
                                <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                                  {information.steps.map((step) => <li key={step}>{step}</li>)}
                                </ol>
                              </>
                            )}
                            <p className="mt-1"><strong>Impact if it stops</strong> · {information.impact}</p>
                          </details>
                        </>
                      )}
                    </td>
                    <td>{names[status]}</td>
                    <td title={job.schedule}>{frequencyLabel(job.schedule)}</td>
                    <td>{dateTime(job.started_at)}</td>
                    <td>{dateTime(job.finished_at)}</td>
                    <td>{dateTime(job.last_success_at)}</td>
                    <td>{dateTime(job.last_failure_at)}</td>
                    <td>{dateTime(job.nextRun)}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <button type="button" className="rounded border px-1.5 py-0.5 text-xs" aria-haspopup="dialog" aria-label={"View run history for " + job.name} onClick={() => setSelectedJob(job.key)}>View history</button>
                        <button type="button" className="rounded border px-1.5 py-0.5 text-xs disabled:opacity-50" disabled={changing || requesting || !job.available} onClick={() => update(job, false)}>{job.enabled ? "Disable" : "Enable"}</button>
                        {job.manual && <button type="button" className="rounded border px-1.5 py-0.5 text-xs disabled:opacity-50" disabled={changing || requesting || !job.available || !job.enabled || job.queued} onClick={() => update(job, true)}>Run now</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {job && <RunHistory key={region + "/" + job.key} region={region} job={job} onClose={() => setSelectedJob("")} />}
    </main>
  );
}
