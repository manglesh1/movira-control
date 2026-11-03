import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  FaArrowLeft,
  FaArchive,
  FaBuilding,
  FaCheckCircle,
  FaCreditCard,
  FaCopy,
  FaDownload,
  FaEdit,
  FaEnvelope,
  FaFileInvoiceDollar,
  FaEye,
  FaGlobe,
  FaLayerGroup,
  FaLock,
  FaMapMarkerAlt,
  FaPause,
  FaPlay,
  FaPlus,
  FaPrint,
  FaRocket,
  FaSearch,
  FaTimes,
  FaTrash,
  FaTrashRestore,
  FaUserPlus,
} from "react-icons/fa";
import PageLayout from "../../layouts/PageLayout";
import Loader from "../../components/Loader";
import { ShimmerBlock } from "../../components/Shimmer";
import ErrorMessage from "../../components/ErrorMessage";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import SearchableSelect from "../../components/common/SearchableSelect";
import { formatPhoneInput, formatPhoneNumber, normalizePhoneNumber } from "../../utils/phoneNumber";
import {
  useApproveSaasParkGoLiveMutation,
  useCreateSaasParkMutation,
  useCreateSaasCustomerOwnerMutation,
  useResendSaasOwnerAccessMutation,
  useCreateSaasInvoicePaymentLinkMutation,
  useCreateSaasPlanMutation,
  useDeleteSaasParkMutation,
  useDeleteSaasPlanMutation,
  useGetSaasParkAuditLogsQuery,
  useGetSaasParkByLocationIdQuery,
  useGetSaasParkPaymentEventsQuery,
  useGetSaasPlatformBillingGatewayQuery,
  useGetSaasParksQuery,
  useGetSaasModulesQuery,
  useGetSaasPlansQuery,
  useLazyGetSaasInvoiceDocumentQuery,
  useLazyGetSaasParkPermanentDeletePreviewQuery,
  useRefundSaasInvoicePaymentMutation,
  useRefreshSaasInvoiceLifecycleMutation,
  useUpdateSaasParkBillingMutation,
  useUpdateSaasParkLifecycleMutation,
  useUpdateSaasParkModulesMutation,
  useUpdateSaasParkMutation,
  useUpdateSaasParkOnboardingMutation,
  useUpdateSaasParkLanguagesMutation,
  useUpdateSaasParkPaymentsMutation,
  useUpdateSaasModuleMutation,
  useUpdateSaasPlanMutation,
  useVoidSaasInvoiceMutation,
  usePermanentDeleteSaasParkMutation,
} from "../../features/saas/moviraControlApi";
import { useGetAllUsersQuery } from "../../features/user/userApi";
import {
  expandModuleSelection,
  fallbackModuleWorkflows,
  getRemovalBlockers,
  getWorkflowState,
  modulesForCompleteWorkflow,
  normalizeModuleCatalog,
} from "../../features/saas/moduleAccessModel";
import ParkPaymentConsole from "./ParkPaymentConsole";

const customerAppBaseUrl = String(
  import.meta.env.VITE_CUSTOMER_APP_URL ||
    import.meta.env.VITE_PUBLIC_APP_URL ||
    window.location.origin
).replace(/\/+$/, "");

const onboardingLabels = {
  parkWorkspace: "Location workspace",
  ownerAccess: "Owner access",
  moduleAccess: "Module access",
  billingPlan: "Billing setup",
  paymentMethod: "Platform payment",
  customerPayments: "Customer payments",
  catalogReady: "Ticket catalog",
  bookingPortal: "Booking portal",
  staffHandoff: "Staff handoff",
  goLiveApproval: "Go-live approval",
};

const defaultForm = {
  organizationId: "",
  organizationName: "",
  name: "",
  slug: "",
  owner: "",
  ownerUserId: "",
  ownerEmail: "",
  phone: "",
  city: "",
  state: "",
  country: "",
  timezone: "",
  currency: "",
  defaultLocale: "en-CA",
  additionalLocale: "",
  customerTaxName: "",
  customerTaxPercent: "",
  customerTaxCalculation: "add_to_price",
  streetNumberOrBuildingName: "",
  streetName: "",
  postalCode: "",
  displayAddress: "",
  deploymentMode: "production",
  demoExpiresAt: "",
  monthlyBaseFee: 0,
};

const countryProfiles = [
  {
    value: "Canada",
    label: "Canada",
    timezone: "America/Toronto",
    timezones: ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Regina", "America/Halifax", "America/Moncton", "America/St_Johns", "America/Whitehorse", "America/Yellowknife", "America/Iqaluit"],
    taxNames: ["GST", "HST", "PST", "QST", "No tax"],
    currency: "CAD",
    dialCode: "+1",
    cityPlaceholder: "St. Catharines",
    statePlaceholder: "Ontario",
    postalPlaceholder: "L2R 7C2",
  },
  {
    value: "United States",
    label: "United States",
    timezone: "America/New_York",
    timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"],
    taxNames: ["Sales Tax", "No tax"],
    currency: "USD",
    dialCode: "+1",
    cityPlaceholder: "Orlando",
    statePlaceholder: "Florida",
    postalPlaceholder: "32801",
  },
  {
    value: "India",
    label: "India",
    timezone: "Asia/Kolkata",
    timezones: ["Asia/Kolkata"],
    taxNames: ["GST", "No tax"],
    currency: "INR",
    dialCode: "+91",
    cityPlaceholder: "Jalaun",
    statePlaceholder: "Uttar Pradesh",
    postalPlaceholder: "285123",
  },
  {
    value: "United Kingdom",
    label: "United Kingdom",
    timezone: "Europe/London",
    timezones: ["Europe/London"],
    taxNames: ["VAT", "No tax"],
    currency: "GBP",
    dialCode: "+44",
    cityPlaceholder: "London",
    statePlaceholder: "England",
    postalPlaceholder: "SW1A 1AA",
  },
  {
    value: "Australia",
    label: "Australia",
    timezone: "Australia/Sydney",
    timezones: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Adelaide", "Australia/Perth", "Australia/Darwin", "Australia/Hobart"],
    taxNames: ["GST", "No tax"],
    currency: "AUD",
    dialCode: "+61",
    cityPlaceholder: "Sydney",
    statePlaceholder: "New South Wales",
    postalPlaceholder: "2000",
  },
];

const countryOptions = countryProfiles.map((profile) => ({
  value: profile.value,
  label: profile.label,
  description: `${profile.timezone} / ${profile.currency} / ${profile.dialCode}`,
}));

const getCountryProfile = (country) =>
  countryProfiles.find((profile) => profile.value.toLowerCase() === String(country || "").trim().toLowerCase()) ||
  { value: String(country || ""), dialCode: "", currency: "", timezones: [], taxNames: [], cityPlaceholder: "City", statePlaceholder: "State / province", postalPlaceholder: "Postal code" };

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalizePhoneForCountry = (phone, country) => normalizePhoneNumber(phone, country);

const phoneLocalValue = (phone, country) => (
  String(phone || "").trim().startsWith("+")
    ? formatPhoneNumber(phone, country)
    : formatPhoneInput(phone, country)
);

const getUserName = (user) =>
  user?.name ||
  [user?.first_name || user?.firstName, user?.last_name || user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
  "";

const getUserPhone = (user) => user?.phone || user?.phone_number || user?.contactNumber || "";

const requiredParkProfileFields = [
  ["organizationName", "Organization name is required."],
  ["name", "Location name is required."],
  ["owner", "Customer name is required."],
  ["phone", "Customer phone is required."],
  ["ownerEmail", "Customer email is required."],
  ["country", "Country is required."],
  ["timezone", "Timezone is required."],
  ["currency", "Currency is required."],
  ["city", "City is required."],
  ["state", "State / province is required."],
  ["postalCode", "Postal / ZIP code is required."],
  ["streetNumberOrBuildingName", "Building / street number is required."],
  ["streetName", "Street / address line is required."],
];

const defaultCustomerOwner = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  temporaryPassword: "",
};

const billingCycleOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

const taxLabelOptions = [
  { value: "Tax", label: "Tax", description: "Generic tax label for regions without a named tax." },
  { value: "VAT", label: "VAT", description: "Value Added Tax." },
  { value: "GST", label: "GST", description: "Goods and Services Tax." },
  { value: "HST", label: "HST", description: "Harmonized Sales Tax." },
  { value: "PST", label: "PST", description: "Provincial Sales Tax." },
  { value: "QST", label: "QST", description: "Quebec Sales Tax." },
  { value: "Sales Tax", label: "Sales Tax", description: "Common sales tax label." },
];

const platformBillingMethodOptions = [
  { value: "not_configured", label: "Not configured" },
  { value: "online_payment", label: "Online payment" },
  { value: "online", label: "Online payment" },
];

const platformBillingStatusOptions = [
  { value: "not_configured", label: "Not configured" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "suspended", label: "Suspended" },
];

const guestPaymentStatusOptions = [
  { value: "not_configured", label: "Not configured" },
  { value: "sandbox", label: "Sandbox" },
  { value: "live", label: "Live" },
];

const paymentHistoryStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "past_due", label: "Past due" },
  { value: "suspended", label: "Suspended" },
  { value: "recovered", label: "Recovered" },
  { value: "void", label: "Void" },
  { value: "recorded", label: "Recorded" },
];

const paymentEventTypeOptions = [
  { value: "all", label: "All event types" },
  { value: "invoice_generated", label: "Invoice generated" },
  { value: "invoice_payment_captured", label: "Payment captured" },
  { value: "invoice_payment_refunded", label: "Payment refunded" },
  { value: "invoice_payment_link_created", label: "Payment link" },
  { value: "invoice_payment_link_resent", label: "Payment link resent" },
  { value: "invoice_marked_overdue", label: "Marked overdue" },
  { value: "invoice_reminder_sent", label: "Reminder sent" },
  { value: "invoice_reminder_failed", label: "Reminder failed" },
  { value: "account_marked_past_due", label: "Account past due" },
  { value: "account_suspended_for_non_payment", label: "Account suspended" },
  { value: "account_collection_recovered", label: "Account recovered" },
  { value: "invoice_voided", label: "Invoice voided" },
  { value: "payment_settings_updated", label: "Payment settings" },
];

const auditActionOptions = [
  { value: "all", label: "All actions" },
  { value: "park.created", label: "Location created" },
  { value: "park.updated", label: "Location updated" },
  { value: "park.archived", label: "Location archived" },
  { value: "park.lifecycle_updated", label: "Lifecycle updated" },
  { value: "billing.updated", label: "Billing updated" },
  { value: "payments.updated", label: "Payments updated" },
  { value: "invoice.generated", label: "Invoice generated" },
  { value: "invoice.payment_recorded", label: "Payment recorded" },
  { value: "invoice.payment_link_created", label: "Payment link created" },
  { value: "invoice.payment_link_resent", label: "Payment link resent" },
  { value: "invoice.payment_refunded", label: "Payment refunded" },
  { value: "invoice.marked_overdue", label: "Marked overdue" },
  { value: "invoice.reminder_sent", label: "Reminder sent" },
  { value: "invoice.reminder_failed", label: "Reminder failed" },
  { value: "billing.past_due", label: "Billing past due" },
  { value: "billing.suspended", label: "Billing suspended" },
  { value: "billing.collection_recovered", label: "Billing recovered" },
  { value: "invoice.voided", label: "Invoice voided" },
  { value: "onboarding.updated", label: "Onboarding updated" },
];

const setupSteps = [
  { key: "parkWorkspace", label: "Workspace", route: "" },
  { key: "ownerAccess", label: "Owner", route: "edit" },
  { key: "moduleAccess", label: "Modules", route: "modules" },
  { key: "billingPlan", label: "Billing", route: "billing" },
  { key: "paymentMethod", label: "Platform payment", route: "payments" },
  { key: "customerPayments", label: "Customer payments", route: "payments" },
  { key: "goLiveApproval", label: "Go live", route: "onboarding" },
];

const demoSetupSteps = [
  { key: "parkWorkspace", label: "Workspace", route: "" },
  { key: "ownerAccess", label: "Owner", route: "edit" },
  { key: "moduleAccess", label: "Modules", route: "modules" },
  { key: "sandboxPayments", label: "Sandbox payments", route: "payments" },
];

const manualOnboardingKeys = new Set();

const setupStages = [
  {
    suffix: "",
    label: "Workspace",
    description: "Location and owner",
    keys: ["parkWorkspace", "ownerAccess"],
  },
  {
    suffix: "modules",
    label: "Modules",
    description: "Product access",
    keys: ["moduleAccess"],
  },
  {
    suffix: "billing",
    label: "Billing",
    description: "Plan and pricing",
    keys: ["billingPlan"],
  },
  {
    suffix: "payments",
    label: "Payments",
    description: "Platform and guests",
    keys: ["paymentMethod", "customerPayments"],
  },
  {
    suffix: "onboarding",
    label: "Approval",
    description: "Approve and notify owner",
    keys: ["goLiveApproval"],
  },
];

const demoSetupStages = [
  {
    suffix: "",
    label: "Workspace",
    description: "Location and owner",
    keys: ["parkWorkspace", "ownerAccess"],
  },
  {
    suffix: "modules",
    label: "Modules",
    description: "Test access",
    keys: ["moduleAccess"],
  },
  {
    suffix: "payments",
    label: "Sandbox",
    description: "Test payments",
    keys: ["sandboxPayments"],
  },
];

const parkRecordViews = [
  {
    suffix: "billing-history",
    label: "Billing history",
    requiredStep: "billingPlan",
    requiredLabel: "Billing",
  },
  {
    suffix: "payment-history",
    label: "Payment history",
    requiredStep: "paymentMethod",
    requiredLabel: "Platform payment",
  },
  { suffix: "audit", label: "Audit log" },
];

function money(value, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function todayDateInputValue() {
  const today = new Date();
  const offsetMs = today.getTimezoneOffset() * 60 * 1000;
  return new Date(today.getTime() - offsetMs).toISOString().slice(0, 10);
}

function dateInputValue(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function defaultDemoExpiryValue() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  const offsetMs = expiry.getTimezoneOffset() * 60 * 1000;
  return new Date(expiry.getTime() - offsetMs).toISOString().slice(0, 10);
}

function dateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function dateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function statusClass(status) {
  if (status === "live") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "demo") return "bg-violet-50 text-violet-700 border-violet-200";
  if (status === "paused") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "archived") return "bg-stone-100 text-stone-600 border-stone-200";
  if (status === "needs_checks") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-violet-50 text-violet-700 border-violet-200";
}

function billingStatusClass(status) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "recovered" || status === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "overdue" || status === "past_due" || status === "suspended") return "border-red-200 bg-red-50 text-red-700";
  if (status === "open") return "border-violet-200 bg-violet-50 text-violet-700";
  if (status === "failed" || status === "refunded") return "border-red-200 bg-red-50 text-red-700";
  if (status === "void") return "border-stone-200 bg-stone-100 text-stone-500";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || String(value || "Not configured").replace(/_/g, " ");
}

function Pill({ children, className = "" }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function buttonClass(variant = "secondary", extra = "") {
  const base =
    "inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "btn-nexus",
    secondary: "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
    ghost: "border border-transparent bg-transparent text-stone-700 hover:bg-stone-100",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    success: "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };
  return `${base} ${variants[variant] || variants.secondary} ${extra}`;
}

function iconButtonClass(variant = "secondary", extra = "") {
  const base =
    "inline-grid h-9 w-9 place-items-center rounded-lg border text-sm shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-(--brand-primary)/15 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    secondary: "border-(--stroke-soft) bg-(--surface-panel) text-(--text-base) hover:border-(--brand-primary-border) hover:bg-(--surface-muted) hover:text-(--text-strong)",
    danger: "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
  };
  return `${base} ${variants[variant] || variants.secondary} ${extra}`;
}

const listingShellClass =
  "min-w-0 overflow-hidden rounded-xl border border-(--stroke-soft) bg-(--surface-panel) shadow-(--shadow-card)";
const listingToolbarClass =
  "sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-(--stroke-soft) bg-(--surface-panel-strong)/95 p-2.5 backdrop-blur sm:p-3";
const listingScrollClass = "max-h-[min(68vh,760px)] overflow-auto";
const listingTableClass = (minWidth = "min-w-225") =>
  `w-full ${minWidth} border-separate border-spacing-0 text-sm`;
const listingHeadClass =
  "sticky top-0 z-20 bg-(--brand-primary-deep) text-left text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_1px_0_var(--stroke-soft)]";
const listingThClass = (extra = "") => `whitespace-nowrap border-b border-(--stroke-soft) px-3 py-2.5 align-middle ${extra}`;
const listingBodyClass =
  "divide-y divide-(--stroke-soft) bg-(--surface-panel) text-(--text-base) [&_p.font-black]:text-(--text-strong) [&_td.font-black]:text-(--text-strong) [&_td]:text-(--text-base)";
const listingRowClass = "transition hover:bg-(--brand-primary-soft)/45 [&>td]:border-b [&>td]:border-(--stroke-soft)";
const listingFooterClass =
  "sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t border-(--stroke-soft) bg-(--surface-panel-strong)/95 p-2.5 backdrop-blur";

function CompactListingMetric({ label, value }) {
  return (
    <span className="inline-flex min-h-8 max-w-47.5 items-center gap-1.5 rounded-lg border border-(--stroke-soft) bg-(--surface-muted) px-2 py-1 text-xs">
      <span className="shrink-0 font-bold text-(--text-muted)">{label}</span>
      <strong className="truncate font-black text-(--text-strong)">{value}</strong>
    </span>
  );
}

