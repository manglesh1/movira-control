import { useState } from 'react';
import { toast } from 'sonner';
import { FiArrowRight, FiCheckCircle, FiDatabase, FiRefreshCw } from 'react-icons/fi';
import PageLayout from '../../layouts/PageLayout';
import SearchableSelect from '../../components/common/SearchableSelect';
import { useTransferSettingsQuery, useTransfersQuery, useTransferQuery, usePreviewTransferMutation, useApplyTransferMutation, useCancelTransferMutation } from '../../features/transfers/transferApi';
import './transfers.css';

const labels = { queued_preview: 'Preview queued', previewing: 'Checking data', ready: 'Ready for review', queued_apply: 'Transfer queued', applying: 'Transferring', completed: 'Completed', failed: 'Stopped', cancelled: 'Cancelled' };
const active = new Set(['queued_preview', 'previewing', 'queued_apply', 'applying']);
const initial = { source: '', destination: '', locationId: '', profile: 'configuration', mode: 'create', name: '', slug: '', copyId: '' };
const errorText = error => error?.data?.message || 'The request could not be completed. Please try again.';
function total(report, field) { return Object.values(report?.counts || {}).reduce((n, row) => n + Number(row[field] || 0), 0); }
function Field({ label, children }) { return <div className="lt-field"><span>{label}</span>{children}</div>; }
function Review({ job, busy, online, onApply, onCancel }) {
  const report = job.report;
  return <section className="lt-panel" aria-live="polite"><div className="lt-heading"><div><small>TRANSFER REVIEW</small><h2>{job.spec.name || 'Location copy'}</h2></div><span className={`lt-status lt-${job.status}`}>{labels[job.status] || job.status}</span></div>
    <p className="lt-route">{job.spec.source} <FiArrowRight aria-hidden="true" /> {job.spec.destination} · Source location {job.spec.locationId}</p>
    {job.error && <p role="alert" className="lt-error">{job.error}</p>}
    {report && <><div className="lt-stats">{[['New records', 'inserted'], ['Updated records', 'updated'], ['Shared references', 'reused']].map(([name, key]) => <div key={key}><strong>{total(report, key).toLocaleString()}</strong><span>{name}</span></div>)}</div>
      <div className="lt-safety"><FiCheckCircle aria-hidden="true" /><span>Customer emails masked. Live credentials and production terminals excluded. Copied message jobs disabled.</span></div>
      <p>Test-only records are preserved. Changes made to previously imported records stop a refresh for review.</p>
      <details><summary>View record counts</summary><div className="lt-table-wrap"><table><thead><tr><th>Data</th><th>New</th><th>Updated</th><th>Reused</th></tr></thead><tbody>{Object.entries(report.counts || {}).map(([name, counts]) => <tr key={name}><td>{name}</td><td>{counts.inserted}</td><td>{counts.updated}</td><td>{counts.reused}</td></tr>)}</tbody></table></div></details>
      {job.status === 'ready' && <p className="lt-muted">Preview passed without saving destination records. Valid until {new Date(report.expiresAt).toLocaleString()}.</p>}
      {job.status === 'completed' && <p className="lt-success">Location {report.destinationLocationId} is ready in {job.spec.destination}. Configure its test reader and sandbox payments in the destination.</p>}
    </>}
    <ol className="lt-events">{(job.events || []).map((event, index) => <li key={`${event.at}-${index}`}><time>{new Date(event.at).toLocaleTimeString()}</time>{event.message}</li>)}</ol>
    <div className="lt-actions">
      {job.status === 'ready' && <button className="lt-primary" disabled={busy || !online || new Date(report?.expiresAt).getTime() < Date.now()} onClick={() => onApply(job)}>{job.spec.mode === 'refresh' ? 'Refresh test location' : 'Create test location'}</button>}
      {['queued_preview', 'ready', 'queued_apply'].includes(job.status) && <button disabled={busy} onClick={() => onCancel(job.id)}>Cancel</button>}
    </div>
  </section>;
}
export default function LocationTransfers() {
  const settings = useTransferSettingsQuery(undefined, { pollingInterval: 15000 });
  const list = useTransfersQuery(undefined, { pollingInterval: 4000 });
  const [form, setForm] = useState(initial);
  const [selectedId, setSelectedId] = useState('');
  const detail = useTransferQuery(selectedId, { skip: !selectedId, pollingInterval: 2500 });
  const [preview, previewState] = usePreviewTransferMutation();
  const [apply, applyState] = useApplyTransferMutation();
  const [cancel, cancelState] = useCancelTransferMutation();
  const busy = previewState.isLoading || applyState.isLoading || cancelState.isLoading;
  const config = settings.data?.data;
  const environments = config?.environments || [];
  const jobs = list.data?.data || [];
  const job = detail.data?.data;
  const online = config?.workerOnline === true;
  const completed = [...new Map(jobs.filter(j => j.status === 'completed').map(j => [j.spec.copyId, j])).values()];
  function set(key, value) { setForm(current => ({ ...current, [key]: value, ...(key === 'mode' ? { copyId: '' } : {}) })); }
  function chooseCopy(id) { const copy = completed.find(j => j.spec.copyId === id); if (copy) setForm(current => ({ ...current, ...copy.spec, mode: 'refresh' })); }
  async function requestPreview(event) { event.preventDefault(); try { const result = await preview(form).unwrap(); setSelectedId(result.data.id); toast.success('Preview queued.'); } catch (error) { toast.error(errorText(error)); } }
  async function applyReviewed(value) { try { await apply({ id: value.id, planHash: value.report.planHash }).unwrap(); toast.success('Reviewed transfer queued.'); } catch (error) { toast.error(errorText(error)); } }
  async function cancelSelected(id) { try { await cancel(id).unwrap(); toast.success('Transfer cancelled.'); } catch (error) { toast.error(errorText(error)); } }
  return <PageLayout heading="Location transfers" sectionKicker="MOVIRA CONTROL" breadcrumb={[{ label: 'Control', link: '/movira-control/parks' }, { label: 'Location transfers' }]}><div className="lt-page">
    <div className="lt-intro"><FiDatabase aria-hidden="true" /><div><h2>Copy a location between environments</h2><p>Preview the data, review the result, then create or refresh a test location.</p></div></div>
    {(settings.isError || list.isError) && <p role="alert" className="lt-error">{settings.error?.data?.message || list.error?.data?.message || 'Transfer service could not be loaded.'}</p>}
    {!settings.isLoading && !online && <div className="lt-notice" role="status"><strong>{config?.configured ? 'Transfer service is offline' : 'Connect your environments'}</strong><p>An administrator needs to configure and start the dedicated transfer service before a copy can run. Database credentials stay on the server.</p></div>}
    <div className="lt-columns"><form className="lt-panel" onSubmit={requestPreview}><div className="lt-heading"><h2>1. Choose data</h2><small>Production destinations blocked</small></div>
      <fieldset className="lt-radios"><legend>Transfer mode</legend>{[['create', 'Create a new copy'], ['refresh', 'Refresh a tracked copy']].map(([value, name]) => <label key={value}><input type="radio" name="transfer-mode" value={value} checked={form.mode === value} onChange={() => set('mode', value)} />{name}</label>)}</fieldset>
      {form.mode === 'refresh' && <Field label="Tracked copy"><SearchableSelect value={form.copyId} options={completed.map(j => ({ value: j.spec.copyId, label: `${j.spec.name} · ${j.spec.destination}` }))} onChange={chooseCopy} placeholder="Choose a completed copy" emptyText="No tracked copies yet" /></Field>}
      <div className="lt-form-grid"><Field label="Source environment"><SearchableSelect value={form.source} disabled={form.mode === 'refresh'} options={environments.filter(e => e.readable).map(e => ({ value: e.key, label: e.label }))} onChange={value => set('source', value)} placeholder="Copy from" /></Field>
        <Field label="Destination environment"><SearchableSelect value={form.destination} disabled={form.mode === 'refresh'} options={environments.filter(e => e.writable && e.key !== form.source).map(e => ({ value: e.key, label: e.label }))} onChange={value => set('destination', value)} placeholder="Copy into" /></Field></div>
      <label className="lt-field">Source location ID<input required type="number" min="1" step="1" value={form.locationId} disabled={form.mode === 'refresh'} onChange={e => set('locationId', e.target.value)} /></label>
      <fieldset className="lt-radios"><legend>Data to include</legend>{[['configuration', 'Configuration and catalogue'], ['full', 'Configuration, customers and history']].map(([value, name]) => <label key={value}><input type="radio" name="transfer-profile" value={value} checked={form.profile === value} onChange={() => set('profile', value)} />{name}</label>)}</fieldset>
      {form.mode === 'create' && <div className="lt-form-grid"><label className="lt-field">New location name<input required maxLength="160" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Vaughan QA" /></label><label className="lt-field">New location URL name<input required maxLength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="vaughan-qa" /></label></div>}
      <p className="lt-muted">Existing public images retain their links. Test readers, payment credentials and delivery settings belong to the destination and are preserved on refresh.</p>
      <button className="lt-primary" type="submit" disabled={!online || busy || !form.source || !form.destination || (form.mode === 'refresh' && !form.copyId)}><FiRefreshCw aria-hidden="true" />{previewState.isLoading ? 'Queuing preview…' : 'Preview transfer'}</button>
    </form>
      <div>{selectedId ? detail.isError ? <p role="alert" className="lt-error">Transfer details could not be loaded.</p> : job ? <Review job={job} busy={busy} online={online} onApply={applyReviewed} onCancel={cancelSelected} /> : <section className="lt-panel">Loading transfer…</section> : <section className="lt-panel lt-empty"><FiDatabase aria-hidden="true" /><h2>2. Review before transferring</h2><p>Your preview will show new and updated records, conflicts and validation results here.</p></section>}</div>
    </div>
    <section className="lt-panel"><div className="lt-heading"><h2>Transfer history</h2><button type="button" onClick={() => list.refetch()} disabled={list.isFetching}>Refresh history</button></div>{!jobs.length ? <p className="lt-muted">Completed and stopped transfers will appear here.</p> : <div className="lt-history">{jobs.map(item => <button type="button" key={item.id} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}><span><strong>{item.spec.name || `Location ${item.spec.locationId}`}</strong><small>{item.spec.source} → {item.spec.destination} · {new Date(item.created_at).toLocaleString()}</small></span><span className={`lt-status lt-${item.status}`}>{active.has(item.status) && <FiRefreshCw aria-hidden="true" />}{labels[item.status] || item.status}</span></button>)}</div>}</section>
  </div></PageLayout>;
}
