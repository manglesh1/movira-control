import { useState } from "react";
import { FiSave, FiRefreshCw, FiChevronDown, FiMail } from "react-icons/fi";
import { FaGoogle, FaFacebookF, FaApple } from "react-icons/fa";
import { toast } from "sonner";
import { useGetCustomerAuthQuery, useSaveCustomerAuthMutation } from "../../features/saas/moviraControlApi";
import { appConfirm } from "../../services/appDialog";

const names = { email: "Email and password", google: "Google", facebook: "Facebook", apple: "Apple" };
const icons = { email: FiMail, google: FaGoogle, facebook: FaFacebookF, apple: FaApple };
const fields = {
  email: [], google: [["clientId", "Web Client ID"]],
  facebook: [["clientId", "App ID"], ["graphVersion", "Graph API version"]],
  apple: [["clientId", "Services ID"], ["teamId", "Team ID"], ["keyId", "Key ID"], ["redirectUri", "Return URL"]],
};
const inputClass = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-(--stroke-soft) bg-(--surface-input) px-3 text-base text-(--text-strong)";

function ProviderForm({ provider, config, locationId }) {
  const [draft, setDraft] = useState(null);
  const [save, { isLoading }] = useSaveCustomerAuthMutation();
  const available = config.configured && config.enabled;
  const initial = locationId ? { loginEnabled: available && config.policy.loginEnabled, signupEnabled: available && config.policy.signupEnabled } : { ...config, enabled: config.configured && config.enabled };
  const values = { ...initial, ...draft };
  const ready = provider === "email" || (fields[provider].every(([key]) => String(values[key] || "").trim()) && (!["facebook", "apple"].includes(provider) || config.secretConfigured || Boolean(values.secret?.trim())));
  const enabled = Boolean(values.enabled && ready);
  const Icon = icons[provider];
  const set = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    const disabling = locationId ? initial.loginEnabled && !values.loginEnabled : initial.enabled && !enabled;
    if (disabling && !await appConfirm({ title: `Disable ${names[provider]} login?`, message: locationId ? "New sign-ins at this location will stop. Existing sessions remain active." : "New sign-ins using this method will stop at every location. Existing sessions remain active." })) return;
    try {
      const body = locationId ? { loginEnabled: values.loginEnabled, signupEnabled: values.signupEnabled } : {
        enabled, ...Object.fromEntries(fields[provider].map(([key]) => [key, values[key] || ""])),
        ...(values.secret ? { secret: values.secret } : {}),
      };
      await save({ locationId, provider, ...body }).unwrap();
      setDraft(null);
      toast.success(`${names[provider]} settings saved.`);
    } catch (error) { toast.error(error?.data?.message || "Settings could not be saved."); }
  }
  return <details name="customer-auth-providers" className="group min-w-0 border-b border-(--stroke-soft)">
    <summary className="flex min-h-18 cursor-pointer list-none items-center gap-3 py-4 [&::-webkit-details-marker]:hidden">
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-(--text-muted)" />
      <span className="min-w-0 flex-1"><span className="block text-base font-bold">{names[provider]}</span>{!config.configured && <span className="mt-1 block text-xs text-(--text-muted)">Coming soon</span>}</span>
      <span className={`shrink-0 text-xs font-semibold ${available && (!locationId || config.loginEnabled) ? "text-emerald-600" : "text-(--text-muted)"}`}>{available && (!locationId || config.loginEnabled) ? "Enabled" : "Disabled"}</span>
      <FiChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <form onSubmit={submit} className="min-w-0 pb-5">
    <fieldset disabled={isLoading} className="grid min-w-0 gap-4 sm:grid-cols-2">
      {locationId ? <>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(values.loginEnabled && available)} disabled={!available} onChange={e => setDraft(current => ({ ...current, loginEnabled: e.target.checked, ...(!e.target.checked ? { signupEnabled: false } : {}) }))} />Allow login</label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(values.signupEnabled && available)} disabled={!available || !values.loginEnabled} onChange={e => set("signupEnabled", e.target.checked)} />Allow new account signup</label>
      </> : <>
        <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" checked={enabled} disabled={!ready} onChange={e => set("enabled", e.target.checked)} />Enabled across locations</label>
        {fields[provider].map(([key, label]) => <label className="min-w-0 text-sm" key={key}>{label}<input type={key === "redirectUri" ? "url" : "text"} className={inputClass} value={values[key] || ""} maxLength={2048} onChange={e => set(key, e.target.value)} autoComplete="off" /></label>)}
        {["facebook", "apple"].includes(provider) && <label className="min-w-0 text-sm sm:col-span-2">{provider === "apple" ? "Private key (.p8 PEM)" : "App secret"} {config.secretConfigured ? "(saved)" : ""}
          {provider === "apple" ? <textarea className={`${inputClass} py-2 font-mono`} rows={5} value={values.secret || ""} onChange={e => set("secret", e.target.value)} autoComplete="off" placeholder={config.secretConfigured ? "Leave blank to keep saved key" : "-----BEGIN PRIVATE KEY-----"} /> : <input type="password" className={inputClass} value={values.secret || ""} onChange={e => set("secret", e.target.value)} autoComplete="new-password" placeholder={config.secretConfigured ? "Leave blank to keep saved secret" : "App secret"} />}
        </label>}
      </>}
      <div className="flex justify-end sm:col-span-2"><button type="submit" disabled={!draft || isLoading} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-(--brand-primary) px-4 text-sm font-bold text-white disabled:opacity-50"><FiSave aria-hidden="true" />{isLoading ? "Saving..." : "Save"}</button></div>
    </fieldset>
    </form>
  </details>;
}

export default function CustomerAuthSettings({ locationId }) {
  const { currentData: data, isLoading, error, refetch } = useGetCustomerAuthQuery(locationId);
  return <section className="mt-6 min-w-0" aria-labelledby="customer-auth-heading">
    <h2 id="customer-auth-heading" className="text-xl font-bold">Customer authentication</h2>
    {isLoading && <p role="status" className="py-4 text-sm">Loading authentication settings...</p>}
    {error && <div role="alert" className="py-4 text-sm">{error?.data?.message || "Settings could not be loaded."} <button type="button" onClick={refetch} className="inline-flex min-h-11 items-center gap-2 underline"><FiRefreshCw />Retry</button></div>}
    {!error && data && Object.keys(names).map(provider => <ProviderForm key={`${locationId || "platform"}:${provider}`} provider={provider} config={data[provider]} locationId={locationId} />)}
  </section>;
}