function CompactListingHeader({ eyebrow, title, description, controls, meta }) {
  return (
    <div className="sticky top-0 z-30 border-b border-(--stroke-soft) bg-(--surface-panel-strong)/95 px-3 py-2.5 backdrop-blur">
      <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center">
        <div className="min-w-0 xl:w-77.5 xl:shrink-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-(--brand-primary)">
              {eyebrow}
            </p>
            <h2 className="min-w-0 truncate text-base font-black text-(--text-strong)">{title}</h2>
          </div>
          {description ? (
            <p className="mt-0.5 truncate text-xs font-semibold text-(--text-muted)">{description}</p>
          ) : null}
        </div>
        {controls ? <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{controls}</div> : null}
        {meta ? <div className="flex shrink-0 flex-wrap items-center gap-1.5 xl:justify-end">{meta}</div> : null}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, compact = false }) {
  return (
    <div className={`min-w-0 rounded-xl border border-stone-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
      <div className={`flex items-center ${compact ? "gap-2.5" : "gap-3"}`}>
        <div className={`grid shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700 ${compact ? "h-9 w-9 text-sm" : "h-11 w-11"}`}>
          {createElement(Icon)}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`min-w-0 ${compact ? "flex flex-1 items-baseline gap-2" : ""}`}>
            <p className={`min-w-0 truncate font-black leading-none text-stone-950 ${compact ? "text-xl" : "text-2xl"}`}>{value}</p>
            <p className={`truncate font-bold text-stone-600 ${compact ? "text-sm" : "text-sm"}`}>{label}</p>
          </div>
          {detail ? <p className={`${compact ? "mt-1" : "mt-2"} truncate text-xs font-semibold text-stone-500`}>{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, detail, action }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
        <FaRocket />
      </div>
      <h3 className="mt-3 text-lg font-black text-stone-950">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-stone-500">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="h-2.5 rounded-full bg-stone-100">
      <div className="h-2.5 rounded-full bg-violet-600 transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function isDemoPark(park) {
  return park?.deploymentMode === "demo" || park?.status === "demo";
}

function isSetupKeyComplete(park, key) {
  if (key === "sandboxPayments") {
    return park?.customerPaymentStatus === "sandbox";
  }
  return Boolean(park?.onboarding?.[key]);
}

function setupStepsForPark(park) {
  return isDemoPark(park) ? demoSetupSteps : setupSteps;
}

function setupStagesForPark(park) {
  return isDemoPark(park) ? demoSetupStages : setupStages;
}

function setupProgressForPark(park) {
  const steps = setupStepsForPark(park);
  const completed = steps.filter((step) => isSetupKeyComplete(park, step.key)).length;
  return {
    completed,
    total: steps.length,
    score: steps.length ? Math.round((completed / steps.length) * 100) : 0,
  };
}

function getNextStep(park) {
  const steps = setupStepsForPark(park);
  return steps.find((step) => !isSetupKeyComplete(park, step.key)) || steps[steps.length - 1];
}

function stepHref(locationId, step) {
  return `/movira-control/parks/${locationId}${step?.route ? `/${step.route}` : ""}`;
}

function parkSectionHref(locationId, suffix = "") {
  return `/movira-control/parks/${locationId}${suffix ? `/${suffix}` : ""}`;
}

function isSetupStageComplete(park, stage) {
  return stage.keys.every((key) => isSetupKeyComplete(park, key));
}

function isSetupStageAvailable(park, stageIndex, stages = setupStagesForPark(park)) {
  return stages.slice(0, stageIndex).every((stage) => isSetupStageComplete(park, stage));
}

function getCurrentSetupStage(park) {
  const stages = setupStagesForPark(park);
  return stages.find((stage) => !isSetupStageComplete(park, stage)) || stages[stages.length - 1];
}

function getParkSectionLock(park, suffix = "") {
  const recordView = parkRecordViews.find((item) => item.suffix === suffix);
  const recordRequirementComplete =
    isDemoPark(park) && suffix === "payment-history"
      ? isSetupKeyComplete(park, "sandboxPayments")
      : recordView?.requiredStep
        ? isSetupKeyComplete(park, recordView.requiredStep)
        : true;
  if (recordView?.requiredStep && !recordRequirementComplete) {
    return {
      message: `Complete ${recordView.requiredLabel} before opening ${recordView.label}.`,
    };
  }

  const stages = setupStagesForPark(park);
  const stageIndex = stages.findIndex((stage) => stage.suffix === suffix);
  if (stageIndex < 0 || isSetupStageAvailable(park, stageIndex, stages)) return null;
  const prerequisite = stages[stageIndex - 1];
  return {
    message: `Complete ${prerequisite.label} before opening ${stages[stageIndex].label}.`,
  };
}

function ParkRecordsMenu({ park, section, isRecordView }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuWidth = 224;
      const menuHeight = 132;
      const gap = 8;
      const viewportPadding = 12;
      const left = Math.min(
        window.innerWidth - menuWidth - viewportPadding,
        Math.max(viewportPadding, rect.right - menuWidth)
      );
      const fitsBelow = rect.bottom + gap + menuHeight <= window.innerHeight - viewportPadding;

      setPosition({
        left,
        top: fitsBelow ? rect.bottom + gap : Math.max(viewportPadding, rect.top - menuHeight - gap),
      });
    };

    const closeOnOutsideClick = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`${buttonClass("secondary")} ${
          isRecordView
            ? "border-(--brand-primary-border) bg-(--brand-primary-soft) text-(--brand-primary)"
            : ""
        }`}
      >
        <FaFileInvoiceDollar /> Records
      </button>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ left: position.left, top: position.top }}
              className="fixed z-1000 w-56 rounded-xl border border-(--stroke-soft) bg-(--surface-panel-strong) p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.2)]"
            >
              {parkRecordViews
                .filter((view) => !(isDemoPark(park) && view.suffix === "billing-history"))
                .map((view) => {
                const locked = getParkSectionLock(park, view.suffix);
                return (
                  <Link
                    key={view.suffix}
                    role="menuitem"
                    to={parkSectionHref(park.locationId, view.suffix)}
                    onClick={(event) => {
                      if (locked) {
                        event.preventDefault();
                        toast.error(locked.message);
                        return;
                      }
                      setOpen(false);
                    }}
                    className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${
                      section === view.suffix
                        ? "bg-(--brand-primary-soft) text-(--brand-primary)"
                        : locked
                          ? "cursor-not-allowed text-(--text-muted) opacity-60"
                          : "text-(--text-base) hover:bg-(--surface-muted)"
                    }`}
                  >
                    {locked ? <FaLock className="text-xs" /> : <FaEye className="text-xs" />}
                    {view.label}
                  </Link>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function SetupNavigation({ park, section }) {
  const stages = setupStagesForPark(park);
  const progress = setupProgressForPark(park);
  const score = progress.score;
  const completedSteps = progress.completed;
  const totalSteps = progress.total;
  const demo = isDemoPark(park);
  const isRecordView = parkRecordViews.some((item) => item.suffix === section);

  return (
    <div className="sticky top-18 z-30 mb-3 overflow-visible rounded-xl border border-(--stroke-soft) bg-(--surface-panel)/95 p-2.5 shadow-(--shadow-card) backdrop-blur">
      <div className="grid min-w-0 gap-2 xl:grid-cols-[190px_minmax(260px,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-(--brand-primary-soft) text-(--brand-primary)">
            <FaRocket />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-(--text-muted)">
              {demo ? "Testing readiness" : "Launch readiness"}
            </p>
            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <p className="shrink-0 text-xl font-black leading-none text-(--text-strong)">{score}%</p>
              <span className="truncate text-xs font-bold text-(--text-muted)">{completedSteps}/{totalSteps} checks</span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-bold text-(--text-muted)">
            <span>{score === 100 ? (demo ? "Demo setup complete" : "Setup complete") : "Complete each stage to unlock the next"}</span>
            <span>{score === 100 ? (demo ? "Sandbox ready" : "Ready for launch") : "In progress"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-(--surface-muted)">
            <div
              className="h-full rounded-full bg-(--brand-primary) transition-all"
              style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 xl:justify-end">
          <Pill className={statusClass(park.status)}>{park.status}</Pill>
          <ParkRecordsMenu park={park} section={section} isRecordView={isRecordView} />
        </div>
      </div>

      <div className={`mt-2 grid gap-1.5 border-t border-(--stroke-soft) pt-2 ${demo ? "sm:grid-cols-3" : "sm:grid-cols-5"}`}>
        {stages.map((stage, index) => {
          const done = isSetupStageComplete(park, stage);
          const available = isSetupStageAvailable(park, index, stages);
          const active = !isRecordView && section === stage.suffix;
          return (
            <Link
              key={stage.suffix || "workspace"}
              to={parkSectionHref(park.locationId, stage.suffix)}
              onClick={(event) => {
                if (available) return;
                event.preventDefault();
                toast.error(`Complete ${stages[index - 1].label} before opening ${stage.label}.`);
              }}
              title={available ? stage.label : `Complete ${stages[index - 1]?.label || "the previous stage"} first`}
              className={`flex min-h-10 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 transition ${
                active
                  ? "border-(--brand-primary-border) bg-(--brand-primary-soft) text-(--brand-primary) shadow-sm"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : available
                      ? "border-(--stroke-soft) bg-(--surface-panel-strong) text-(--text-base) hover:border-(--brand-primary-border) hover:bg-(--surface-muted)"
                      : "cursor-not-allowed border-(--stroke-soft) bg-(--surface-muted) text-(--text-muted) opacity-65"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                  done
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-(--brand-primary) text-white"
                      : "border border-(--stroke-soft) bg-(--surface-panel) text-(--text-muted)"
                }`}
              >
                {done ? <FaCheckCircle className="text-[10px]" /> : available ? index + 1 : <FaLock className="text-[9px]" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-black">{stage.label}</span>
                <span className="hidden truncate text-[10px] font-semibold opacity-75 2xl:block">{stage.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NextActionCard({ park }) {
  const nextStep = getNextStep(park);
  const demo = isDemoPark(park);
  const progress = setupProgressForPark(park);
  const complete = progress.score === 100;
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-xs font-black uppercase text-violet-700">Next action</p>
      <h3 className="mt-1 text-lg font-black text-stone-950">
        {demo && complete ? "Demo testing ready" : nextStep.label}
      </h3>
      <p className="mt-1 text-sm font-semibold text-stone-600">
        {demo
          ? complete
            ? "Sandbox access is active. Convert the location when real billing and live operations are required."
            : "Complete this step to finish the sandbox testing setup."
          : progress.score === 100
            ? "Ready for live operations review."
            : "Complete this step to move the location closer to go-live."}
      </p>
      <Link
        to={demo && complete ? `/movira-control/parks/${park.locationId}/edit` : stepHref(park.locationId, nextStep)}
        className={buttonClass("primary", "mt-4")}
      >
        {demo && complete ? "Convert to production" : "Continue"} <FaRocket />
      </Link>
    </div>
  );
}

function ControlShell({ title, kicker = "SaaS command", children, actions }) {
  return (
    <PageLayout
      heading={title}
      sectionKicker={kicker}
      breadcrumb={[{ label: "Movira Control", link: "/movira-control/parks" }, { label: title }]}
      topButton={actions}
    >
      {children}
    </PageLayout>
  );
}

const emptyPlanForm = {
  key: "",
  label: "",
  monthlyBaseFee: 0,
  maxParks: "",
  description: "",
  sortOrder: 100,
  recommended: false,
  internalOnly: false,
  status: "active",
};

function planFormFrom(plan = null) {
  if (!plan) return emptyPlanForm;
  return {
    key: plan.key || "",
    label: plan.label || "",
    monthlyBaseFee: Number(plan.monthlyBaseFee || 0),
    maxParks: plan.maxParks === null || plan.maxParks === undefined ? "" : Number(plan.maxParks),
    description: plan.description || "",
    sortOrder: Number(plan.sortOrder || 100),
    recommended: Boolean(plan.recommended),
    internalOnly: Boolean(plan.internalOnly),
    status: plan.status || "active",
  };
}

export function PlansManager() {
  const [activeCatalogTab, setActiveCatalogTab] = useState("plans");
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(emptyPlanForm);
  const [deletePlan, setDeletePlan] = useState(null);
  const { data = {}, isLoading, isError, error } = useGetSaasPlansQuery({ includeArchived });
  const [createPlan, createState] = useCreateSaasPlanMutation();
  const [updatePlan, updateState] = useUpdateSaasPlanMutation();
  const [archivePlan, archiveState] = useDeleteSaasPlanMutation();
  const plans = data.plans || [];
  const filteredPlans = plans.filter((plan) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [plan.label, plan.key, plan.description].some((value) => String(value || "").toLowerCase().includes(term));
  });
  const activePlans = plans.filter((plan) => plan.status === "active" && !plan.archivedAt);
  const recommendedPlan = activePlans.find((plan) => plan.recommended);
  const cheapestPlan = activePlans.reduce((lowest, plan) => {
    if (!lowest) return plan;
    return Number(plan.monthlyBaseFee || 0) < Number(lowest.monthlyBaseFee || 0) ? plan : lowest;
  }, null);
  const unlimitedCount = activePlans.filter((plan) => plan.maxParks === null).length;
  const isSaving = createState.isLoading || updateState.isLoading;

  function openCreate() {
    setEditingPlan(null);
    setForm(emptyPlanForm);
    setPlanModalOpen(true);
  }

  function openEdit(plan) {
    setEditingPlan(plan);
    setForm(planFormFrom(plan));
    setPlanModalOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setEditingPlan(null);
    setForm(emptyPlanForm);
    setPlanModalOpen(false);
  }

  async function handleSavePlan(event) {
    event.preventDefault();
    const payload = {
      ...form,
      monthlyBaseFee: Number(form.monthlyBaseFee || 0),
      maxParks: form.maxParks === "" ? null : Number(form.maxParks),
      sortOrder: Number(form.sortOrder || 100),
    };
    try {
      if (editingPlan) {
        await updatePlan({ planKey: editingPlan.key, ...payload }).unwrap();
        toast.success("Plan updated.");
      } else {
        await createPlan(payload).unwrap();
        toast.success("Plan created.");
      }
      closeForm();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save plan.");
    }
  }

  async function handleDeletePlan() {
    if (!deletePlan) return;
    try {
      await archivePlan(deletePlan.key).unwrap();
      toast.success("Plan archived.");
      setDeletePlan(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete plan.");
    }
  }

  if (isLoading) return <Loader />;
  if (isError) return <ErrorMessage message={error?.data?.message || "Failed to load SaaS plans."} />;

  return (
    <ControlShell
      title="Plans"
      actions={
        activeCatalogTab === "plans" ? (
          <button type="button" onClick={openCreate} className={buttonClass("primary")}>
            <FaPlus /> New plan
          </button>
        ) : null
      }
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
          <div className="inline-flex rounded-lg bg-stone-50 p-1">
            {[
              { key: "plans", label: "Plans" },
              { key: "modules", label: "Module pricing" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveCatalogTab(tab.key)}
                className={`rounded-md px-4 py-2 text-sm font-black transition ${
                  activeCatalogTab === tab.key ? "bg-violet-50 text-violet-700 shadow-sm" : "text-stone-600 hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeCatalogTab === "plans" ? (
          <>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard compact icon={FaLayerGroup} label="Active plans" value={activePlans.length} detail="available for billing" />
          <StatCard compact icon={FaRocket} label="Recommended" value={recommendedPlan?.label || "-"} detail="highlighted for sales" />
          <StatCard compact icon={FaMapMarkerAlt} label="Unlimited" value={unlimitedCount} detail="no location cap" />
          <StatCard compact icon={FaCreditCard} label="Starts at" value={cheapestPlan ? money(cheapestPlan.monthlyBaseFee) : "$0"} detail="monthly base fee" />
        </section>

        <section className={listingShellClass}>
          <div className={listingToolbarClass}>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-full flex-1 sm:min-w-65 md:max-w-md">
                <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search plans..."
                  className="input-nexus w-full px-9 py-2.5 text-sm"
                />
              </div>
              <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-1">
                <button
                  type="button"
                  onClick={() => setIncludeArchived(false)}
                  className={`rounded-md px-3 py-1.5 text-xs font-black ${!includeArchived ? "bg-white text-violet-700 shadow-sm" : "text-stone-500"}`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeArchived(true)}
                  className={`rounded-md px-3 py-1.5 text-xs font-black ${includeArchived ? "bg-white text-violet-700 shadow-sm" : "text-stone-500"}`}
                >
                  All
                </button>
              </div>
            </div>
            <Pill className="border-stone-200 bg-stone-50 text-stone-600">{filteredPlans.length} plans</Pill>
          </div>

          <div className={listingScrollClass}>
            <table className={listingTableClass("min-w-225")}>
              <thead className={listingHeadClass}>
                <tr>
                  <th className={listingThClass()}>Plan</th>
                  <th className={listingThClass()}>Base fee</th>
                  <th className={listingThClass()}>Location limit</th>
                  <th className={listingThClass()}>Status</th>
                  <th className={listingThClass()}>Flags</th>
                  <th className={listingThClass("text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className={listingBodyClass}>
                {filteredPlans.map((plan) => (
                  <tr key={plan.key} className={listingRowClass}>
                    <td className="px-4 py-3">
                      <p className="font-black text-stone-950">{plan.label}</p>
                      <p className="text-xs font-bold text-stone-500">{plan.key}</p>
                      {plan.description ? <p className="mt-1 max-w-xl text-xs font-semibold text-stone-500">{plan.description}</p> : null}
                    </td>
                    <td className="px-4 py-3 font-black text-stone-950">{money(plan.monthlyBaseFee)}/mo</td>
                    <td className="px-4 py-3 font-bold text-stone-600">
                      {plan.maxParks === null ? "Unlimited locations" : `${plan.maxParks} location${plan.maxParks === 1 ? "" : "s"}`}
                    </td>
                    <td className="px-4 py-3">
                      <Pill className={plan.status === "active" && !plan.archivedAt ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-600"}>
                        {plan.archivedAt ? "archived" : plan.status}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {plan.recommended ? <Pill className="border-violet-200 bg-violet-50 text-violet-700">recommended</Pill> : null}
                        {plan.internalOnly ? <Pill className="border-blue-200 bg-blue-50 text-blue-700">internal</Pill> : null}
                        {!plan.recommended && !plan.internalOnly ? <span className="text-xs font-bold text-stone-400">-</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openEdit(plan)} className={iconButtonClass("secondary")} aria-label={`Edit ${plan.label}`}>
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          disabled={plan.key === "starter" || Boolean(plan.archivedAt)}
                          onClick={() => setDeletePlan(plan)}
                          className={iconButtonClass("danger")}
                          aria-label={`Delete ${plan.label}`}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8">
                      <EmptyState title="No plans found" detail="Try another search or create a new SaaS billing plan." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
          </>
        ) : (
          <ModulePricingPanel />
        )}
      </div>

      {planModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm" onClick={closeForm}>
          <form
            onSubmit={handleSavePlan}
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">{editingPlan ? "Update plan" : "New plan"}</p>
                <h3 className="mt-1 text-2xl font-black text-stone-950">{editingPlan ? `Edit ${editingPlan.label}` : "Create SaaS billing plan"}</h3>
                <p className="mt-1 text-sm font-semibold text-stone-500">Plans define the base SaaS fee and how many locations an owner can operate.</p>
              </div>
              <button type="button" onClick={closeForm} className={iconButtonClass("secondary")} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Plan name</span>
                <input
                  required
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Starter"
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Plan key</span>
                <input
                  required
                  disabled={Boolean(editingPlan)}
                  value={form.key}
                  onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                  placeholder="starter"
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm disabled:bg-stone-50 disabled:text-stone-500"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Monthly base fee</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.monthlyBaseFee}
                  onChange={(event) => setForm((current) => ({ ...current, monthlyBaseFee: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Location limit</span>
                <input
                  type="number"
                  min="1"
                  value={form.maxParks}
                  onChange={(event) => setForm((current) => ({ ...current, maxParks: event.target.value }))}
                  placeholder="Blank means unlimited"
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Sort order</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Status</span>
                <SearchableSelect
                  value={form.status}
                  onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                  className="mt-1"
                  buttonClassName="min-h-11 py-2.5"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "draft", label: "Draft" },
                    { value: "archived", label: "Archived" },
                  ]}
                />
              </label>
              <label className="md:col-span-2">
                <span className="text-xs font-black uppercase text-stone-500">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <input
                  type="checkbox"
                  checked={form.recommended}
                  onChange={(event) => setForm((current) => ({ ...current, recommended: event.target.checked }))}
                  className="h-4 w-4 accent-violet-600"
                />
                <span>
                  <span className="block text-sm font-black text-stone-950">Recommended plan</span>
                  <span className="text-xs font-semibold text-stone-500">Highlight this plan for operators.</span>
                </span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <input
                  type="checkbox"
                  checked={form.internalOnly}
                  onChange={(event) => setForm((current) => ({ ...current, internalOnly: event.target.checked }))}
                  className="h-4 w-4 accent-violet-600"
                />
                <span>
                  <span className="block text-sm font-black text-stone-950">Internal only</span>
                  <span className="text-xs font-semibold text-stone-500">Hide from normal customer-facing choices.</span>
                </span>
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-4">
              <button type="button" onClick={closeForm} className={buttonClass("secondary")}>
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className={buttonClass("primary")}>
                {isSaving ? "Saving..." : editingPlan ? "Update plan" : "Create plan"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletePlan)}
        tone="danger"
        eyebrow="Delete plan"
        title={deletePlan ? `Delete ${deletePlan.label}?` : ""}
        message="The plan will be archived and removed from normal plan selection. Existing locations keep their saved billing values until changed."
        details={["Starter/default plan cannot be deleted.", "Archived plans can still be shown from the All filter for audit context."]}
        confirmLabel="Delete plan"
        loading={archiveState.isLoading}
        onConfirm={handleDeletePlan}
        onClose={() => setDeletePlan(null)}
      />
    </ControlShell>
  );
}

function ModulePricingPanel() {
  const [search, setSearch] = useState("");
  const [editingModule, setEditingModule] = useState(null);
  const [form, setForm] = useState(null);
  const { data = {}, isLoading, isError, error } = useGetSaasModulesQuery({ includeInactive: true });
  const [updateModule, updateState] = useUpdateSaasModuleMutation();
  const moduleList = data.modules || [];
  const filteredModules = moduleList.filter((module) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [module.label, module.key, module.description].some((value) => String(value || "").toLowerCase().includes(term));
  });
  const activeModules = moduleList.filter((module) => (module.status || "active") === "active");
  const monthlyTotal = activeModules.reduce((sum, module) => sum + Number(module.monthly || 0), 0);
  const highestModule = activeModules.reduce((highest, module) => {
    if (!highest) return module;
    return Number(module.monthly || 0) > Number(highest.monthly || 0) ? module : highest;
  }, null);

  function openEdit(module) {
    setEditingModule(module);
    setForm({
      label: module.label || "",
      monthly: Number(module.monthly || 0),
      description: module.description || "",
      sortOrder: Number(module.sortOrder || 100),
      status: module.status || "active",
    });
  }

  function closeEdit() {
    if (updateState.isLoading) return;
    setEditingModule(null);
    setForm(null);
  }

  async function handleSaveModule(event) {
    event.preventDefault();
    if (!editingModule || !form) return;
    try {
      await updateModule({
        moduleKey: editingModule.key,
        ...form,
        monthly: Number(form.monthly || 0),
        sortOrder: Number(form.sortOrder || 100),
      }).unwrap();
      toast.success("Module price updated.");
      closeEdit();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update module price.");
    }
  }

  if (isLoading) return <Loader />;
  if (isError) return <ErrorMessage message={error?.data?.message || "Failed to load module pricing."} />;

  return (
    <>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard compact icon={FaLayerGroup} label="Active modules" value={activeModules.length} detail="available add-ons" />
        <StatCard compact icon={FaCreditCard} label="Monthly bundle" value={money(monthlyTotal)} detail="all active modules" />
        <StatCard compact icon={FaRocket} label="Highest price" value={highestModule?.label || "-"} detail={highestModule ? `${money(highestModule.monthly)}/mo` : "No active module"} />
        <StatCard compact icon={FaCheckCircle} label="Catalog rows" value={moduleList.length} detail="managed modules" />
      </section>

      <section className={listingShellClass}>
        <div className={listingToolbarClass}>
          <div className="relative min-w-full flex-1 sm:min-w-65 md:max-w-md">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search modules..."
              className="input-nexus w-full px-9 py-2.5 text-sm"
            />
          </div>
          <Pill className="border-stone-200 bg-stone-50 text-stone-600">{filteredModules.length} modules</Pill>
        </div>

        <div className={listingScrollClass}>
          <table className={listingTableClass("min-w-215")}>
            <thead className={listingHeadClass}>
              <tr>
                <th className={listingThClass()}>Module</th>
                <th className={listingThClass()}>Monthly price</th>
                <th className={listingThClass()}>Status</th>
                <th className={listingThClass()}>Sort</th>
                <th className={listingThClass("text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className={listingBodyClass}>
              {filteredModules.map((module) => (
                <tr key={module.key} className={listingRowClass}>
                  <td className="px-4 py-3">
                    <p className="font-black text-stone-950">{module.label}</p>
                    <p className="text-xs font-bold text-stone-500">{module.key}</p>
                    {module.description ? <p className="mt-1 max-w-xl text-xs font-semibold text-stone-500">{module.description}</p> : null}
                  </td>
                  <td className="px-4 py-3 font-black text-stone-950">{money(module.monthly)}/mo</td>
                  <td className="px-4 py-3">
                    <Pill className={(module.status || "active") === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-600"}>
                      {module.status || "active"}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-600">{module.sortOrder || 100}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button type="button" onClick={() => openEdit(module)} className={iconButtonClass("secondary")} aria-label={`Edit ${module.label}`}>
                        <FaEdit />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8">
                    <EmptyState title="No modules found" detail="Try another search to find a module price." />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {editingModule && form ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm" onClick={closeEdit}>
          <form
            onSubmit={handleSaveModule}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Module pricing</p>
                <h3 className="mt-1 text-2xl font-black text-stone-950">Edit {editingModule.label}</h3>
                <p className="mt-1 text-sm font-semibold text-stone-500">This price is used for location modules, billing totals, and generated SaaS invoices.</p>
              </div>
              <button type="button" onClick={closeEdit} className={iconButtonClass("secondary")} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Module name</span>
                <input
                  required
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Monthly price</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.monthly}
                  onChange={(event) => setForm((current) => ({ ...current, monthly: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Sort order</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Status</span>
                <SearchableSelect
                  value={form.status}
                  onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                  className="mt-1"
                  buttonClassName="min-h-11 py-2.5"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </label>
              <label className="md:col-span-2">
                <span className="text-xs font-black uppercase text-stone-500">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-4">
              <button type="button" onClick={closeEdit} className={buttonClass("secondary")}>
                Cancel
              </button>
              <button type="submit" disabled={updateState.isLoading} className={buttonClass("primary")}>
                {updateState.isLoading ? "Saving..." : "Update module"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Overview() {
  const { data = {}, isLoading, isError, error } = useGetSaasParksQuery({ limit: 6 });
  const summary = data.summary || {};
  const parks = data.parks || [];

  if (isLoading) return <Loader />;
  if (isError) return <ErrorMessage message={error?.data?.message || "Failed to load Movira Control"} />;

  return (
    <ControlShell
      title="Movira Control"
      actions={
        <div className="flex gap-2">
          <Link to="/movira-control/parks" className={buttonClass("secondary")}>
            Locations
          </Link>
          <Link to="/movira-control/parks/new" className={buttonClass("primary")}>
            <FaPlus /> New location
          </Link>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={FaMapMarkerAlt} label="Total locations" value={summary.total || 0} detail={`${summary.setup || 0} in setup`} />
          <StatCard icon={FaRocket} label="Live locations" value={summary.live || 0} detail="approved for operations" />
          <StatCard icon={FaEye} label="Demo locations" value={summary.demo || 0} detail="sandbox testing access" />
          <StatCard icon={FaCreditCard} label="Monthly SaaS" value={money(summary.monthlyRevenue || 0)} detail="base fee + modules" />
          <StatCard icon={FaLayerGroup} label="Modules" value={data.catalogs?.modules?.length || 0} detail="controlled per location" />
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-violet-700">Location onboarding</p>
              <h2 className="mt-1 text-2xl font-black text-stone-950">Create, bill, configure, and approve every location.</h2>
              <p className="mt-1 text-sm font-semibold text-stone-500">Start from the locations list, then work through modules, billing, payments, and launch readiness.</p>
            </div>
            <Link to="/movira-control/parks/new" className={buttonClass("primary")}>
              <FaPlus /> Onboard location
            </Link>
          </div>
          {parks.length ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {parks.map((park) => (
              <Link key={park.locationId} to={`/movira-control/parks/${park.locationId}`} className="rounded-xl border border-stone-200 p-4 transition hover:border-violet-300 hover:bg-violet-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-stone-950">{park.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-stone-500">{park.location}</p>
                  </div>
                  <Pill className={statusClass(park.status)}>{park.status}</Pill>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm font-bold text-stone-600">
                  <span>Base {money(park.monthlyBaseFee, park.currency)}</span>
                  <span>{money(park.billing?.monthlyTotal, park.currency)}/mo</span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={setupProgressForPark(park).score} />
                  <p className="mt-1 text-xs font-bold text-stone-500">{setupProgressForPark(park).score}% ready</p>
                </div>
              </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="No locations in Control yet"
                detail="Create the first location workspace to start onboarding, billing, and launch checks."
                action={<Link to="/movira-control/parks/new" className={buttonClass("primary")}><FaPlus /> New location</Link>}
              />
            </div>
          )}
        </section>
      </div>
    </ControlShell>
  );
}

export function ParksList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const { data = {}, isLoading, isError, error } = useGetSaasParksQuery({
    page,
    limit: 12,
    search,
    includeArchived: statusFilter === "archived",
    status: statusFilter,
    organizationId: organizationFilter,
  });
  const [permanentDeletePark] = usePermanentDeleteSaasParkMutation();
  const [archivePark, archiveParkState] = useDeleteSaasParkMutation();
  const [loadDeletePreview] = useLazyGetSaasParkPermanentDeletePreviewQuery();
  const [updateLifecycle] = useUpdateSaasParkLifecycleMutation();
  const parks = data.parks || [];
  const pagination = data.pagination || {};
  const summary = data.summary || {};
  const organizations = data.catalogs?.organizations || [];

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const permanentDeleteConfirmed = async (park) => {
    try {
      const response = await permanentDeletePark({
        locationId: park.locationId,
        confirmation: "DELETE",
        confirmLocationName: park.name,
        previewAccepted: true,
      }).unwrap();
      const cleanup = response?.data?.organizationCleanup;
      toast.success(
        cleanup?.deleted
          ? `Location and organization deleted. ${cleanup.deletedUserIds?.length || 0} orphaned user account(s) removed.`
          : "Location permanently deleted. The organization remains because it has other locations."
      );
      closeConfirmDialog();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.error || "Failed to permanently delete location.");
    }
  };

  const onRestore = async (park) => {
    try {
      await updateLifecycle({ locationId: park.locationId, status: "setup" }).unwrap();
      toast.success("Location restored.");
      closeConfirmDialog();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to restore location.");
    }
  };

  const archiveConfirmed = async (park) => {
    try {
      await archivePark(park.locationId).unwrap();
      toast.success("Location archived. Its data is retained and operational access is blocked.");
      closeConfirmDialog();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to archive location.");
    }
  };

  const openArchiveDialog = (park) => {
    setConfirmDialog({
      type: "archive",
      tone: "warning",
      eyebrow: "Archive location",
      title: `Archive ${park.name}?`,
      message: "The location will stop appearing in the active list and its operational modules will be blocked. All bookings, customers, payments, CRM data, and configuration will remain safe.",
      details: [
        "You can restore the location later from the Archived tab.",
        "Permanent delete becomes available only after the location is archived.",
      ],
      confirmLabel: "Archive location",
      park,
    });
  };

  const pauseToggleConfirmed = async (park) => {
    const nextStatus = park.status === "paused" ? "setup" : "paused";
    try {
      await updateLifecycle({ locationId: park.locationId, status: nextStatus }).unwrap();
      toast.success(nextStatus === "paused" ? "Location paused." : "Location resumed.");
      closeConfirmDialog();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update location status.");
    }
  };

  const onPauseToggle = (park) => {
    const pausing = park.status !== "paused";
    setConfirmDialog({
      type: "pause",
      tone: pausing ? "info" : "warning",
      eyebrow: pausing ? "Pause location" : "Resume location",
      title: `${pausing ? "Pause" : "Resume"} ${park.name}?`,
      message: pausing
        ? "Customer data will stay safe. The location remains visible for admins, but operations can be treated as temporarily stopped."
        : "This will move the location back into setup status so work can continue.",
      confirmLabel: pausing ? "Pause location" : "Resume location",
      park,
    });
  };

  const openRestoreDialog = (park) => {
    setConfirmDialog({
      type: "restore",
      tone: "info",
      eyebrow: "Restore location",
      title: `Restore ${park.name}?`,
      message: "The location will move back to active setup and appear in Admin again.",
      confirmLabel: "Restore location",
      park,
    });
  };

  const openPermanentDeleteDialog = async (park) => {
    setConfirmDialog({
      type: "permanent-preview",
      tone: "danger",
      eyebrow: "Checking delete impact",
      title: `Preparing permanent delete for ${park.name}`,
      message: "Loading the affected data preview before permanent delete.",
      details: ["Permanent delete is only available after the location is archived."],
      confirmLabel: "Loading...",
      park,
    });

    try {
      const preview = await loadDeletePreview(park.locationId).unwrap();
      const plan = preview?.plan || {};
      const organizationCleanup = preview?.organizationCleanup || {};
      const topTables = (plan.tables || []).slice(0, 6).map((item) => `${item.tableName}: ${item.count} rows`);
      setConfirmDialog({
        type: "permanent-delete",
        tone: "danger",
        eyebrow: "Permanent delete",
        title: `Delete ${park.name} permanently?`,
        message: "Review the impact below. This removes the location and all location-scoped data permanently.",
        details: [
          `Affected rows: ${plan.rowCount || 0}`,
          `Affected tables: ${plan.tableCount || 0}`,
          ...(topTables.length ? topTables : ["No location-scoped child rows found in preview."]),
          ...(organizationCleanup.isLastPark
            ? [
                "This is the organization's last location, so the organization will also be deleted.",
                `${organizationCleanup.candidateUserCount || 0} organization user(s) will be checked and only orphaned non-admin users will be deleted.`,
              ]
            : ["The organization has other locations and will remain active."]),
          "This action cannot be undone.",
        ],
        confirmText: "DELETE",
        confirmValue: "",
        confirmLabel: "Delete permanently",
        park,
      });
    } catch (err) {
      setConfirmDialog({
        type: "permanent-preview-failed",
        tone: "danger",
        eyebrow: "Preview failed",
        title: "Permanent delete preview failed",
        message: err?.data?.message || "Could not load delete impact. Permanent delete is blocked until the preview works.",
        confirmLabel: "Close",
        park,
      });
    }
  };

  const handleConfirmDialog = async (event) => {
    if (!confirmDialog) return;
    if (event.type === "input") {
      setConfirmDialog((current) => ({ ...current, confirmValue: event.value }));
      return;
    }
    if (confirmDialog.type === "pause") return pauseToggleConfirmed(confirmDialog.park);
    if (confirmDialog.type === "archive") return archiveConfirmed(confirmDialog.park);
    if (confirmDialog.type === "restore") return onRestore(confirmDialog.park);
    if (confirmDialog.type === "permanent-preview-failed") return closeConfirmDialog();
    if (confirmDialog.type === "permanent-delete") return permanentDeleteConfirmed(confirmDialog.park);
  };

  if (isLoading) return <Loader />;
  if (isError) return <ErrorMessage message={error?.data?.message || "Failed to load locations"} />;

  return (
    <ControlShell
      title="Locations"
      actions={
        <Link to="/movira-control/parks/new" className={buttonClass("primary", "min-h-9 px-3 py-1.5")}>
          <FaPlus /> New location
        </Link>
      }
    >
      <div className="space-y-3">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard compact icon={FaMapMarkerAlt} label="Total locations" value={summary.total || pagination.totalRecords || 0} detail={`${summary.setup || 0} in setup`} />
          <StatCard compact icon={FaRocket} label="Live locations" value={summary.live || 0} detail="approved for operations" />
          <StatCard compact icon={FaEye} label="Demo locations" value={summary.demo || 0} detail="sandbox testing access" />
          <StatCard compact icon={FaCreditCard} label="Monthly SaaS" value={money(summary.monthlyRevenue || 0)} detail="base fee + modules" />
          <StatCard compact icon={FaBuilding} label="Organizations" value={summary.organizations || 0} detail="own one or more locations" />
        </section>

        <div className={listingShellClass}>
          <div className="sticky top-0 z-30 grid gap-2 border-b border-(--stroke-soft) bg-(--surface-panel-strong)/95 p-3 backdrop-blur sm:grid-cols-[minmax(180px,320px)_minmax(180px,260px)_1fr_auto] sm:items-center">
            <div className="relative min-w-0">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search locations..." className="input-nexus w-full py-1.5 pl-8 pr-3 text-sm" />
            </div>
            <SearchableSelect
              value={organizationFilter}
              onChange={(value) => {
                setOrganizationFilter(value);
                setPage(1);
              }}
              placeholder="All organizations"
              searchPlaceholder="Search organizations..."
              className="min-w-0"
              options={[
                { value: "", label: "All organizations" },
                ...organizations.map((org) => ({
                  value: String(org.id || org.organizationId),
                  label: org.name,
                })),
              ]}
            />
            <p className="text-right text-sm font-bold text-stone-500 sm:whitespace-nowrap">{pagination.totalRecords || 0} locations</p>
            <div className="inline-flex w-fit justify-self-end rounded-lg border border-stone-200 bg-stone-50 p-1">
              {[
                ["active", "Active"],
                ["archived", "Archived"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-black transition ${
                    statusFilter === value ? "bg-white text-violet-700 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {parks.length ? (
            <div className={listingScrollClass}>
            <table className={listingTableClass("min-w-245")}>
              <thead className={listingHeadClass}>
                <tr>
                  <th className={listingThClass("py-2.5")}>Location</th>
                  <th className={listingThClass("py-2.5")}>Organization</th>
                  <th className={listingThClass("py-2.5")}>Customer</th>
                  <th className={listingThClass("py-2.5")}>Status</th>
                  <th className={listingThClass("py-2.5")}>Base fee</th>
                  <th className={listingThClass("py-2.5")}>Billing</th>
                  <th className={listingThClass("py-2.5")}>Onboarding</th>
                  <th className={listingThClass("py-2.5 text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className={listingBodyClass}>
                {parks.map((park) => {
                  const isArchived = statusFilter === "archived" || Boolean(park.archivedAt) || park.status === "archived";
                  const displayStatus = isArchived ? "archived" : park.status;

                  return (
                    <tr key={park.locationId} className={listingRowClass}>
                      <td className="px-4 py-3">
                        <p className="font-black text-stone-950">{park.name}</p>
                        <p className="text-xs font-semibold text-stone-500">{park.location}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-stone-800">{park.organization?.name || "Unassigned"}</p>
                        {park.ownerUser?.email ? <p className="text-xs font-semibold text-stone-500">{park.ownerUser.email}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-stone-700">{park.owner}</p>
                        <p className="text-xs font-semibold text-stone-500">{park.ownerUser?.name || "Customer not assigned"}</p>
                      </td>
                      <td className="px-4 py-3"><Pill className={statusClass(displayStatus)}>{displayStatus}</Pill></td>
                      <td className="px-4 py-3 font-bold text-stone-700">{money(park.monthlyBaseFee, park.currency)}/mo</td>
                      <td className="px-4 py-3 font-black text-stone-950">{money(park.billing?.monthlyTotal, park.currency)}/mo</td>
                      <td className="px-4 py-3">
                        <div className="w-28"><ProgressBar value={setupProgressForPark(park).score} /></div>
                        <p className="mt-1 text-xs font-bold text-stone-500">{setupProgressForPark(park).score}%</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Link to={`/movira-control/parks/${park.locationId}`} className={iconButtonClass("secondary", "h-8 w-8 rounded-md text-base")} title="Open"><FaEye /></Link>
                          <Link to={`/movira-control/parks/${park.locationId}/edit`} className={iconButtonClass("secondary", "h-8 w-8 rounded-md text-base")} title="Edit"><FaEdit /></Link>
                          {isArchived ? (
                            <>
                              <button onClick={() => openRestoreDialog(park)} className={iconButtonClass("secondary", "h-8 w-8 rounded-md text-base")} title="Restore"><FaTrashRestore /></button>
                              <button onClick={() => openPermanentDeleteDialog(park)} className={iconButtonClass("danger", "h-8 w-8 rounded-md text-base")} title="Permanent delete"><FaTrash /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => onPauseToggle(park)} className={iconButtonClass("secondary", "h-8 w-8 rounded-md text-base")} title={park.status === "paused" ? "Resume" : "Pause"}>
                                {park.status === "paused" ? <FaPlay /> : <FaPause />}
                              </button>
                              <button onClick={() => openArchiveDialog(park)} className={iconButtonClass("danger", "h-8 w-8 rounded-md text-base")} title="Archive location" aria-label={`Archive ${park.name}`}><FaArchive /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title={search ? "No matching locations" : "No locations yet"}
                detail={search ? "Try a different location name, owner, or city." : "Create a location workspace before assigning billing, modules, and go-live controls."}
                action={!search ? <Link to="/movira-control/parks/new" className={buttonClass("primary")}><FaPlus /> New location</Link> : null}
              />
            </div>
          )}
          {pagination.totalPages > 1 ? (
            <div className={listingFooterClass}>
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={buttonClass("secondary", "min-h-10 px-3")}>Prev</button>
              <span className="text-sm font-bold text-stone-500">{page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className={buttonClass("secondary", "min-h-10 px-3")}>Next</button>
            </div>
          ) : null}
        </div>
        <ConfirmDialog
          open={Boolean(confirmDialog)}
          tone={confirmDialog?.tone}
          eyebrow={confirmDialog?.eyebrow}
          title={confirmDialog?.title}
          message={confirmDialog?.message}
          details={confirmDialog?.details}
          confirmLabel={confirmDialog?.confirmLabel}
          confirmText={confirmDialog?.confirmText}
          confirmValue={confirmDialog?.confirmValue}
          requireConfirmTextForPrimary
          loading={confirmDialog?.type === "permanent-preview" || archiveParkState.isLoading}
          confirmDisabled={Boolean(confirmDialog?.blocked)}
          onConfirm={handleConfirmDialog}
          onClose={closeConfirmDialog}
        />
      </div>
    </ControlShell>
  );
}

export function ParkForm() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(locationId);
  const { data, isLoading } = useGetSaasParkByLocationIdQuery(locationId, { skip: !isEdit });
  const { data: listData = {} } = useGetSaasParksQuery({ limit: 1, status: "all", includeArchived: true });
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: usersData = {} } = useGetAllUsersQuery({ search: customerSearch });
  const organizations = listData.catalogs?.organizations || data?.catalogs?.organizations || [];
  const users = useMemo(
    () =>
      Array.isArray(usersData)
        ? usersData
        : Array.isArray(usersData?.data)
        ? usersData.data
        : Array.isArray(usersData?.users)
        ? usersData.users
        : [],
    [usersData]
  );
  const [form, setForm] = useState(defaultForm);
  const [newCustomer, setNewCustomer] = useState(defaultCustomerOwner);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createdParkAccess, setCreatedParkAccess] = useState(null);
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [createPark, createState] = useCreateSaasParkMutation();
  const [createCustomerOwner, createCustomerState] = useCreateSaasCustomerOwnerMutation();
  const [resendOwnerAccess, resendOwnerAccessState] = useResendSaasOwnerAccessMutation();
  const [updatePark, updateState] = useUpdateSaasParkMutation();
  const customerUsers = useMemo(
    () =>
      createdCustomer &&
      !users.some(
        (user) =>
          String(user.user_id || user.userId || user.id) ===
          String(createdCustomer.userId || createdCustomer.id)
      )
        ? [...users, createdCustomer]
        : users,
    [createdCustomer, users]
  );
  const selectedCustomer = customerUsers.find((user) => String(user.user_id || user.userId || user.id) === String(form.ownerUserId));
  const selectedCustomerName = getUserName(selectedCustomer) || form.owner || "No customer selected";
  const selectedCustomerEmail = selectedCustomer?.email || form.ownerEmail || "Select or create an owner account";
  const selectedCustomerPhone = getUserPhone(selectedCustomer) || form.phone || "";
  const customerByEmail = useMemo(() => {
    const email = normalizeEmail(form.ownerEmail);
    if (!email) return null;
    return customerUsers.find((user) => normalizeEmail(user.email) === email) || null;
  }, [customerUsers, form.ownerEmail]);
  const selectedCustomerId = selectedCustomer ? String(selectedCustomer.user_id || selectedCustomer.userId || selectedCustomer.id) : "";
  const emailCustomerId = customerByEmail ? String(customerByEmail.user_id || customerByEmail.userId || customerByEmail.id) : "";
  const ownerEmailError =
    form.ownerEmail && selectedCustomer && normalizeEmail(selectedCustomer.email) !== normalizeEmail(form.ownerEmail)
      ? "Selected customer account and customer email do not match."
      : form.ownerEmail && selectedCustomerId && emailCustomerId && selectedCustomerId !== emailCustomerId
      ? "Selected customer account and customer email do not match."
      : "";
  const selectedCountryProfile = getCountryProfile(form.country);

  useEffect(() => {
    const timer = window.setTimeout(() => setCustomerSearch(customerSearchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [customerSearchInput]);

  useEffect(() => {
    if (data?.park && isEdit) {
      const park = data.park;
      setForm({
        ...defaultForm,
        organizationId: park.organizationId || park.organization?.id || "",
        organizationName: park.organization?.name || park.organizationName || "",
        name: park.name || "",
        slug: park.slug || "",
        owner: park.owner || "",
        ownerUserId: park.ownerUserId || park.ownerUser?.id || park.ownerUser?.userId || park.organization?.ownerUserId || park.organization?.ownerUser?.id || park.organization?.ownerUser?.userId || "",
        ownerEmail: park.ownerEmail || "",
        phone: park.phone || "",
        city: park.city || "",
        state: park.state || "",
        country: park.country || "",
        timezone: park.timezone || "",
        currency: park.currency || "",
        defaultLocale: park.languages?.defaultLocale || "en-CA",
        additionalLocale:
          (park.languages?.allowed || park.languages?.supportedLocales || []).find(
            (code) => code !== (park.languages?.defaultLocale || "en-CA")
          ) || "",
        customerTaxName: park.customerTax?.name || "",
        customerTaxPercent: park.customerTax?.percent ?? "",
        customerTaxCalculation: park.customerTax?.calculation || "add_to_price",
        streetNumberOrBuildingName: park.streetNumberOrBuildingName || "",
        streetName: park.streetName || "",
        postalCode: park.postalCode || "",
        displayAddress: park.displayAddress || "",
        deploymentMode: park.deploymentMode || (park.status === "demo" ? "demo" : "production"),
        demoExpiresAt: dateInputValue(park.demoExpiresAt),
        monthlyBaseFee: park.monthlyBaseFee || 0,
      });
      setCreatedParkAccess({
        locationId: park.locationId || locationId,
        parkName: park.name || "Location",
        ownerEmail: park.ownerEmail || "",
        temporaryPassword: "",
        welcomeEmail: null,
      });
    }
  }, [data, isEdit, locationId]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateDeploymentMode = (value) => {
    setForm((current) => ({
      ...current,
      deploymentMode: value,
      demoExpiresAt: value === "demo" ? current.demoExpiresAt || defaultDemoExpiryValue() : "",
    }));
  };
  const updateNewCustomer = (key, value) => setNewCustomer((current) => ({ ...current, [key]: value }));
  const applyCustomerUser = (user, fallback = {}) => {
    if (!user) return;
    const userId = user.user_id || user.userId || user.id;
    setForm((current) => ({
      ...current,
      ownerUserId: String(userId),
      ownerEmail: user.email || fallback.email || current.ownerEmail,
      owner: getUserName(user) || current.owner,
      phone: getUserPhone(user) || current.phone,
    }));
  };
  const updateCountry = (value) => {
    const profile = getCountryProfile(value);
    setForm((current) => ({
      ...current,
      country: profile.value,
      timezone: profile.timezones.length === 1 ? profile.timezones[0] : "",
      currency: profile.currency,
      customerTaxName: "",
      customerTaxPercent: "",
      phone: normalizePhoneForCountry(current.phone, profile.value),
    }));
  };

  const handleCreateCustomerOwner = async () => {
    if (!newCustomer.firstName.trim() || !newCustomer.email.trim() || !newCustomer.phone.trim()) {
      toast.error("Customer first name, email, and phone are required.");
      return;
    }
    try {
      const response = await createCustomerOwner({
        ...newCustomer,
        phone: normalizePhoneForCountry(newCustomer.phone, form.country),
        locationId: isEdit ? locationId : undefined,
        parkName: form.name,
        organizationName: form.organizationName,
        appBaseUrl: customerAppBaseUrl,
      }).unwrap();
      const user = response?.user || response?.data?.user;
      const password = response?.temporaryPassword || response?.data?.temporaryPassword || "";
      const welcomeEmail = response?.welcomeEmail || response?.data?.welcomeEmail || null;
      if (!user) {
        toast.error("Customer owner was created, but the user data was not returned.");
        return;
      }
      const userId = user.userId || user.user_id || user.id;
      const name = user.name || [newCustomer.firstName, newCustomer.lastName].filter(Boolean).join(" ");
      const phone = normalizePhoneForCountry(user.phone || newCustomer.phone, form.country);
      setCreatedCustomer(user);
      setTemporaryPassword(password);
      setForm((current) => ({
        ...current,
        ownerUserId: String(userId),
        owner: name || current.owner,
        ownerEmail: user.email || newCustomer.email,
        phone: phone || current.phone,
      }));
      setNewCustomer(defaultCustomerOwner);
      setOwnerModalOpen(false);
      if (welcomeEmail?.sent) {
        toast.success("Customer owner created, selected, and welcome email queued.");
      } else if (!isEdit && welcomeEmail?.reason === "missing_location") {
        toast.success("Customer owner created and selected. Welcome email will be sent after the location is created.");
      } else if (password) {
        toast.warning(`Customer owner created and selected, but welcome email was not sent${welcomeEmail?.reason ? `: ${welcomeEmail.reason}` : "."}`);
      } else {
        toast.success("Existing customer owner selected.");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create customer owner.");
    }
  };

  const copyTemporaryPassword = async () => {
    const password = createdParkAccess?.temporaryPassword || temporaryPassword;
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Temporary password copied.");
    } catch {
      toast.error("Could not copy the password. Select and copy it manually.");
    }
  };

  const handleResendOwnerAccess = async () => {
    if (!createdParkAccess?.locationId) return;
    try {
      const response = await resendOwnerAccess({
        locationId: createdParkAccess.locationId,
        appBaseUrl: customerAppBaseUrl,
      }).unwrap();
      const password = response?.temporaryPassword || "";
      const welcomeEmail = response?.welcomeEmail || null;
      setTemporaryPassword(password);
      setCreatedParkAccess((current) => ({
        ...current,
        temporaryPassword: password,
        welcomeEmail,
        ownerEmail: response?.owner?.email || current.ownerEmail,
      }));
      if (welcomeEmail?.sent) {
        toast.success("New temporary password generated and welcome email queued.");
      } else {
        toast.warning(
          `New temporary password generated, but email was not sent${
            welcomeEmail?.reason ? `: ${welcomeEmail.reason}` : "."
          }`
        );
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to regenerate and resend owner access.");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const emailOwner = customerByEmail;
    const ownerUserId = form.ownerUserId || (emailOwner ? String(emailOwner.user_id || emailOwner.userId || emailOwner.id) : "");
    const missingMessage = requiredParkProfileFields.find(([key]) => !String(form[key] || "").trim())?.[1];
    if (missingMessage) {
      toast.error(missingMessage);
      return;
    }
    if (!form.customerTaxName.trim() || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(String(form.customerTaxPercent).trim()) || !Number.isFinite(Number(form.customerTaxPercent)) || Number(form.customerTaxPercent) < 0 || Number(form.customerTaxPercent) > 100) {
      toast.error("Set an explicit customer sales tax name and rate for this location (0% if exempt).");
      return;
    }
    if (form.customerTaxName.trim().toLowerCase() === "no tax" && Number(form.customerTaxPercent) !== 0) {
      toast.error("'No tax' must have a 0% rate.");
      return;
    }
    if (form.ownerEmail && !isValidEmail(form.ownerEmail)) {
      toast.error("Enter a valid customer email.");
      return;
    }
    if (ownerEmailError) {
      toast.error(ownerEmailError);
      return;
    }
    try {
      const payload = {
        ...form,
        ownerUserId,
        customerUserId: ownerUserId,
        phone: normalizePhoneForCountry(form.phone, form.country),
        requireCustomerAssignment: true,
        autoCreateCustomerOwner: !ownerUserId,
        appBaseUrl: customerAppBaseUrl,
        temporaryPassword: !isEdit ? temporaryPassword : undefined,
      };
      delete payload.monthlyBaseFee;
      const response = isEdit
        ? await updatePark({ locationId, ...payload }).unwrap()
        : await createPark(payload).unwrap();
      const savedLocationId = response?.data?.locationId || response?.locationId || locationId;
      const welcomeEmail = response?.welcomeEmail || response?.data?.welcomeEmail || null;
      const customerOwner = response?.customerOwner || response?.data?.customerOwner || null;
      const returnedPassword =
        customerOwner?.temporaryPassword || temporaryPassword || "";
      if (!isEdit && welcomeEmail && !welcomeEmail.sent) {
        toast.warning(`Location created, but welcome email was not sent${welcomeEmail.reason ? `: ${welcomeEmail.reason}` : "."}`);
      } else if (!isEdit && customerOwner?.created) {
        toast.success("Location and owner account created. Welcome email queued.");
      } else {
        toast.success(isEdit ? "Location updated." : "Location created and welcome email queued.");
      }
      if (!isEdit) {
        setTemporaryPassword(returnedPassword);
        setCreatedParkAccess({
          locationId: savedLocationId,
          parkName: response?.data?.name || form.name,
          ownerEmail: customerOwner?.user?.email || form.ownerEmail,
          temporaryPassword: returnedPassword,
          welcomeEmail,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      navigate(`/movira-control/parks/${savedLocationId}`);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save location.");
    }
  };

  if (isLoading) return <Loader />;

  return (
    <ControlShell
      title={isEdit ? "Edit location" : "New location"}
      actions={<Link to="/movira-control/parks" className={buttonClass("secondary", "w-full sm:w-auto")}><FaArrowLeft /> Locations</Link>}
    >
      <form onSubmit={submit} className="grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        {createdParkAccess ? (
          <section className="xl:col-span-2 overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 bg-emerald-50/80 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  {isEdit ? "Owner access" : "Location created"}
                </p>
                <h2 className="mt-1 text-xl font-black text-stone-950">
                  {createdParkAccess.parkName} owner access
                </h2>
                <p className="mt-1 wrap-break-word text-sm font-semibold text-stone-600">
                  Welcome email:{" "}
                  <span className={createdParkAccess.welcomeEmail?.sent ? "text-emerald-700" : "text-amber-700"}>
                    {createdParkAccess.welcomeEmail?.sent
                      ? `queued for ${createdParkAccess.ownerEmail}`
                      : !createdParkAccess.welcomeEmail
                      ? "Generate a fresh temporary password and resend the welcome email when needed."
                      : `not sent${createdParkAccess.welcomeEmail?.reason ? ` · ${createdParkAccess.welcomeEmail.reason}` : ""}`}
                  </span>
                </p>
              </div>
              <Link
                to={`/movira-control/parks/${createdParkAccess.locationId}`}
                className={buttonClass("secondary", "w-full sm:w-auto")}
              >
                Open location <FaArrowLeft className="rotate-180" />
              </Link>
            </div>
            <div className="grid gap-4 border-t border-emerald-100 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-stone-500">Temporary password · shown only on this screen</p>
                {createdParkAccess.temporaryPassword ? (
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-black text-amber-950">
                      {createdParkAccess.temporaryPassword}
                    </code>
                    <button
                      type="button"
                      onClick={copyTemporaryPassword}
                      className={buttonClass("secondary", "shrink-0")}
                      aria-label="Copy temporary password"
                    >
                      <FaCopy /> Copy
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-stone-600">
                    No temporary password is currently displayed. Generate a new one only when the owner needs access resent.
                  </p>
                )}
                <p className="mt-2 text-xs font-semibold text-stone-500">
                  Resending generates a new password, invalidates the previous one, and requires the owner to change it after login.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResendOwnerAccess}
                disabled={resendOwnerAccessState.isLoading}
                className={buttonClass("primary", "w-full lg:w-auto")}
              >
                <FaEnvelope />
                {resendOwnerAccessState.isLoading ? "Generating & sending..." : "Generate new password & resend"}
              </button>
            </div>
          </section>
        ) : null}
        <div className="min-w-0 space-y-4">
          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="control-form-section-header border-b border-stone-200 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Workspace purpose</p>
              <h2 className="mt-1 text-lg font-black text-stone-950">Choose demo or production onboarding</h2>
              <p className="mt-1 text-sm font-semibold text-stone-600">This choice controls access, payments, expiry, and the go-live path.</p>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {[
                {
                  value: "demo",
                  title: "Demo / testing",
                  description: "Owner can log in and test assigned modules. Sandbox payments only; real charges are blocked.",
                },
                {
                  value: "production",
                  title: "Production onboarding",
                  description: "Billing, live payment credentials, readiness checks, and separate go-live approval are required.",
                },
              ].map((option) => {
                const selected = form.deploymentMode === option.value;
                const disabled = isEdit && data?.park?.status === "live" && option.value === "demo";
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => updateDeploymentMode(option.value)}
                    className={`rounded-xl border-2 p-4 text-left transition ${
                      selected
                        ? option.value === "demo"
                          ? "border-violet-400 bg-violet-50 ring-4 ring-violet-100"
                          : "border-violet-400 bg-violet-50 ring-4 ring-violet-100"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-black text-stone-950">{option.title}</span>
                      <span className={`h-4 w-4 rounded-full border-4 ${selected ? "border-violet-600 bg-white" : "border-stone-300 bg-white"}`} />
                    </span>
                    <span className="mt-2 block text-sm font-semibold leading-5 text-stone-600">{option.description}</span>
                    {disabled ? <span className="mt-2 block text-xs font-black text-red-700">A live location cannot be moved back to demo.</span> : null}
                  </button>
                );
              })}
              {form.deploymentMode === "demo" ? (
                <label className="block rounded-xl border border-violet-200 bg-violet-50/60 p-4 md:col-span-2">
                  <span className="text-xs font-black uppercase text-violet-700">Demo access expires *</span>
                  <input
                    type="date"
                    min={todayDateInputValue()}
                    value={form.demoExpiresAt}
                    onChange={(event) => update("demoExpiresAt", event.target.value)}
                    required
                    className="input-nexus mt-2 w-full max-w-sm px-3 py-2.5 text-sm"
                  />
                  <span className="mt-2 block text-xs font-semibold text-stone-600">Expiry is configurable. After this date, owner and staff access is blocked until extended or converted to production onboarding.</span>
                </label>
              ) : null}
              {isEdit && data?.park?.deploymentMode === "demo" && form.deploymentMode === "production" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 md:col-span-2">
                  Saving will end demo mode and move this park to production onboarding. Live access still requires billing, live gateway setup, readiness checks, and explicit go-live approval.
                </div>
              ) : null}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="control-form-section-header flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Location profile</p>
                <h2 className="mt-1 wrap-break-word text-lg font-black text-stone-950">Workspace identity</h2>
              </div>
              <Pill className="border-violet-200 bg-white text-violet-700">{isEdit ? "Editing" : "New setup"}</Pill>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-xs font-black uppercase text-stone-500">Organization *</span>
                <div className="mt-1 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <SearchableSelect
                    value={form.organizationId}
                    onChange={(value) => {
                      const selected = organizations.find((org) => String(org.id || org.organizationId) === String(value));
                      setForm((current) => ({
                        ...current,
                        organizationId: value,
                        organizationName: selected?.name || current.organizationName,
                      }));
                    }}
                    placeholder="Create or match by organization name"
                    searchPlaceholder="Search organizations..."
                    className="w-full"
                    buttonClassName="min-h-11 py-2.5"
                    options={[
                      { value: "", label: "Create or match by organization name" },
                      ...organizations.map((org) => ({
                        value: String(org.id || org.organizationId),
                        label: org.name,
                      })),
                    ]}
                  />
                  <input
                    value={form.organizationName}
                    onChange={(event) => update("organizationName", event.target.value)}
                    placeholder="e.g. Yogesh Sports Group"
                    required
                    className="input-nexus w-full px-3 py-2.5 text-sm"
                  />
                </div>
              </label>
              {[
                ["name", "Location name", "Movira St. Catharines"],
                ["slug", "Slug", "movira-st-catharines"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="text-xs font-black uppercase text-stone-500">{label}{key === "name" ? " *" : ""}</span>
                  <input value={form[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} required={key === "name"} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
              ))}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="control-form-section-header flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Customer assignment</p>
                <h2 className="mt-1 wrap-break-word text-lg font-black text-stone-950">Assign the account that owns this location</h2>
              </div>
              <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">Auto create on save</Pill>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)]">
              <div className="control-owner-summary rounded-xl border border-violet-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-violet-700 shadow-sm">
                    <FaUserPlus />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-violet-700">Selected owner</p>
                    <p className="mt-1 truncate text-base font-black text-stone-950">{selectedCustomerName}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-stone-600">{selectedCustomerEmail}</p>
                    {selectedCustomerPhone ? (
                      <p className="mt-1 truncate text-sm font-semibold text-stone-500">{selectedCustomerPhone}</p>
                    ) : null}
                  </div>
                </div>
                {temporaryPassword ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                    Temporary login password: <span className="font-black">{temporaryPassword}</span>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase text-stone-500">Customer account *</span>
                  <SearchableSelect
                    value={form.ownerUserId}
                    onChange={(value) => {
                      const selected = customerUsers.find((user) => String(user.user_id || user.userId || user.id) === String(value));
                      if (selected) {
                        applyCustomerUser(selected);
                        return;
                      }
                      setForm((current) => ({ ...current, ownerUserId: value }));
                    }}
                    placeholder="Select customer account"
                    searchPlaceholder="Search customer account..."
                    emptyText={customerSearch ? "No customer matched. Fill the details below and save to create one." : "No customer owners found. Fill the details below and save to create one."}
                    onSearchChange={setCustomerSearchInput}
                    className="mt-1"
                    buttonClassName="min-h-11 py-2.5"
                    options={[
                      { value: "", label: "Select customer account" },
                      ...customerUsers.map((user) => {
                        const id = user.user_id || user.userId || user.id;
                        const name = getUserName(user);
                        const phone = getUserPhone(user);
                        const phoneDigits = String(phone || "").replace(/\D/g, "");
                        return {
                          value: String(id),
                          label: name || "Unnamed customer",
                          description: [user.email, phone].filter(Boolean).join(" | "),
                          searchText: [name, user.email, phone, phoneDigits].filter(Boolean).join(" "),
                        };
                      }),
                    ]}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Customer name *</span>
                  <input value={form.owner} onChange={(event) => update("owner", event.target.value)} placeholder="Yogesh Niranjan" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Phone *</span>
                  <div className="mt-1 flex min-h-11 overflow-hidden rounded-lg border-2 border-(--input-border) bg-(--input-bg) shadow-[0_2px_0_rgba(23,21,18,0.08)] transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15">
                    <span className="grid min-w-14 place-items-center border-r border-stone-200 bg-stone-50 px-3 text-sm font-black text-stone-600">
                      {selectedCountryProfile.dialCode}
                    </span>
                    <input
                      value={phoneLocalValue(form.phone, form.country)}
                      onChange={(event) => update("phone", phoneLocalValue(event.target.value, form.country))}
                      onBlur={(event) => update("phone", phoneLocalValue(event.target.value, form.country))}
                      placeholder="9055550101"
                      required
                      className="unstyled-input min-h-11 w-full rounded-none border-0 bg-transparent px-3 py-2.5 text-sm font-bold text-stone-950 outline-none placeholder:text-stone-400 focus:border-0 focus:outline-none focus:ring-0"
                      style={{ border: 0, boxShadow: "none", outline: "none", WebkitAppearance: "none" }}
                    />
                  </div>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase text-stone-500">Customer email *</span>
                  <input
                    value={form.ownerEmail}
                    onChange={(event) => update("ownerEmail", event.target.value)}
                    onBlur={(event) => {
                      const matched = customerUsers.find((user) => normalizeEmail(user.email) === normalizeEmail(event.target.value));
                      applyCustomerUser(matched, { email: event.target.value });
                    }}
                    placeholder="owner@example.com"
                    required
                    className={`input-nexus mt-1 w-full px-3 py-2.5 text-sm ${ownerEmailError ? "border-red-300 bg-red-50/40" : ""}`}
                  />
                  {ownerEmailError ? (
                    <p className="mt-1 text-xs font-bold text-red-700">{ownerEmailError}</p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      Search existing owner by name, phone, or email. If no match exists, this owner is created when the park is saved.
                    </p>
                  )}
                </label>
              </div>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="control-form-section-header border-b border-stone-200 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Location</p>
              <h2 className="mt-1 text-lg font-black text-stone-950">Operating region</h2>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-3">
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Country *</span>
                <SearchableSelect
                  value={form.country}
                  onChange={updateCountry}
                  placeholder="Select country"
                  searchPlaceholder="Search countries..."
                  className="mt-1"
                  buttonClassName="min-h-11 py-2.5"
                  options={countryOptions}
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Timezone *</span>
                <SearchableSelect
                  value={form.timezone}
                  onChange={(value) => update("timezone", value)}
                  placeholder="Select location timezone"
                  searchPlaceholder="Search timezone..."
                  className="mt-1"
                  buttonClassName="min-h-11 py-2.5"
                  options={[...new Set([...selectedCountryProfile.timezones, ...(form.timezone ? [form.timezone] : [])])].map((zone) => ({ value: zone, label: zone.replaceAll("_", " ") }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Currency *</span>
                <input value={form.currency} readOnly required className="input-nexus mt-1 w-full bg-stone-50 px-3 py-2.5 text-sm text-stone-600" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Default language *</span>
                <select
                  value={form.defaultLocale}
                  onChange={(event) => {
                    const next = event.target.value;
                    update("defaultLocale", next);
                    if (form.additionalLocale === next) update("additionalLocale", "");
                  }}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                >
                  {PARK_LANGUAGE_CODES.map((code) => (
                    <option key={code} value={code}>{languageName(code)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Additional language</span>
                <select
                  value={form.additionalLocale}
                  onChange={(event) => update("additionalLocale", event.target.value)}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                >
                  <option value="">None</option>
                  {PARK_LANGUAGE_CODES.filter((code) => code !== form.defaultLocale).map((code) => (
                    <option key={code} value={code}>{languageName(code)}</option>
                  ))}
                </select>
              </label>
              <p className="md:col-span-3 text-xs font-semibold text-stone-600">The park can use only these languages. Staff screens and tills use the default; guests can choose the additional language for booking pages, waivers, emails and offers.</p>
              <p className="md:col-span-3 text-xs font-semibold text-stone-600">All session dates, booking windows and staff-facing times use this location timezone—not the customer's or server's clock.</p>
              <div className="md:col-span-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-violet-700">Customer sales tax *</p>
                <p className="mt-1 text-xs font-semibold text-stone-600">Used by bookings, online checkout and POS. This is separate from Movira's monthly SaaS invoice tax. Select the rate for this location's jurisdiction and what it sells; 0% must be chosen explicitly when applicable.</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-stone-500">Tax name *</span>
                    <input list="park-customer-tax-names" value={form.customerTaxName} onChange={(event) => update("customerTaxName", event.target.value)} placeholder="e.g. GST, HST or VAT" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                    <datalist id="park-customer-tax-names">{selectedCountryProfile.taxNames.map((name) => <option key={name} value={name} />)}</datalist>
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase text-stone-500">Rate % *</span>
                    <input type="number" min="0" max="100" step="0.01" value={form.customerTaxPercent} onChange={(event) => update("customerTaxPercent", event.target.value)} placeholder="Enter verified rate" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase text-stone-500">Price display *</span>
                    <SearchableSelect value={form.customerTaxCalculation} onChange={(value) => update("customerTaxCalculation", value)} className="mt-1" buttonClassName="min-h-11 py-2.5" options={[{ value: "add_to_price", label: "Tax added at checkout" }, { value: "include_in_price", label: "Tax included in prices" }]} />
                  </label>
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">City *</span>
                <input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder={selectedCountryProfile.cityPlaceholder} required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">State / province *</span>
                <input value={form.state} onChange={(event) => update("state", event.target.value)} placeholder={selectedCountryProfile.statePlaceholder} required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Postal / ZIP code *</span>
                <input value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} placeholder={selectedCountryProfile.postalPlaceholder} required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Building / street no. *</span>
                <input value={form.streetNumberOrBuildingName} onChange={(event) => update("streetNumberOrBuildingName", event.target.value)} placeholder="123" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-black uppercase text-stone-500">Street / address line *</span>
                <input value={form.streetName} onChange={(event) => update("streetName", event.target.value)} placeholder="Sports Avenue" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
            </div>
          </section>
        </div>

        <aside className="h-fit min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
          <p className="text-xs font-black uppercase text-stone-500">Setup starts here</p>
          <h3 className="mt-1 text-xl font-black text-stone-950">{isEdit ? "Save profile changes" : "Create workspace"}</h3>
          <div className={`mt-3 rounded-lg border px-3 py-2 text-sm font-black ${form.deploymentMode === "demo" ? "border-violet-200 bg-violet-50 text-violet-800" : "border-violet-200 bg-violet-50 text-violet-800"}`}>
            {form.deploymentMode === "demo" ? `Demo mode · expires ${dateOnly(form.demoExpiresAt)}` : "Production onboarding"}
          </div>
          <div className="mt-4 space-y-3 text-sm font-bold text-stone-600">
            <div className="flex items-center gap-2"><FaCheckCircle className="text-emerald-600" /> Location workspace</div>
            <div className="flex items-center gap-2"><FaLayerGroup className="text-violet-600" /> Module access</div>
            <div className="flex items-center gap-2"><FaFileInvoiceDollar className="text-violet-600" /> Billing preview</div>
            <div className="flex items-center gap-2"><FaCreditCard className="text-violet-600" /> Payment setup</div>
          </div>
          <div className="mt-6 space-y-2">
            <button disabled={(!isEdit && Boolean(createdParkAccess)) || createState.isLoading || updateState.isLoading} className={buttonClass("primary", "w-full")}>
              {isEdit ? "Update location" : createdParkAccess ? "Location created" : "Create location"}
            </button>
            <Link to="/movira-control/parks" className={buttonClass("secondary", "w-full")}>Cancel</Link>
          </div>
        </aside>
        {ownerModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/35 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-owner-title"
              className="w-full max-w-3xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl"
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || createCustomerState.isLoading) return;
                event.preventDefault();
                handleCreateCustomerOwner();
              }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-stone-200 bg-violet-50/70 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">New paying customer</p>
                  <h3 id="create-owner-title" className="mt-1 text-xl font-black text-stone-950">Create a login owner account</h3>
                  <p className="mt-1 text-sm font-semibold text-stone-600">Use this when the customer does not already exist in Movira.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOwnerModalOpen(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-50"
                  aria-label="Close create owner"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">First name *</span>
                  <input value={newCustomer.firstName} onChange={(event) => updateNewCustomer("firstName", event.target.value)} placeholder="Yogesh" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Last name</span>
                  <input value={newCustomer.lastName} onChange={(event) => updateNewCustomer("lastName", event.target.value)} placeholder="Niranjan" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Email *</span>
                  <input type="email" value={newCustomer.email} onChange={(event) => updateNewCustomer("email", event.target.value)} placeholder="owner@example.com" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Phone *</span>
                  <div className="mt-1 flex min-h-11 overflow-hidden rounded-lg border-2 border-(--input-border) bg-(--input-bg) shadow-[0_2px_0_rgba(23,21,18,0.08)] transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15">
                    <span className="grid min-w-14 place-items-center border-r border-stone-200 bg-stone-50 px-3 text-sm font-black text-stone-600">
                      {selectedCountryProfile.dialCode}
                    </span>
                    <input
                      value={phoneLocalValue(newCustomer.phone, form.country)}
                      onChange={(event) => updateNewCustomer("phone", phoneLocalValue(event.target.value, form.country))}
                      onBlur={(event) => updateNewCustomer("phone", phoneLocalValue(event.target.value, form.country))}
                      placeholder="9055550101"
                      required
                      className="unstyled-input min-h-11 w-full rounded-none border-0 bg-transparent px-3 py-2.5 text-sm font-bold text-stone-950 outline-none placeholder:text-stone-400 focus:border-0 focus:outline-none focus:ring-0"
                      style={{ border: 0, boxShadow: "none", outline: "none", WebkitAppearance: "none" }}
                    />
                  </div>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase text-stone-500">Temporary password</span>
                  <input
                    value={newCustomer.temporaryPassword}
                    onChange={(event) => updateNewCustomer("temporaryPassword", event.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-4">
                <button type="button" onClick={() => setOwnerModalOpen(false)} className={buttonClass("secondary")}>
                  Cancel
                </button>
                <button type="button" disabled={createCustomerState.isLoading} onClick={handleCreateCustomerOwner} className={buttonClass("primary")}>
                  <FaPlus /> {createCustomerState.isLoading ? "Creating..." : "Create owner"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </ControlShell>
  );
}

export function ParkDetail() {
  const { locationId, section = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useGetSaasParkByLocationIdQuery(locationId);
  const park = data?.park;
  const auditLogs = data?.auditLogs || [];
  const invoices = data?.invoices || [];
  const paymentEvents = data?.paymentEvents || [];
  const catalogModules = data?.catalogs?.modules || [];
  const moduleWorkflows = data?.catalogs?.moduleWorkflows?.length
    ? data.catalogs.moduleWorkflows
    : fallbackModuleWorkflows;

  useEffect(() => {
    if (!park) return;
    const lock = getParkSectionLock(park, section);
    if (!lock) return;
    toast.error(lock.message);
    const currentStage = getCurrentSetupStage(park);
    navigate(parkSectionHref(park.locationId, currentStage.suffix), { replace: true });
  }, [navigate, park, section]);

  if (isLoading) return <Loader />;
  if (isError || !park) return <ErrorMessage message={error?.data?.message || "Location not found"} />;

  return (
    <ControlShell
      title={park.name}
      actions={
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link to="/movira-control/parks" className={buttonClass("secondary", "flex-1 sm:flex-none")}><FaArrowLeft /> Locations</Link>
          <Link
            to={parkSectionHref(park.locationId, "languages")}
            className={buttonClass(section === "languages" ? "primary" : "secondary", "flex-1 sm:flex-none")}
          >
            <FaGlobe /> Languages
          </Link>
          <Link to={`/movira-control/parks/${park.locationId}/edit`} className={buttonClass("primary", "flex-1 sm:flex-none")}><FaEdit /> Edit</Link>
        </div>
      }
    >
      {park.deploymentMode === "demo" || park.status === "demo" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Demo mode</p>
            <p className="mt-1 text-sm font-bold">Owner access is enabled for testing. Only sandbox payments are allowed.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill className="shrink-0 border-violet-300 bg-white text-violet-700">Expires {dateOnly(park.demoExpiresAt)}</Pill>
            <Link
              to={`/movira-control/parks/${park.locationId}/edit`}
              className={buttonClass("secondary", "min-h-9 border-violet-300 bg-white px-3 py-1.5 text-xs text-violet-800")}
            >
              <FaRocket /> Convert to production
            </Link>
          </div>
        </div>
      ) : null}
      <SetupNavigation park={park} section={section} />
      {section === "modules" ? (
        <ModulesPanel
          park={park}
          moduleCatalog={catalogModules}
          workflows={moduleWorkflows}
        />
      ) : null}
      {section === "billing" ? <BillingPanel park={park} plans={data?.catalogs?.plans || []} moduleCatalog={catalogModules} planUsage={data?.planUsage} /> : null}
      {section === "payments" ? <PaymentsPanel park={park} /> : null}
      {section === "payment-history" ? <PaymentHistoryPanel park={park} paymentEvents={paymentEvents} /> : null}
      {section === "billing-history" ? <InvoiceHistoryTable park={park} invoices={invoices} paymentEvents={paymentEvents} /> : null}
      {section === "onboarding" ? <OnboardingPanel park={park} /> : null}
      {section === "audit" ? <AuditPanel park={park} initialLogs={auditLogs} /> : null}
      {section === "languages" ? <LanguagesPanel park={park} /> : null}
      {!section ? <OverviewPanel park={park} /> : null}
    </ControlShell>
  );
}

// ── Languages ────────────────────────────────────────────────────────
// Movira Control decides which languages a park may offer (max 2). The park
// then turns guest languages on or off itself, inside that list, in the
// admin app (Locations → Edit). Control can also set the park's default and
// guest languages here, e.g. during onboarding.

// Languages a park can be given (keep in sync with the backend's PARK_LOCALES).
const PARK_LANGUAGE_CODES = [
  "en-CA", "fr-CA", "es-MX", "pt-BR", "de-DE", "it-IT", "nl-NL", "pl-PL",
  "ru-RU", "tr-TR", "ar-SA", "hi-IN", "zh-CN", "ja-JP", "ko-KR",
];

// Shown by language only (one entry each): "French", not "Canadian French".
function languageName(code) {
  const base = String(code || "").split("-")[0];
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(base);
    return name || code;
  } catch {
    return code;
  }
}

function parkLanguagesSummary(park) {
  const languages = park.languages;
  if (!languages) return "-";
  const offered = (languages.supportedLocales || []).map(languageName).join(" + ");
  return languages.allowed ? offered : `${offered} (any allowed)`;
}

function LanguagesPanel({ park }) {
  const languages = park.languages || {};
  const [updateLanguages, updateState] = useUpdateSaasParkLanguagesMutation();
  const currentDefault = languages.defaultLocale || "en-CA";
  const currentAdditional =
    (languages.allowed || languages.supportedLocales || []).find((code) => code !== currentDefault) || "";
  const [defaultLocale, setDefaultLocale] = useState(currentDefault);
  const [additionalLocale, setAdditionalLocale] = useState(currentAdditional);
  useEffect(() => {
    setDefaultLocale(currentDefault);
    setAdditionalLocale(currentAdditional);
  }, [park.locationId, currentDefault, currentAdditional]);
  const dirty = defaultLocale !== currentDefault || additionalLocale !== currentAdditional;

  const save = async () => {
    try {
      await updateLanguages({ locationId: park.locationId, defaultLocale, additionalLocale: additionalLocale || null }).unwrap();
      toast.success("Languages saved.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save languages.");
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase text-violet-700">Languages</p>
        <h2 className="mt-1 text-xl font-black text-stone-950">Languages for {park.name}</h2>
        <p className="mt-1 text-sm font-semibold text-stone-600">
          One default language and, if needed, one additional language. The park can use only these.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase text-stone-500">Default language *</span>
            <select
              value={defaultLocale}
              onChange={(event) => {
                const next = event.target.value;
                setDefaultLocale(next);
                if (additionalLocale === next) setAdditionalLocale("");
              }}
              className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
            >
              {PARK_LANGUAGE_CODES.map((code) => (
                <option key={code} value={code}>{languageName(code)}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-semibold text-stone-500">Tills, staff screens and park-wide emails.</span>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-stone-500">Additional language</span>
            <select
              value={additionalLocale}
              onChange={(event) => setAdditionalLocale(event.target.value)}
              className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
            >
              <option value="">None</option>
              {PARK_LANGUAGE_CODES.filter((code) => code !== defaultLocale).map((code) => (
                <option key={code} value={code}>{languageName(code)}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-semibold text-stone-500">Guests can choose it for booking pages, waivers, emails and offers.</span>
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={!dirty || updateState.isLoading} className={buttonClass("primary", "disabled:opacity-50")}>
            {updateState.isLoading ? "Saving…" : "Save languages"}
          </button>
          {!languages.allowed ? (
            <span className="text-xs font-bold text-amber-700">Not set yet. Save to fix this park's languages.</span>
          ) : null}
        </div>
      </section>
      <aside className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase text-violet-700">How it works</p>
        <ul className="mt-3 space-y-2 text-sm font-semibold text-stone-700">
          <li>Movira sets the park's languages here (also on the park's Edit page).</li>
          <li>The park translates its products, waivers and emails in the admin app.</li>
          <li>Removing the additional language turns it off for guests.</li>
        </ul>
      </aside>
    </div>
  );
}

function OverviewPanel({ park }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <StatCard icon={FaMapMarkerAlt} label="Status" value={park.status} detail={park.phase} />
          <StatCard icon={FaCreditCard} label="Billing" value={`${money(park.billing?.monthlyTotal, park.currency)}/mo`} detail="base fee + modules" />
          <StatCard icon={FaLayerGroup} label="Modules" value={park.modules?.length || 0} detail="enabled modules" />
          <StatCard
            icon={FaCheckCircle}
            label={isDemoPark(park) ? "Testing" : "Onboarding"}
            value={`${setupProgressForPark(park).score}%`}
            detail={isDemoPark(park) ? "sandbox readiness" : "launch readiness"}
          />
        </div>
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-violet-700">Location summary</p>
              <h2 className="mt-1 text-xl font-black text-stone-950">{park.name}</h2>
            </div>
            <Pill className={statusClass(park.status)}>{park.status}</Pill>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["Organization", park.organization?.name || "Unassigned"],
              ["Customer", park.ownerUser?.name || park.owner || "Customer not assigned"],
              ["Customer email", park.ownerUser?.email || park.ownerEmail || "-"],
              ["Region", park.location || "-"],
              ["Currency", park.currency || "-"],
              ["Languages", parkLanguagesSummary(park)],
              ["Payment", park.paymentStatus || "not_configured"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-black uppercase text-stone-500">{label}</p>
                <p className="mt-1 font-black text-stone-950">{value}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-violet-700">Entitlement contract</p>
              <h2 className="mt-1 text-lg font-black text-stone-950">Main app module access</h2>
            </div>
            <Pill className={park.entitlements?.blocked ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
              {park.entitlements?.blocked ? park.entitlements.blockedReason : "active"}
            </Pill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(park.entitlements?.modules || []).map((module) => (
              <span
                key={module.key}
                className={`rounded-lg border px-3 py-2 text-xs font-black uppercase ${
                  module.enabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : module.configured
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-stone-200 bg-stone-50 text-stone-400"
                }`}
              >
                {module.label}
              </span>
            ))}
          </div>
          {park.entitlements?.billingRisk ? (
            <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              Billing risk is active. Module access still works, but collection policy may place this park on hold.
            </p>
          ) : null}
        </section>
      </div>
      <NextActionCard park={park} />
    </div>
  );
}

function ModulesPanel({
  park,
  moduleCatalog = [],
  workflows = fallbackModuleWorkflows,
}) {
  const [updateModules, { isLoading: isUpdating }] = useUpdateSaasParkModulesMutation();
  const [pendingWorkflow, setPendingWorkflow] = useState(null);
  const normalizedModules = useMemo(
    () => normalizeModuleCatalog(moduleCatalog),
    [moduleCatalog]
  );
  const moduleMap = useMemo(
    () => new Map(normalizedModules.map((module) => [module.key, module])),
    [normalizedModules]
  );
  const selected = new Set(expandModuleSelection(park.modules || [], normalizedModules));
  const moduleLabel = (key) => moduleMap.get(key)?.label || key;
  const workflowStates = workflows.map((workflow) => ({
    workflow,
    state: getWorkflowState(workflow, [...selected], normalizedModules),
  }));
  const completeWorkflows = workflowStates.filter(({ state }) => state.complete).length;

  const persistModules = async (nextKeys, successMessage = "Modules updated.") => {
    const nextModules = expandModuleSelection(nextKeys, normalizedModules);
    try {
      const result = await updateModules({ locationId: park.locationId, modules: nextModules }).unwrap();
      const activationInvoice =
        result?.data?.activationInvoice || result?.activationInvoice || null;
      if (activationInvoice?.status === "open") {
        toast.success(
          `${successMessage} Pay ${activationInvoice.invoiceNumber} to activate the added access.`
        );
      } else {
        toast.success(successMessage);
      }
      return true;
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update modules.");
      return false;
    }
  };

  const toggle = async (key) => {
    if (isUpdating) return;
    if (selected.has(key)) {
      const blockers = getRemovalBlockers(key, [...selected], normalizedModules);
      if (blockers.length) {
        toast.error(
          `${moduleLabel(key)} is required by ${blockers.map(moduleLabel).join(", ")}. Disable those modules first.`
        );
        return;
      }
      const next = [...selected].filter((moduleKey) => moduleKey !== key);
      await persistModules(next, `${moduleLabel(key)} disabled.`);
      return;
    }

    const next = expandModuleSelection([...selected, key], normalizedModules);
    const autoAdded = next.filter(
      (moduleKey) => !selected.has(moduleKey) && moduleKey !== key
    );
    const detail = autoAdded.length
      ? ` Required access added: ${autoAdded.map(moduleLabel).join(", ")}.`
      : "";
    await persistModules(next, `${moduleLabel(key)} enabled.${detail}`);
  };

  const enableWorkflow = async () => {
    const workflow = pendingWorkflow;
    if (!workflow) return;
    if (isUpdating) return;
    const workflowModules = modulesForCompleteWorkflow(workflow, normalizedModules);
    const next = [...new Set([...selected, ...workflowModules])];
    const saved = await persistModules(next, `${workflow.label} is now a complete process.`);
    if (saved) setPendingWorkflow(null);
  };

  const pendingWorkflowModules = pendingWorkflow
    ? modulesForCompleteWorkflow(pendingWorkflow, normalizedModules)
    : [];
  const pendingAddedModules = pendingWorkflowModules.filter((key) => !selected.has(key));
  const pendingAddedMonthly = pendingAddedModules.reduce(
    (sum, key) => sum + Number(moduleMap.get(key)?.monthly || 0),
    0
  );

  const enabledTotal = normalizedModules
    .filter((module) => selected.has(module.key))
    .reduce((sum, module) => sum + Number(module.monthly || 0), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-violet-700">Module access</p>
            <h2 className="mt-1 text-xl font-black text-stone-950">Access and complete process map</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-stone-500">
              Required modules are enabled automatically. Recommended modules complete the end-to-end customer or operating flow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-stone-50 px-4 py-3 text-right">
              <p className="text-xs font-black uppercase text-stone-500">Complete flows</p>
              <p className="text-xl font-black text-stone-950">{completeWorkflows}/{workflows.length}</p>
            </div>
            <div className="rounded-xl bg-stone-50 px-4 py-3 text-right">
              <p className="text-xs font-black uppercase text-stone-500">Module total</p>
              <p className="text-xl font-black text-stone-950">{money(enabledTotal, park.currency)}/mo</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-violet-700">Process bundles</p>
            <h3 className="mt-1 text-lg font-black text-stone-950">Choose the outcome you want to run</h3>
          </div>
          <p className="text-xs font-bold text-stone-500">Required = minimum working flow · Recommended = complete experience</p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {workflowStates.map(({ workflow, state }) => (
            <article
              key={workflow.key}
              className={`rounded-xl border p-4 ${
                state.complete
                  ? "border-emerald-200 bg-emerald-50"
                  : state.ready
                    ? "border-amber-200 bg-amber-50"
                    : "border-stone-200 bg-stone-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-black text-stone-950">{workflow.label}</h4>
                    <Pill
                      className={
                        state.complete
                          ? "border-emerald-200 bg-white text-emerald-700"
                          : state.ready
                            ? "border-amber-200 bg-white text-amber-700"
                            : "border-stone-200 bg-white text-stone-600"
                      }
                    >
                      {state.complete ? "Complete" : state.ready ? "Working · add recommended" : `${state.missingRequired.length} required missing`}
                    </Pill>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-stone-600">{workflow.description}</p>
                </div>
                {!state.complete ? (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => setPendingWorkflow(workflow)}
                    className={buttonClass("primary")}
                  >
                    <FaCheckCircle /> Enable full process
                  </button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-stone-500">Required access</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {state.requiredModules.map((key) => (
                      <span key={key} className={`rounded-md border px-2 py-1 text-xs font-bold ${selected.has(key) ? "border-emerald-200 bg-white text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                        {selected.has(key) ? "✓ " : ""}{moduleLabel(key)}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-stone-500">Recommended</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {state.recommendedModules.map((key) => (
                      <span key={key} className={`rounded-md border px-2 py-1 text-xs font-bold ${selected.has(key) ? "border-emerald-200 bg-white text-emerald-700" : "border-stone-200 bg-white text-stone-500"}`}>
                        {selected.has(key) ? "✓ " : ""}{moduleLabel(key)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div>
        <div className="mb-3">
          <p className="text-xs font-black uppercase text-violet-700">Individual access</p>
          <h3 className="mt-1 text-lg font-black text-stone-950">What each module unlocks</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {normalizedModules.map((module) => {
          const enabled = selected.has(module.key);
          const requiredLabels = (module.requires || []).map(moduleLabel);
          const relatedLabels = (module.recommendedWith || []).map(moduleLabel);
          const requiredBy = getRemovalBlockers(module.key, [...selected], normalizedModules).map(moduleLabel);
          return (
          <article key={module.key} className={`rounded-xl border p-4 text-left shadow-sm transition ${enabled ? "border-violet-300 bg-violet-50" : "border-stone-200 bg-white"}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-stone-950">{module.label}</h3>
              <Pill className={enabled ? "border-violet-200 bg-white text-violet-700" : "border-stone-200 text-stone-500"}>{enabled ? "Enabled" : "Off"}</Pill>
            </div>
            <p className="mt-2 text-sm font-semibold text-stone-500">{module.description}</p>
            <div className="mt-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-stone-500">Gives access to</p>
              <ul className="mt-1 space-y-1 text-xs font-bold text-stone-700">
                {(module.capabilities || []).map((capability) => (
                  <li key={capability} className="flex gap-1.5"><span className="text-emerald-600">✓</span>{capability}</li>
                ))}
              </ul>
            </div>
            {requiredLabels.length ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-800">
                <FaLock className="mr-1 inline" /> Requires: {requiredLabels.join(", ")}
              </p>
            ) : null}
            {relatedLabels.length ? (
              <p className="mt-2 text-xs font-bold text-stone-500">Works best with: {relatedLabels.join(", ")}</p>
            ) : null}
            {enabled && requiredBy.length ? (
              <p className="mt-2 text-xs font-bold text-violet-700">Currently required by: {requiredBy.join(", ")}</p>
            ) : null}
            <p className="mt-3 text-sm font-black text-stone-950">{money(module.monthly, park.currency)}/month</p>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => toggle(module.key)}
              className={`mt-3 w-full ${buttonClass(enabled ? "secondary" : "primary")}`}
            >
              {enabled ? (requiredBy.length ? <><FaLock /> Required</> : "Disable") : <><FaPlus /> Enable</>}
            </button>
          </article>
          );
        })}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingWorkflow)}
        tone="info"
        eyebrow="Complete process"
        title={`Enable ${pendingWorkflow?.label || "this process"}?`}
        message="Required and recommended modules will be enabled together. If the location already has a paid invoice, newly added access may create an activation invoice."
        details={[
          `Required: ${(pendingWorkflow?.requiredModules || []).map(moduleLabel).join(", ") || "None"}`,
          `Recommended: ${(pendingWorkflow?.recommendedModules || []).map(moduleLabel).join(", ") || "None"}`,
          `New access: ${pendingAddedModules.map(moduleLabel).join(", ") || "No additional modules"}`,
          `Added module price: ${money(pendingAddedMonthly, park.currency)}/month`,
        ]}
        confirmLabel="Enable full process"
        loading={isUpdating}
        confirmDisabled={!pendingAddedModules.length}
        onClose={() => setPendingWorkflow(null)}
        onConfirm={({ type }) => {
          if (type === "confirm") enableWorkflow();
        }}
      />
    </div>
  );
}

function BillingPanel({ park, plans = [], moduleCatalog = [], planUsage = null }) {
  const availablePlans = plans;
  const currentPlan = availablePlans.find((plan) => plan.key === (park.planKey || "starter")) || availablePlans[0];
  const [form, setForm] = useState({
    planKey: park.planKey || currentPlan?.key || "starter",
    monthlyBaseFee: park.monthlyBaseFee || currentPlan?.monthlyBaseFee || 0,
    billingCycle: park.billingCycle || "monthly",
    billingStartDate: dateInputValue(park.billingStartDate) || todayDateInputValue(),
    promoAmount: park.promoAmount || 0,
    taxLabel: park.taxLabel || "Tax",
    taxRatePercent: park.taxRatePercent || 0,
    taxRegistrationNumber: park.taxRegistrationNumber || "",
  });
  const [updateBilling, { isLoading: isSavingBilling }] = useUpdateSaasParkBillingMutation();
  const selectedPlan = availablePlans.find((plan) => plan.key === form.planKey) || currentPlan;
  const planOptions = availablePlans.map((plan) => ({
    value: plan.key,
    label: `${plan.label} - ${money(plan.monthlyBaseFee, park.currency)}/mo`,
    description: plan.maxParks === null ? "Unlimited locations" : `${plan.maxParks} location${plan.maxParks === 1 ? "" : "s"} included`,
  }));
  const selectPlan = (planKey) => {
    const plan = availablePlans.find((item) => item.key === planKey) || selectedPlan;
    if (!plan) return;
    setForm((current) => ({
      ...current,
      planKey: plan.key,
      monthlyBaseFee: plan.monthlyBaseFee,
    }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!selectedPlan) {
      toast.error("No active billing plan is configured. Create a plan before saving billing.");
      return;
    }
    try {
      await updateBilling({ locationId: park.locationId, ...form }).unwrap();
      toast.success("Billing updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update billing.");
    }
  };
  const selectedModules = moduleCatalog.filter((module) => (park.modules || []).includes(module.key));
  const baseAmount = Number(form.monthlyBaseFee ?? selectedPlan?.monthlyBaseFee ?? park.billing?.base ?? park.monthlyBaseFee ?? 0);
  const moduleTotal = selectedModules.reduce((sum, module) => sum + Number(module.monthly || 0), 0);
  const promo = Number(form.promoAmount ?? park.billing?.promo ?? park.promoAmount ?? 0);
  const taxRatePercent = Math.max(0, Math.min(100, Number(form.taxRatePercent || 0)));
  const subtotal = Math.max(0, baseAmount + moduleTotal - promo);
  const taxAmount = Number(((subtotal * taxRatePercent) / 100).toFixed(2));
  const monthlyTotal = Number((subtotal + taxAmount).toFixed(2));

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          id="park-billing-form"
          onSubmit={submit}
          className="min-w-0 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4"
        >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-violet-700">Billing setup</p>
            <h2 className="mt-0.5 text-lg font-black text-stone-950">Base fee and invoice controls</h2>
            <p className="mt-0.5 text-xs font-semibold text-stone-500 sm:text-sm">Plan, tax, promos, and enabled modules determine the recurring bill.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Pill className="hidden border-violet-200 bg-violet-50 text-violet-700 sm:inline-flex">
              {form.billingCycle || "monthly"}
            </Pill>
            <button
              type="submit"
              disabled={isSavingBilling || !selectedPlan}
              className={buttonClass("primary", "min-h-10 px-4 py-2 text-sm disabled:cursor-wait disabled:opacity-60")}
            >
              {isSavingBilling ? "Saving..." : "Save billing"}
            </button>
          </div>
        </div>

        {!availablePlans.length ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            No active plans are available from the billing catalog. Create or activate a plan in Manage plans before this location can be billed or launched.
          </div>
        ) : null}

        <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/50 p-3">
          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(220px,340px)_1fr]">
            <label>
              <span className="flex items-center justify-between gap-2 text-xs font-black uppercase text-stone-500">
                <span>Customer plan</span>
                <Link to="/movira-control/plans" className="text-violet-700 hover:text-violet-800">
                  Manage plans
                </Link>
              </span>
              <SearchableSelect
                value={form.planKey}
                onChange={selectPlan}
                className="mt-1"
                buttonClassName="min-h-11 py-2.5"
                options={planOptions}
              />
            </label>
            <div className="grid min-w-0 gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-violet-100 bg-white px-3 py-2">
                <p className="text-xs font-black uppercase text-stone-500">Base fee</p>
                <p className="mt-0.5 text-base font-black text-stone-950">{money(selectedPlan?.monthlyBaseFee || 0, park.currency)}/mo</p>
              </div>
              <div className="rounded-md border border-violet-100 bg-white px-3 py-2">
                <p className="text-xs font-black uppercase text-stone-500">Location limit</p>
                <p className="mt-0.5 text-base font-black text-stone-950">{selectedPlan?.maxParks === null ? "Unlimited" : selectedPlan?.maxParks}</p>
              </div>
              <div className="rounded-md border border-violet-100 bg-white px-3 py-2">
                <p className="text-xs font-black uppercase text-stone-500">Current usage</p>
                <p className="mt-0.5 text-base font-black text-stone-950">
                  {planUsage?.activeParks ?? "-"}{selectedPlan?.maxParks === null ? "" : ` / ${selectedPlan?.maxParks}`}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs font-semibold text-stone-600 sm:text-sm">{selectedPlan?.description}</p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Base platform fee</span>
            <input
              type="number"
              min="0"
              value={form.monthlyBaseFee}
              onChange={(event) => setForm({ ...form, monthlyBaseFee: event.target.value })}
              readOnly={form.planKey !== "custom"}
              className={`input-nexus mt-1 w-full px-3 py-2.5 text-sm ${form.planKey !== "custom" ? "bg-stone-50 text-stone-500" : ""}`}
            />
            {form.planKey !== "custom" ? <span className="mt-1 block text-xs font-semibold text-stone-500">Auto-calculated from selected plan.</span> : null}
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Cycle</span>
            <SearchableSelect
              value={form.billingCycle}
              onChange={(value) => setForm({ ...form, billingCycle: value })}
              className="mt-1"
              buttonClassName="min-h-11 py-2.5"
              options={billingCycleOptions}
            />
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Billing start</span>
            <input type="date" value={form.billingStartDate} onChange={(event) => setForm({ ...form, billingStartDate: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Monthly promo / promo</span>
            <input type="number" value={form.promoAmount} onChange={(event) => setForm({ ...form, promoAmount: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
            <span className="mt-1 block text-xs font-semibold text-stone-500">Applies to every invoice until you change it. A $0 invoice is settled automatically.</span>
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-[0.9fr_0.9fr_1.2fr]">
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Tax label</span>
            <SearchableSelect
              value={form.taxLabel}
              onChange={(value) => setForm({ ...form, taxLabel: value })}
              placeholder="Select tax label"
              searchPlaceholder="Search tax label..."
              className="mt-1"
              buttonClassName="min-h-11 py-2.5"
              options={taxLabelOptions}
            />
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Tax rate %</span>
            <input type="number" min="0" max="100" step="0.001" value={form.taxRatePercent} onChange={(event) => setForm({ ...form, taxRatePercent: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Tax registration</span>
            <input value={form.taxRegistrationNumber} onChange={(event) => setForm({ ...form, taxRegistrationNumber: event.target.value })} placeholder="Optional tax ID" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
          </label>
        </div>

        <div className="mt-3 w-full max-w-full overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full min-w-155 table-fixed divide-y divide-stone-200 text-sm">
            <colgroup>
              <col className="w-[56%]" />
              <col className="w-[24%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="bg-stone-50 text-left text-xs font-black uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              <tr>
                <td className="px-3 py-2.5">
                  <p className="font-black text-stone-950">Base platform fee</p>
                  <p className="text-xs font-semibold text-stone-500">Base SaaS platform fee</p>
                </td>
                <td className="px-3 py-2.5 font-bold text-stone-500">Base fee</td>
                <td className="px-3 py-2.5 text-right font-black text-stone-950">{money(baseAmount, park.currency)}</td>
              </tr>
              {selectedModules.map((module) => (
                <tr key={module.key}>
                  <td className="px-3 py-2.5">
                    <p className="font-black text-stone-950">{module.label}</p>
                    <p className="text-xs font-semibold text-stone-500">Enabled module</p>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-stone-500">Module</td>
                  <td className="px-3 py-2.5 text-right font-black text-stone-950">{money(module.monthly, park.currency)}</td>
                </tr>
              ))}
              {selectedModules.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-3 py-3 text-sm font-bold text-stone-500">No paid modules enabled.</td>
                </tr>
              ) : null}
              {promo > 0 ? (
                <tr>
                  <td className="px-3 py-2.5">
                    <p className="font-black text-stone-950">Promo</p>
                    <p className="text-xs font-semibold text-stone-500">Manual monthly adjustment</p>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-stone-500">Credit</td>
                  <td className="px-3 py-2.5 text-right font-black text-emerald-700">-{money(promo, park.currency)}</td>
                </tr>
              ) : null}
              {taxAmount > 0 ? (
                <tr>
                  <td className="px-3 py-2.5">
                    <p className="font-black text-stone-950">{form.taxLabel || "Tax"}</p>
                    <p className="text-xs font-semibold text-stone-500">{taxRatePercent}% applied to subtotal</p>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-stone-500">Tax</td>
                  <td className="px-3 py-2.5 text-right font-black text-stone-950">{money(taxAmount, park.currency)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </form>

        <aside className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm xl:sticky xl:top-24">
        <p className="text-xs font-black uppercase text-stone-500">Monthly invoice preview</p>
        <div className="mt-3 space-y-2.5 text-sm font-bold">
          <div className="flex justify-between gap-3">
            <span className="text-stone-500">Base platform fee</span>
            <span className="text-stone-950">{money(baseAmount, park.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-500">Modules</span>
            <span className="text-stone-950">{money(moduleTotal, park.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-500">Promo</span>
            <span className="text-emerald-700">-{money(promo, park.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-500">{form.taxLabel || "Tax"} ({taxRatePercent}%)</span>
            <span className="text-stone-950">{money(taxAmount, park.currency)}</span>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-violet-50 p-3">
          <p className="text-xs font-black uppercase text-violet-700">Total due</p>
          <p className="mt-0.5 text-2xl font-black text-stone-950">{money(monthlyTotal, park.currency)}</p>
          <p className="mt-0.5 text-xs font-bold text-stone-500">per month</p>
        </div>
        <div className="mt-3 rounded-lg bg-stone-50 p-3 text-xs font-semibold text-stone-600">
          {selectedModules.length} module{selectedModules.length === 1 ? "" : "s"} enabled for this location.
        </div>
        </aside>
      </div>
    </div>
  );
}

function InvoicePreviewModal({ preview, onClose }) {
  useEffect(() => {
    if (!preview) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [preview, onClose]);

  if (!preview || typeof document === "undefined") return null;

  const { html, invoice } = preview;
  const downloadInvoice = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${invoice.invoiceNumber || "invoice"}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const printInvoice = () => {
    const frame = document.getElementById("saas-invoice-preview-frame");
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-180 flex items-center justify-center bg-stone-950/35 p-0 backdrop-blur-[3px] sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-preview-title"
        className="flex h-full w-full min-w-0 flex-col overflow-hidden border-(--stroke-soft) bg-(--surface-panel) shadow-2xl sm:h-[min(92vh,920px)] sm:max-w-6xl sm:rounded-xl sm:border"
      >
        <header className="flex shrink-0 flex-col gap-3 border-b border-(--stroke-soft) bg-(--surface-panel) px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-(--brand-primary-soft) text-(--brand-primary)">
              <FaFileInvoiceDollar aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-(--text-muted)">
                Invoice preview
              </p>
              <h2
                id="invoice-preview-title"
                className="truncate text-base font-black text-(--text-strong) sm:text-lg"
              >
                {invoice.invoiceNumber}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Pill className={billingStatusClass(invoice.status)}>{invoice.status}</Pill>
            <button
              type="button"
              onClick={printInvoice}
              className={buttonClass("secondary", "min-h-9 gap-2 px-3 py-1.5 text-xs")}
            >
              <FaPrint aria-hidden="true" />
              Print
            </button>
            <button
              type="button"
              onClick={downloadInvoice}
              className={buttonClass("secondary", "min-h-9 gap-2 px-3 py-1.5 text-xs")}
            >
              <FaDownload aria-hidden="true" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close invoice preview"
              title="Close invoice preview"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-(--stroke-soft) bg-(--surface-panel) text-(--text-strong) transition hover:border-(--brand-primary) hover:bg-(--brand-primary-soft)"
            >
              <FaTimes aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 bg-(--app-background) p-2 sm:p-4">
          <iframe
            id="saas-invoice-preview-frame"
            title={`Invoice ${invoice.invoiceNumber}`}
            srcDoc={html}
            sandbox="allow-same-origin"
            className="h-full w-full rounded-lg border border-(--stroke-soft) bg-white shadow-sm"
          />
        </div>
      </section>
    </div>,
    document.body
  );
}

function InvoiceHistoryTable({ park, invoices, paymentEvents = [] }) {
  const { data: liveGatewayData = {}, isLoading: isLoadingLiveGateway } = useGetSaasPlatformBillingGatewayQuery({
    channel: "payment_link",
    currency: park.currency || "",
    mode: "live",
  });
  const [createPaymentLink, createLinkState] = useCreateSaasInvoicePaymentLinkMutation();
  const [refreshLifecycle, refreshLifecycleState] = useRefreshSaasInvoiceLifecycleMutation();
  const [voidInvoice, voidInvoiceState] = useVoidSaasInvoiceMutation();
  const [refundInvoice, refundInvoiceState] = useRefundSaasInvoicePaymentMutation();
  const [getInvoiceDocument, invoiceDocumentState] = useLazyGetSaasInvoiceDocumentQuery();
  const [actionConfirm, setActionConfirm] = useState(null);
  const [voidConfirm, setVoidConfirm] = useState(null);
  const [refundConfirm, setRefundConfirm] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const liveGatewayReady = Boolean(
    liveGatewayData.active?.mode === "live" &&
      liveGatewayData.active?.credential?.status === "active"
  );

  const handleRefreshLifecycle = async () => {
    try {
      const result = await refreshLifecycle({ locationId: park.locationId }).unwrap();
      const updated = Number(result?.updated || 0);
      const generated = Number(result?.generated || 0);
      const remindersSent = Number(result?.remindersSent || 0);
      const remindersFailed = Number(result?.remindersFailed || 0);
      const collectionPastDue = Number(result?.collectionPastDue || 0);
      const collectionSuspended = Number(result?.collectionSuspended || 0);
      const collectionRecovered = Number(result?.collectionRecovered || 0);
      if (generated || updated || remindersSent || remindersFailed || collectionPastDue || collectionSuspended || collectionRecovered) {
        toast.success(
          `${generated} generated, ${updated} marked overdue, ${remindersSent} reminders sent${remindersFailed ? `, ${remindersFailed} failed` : ""}, collection ${collectionPastDue} past due / ${collectionSuspended} hold / ${collectionRecovered} recovered.`
        );
      } else {
        toast.success("Invoice lifecycle is up to date.");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to refresh invoice lifecycle.");
    }
  };

  const linkSentForInvoice = (invoiceId) => paymentEvents.some(
    (event) =>
      Number(event.invoiceId || event.invoice?.invoiceId) === Number(invoiceId) &&
      ["invoice_payment_link_created", "invoice_payment_link_resent"].includes(event.eventType)
  );
  const handleCreatePaymentLink = async (invoice, resend = false) => {
    try {
      const result = await createPaymentLink({
        locationId: park.locationId,
        invoiceId: invoice.invoiceId,
        resend,
        notificationRequestId: window.crypto?.randomUUID?.() || `${Date.now()}-${invoice.invoiceId}`,
      }).unwrap();
      if (result?.paymentLinkUrl) {
        let copied = false;
        try {
          await navigator.clipboard?.writeText(result.paymentLinkUrl);
          copied = true;
        } catch {
          copied = false;
        }
        toast.success(
          `${result.resent ? "Payment link resent" : "Payment link sent"} to ${result.recipientEmail || "the billing email"}${copied ? " and copied." : "."}`
        );
      } else {
        toast.success(result.resent ? "Payment link resent." : "Payment link sent.");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to send payment link.");
    }
  };
  const handleOpenInvoiceDocument = async (invoice) => {
    try {
      const html = await getInvoiceDocument({ locationId: park.locationId, invoiceId: invoice.invoiceId }).unwrap();
      setInvoicePreview({ html, invoice });
    } catch (err) {
      toast.error(err?.data?.message || "Failed to open invoice document.");
    }
  };
  const handleConfirmedInvoiceAction = async (event) => {
    if (!actionConfirm || event.type !== "confirm") return;
    const current = actionConfirm;
    if (current.type === "refresh_lifecycle") {
      await handleRefreshLifecycle();
    } else if (current.type === "open_invoice") {
      await handleOpenInvoiceDocument(current.invoice);
    } else if (current.type === "payment_link") {
      await handleCreatePaymentLink(current.invoice, current.resend);
    }
    setActionConfirm(null);
  };
  const actionConfirmLoading =
    actionConfirm?.type === "refresh_lifecycle"
      ? refreshLifecycleState.isLoading
      : actionConfirm?.type === "open_invoice"
        ? invoiceDocumentState.isFetching
        : actionConfirm?.type === "payment_link"
            ? createLinkState.isLoading
            : false;
  const actionConfirmConfig = (() => {
    if (!actionConfirm) return null;
    const invoice = actionConfirm.invoice;
    const remaining = invoice ? Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0)) : 0;
    if (actionConfirm.type === "refresh_lifecycle") {
      return {
        tone: "warning",
        eyebrow: "Refresh lifecycle",
        title: "Refresh invoice lifecycle?",
        message: "This can generate due invoices, mark overdue invoices, send reminders, and apply collection policy for this location.",
        details: ["Use this when you intentionally want billing state to be recalculated.", "Audit and payment history will record resulting changes."],
        confirmLabel: "Refresh invoices",
      };
    }
    if (actionConfirm.type === "open_invoice") {
      return {
        tone: "info",
        eyebrow: "Preview invoice",
        title: `Preview ${invoice.invoiceNumber}?`,
        message: "This opens the official invoice document in a secure in-app preview.",
        details: [`Invoice total: ${money(invoice.totalAmount, invoice.currency || park.currency)}`, `Status: ${invoice.status}`],
        confirmLabel: "Preview invoice",
      };
    }
    const resend = Boolean(actionConfirm.resend);
    return {
      tone: "warning",
      eyebrow: resend ? "Resend payment link" : "Send payment link",
      title: `${resend ? "Resend" : "Send"} payment link for ${invoice.invoiceNumber}?`,
      message: resend
        ? "This creates a fresh unpaid live payment link, invalidates older links for this invoice, and emails the new link to the billing contact."
        : "This creates a live customer-payable SaaS invoice link and sends it to the location billing email.",
      details: [
        `Amount due: ${money(remaining, invoice.currency || park.currency)}`,
        "A live Movira SaaS billing gateway and live platform credentials are required.",
        "Cash and manual settlement are not available for live SaaS billing.",
      ],
      confirmLabel: resend ? "Resend link" : "Send link",
    };
  })();
  const handleVoidInvoice = async (event) => {
    if (!voidConfirm) return;
    if (event.type === "input") {
      setVoidConfirm((current) => ({ ...current, confirmValue: event.value }));
      return;
    }
    try {
      await voidInvoice({
        locationId: park.locationId,
        invoiceId: voidConfirm.invoice.invoiceId,
        reason: `Voided from Movira Control by operator.`,
      }).unwrap();
      toast.success("Invoice voided.");
      setVoidConfirm(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to void invoice.");
    }
  };
  const handleRefundInvoice = async (event) => {
    if (!refundConfirm) return;
    if (event.type === "input") {
      setRefundConfirm((current) => ({ ...current, confirmValue: event.value }));
      return;
    }
    const amount = Number(refundConfirm.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Refund amount must be greater than 0.");
      return;
    }
    try {
      await refundInvoice({
        locationId: park.locationId,
        invoiceId: refundConfirm.invoice.invoiceId,
        amount,
        reason: refundConfirm.reason || `Refund for ${refundConfirm.invoice.invoiceNumber}`,
      }).unwrap();
      toast.success("Invoice refund recorded.");
      setRefundConfirm(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to refund invoice payment.");
    }
  };

  return (
    <section className={listingShellClass}>
      <CompactListingHeader
        eyebrow="Billing history"
        title="Generated SaaS invoices"
        description="Invoice periods, collection status, and balances."
        meta={(
          <>
          <button
            type="button"
            disabled={refreshLifecycleState.isLoading}
            onClick={() => setActionConfirm({ type: "refresh_lifecycle" })}
            className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}
          >
            {refreshLifecycleState.isLoading ? "Refreshing..." : "Refresh invoices"}
          </button>
            <CompactListingMetric label="Invoices" value={invoices.length} />
          </>
        )}
      />
      {!isLoadingLiveGateway && !liveGatewayReady ? (
        <div className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Live SaaS billing setup required</p>
            <p className="mt-1 text-sm font-bold text-amber-950">Add an enabled live Stripe or Razorpay platform gateway and its live credentials before sending invoice payment links.</p>
          </div>
          <Link to="/movira-control/billing" className={buttonClass("secondary", "shrink-0 border-amber-300 text-amber-900")}>Open SaaS Billing</Link>
        </div>
      ) : null}
      <div className={listingScrollClass}>
        <table className={listingTableClass("min-w-240")}>
          <thead className={listingHeadClass}>
            <tr>
              <th className={listingThClass()}>Invoice</th>
              <th className={listingThClass()}>Period</th>
              <th className={listingThClass()}>Due</th>
              <th className={listingThClass()}>Status</th>
              <th className={listingThClass("text-right")}>Total</th>
              <th className={listingThClass("text-right")}>Paid</th>
              <th className={listingThClass("text-right")}>Action</th>
            </tr>
          </thead>
          <tbody className={listingBodyClass}>
            {invoices.map((invoice) => {
              const remaining = Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0));
              const terminalStatuses = ["paid", "void", "refunded"];
              const canPay = remaining > 0 && !terminalStatuses.includes(invoice.status);
              const canVoid = Number(invoice.paidAmount || 0) <= 0 && !terminalStatuses.includes(invoice.status);
              const paidAmount = Number(invoice.paidAmount || 0);
              const canRefund = paidAmount > 0 && !["void", "refunded"].includes(invoice.status);
              const linkAlreadySent = linkSentForInvoice(invoice.invoiceId);
              return (
                <tr key={invoice.invoiceId} className={listingRowClass}>
                  <td className="px-4 py-3">
                    <p className="font-black text-stone-950">{invoice.invoiceNumber}</p>
                    <p className="text-xs font-semibold text-stone-500">{invoice.billingCycle || "monthly"}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-600">{dateOnly(invoice.periodStart)} - {dateOnly(invoice.periodEnd)}</td>
                  <td className="px-4 py-3 font-semibold text-stone-600">{dateOnly(invoice.dueDate)}</td>
                  <td className="px-4 py-3"><Pill className={billingStatusClass(invoice.status)}>{invoice.status}</Pill></td>
                  <td className="px-4 py-3 text-right font-black text-stone-950">{money(invoice.totalAmount, invoice.currency || park.currency)}</td>
                  <td className="px-4 py-3 text-right font-bold text-stone-600">{money(invoice.paidAmount, invoice.currency || park.currency)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={invoiceDocumentState.isFetching}
                        onClick={() => setActionConfirm({ type: "open_invoice", invoice })}
                        className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}
                      >
                        Preview invoice
                      </button>
                      {canPay ? (
                        <button
                          type="button"
                          disabled={createLinkState.isLoading || isLoadingLiveGateway}
                          onClick={() => setActionConfirm({ type: "payment_link", invoice, resend: linkAlreadySent })}
                          className={buttonClass(linkAlreadySent ? "secondary" : "success", "min-h-9 px-3 py-1.5 text-xs")}
                        >
                          {linkAlreadySent ? "Resend payment link" : `Send ${money(remaining, invoice.currency || park.currency)} link`}
                        </button>
                      ) : <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">Settled</Pill>}
                      {canVoid ? (
                        <button
                          type="button"
                          disabled={voidInvoiceState.isLoading}
                          onClick={() =>
                            setVoidConfirm({
                              invoice,
                              confirmValue: "",
                            })
                          }
                          className={buttonClass("danger", "min-h-9 px-3 py-1.5 text-xs")}
                        >
                          Void
                        </button>
                      ) : null}
                      {canRefund ? (
                        <button
                          type="button"
                          disabled={refundInvoiceState.isLoading}
                          onClick={() =>
                            setRefundConfirm({
                              invoice,
                              amount: paidAmount,
                              reason: "",
                              confirmValue: "",
                            })
                          }
                          className={buttonClass("danger", "min-h-9 px-3 py-1.5 text-xs")}
                        >
                          Refund
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-5 text-sm font-bold text-stone-500">No invoices generated yet. Save billing or payment setup to create the first invoice.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(actionConfirm && actionConfirmConfig)}
        tone={actionConfirmConfig?.tone || "warning"}
        eyebrow={actionConfirmConfig?.eyebrow || "Please confirm"}
        title={actionConfirmConfig?.title || ""}
        message={actionConfirmConfig?.message || ""}
        details={actionConfirmConfig?.details || []}
        confirmLabel={actionConfirmConfig?.confirmLabel || "Confirm"}
        loading={actionConfirmLoading}
        onConfirm={handleConfirmedInvoiceAction}
        onClose={() => setActionConfirm(null)}
      />
      <ConfirmDialog
        open={Boolean(voidConfirm)}
        tone="danger"
        eyebrow="Void invoice"
        title={voidConfirm ? `Void ${voidConfirm.invoice.invoiceNumber}?` : ""}
        message="This keeps invoice history but stops the invoice from being payable. Use this only for invoices that should not be collected."
        details={[
          "Only unpaid invoices can be voided.",
          "Paid or partially paid invoices must be refunded or settled instead.",
          "Voided invoices remain visible in audit and payment history.",
        ]}
        confirmText="VOID"
        confirmValue={voidConfirm?.confirmValue}
        confirmLabel="Void invoice"
        loading={voidInvoiceState.isLoading}
        onConfirm={handleVoidInvoice}
        onClose={() => setVoidConfirm(null)}
      />
      <ConfirmDialog
        open={Boolean(refundConfirm)}
        tone="danger"
        eyebrow="Refund payment"
        title={refundConfirm ? `Refund ${refundConfirm.invoice.invoiceNumber}?` : ""}
        message="This records a refund against the captured SaaS invoice payment and reconciles the invoice balance."
        details={[
          refundConfirm ? `Paid amount: ${money(refundConfirm.invoice.paidAmount, refundConfirm.invoice.currency || park.currency)}` : "Paid amount available for refund.",
          "Partial refunds move the invoice back to partial.",
          "Full refunds move the invoice to refunded.",
        ]}
        confirmText="REFUND"
        confirmValue={refundConfirm?.confirmValue}
        confirmLabel="Refund invoice"
        loading={refundInvoiceState.isLoading}
        onConfirm={handleRefundInvoice}
        onClose={() => setRefundConfirm(null)}
      >
        {refundConfirm ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-xs font-black uppercase text-stone-500">Refund amount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={refundConfirm.invoice.paidAmount || 0}
                value={refundConfirm.amount}
                onChange={(event) => setRefundConfirm((current) => ({ ...current, amount: event.target.value }))}
                className="input-nexus mt-1 w-full px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="text-xs font-black uppercase text-stone-500">Reason</span>
              <input
                value={refundConfirm.reason}
                onChange={(event) => setRefundConfirm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Billing adjustment"
                className="input-nexus mt-1 w-full px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}
      </ConfirmDialog>
      <InvoicePreviewModal
        preview={invoicePreview}
        onClose={() => setInvoicePreview(null)}
      />
    </section>
  );
}

function PaymentsPanel({ park }) {
  const isDemo = park.deploymentMode === "demo" || park.status === "demo";
  const [form, setForm] = useState({
    customerPaymentStatus: park.customerPaymentStatus || "not_configured",
  });
  const [updatePayments, { isLoading: isSavingPayments }] = useUpdateSaasParkPaymentsMutation();
  useEffect(() => {
    setForm({ customerPaymentStatus: park.customerPaymentStatus || "not_configured" });
  }, [park.locationId, park.customerPaymentStatus]);

  const platformMethodLabel = optionLabel(platformBillingMethodOptions, park.paymentMethod);
  const platformStatusLabel = optionLabel(platformBillingStatusOptions, park.paymentStatus);
  const platformStatusClass = billingStatusClass(park.paymentStatus);
  const guestPaymentDirty = form.customerPaymentStatus !== (park.customerPaymentStatus || "not_configured");

  const submit = async (event) => {
    event.preventDefault();
    try {
      await updatePayments({ locationId: park.locationId, ...form }).unwrap();
      toast.success("Guest payment setting updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update payments.");
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-violet-700">Payment control</p>
            <h2 className="mt-1 wrap-break-word text-lg font-black text-stone-950">
              {isDemo ? "Sandbox payment testing" : "Location payment status"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">
              {isDemo
                ? "Test checkout, POS, refunds, and memberships without collecting real money."
                : "Platform billing collects from the location. Guest payments control checkout, POS, refunds, and memberships."}
            </p>
          </div>
          <Pill className={isDemo ? "border-violet-200 bg-violet-50 text-violet-700" : platformStatusClass}>
            {isDemo ? "Sandbox only" : platformStatusLabel}
          </Pill>
        </div>
        <div className={`mt-4 grid min-w-0 gap-3 ${isDemo ? "grid-cols-1" : "lg:grid-cols-[0.85fr_0.85fr_1.3fr]"}`}>
          {!isDemo ? (
            <>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-black uppercase text-stone-500">Platform billing method</p>
                <p className="mt-1 text-base font-black capitalize text-stone-950">{platformMethodLabel}</p>
                <p className="mt-1 text-xs font-semibold text-stone-500">Auto selected from gateway and invoice setup.</p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-black uppercase text-stone-500">Platform billing status</p>
                <div className="mt-1">
                  <Pill className={platformStatusClass}>{platformStatusLabel}</Pill>
                </div>
                <p className="mt-2 text-xs font-semibold text-stone-500">Auto updated from invoice and collection lifecycle.</p>
              </div>
            </>
          ) : null}
          <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-3">
            <span className="text-xs font-black uppercase text-stone-500">Guest payments</span>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start">
              <SearchableSelect
                value={form.customerPaymentStatus}
                onChange={(value) => setForm({ ...form, customerPaymentStatus: value })}
                className="min-w-0 flex-1"
                buttonClassName="min-h-10 py-2"
                options={isDemo ? guestPaymentStatusOptions.filter((option) => option.value !== "live") : guestPaymentStatusOptions}
              />
              <button
                disabled={!guestPaymentDirty || isSavingPayments}
                className={buttonClass("primary", "min-h-10 px-4 py-2 sm:shrink-0 disabled:cursor-not-allowed disabled:opacity-50")}
              >
                {isSavingPayments ? "Saving..." : guestPaymentDirty ? "Save change" : "Saved"}
              </button>
            </div>
            <span className="mt-2 block text-xs font-semibold text-stone-500">Controls checkout/POS acceptance for this location.</span>
            {isDemo ? (
              <span className="mt-2 block rounded-md border border-violet-200 bg-violet-50 px-2.5 py-2 text-xs font-black text-violet-800">
                Demo guard active: real/live gateway routes and charges are blocked.
              </span>
            ) : null}
          </div>
        </div>
      </form>
      <ParkPaymentConsole park={park} />
    </div>
  );
}

function PaymentHistoryPanel({ park, paymentEvents }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [eventType, setEventType] = useState("all");
  const { data = {}, isFetching } = useGetSaasParkPaymentEventsQuery(
    { locationId: park.locationId, page, limit: 25, search, status, eventType },
    { skip: !park?.locationId }
  );
  const events = data.events || paymentEvents || [];
  const pagination = data.pagination || { totalRecords: events.length, totalPages: 1, currentPage: 1 };

  return (
    <section className={listingShellClass}>
      <CompactListingHeader
        eyebrow="Payment history"
        title="SaaS billing events"
        description="Provider events, references, and payment outcomes."
        controls={(
          <>
            <div className="relative min-w-52.5 flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-(--text-muted)" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search events, provider, reference..."
                className="input-nexus w-full py-1.5 pl-8 pr-3 text-sm"
              />
            </div>
            <SearchableSelect
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              searchPlaceholder="Search status..."
              className="w-full sm:w-36"
              options={paymentHistoryStatusOptions}
            />
            <SearchableSelect
              value={eventType}
              onChange={(value) => {
                setEventType(value);
                setPage(1);
              }}
              searchPlaceholder="Search event type..."
              className="w-full sm:w-48"
              options={paymentEventTypeOptions}
            />
          </>
        )}
        meta={(
          <>
            {isFetching ? <ShimmerBlock className="h-7 w-20 rounded-full" /> : null}
            <CompactListingMetric label="Events" value={pagination.totalRecords || events.length} />
          </>
        )}
      />
      <div className="max-h-[min(62vh,700px)] overflow-auto divide-y divide-stone-100">
        {events.map((event) => (
          <div key={event.eventId} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_160px_140px] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-stone-950">{event.message || event.eventType}</p>
                <Pill className={billingStatusClass(event.status)}>{event.status}</Pill>
              </div>
              <p className="mt-1 text-xs font-semibold text-stone-500">
                {event.invoice?.invoiceNumber ? `Invoice ${event.invoice.invoiceNumber}` : "No invoice"} · {event.paymentMethod || "online"} · {dateTime(event.createdAt)}
              </p>
              {event.actor ? <p className="mt-1 text-xs font-semibold text-stone-400">By {event.actor.name || event.actor.email}</p> : null}
            </div>
            <div className="text-sm font-bold text-stone-600">{event.provider || "manual"}</div>
            <div className="text-left font-black text-stone-950 md:text-right">{money(event.amount, event.currency || park.currency)}</div>
          </div>
        ))}
        {events.length === 0 ? (
          <p className="px-5 py-5 text-sm font-bold text-stone-500">No payment events yet. Payment setup changes and invoice payments will appear here.</p>
        ) : null}
      </div>
      {pagination.totalPages > 1 ? (
        <div className={listingFooterClass}>
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}>Prev</button>
          <span className="text-xs font-bold text-stone-500">{page} / {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}>Next</button>
        </div>
      ) : null}
    </section>
  );
}

function OnboardingPanel({ park }) {
  const isDemo = park.deploymentMode === "demo" || park.status === "demo";
  const [updateOnboarding] = useUpdateSaasParkOnboardingMutation();
  const [goLive, goLiveState] = useApproveSaasParkGoLiveMutation();
  const [goLiveConfirm, setGoLiveConfirm] = useState(false);
  const missingChecks = Array.isArray(park.onboardingMissingChecks) ? park.onboardingMissingChecks : [];
  const toggle = async (key) => {
    if (!manualOnboardingKeys.has(key)) return;
    try {
      await updateOnboarding({ locationId: park.locationId, onboarding: { [key]: !park.onboarding?.[key] } }).unwrap();
      toast.success("Checklist updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update checklist.");
    }
  };
  const approve = async (event) => {
    if (event?.type && event.type !== "confirm") return;
    try {
      await goLive({ locationId: park.locationId }).unwrap();
      toast.success("Go-live checked.");
      setGoLiveConfirm(false);
    } catch (err) {
      const blockedChecks = err?.data?.data?.missingChecks || err?.data?.missingChecks || [];
      const blockedLabels = blockedChecks.map((key) => onboardingLabels[key] || key);
      toast.error(
        blockedLabels.length
          ? `Complete before go-live: ${blockedLabels.join(", ")}.`
          : err?.data?.message || "Failed to approve go-live."
      );
    }
  };
  if (isDemo) {
    const progress = setupProgressForPark(park);
    return (
      <div className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-violet-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Demo testing</p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              {progress.score === 100 ? "Sandbox workspace is ready" : "Complete the sandbox setup"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-stone-600">
              Demo access does not require SaaS billing or production go-live approval. Real charges remain blocked.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <ProgressBar value={progress.score} />
            <p className="mt-1 text-right text-xs font-black text-violet-700">
              {progress.completed}/{progress.total} testing checks complete
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {demoSetupSteps.map((step) => {
            const done = isSetupKeyComplete(park, step.key);
            return (
              <div
                key={step.key}
                className={`flex items-center justify-between rounded-xl border p-4 ${
                  done ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
                }`}
              >
                <span className="font-black text-stone-950">{step.label}</span>
                <Pill className={done ? "border-emerald-200 bg-white text-emerald-700" : "border-amber-200 bg-white text-amber-700"}>
                  {done ? "Ready" : "Pending"}
                </Pill>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-violet-950">Need real customer operations?</p>
            <p className="mt-1 text-sm font-semibold text-violet-800">
              Convert to production onboarding, then configure billing, live payments, and request go-live approval.
            </p>
          </div>
          <Link
            to={`/movira-control/parks/${park.locationId}/edit`}
            className={buttonClass("primary", "shrink-0")}
          >
            <FaRocket /> Convert to production
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <p className="text-xs font-black uppercase text-violet-700">Location approval</p>
          <h2 className="mt-1 text-xl font-black text-stone-950">Provisioning readiness</h2>
        </div>
        <div className="w-full max-w-xs">
          <ProgressBar value={park.onboardingScore || 0} />
          <p className="mt-1 text-right text-xs font-black text-stone-500">{park.onboardingScore || 0}% complete</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {setupSteps.map((step, index) => {
          const label = onboardingLabels[step.key] || step.label;
          const done = Boolean(park.onboarding?.[step.key]);
          const isManual = manualOnboardingKeys.has(step.key);
          const content = (
            <>
              <span>
                <span className="block text-xs font-black uppercase text-stone-400">Step {index + 1}</span>
                <span className="font-black text-stone-950">{label}</span>
                <span className="mt-1 block text-xs font-semibold text-stone-500">
                  {isManual ? "Operational confirmation" : "Verified automatically"}
                </span>
              </span>
              <Pill className={done ? "border-emerald-200 bg-white text-emerald-700" : "border-stone-200 text-stone-500"}>
                {done ? "Complete" : isManual ? "Mark done" : "Pending"}
              </Pill>
            </>
          );
          const className = `flex items-center justify-between rounded-xl border p-4 text-left transition ${
            done
              ? "border-emerald-200 bg-emerald-50"
              : isManual
                ? "border-stone-200 bg-white hover:-translate-y-0.5 hover:border-violet-200"
                : "cursor-default border-stone-200 bg-stone-50"
          }`;
          return (
            isManual ? (
              <button key={step.key} type="button" onClick={() => toggle(step.key)} className={className}>
                {content}
              </button>
            ) : (
              <div key={step.key} className={className}>
                {content}
              </div>
            )
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4">
        <div>
          <p className="font-black text-stone-950">Approve customer workspace</p>
          <p className="text-sm font-semibold text-stone-500">
            {isDemo
              ? "Convert this demo to production onboarding before requesting go-live approval."
              : missingChecks.length
              ? `Still required: ${missingChecks.map((key) => onboardingLabels[key] || key).join(", ")}.`
              : "All Movira provisioning checks are complete. Approval will activate the location and notify its owner."}
          </p>
        </div>
        <button disabled={isDemo} onClick={() => setGoLiveConfirm(true)} className={buttonClass("primary", "disabled:cursor-not-allowed disabled:opacity-50")}><FaRocket /> {isDemo ? "Convert to production first" : "Approve location"}</button>
      </div>
      <ConfirmDialog
        open={goLiveConfirm}
        tone="warning"
        eyebrow="Go-live approval"
        title={`Approve ${park.name} and notify the owner?`}
        message="This checks readiness and updates the location lifecycle. Use it only when the location is ready for real customer operations."
        details={[
          `${park.onboardingScore || 0}% readiness currently complete.`,
          missingChecks.length
            ? `Incomplete: ${missingChecks.map((key) => onboardingLabels[key] || key).join(", ")}.`
            : "All required readiness checks are complete.",
          "This action is recorded in the audit history.",
        ]}
        confirmLabel="Approve location"
        loading={goLiveState.isLoading}
        onConfirm={approve}
        onClose={() => setGoLiveConfirm(false)}
      />
    </div>
  );
}

function AuditPanel({ park, initialLogs = [] }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const { data = {}, isFetching } = useGetSaasParkAuditLogsQuery(
    { locationId: park.locationId, page, limit: 25, search, action },
    { skip: !park?.locationId }
  );
  const logs = useMemo(() => data.logs || initialLogs || [], [data.logs, initialLogs]);
  const pagination = data.pagination || { totalRecords: logs.length, totalPages: 1, currentPage: 1 };
  const auditSummary = useMemo(() => {
    const actors = new Set();
    logs.forEach((item) => {
      const actorKey = item.actor?.email || item.actor?.name || "System";
      actors.add(actorKey);
    });
    return {
      latest: logs[0]?.createdAt,
      actorCount: actors.size,
      visible: logs.length,
    };
  }, [logs]);
  const actionTone = (value = "") => {
    if (value.includes("failed") || value.includes("voided") || value.includes("archived")) {
      return "border-red-200 bg-red-50 text-red-700";
    }
    if (value.includes("payment") || value.includes("billing") || value.includes("invoice")) {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }
    if (value.includes("created") || value.includes("updated") || value.includes("recovered")) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    return "border-stone-200 bg-stone-50 text-stone-600";
  };

  return (
    <section className={listingShellClass}>
      <CompactListingHeader
        eyebrow="Production audit"
        title="Operator and system activity trail"
        description={`Billing, onboarding, lifecycle, and payment changes for ${park.name}.`}
        controls={(
          <>
            <div className="relative min-w-55 flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-(--text-muted)" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search audit activity..."
                className="input-nexus w-full py-1.5 pl-8 pr-3 text-sm"
              />
            </div>
            <SearchableSelect
              value={action}
              onChange={(value) => {
                setAction(value);
                setPage(1);
              }}
              searchPlaceholder="Search action..."
              className="w-full sm:w-48"
              buttonClassName="min-h-9 py-1.5"
              options={auditActionOptions}
            />
          </>
        )}
        meta={(
          <>
            <CompactListingMetric label="Rows" value={auditSummary.visible} />
            <CompactListingMetric label="Actors" value={auditSummary.actorCount} />
            <CompactListingMetric
              label="Latest"
              value={auditSummary.latest ? dateTime(auditSummary.latest) : "-"}
            />
            {isFetching ? (
              <Pill className="border-(--stroke-soft) bg-(--surface-muted) text-(--text-muted)">
                Refreshing
              </Pill>
            ) : null}
            <CompactListingMetric label="Records" value={pagination.totalRecords || logs.length} />
          </>
        )}
      />

      <div className="max-h-[min(68vh,760px)] overflow-auto divide-y divide-stone-100">
          {logs.map((item) => (
            <article key={item.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="flex min-w-0 gap-3">
                <div className="flex flex-col items-center pt-1">
                  <span className="h-3 w-3 rounded-full border-2 border-violet-200 bg-violet-600" />
                  <span className="mt-2 h-full min-h-12 w-px bg-stone-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill className={actionTone(item.action)}>{item.action}</Pill>
                    <span className="text-xs font-black uppercase tracking-wide text-stone-400">
                      {dateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-black text-stone-950">{item.message || item.action}</p>
              {item.metadata && Object.keys(item.metadata).length ? (
                    <div className="mt-3 grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs font-semibold text-stone-600 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(item.metadata).slice(0, 9).map(([key, value]) => (
                        <div key={key} className="min-w-0 rounded-md bg-white px-2.5 py-2">
                          <span className="block font-black uppercase tracking-wide text-stone-400">{key}</span>
                          <span className="mt-0.5 block wrap-break-word text-stone-700">
                            {typeof value === "object" ? JSON.stringify(value) : String(value ?? "-")}
                          </span>
                        </div>
                      ))}
                    </div>
              ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 lg:text-right">
                <p className="text-xs font-black uppercase tracking-wide text-stone-400">Actor</p>
                {item.actor ? (
                  <>
                    <p className="mt-1 truncate font-black text-stone-950">{item.actor.name || item.actor.email}</p>
                    <p className="mt-0.5 break-all text-xs font-semibold text-stone-500">{item.actor.email}</p>
                  </>
                ) : (
                  <p className="mt-1 font-black text-stone-950">System</p>
                )}
              </div>
            </article>
          ))}
          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-black text-stone-950">No audit records yet.</p>
              <p className="mt-1 text-sm font-semibold text-stone-500">
                Lifecycle, billing, payment, and onboarding changes will appear here.
              </p>
            </div>
          ) : null}
        </div>

      {pagination.totalPages > 1 ? (
        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 border-t border-(--stroke-soft) bg-(--surface-panel-strong)/95 px-4 py-2 backdrop-blur">
          <span className="text-xs font-bold text-stone-500">
            Page {page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}>Prev</button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}>Next</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
