import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { isSuperAdmin } from "../../auth/access";
import AccessDenied from "../AccessDenied";
import {
  useGetControlEmailCatalogQuery,
  useGetControlEmailTemplateQuery,
  useGetControlEmailOperationsQuery,
  usePreviewControlEmailTemplateMutation,
  usePublishControlEmailTemplateMutation,
  useRestoreControlEmailTemplateMutation,
} from "../../features/saas/moviraControlApi";

const staffFlows = [
  { event: "employee.portal.created", label: "Staff welcome", description: "Sent after employee portal credentials are created." },
  { event: "employee.credentials.regenerated", label: "Regenerated password", description: "Sent after a manager issues a new temporary password." },
  { event: "employee.password_reset.otp_requested", label: "Forgot password", description: "Sends the verification code requested from the employee portal." },
];
const panel = "rounded-xl border border-slate-200 bg-[var(--surface-panel)] p-4";
const field = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2";
const primary = "rounded-lg bg-[#7220e6] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50";
const errorMessage = (error) => error?.data?.message || error?.data?.error || "Request failed.";
const displayDate = (value) => value ? new Date(value).toLocaleString() : "—";

export default function ControlEmail() {
  const user = useSelector((state) => state.auth.user);
  const [tab, setTab] = useState("staff");
  if (!isSuperAdmin(user)) return <AccessDenied />;
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">Email</h1>
        <p className="mt-1 text-sm">Manage Movira defaults and monitor transactional delivery.</p>
      </header>
      <nav aria-label="Email sections" className="flex flex-wrap gap-2">
        <button type="button" className={tab === "staff" ? primary : secondary} onClick={() => setTab("staff")}>Staff access emails</button>
        <button type="button" className={tab === "catalog" ? primary : secondary} onClick={() => setTab("catalog")}>Template catalog</button>
        <button type="button" className={tab === "operations" ? primary : secondary} onClick={() => setTab("operations")}>Email operations</button>
      </nav>
      {tab === "operations" ? <Operations /> : <Catalog key={tab} staffOnly={tab === "staff"} />}
    </main>
  );
}

function Catalog({ staffOnly = false }) {
  const { data, error, isLoading } = useGetControlEmailCatalogQuery();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const rows = data?.data || [];
  const selected = rows.find((row) => row.id === selectedId);
  const visible = rows.filter(row => !staffOnly || row.events.some(event => staffFlows.some(flow => flow.event === event.type))).filter((row) => [row.name, row.locale, ...row.events.map((event) => event.type)]
    .some((value) => value?.toLowerCase().includes(search.trim().toLowerCase())));
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
      <section className={panel}>
        {staffOnly && <div className="mb-4 space-y-2"><h2 className="font-bold">Staff access emails</h2><p className="text-sm">Manage the wording and design here. Passwords, verification codes, expiry and session security remain controlled by the backend.</p></div>}
        <input className={field} aria-label="Search master templates" placeholder="Search name, event or language" value={search} onChange={(event) => setSearch(event.target.value)} />
        {isLoading && <p className="mt-3" role="status">Loading templates…</p>}
        {error && <p className="mt-3" role="alert">{errorMessage(error)}</p>}
        {staffOnly && !isLoading && !error && <div className="mt-3 grid gap-2">{staffFlows.filter(flow => !search.trim() || `${flow.label} ${flow.event} ${flow.description}`.toLowerCase().includes(search.trim().toLowerCase()) || visible.some(row => row.events.some(event => event.type === flow.event))).map(flow => {
          const matches = rows.filter(row => row.events.some(event => event.type === flow.event));
          return <div className="rounded-lg border border-slate-200 p-3 text-sm" key={flow.event}><strong>{flow.label}</strong><p className="mt-1">{flow.description}</p><p className={matches.length ? "mt-1 text-green-700" : "mt-1 text-amber-700"}>{matches.length ? `Active binding · ${matches.length} template language(s)` : "Missing active binding - CRM configuration needs attention"}</p><code className="mt-1 block break-all text-xs">{flow.event}</code>{matches.map(row => <button type="button" key={row.id} className={`${secondary} mt-2 mr-2`} aria-pressed={selectedId === row.id} onClick={() => setSelectedId(row.id)}>Manage {flow.label.toLowerCase()} · {row.locale}</button>)}</div>;
        })}</div>}
        <div className="mt-3 grid max-h-[65vh] gap-2 overflow-auto">
          {!staffOnly && visible.map((row) => (
            <button type="button" aria-pressed={selectedId === row.id} className={`${secondary} grid gap-1 text-left ${selectedId === row.id ? "border-violet-500" : ""}`} key={row.id} onClick={() => setSelectedId(row.id)}>
              <span>{row.name} · {row.locale}</span>
              <span className="text-xs font-normal">{row.scope === "movira_control" ? "Movira Control" : "Park default"} · {row.events.length} active events{row.scope === "location" ? ` · ${row.customizedLocations} customized` : ""}</span>
            </button>
          ))}
        </div>
      </section>
      {selected ? <MasterTemplate key={selected.id} row={selected} /> : <p className={panel}>Select an email to review its binding, edit its content and preview with sample data. No email is sent by previewing.</p>}
    </div>
  );
}

function MasterTemplate({ row }) {
  const { currentData, error, isFetching } = useGetControlEmailTemplateQuery(row.id);
  if (error) return <p className={panel} role="alert">{errorMessage(error)}</p>;
  if (!currentData) return <p className={panel} role="status">Loading master…</p>;
  const template = currentData.data;
  return <MasterEditor key={`${row.id}:${template.updatedAt}`} row={row} template={template} refreshing={isFetching} />;
}

function MasterEditor({ row, template, refreshing }) {
  const [subject, setSubject] = useState(template.subject || "");
  const [content, setContent] = useState(template.editorType === "design" ? JSON.stringify(template.designJson, null, 2) : template.body);
  const [plainText, setPlainText] = useState(template.plainText || "");
  const [eventType, setEventType] = useState(row.events[0]?.type || "");
  const [preview, setPreview] = useState(null);
  const [publish, publishing] = usePublishControlEmailTemplateMutation();
  const [render, rendering] = usePreviewControlEmailTemplateMutation();
  const [restore, restoring] = useRestoreControlEmailTemplateMutation();

  function payload() {
    return {
      id: row.id, subject, plainText, expectedUpdatedAt: template.updatedAt,
      ...(template.editorType === "design" ? { designJson: JSON.parse(content) } : { body: content }),
    };
  }

  async function showPreview() {
    try {
      const response = await render({ ...payload(), eventType }).unwrap();
      setPreview(response.data);
    } catch (error) {
      toast.error(error instanceof SyntaxError ? "The template JSON is invalid." : errorMessage(error));
    }
  }

  async function publishMaster(event) {
    event.preventDefault();
    if (!window.confirm("Publish this master for locations using the Movira default?")) return;
    try {
      await publish(payload()).unwrap();
      toast.success("Master template published.");
    } catch (error) {
      toast.error(error instanceof SyntaxError ? "The template JSON is invalid." : errorMessage(error));
    }
  }

  async function restoreMaster(revisionId) {
    if (!window.confirm("Restore this revision as the published master?")) return;
    try {
      await restore({ id: row.id, revisionId, expectedUpdatedAt: template.updatedAt }).unwrap();
      toast.success("Master revision restored.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <section className={`${panel} space-y-4`}>
      <div>
        <h2 className="text-lg font-bold">{row.name} · {row.locale}</h2>
        <p className="mt-1 text-sm">Master template · {row.key} · {row.customizedLocations || 0} location customizations</p>
        <p className="mt-1 text-sm">Publishing updates locations using this default. Location-specific overrides keep their own content.</p>
        <div className="mt-3 space-y-2" aria-label="Event bindings">{row.events.map(event => <div key={event.type} className="rounded-lg border border-slate-200 p-3 text-sm"><strong>{staffFlows.find(flow => flow.event === event.type)?.label || event.description || event.type}</strong><p className="text-green-700">Active CRM binding</p><code className="block break-all text-xs">{event.type} → {event.templateKey || row.key}</code><p className="mt-1">{event.description}</p>{event.requiredVariables?.length > 0 && <p className="mt-2">Backend variables: {event.requiredVariables.map(variable => <code key={variable} className="mr-2 inline-block">{`{{${variable}}}`}</code>)}</p>}</div>)}</div>
      </div>
      <form className="grid gap-3" onSubmit={publishMaster}>
        <label className="grid gap-1 text-sm font-semibold">Subject<input className={field} required maxLength={500} value={subject} onChange={(event) => { setSubject(event.target.value); setPreview(null); }} /></label>
        <label className="grid gap-1 text-sm font-semibold">{template.editorType === "design" ? "Design JSON" : "Email HTML"}<textarea className={`${field} font-mono`} required rows={12} value={content} onChange={(event) => { setContent(event.target.value); setPreview(null); }} /></label>
        <label className="grid gap-1 text-sm font-semibold">Plain text fallback<textarea className={field} rows={3} value={plainText} onChange={(event) => { setPlainText(event.target.value); setPreview(null); }} /></label>
        <div className="flex flex-wrap items-center gap-2">
          {row.events.length > 1 && <select aria-label="Preview event" className={secondary} value={eventType} onChange={(event) => { setEventType(event.target.value); setPreview(null); }}>{row.events.map((event) => <option key={event.type}>{event.type}</option>)}</select>}
          <button type="button" className={secondary} disabled={rendering.isLoading} onClick={showPreview}>Preview with sample data</button>
          <button type="submit" className={primary} disabled={refreshing || publishing.isLoading}>Publish master</button>
        </div>
      </form>
      <p className="text-xs">Preview uses fictional credentials and codes, and never queues an email. Portal URLs in previews are samples; actual links come from the backend environment.</p>
      {preview && <div><p className="mb-2 font-semibold">{preview.subject}</p><iframe title="Email preview" className="h-96 w-full rounded-lg border border-slate-200 bg-white" sandbox="" srcDoc={preview.html} /><details className="mt-2"><summary className="cursor-pointer text-sm font-semibold">Plain text preview</summary><pre className="mt-2 whitespace-pre-wrap break-words text-sm">{preview.text || "No plain text content"}</pre></details></div>}
      <details>
        <summary className="cursor-pointer font-semibold">Published revision history</summary>
        {template.history.length === 0 && <p className="mt-2 text-sm">No revisions recorded yet.</p>}
        {template.history.map((revision) => (
          <div key={revision.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-sm">
            <span>{revision.subject || "No subject"} · {displayDate(revision.createdAt)}</span>
            <button type="button" className={secondary} disabled={restoring.isLoading || refreshing} onClick={() => restoreMaster(revision.id)}>Restore</button>
          </div>
        ))}
      </details>
    </section>
  );
}

function Operations() {
  const { currentData, error, isFetching, refetch } = useGetControlEmailOperationsQuery(undefined, { pollingInterval: 15000 });
  const monitor = currentData?.data;
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm">Last checked {displayDate(monitor?.generatedAt)}</p>
        <button type="button" className={secondary} disabled={isFetching} onClick={refetch}>Refresh</button>
      </div>
      {error && <p className={panel} role="alert">{errorMessage(error)}</p>}
      {!monitor && isFetching && <p role="status">Checking email operations…</p>}
      {monitor && <>
        {(monitor.summary.dlqVisible > 0 || monitor.summary.stuckSending > 0 || monitor.workers.some((worker) => worker.health !== "online")) &&
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status">
            Delivery needs attention. Review stuck messages, dead-letter queues, and worker health below.
          </p>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Waiting", "waiting"], ["Stuck sending", "stuckSending"], ["Failed", "failed"], ["Dead-letter queue", "dlqVisible"]].map(([label, key]) => (
            <div className={panel} key={key}><div className="text-sm">{label}</div><strong className="text-xl">{monitor.summary[key]}</strong></div>
          ))}
        </div>
        <div className={`${panel} overflow-auto`}>
          <h2 className="mb-3 font-bold">Queues</h2>
          <table className="w-full text-left text-sm">
            <thead><tr><th>Queue</th><th>Status</th><th>Waiting</th><th>In flight</th><th>Delayed</th></tr></thead>
            <tbody>{monitor.queues.map((queue) => <tr className="border-t border-slate-200" key={queue.key}><td className="py-2">{queue.label}</td><td>{!queue.configured ? "Not configured" : queue.ok ? "Reachable" : "Unavailable"}</td><td>{queue.attributes?.visible ?? "—"}</td><td>{queue.attributes?.inFlight ?? "—"}</td><td>{queue.attributes?.delayed ?? "—"}</td></tr>)}</tbody>
          </table>
        </div>
        <div className={`${panel} space-y-2`}>
          <h2 className="font-bold">Workers</h2>
          {!monitor.workers.length && <p className="text-sm">No worker heartbeats recorded.</p>}
          {monitor.workers.map((worker) => <div key={worker.id} className="border-t border-slate-200 pt-2 text-sm"><strong>{worker.workerType} · {worker.health}</strong><p>Last heartbeat {displayDate(worker.lastHeartbeatAt)} · Last processed {displayDate(worker.lastProcessedAt)}</p>{worker.lastError && <p className="text-red-700">{worker.lastError}</p>}</div>)}
        </div>
      </>}
    </section>
  );
}
