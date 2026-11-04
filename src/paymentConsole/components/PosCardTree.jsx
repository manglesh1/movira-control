import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCpu, FiPlus, FiTrash2, FiCreditCard, FiRefreshCw, FiEdit2, FiX } from "react-icons/fi";
import { api } from "../api";
import { Button, Input, Badge } from "./ui";
import { appConfirm } from "../../services/appDialog";
import "./PosCardTree.css";
import LegacyPosCardTree from "./LegacyPosCardTree";

const emptyDraft = { label: "", model: "", serialNumber: "", providerTerminalId: "", registerId: "", registerAuthKey: "", registrationCode: "", bridgeEndpoint: "", bridgeAuthToken: "" };

function TerminalCloudSettings({ gateway, disabled, onSave }) {
  const [mid, setMid] = useState(gateway.terminalMid || "");
  const [url, setUrl] = useState(gateway.terminalCloudUrl || "");
  const changed = mid.trim() !== gateway.terminalMid || url.trim() !== gateway.terminalCloudUrl;
  return <form className="control-reader-cloud" onSubmit={async event => {
    event.preventDefault();
    if (disabled || !changed) return;
    if (gateway.locationId == null && !await appConfirm({ title: "Update shared terminal gateway?",
      message: `Credential #${gateway.credentialId} is organization-wide. This changes the terminal cloud settings for every park using it. Online credentials are unchanged.`,
      confirmLabel: "Update shared gateway" })) return;
    await onSave({ terminalMid: mid.trim(), terminalCloudUrl: url.trim() });
  }}>
    <header className="control-reader-header"><h3>Nuvei terminal cloud</h3>
      <span>{gateway.mode} · {gateway.locationId == null ? "Organization gateway" : "Park gateway"} · #{gateway.credentialId} · {gateway.status}</span>
    </header>
    <fieldset disabled={disabled} className="control-reader-cloud-fields">
      <label>In-person MID<Input required maxLength={120} value={mid} onChange={event => setMid(event.target.value)} autoComplete="off" /></label>
      <label>In-person Cloud URL<Input required type="url" value={url} onChange={event => setUrl(event.target.value)} autoComplete="off" /></label>
      <Button type="submit" title={!mid.trim() || !url.trim() ? "In-person MID and Cloud URL are required" : !changed ? "No unsaved changes" : "Save terminal gateway settings"} disabled={!changed || !mid.trim() || !url.trim()}>Save cloud settings</Button>
    </fieldset>
    {!gateway.terminalMid && <p className="control-reader-connectivity-note">In-person MID not configured. Legacy merchant settings may still be used for payments; Nuvei must confirm the correct card-present MID.</p>}
  </form>;
}

export default function PosCardTree({ locationId, onConfigurePos }) {
  return <ParkReaderInventory key={locationId} locationId={locationId} onConfigurePos={onConfigurePos} />;
}

function ParkReaderInventory({ locationId, onConfigurePos }) {
  const [tree, setTree] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [readerCheck, setReaderCheck] = useState(null);
  const [inventoryChecks, setInventoryChecks] = useState({});
  const [checkingReaderId, setCheckingReaderId] = useState(null);
  const [checkingPaymentId, setCheckingPaymentId] = useState(null);
  const [paymentChecks, setPaymentChecks] = useState({});
  const [gatewayNotice, setGatewayNotice] = useState("");
  const checkVersion = useRef(0);
  const [stationName, setStationName] = useState("");
  const generation = useRef(0);
  const editorRef = useRef(null);
  const busyRef = useRef(false);
  busyRef.current = busy;
  useEffect(() => {
    if (!editing) return;
    const previous = document.activeElement;
    const dialog = editorRef.current;
    dialog?.querySelector("input")?.focus();
    const handleKey = event => {
      if (event.key === "Escape" && !busyRef.current) setEditing(null);
      if (event.key !== "Tab") return;
      const fields = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled)")];
      if (!fields.length) { event.preventDefault(); return; }
      const first = fields[0], last = fields.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog?.addEventListener("keydown", handleKey);
    return () => { dialog?.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, [editing]);
  const load = useCallback(async () => {
    const version = ++generation.current;
    setInventoryChecks({});
    setLoading(true);
    try {
      const data = await api.getPosTree(locationId);
      if (version === generation.current) { setTree(data); setError(""); }
    } catch (err) { if (version === generation.current) setError(err.message || "Could not load readers."); }
    finally { if (version === generation.current) setLoading(false); }
  }, [locationId]);
  useEffect(() => {
    const currentGeneration = generation;
    setTree(null); setEditing(null); setDraft(emptyDraft);
    load();
    return () => { currentGeneration.current++; };
  }, [load]);
  async function run(action) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true); setError("");
    try { await action(); await load(); return true; }
    catch (err) { setError(err.message || "Could not save reader settings."); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }
  const readers = tree?.readers || [];
  const stations = tree?.terminals || [];
  const nuvei = tree?.enrollment === "tid-per-till";
  const localBridge = tree?.adapterKey === "nuvei.terminal";
  const canCheck = tree?.adapterKey === "nuvei.terminalCloud";
  const supported = ["tid-per-till", "cloud-readers"].includes(tree?.enrollment);
  const gateway = tree?.terminalGateway;
  const legacyTree = tree && !Array.isArray(tree.readers);
  const stationFor = reader => stations.find(station => Number(station.posDeviceId) === Number(reader.posDeviceId));
  const identity = reader => [reader.model, reader.serialNumber || reader.providerTerminalId].filter(Boolean).join(" / ");
  const selectionLabel = reader => `${reader.displayName} · ${reader.serialNumber ? `Sl. no. ${reader.serialNumber}` : `Terminal ID ${reader.providerTerminalId || "not set"}`}`;
  const openEditor = reader => {
    checkVersion.current++;
    setReaderCheck(null); setError("");
    setEditing(reader || "new");
    setDraft(reader ? { ...emptyDraft, label: reader.displayName || "", model: reader.model || "", serialNumber: reader.serialNumber || "",
      providerTerminalId: reader.providerTerminalId || "", registerId: reader.registerId || "", bridgeEndpoint: reader.bridgeEndpoint || "" } : emptyDraft);
  };
  const set = (key, value) => {
    checkVersion.current++;
    setReaderCheck(null);
    setDraft(current => ({ ...current, [key]: value }));
  };
  function readerBody() {
    const body = { label: draft.label.trim(), model: draft.model.trim(), serialNumber: draft.serialNumber.trim() };
    if (nuvei) {
      body.providerTerminalId = draft.providerTerminalId.trim();
      if (localBridge) Object.assign(body, { bridgeEndpoint: draft.bridgeEndpoint.trim(), bridgeAuthToken: draft.bridgeAuthToken.trim() || undefined });
      else Object.assign(body, { registerId: draft.registerId.trim(), registerAuthKey: draft.registerAuthKey.trim() || undefined });
    }
    else if (editing === "new") body.registrationCode = draft.registrationCode.trim();
    return body;
  }
  async function checkCredentials() {
    if (busyRef.current || !editorRef.current?.reportValidity()) return;
    const version = ++checkVersion.current;
    busyRef.current = true; setBusy(true); setError(""); setReaderCheck(null);
    try {
      const result = await api.testReaderConnection({ locationId, ...readerBody(), ...(editing === "new" ? {} : { terminalId: editing.terminalId }) });
      if (version === checkVersion.current) setReaderCheck(result);
    } catch (err) {
      if (version === checkVersion.current) setError(err.message || "Could not check reader credentials.");
    } finally { busyRef.current = false; setBusy(false); }
  }
  async function checkSavedReader(reader) {
    if (busyRef.current || reader.busy || !reader.compatible) return;
    const version = generation.current;
    busyRef.current = true; setBusy(true); setCheckingReaderId(reader.terminalId);
    setInventoryChecks(current => ({ ...current, [reader.terminalId]: null }));
    try {
      const result = await api.testReaderConnection({ locationId, terminalId: reader.terminalId });
      if (version === generation.current) setInventoryChecks(current => ({ ...current, [reader.terminalId]: result }));
    } catch (err) {
      if (version === generation.current) setInventoryChecks(current => ({ ...current, [reader.terminalId]: {
        ok: false, message: err.message || "Register check could not complete. Device connectivity is unknown.", checkedAt: new Date().toISOString(),
      } }));
    } finally { busyRef.current = false; setBusy(false); setCheckingReaderId(null); }
  }
  async function saveReader(event) {
    event.preventDefault();
    if (canCheck && !readerCheck?.ok) return;
    const body = readerBody();
    const saved = await run(() => editing === "new"
      ? api.addReader({ locationId, ...body })
      : api.updateReader(editing.terminalId, { locationId, ...body, displayName: body.label }));
    if (saved) { setEditing(null); setDraft(emptyDraft); }
  }
  async function checkPendingPayment(payment) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setCheckingPaymentId(payment.transactionId);
    try {
      const result = await api.checkReaderPayment({ locationId, transactionId: payment.transactionId });
      await load();
      setPaymentChecks(current => ({ ...current, [payment.transactionId]: {
        message: result.message || (result.reviewRequired ? "The payment outcome needs review with Nuvei." :
          ["pending", "processing", "authorized"].includes(result.status) ? "Payment remains unresolved. Reader settings remain locked." : `Payment status: ${result.status}.`),
        reason: result.reason,
        checkedAt: result.checkedAt || new Date().toISOString(),
      } }));
    } catch (err) {
      setPaymentChecks(current => ({ ...current, [payment.transactionId]: { message: err.message || "Payment status could not be checked.", checkedAt: new Date().toISOString() } }));
    } finally { busyRef.current = false; setBusy(false); setCheckingPaymentId(null); }
  }
  async function unassign(reader) {
    if (await appConfirm({ title: "Unassign card reader?", message: `${reader.displayName} will stop accepting new payments from ${stationFor(reader)?.name || "its POS"}.`, confirmLabel: "Unassign" })) {
      await run(() => api.updateReader(reader.terminalId, { locationId, posDeviceId: null }));
    }
  }

  return <section className="control-reader-inventory">
    {gateway && <TerminalCloudSettings
      key={`${gateway.credentialId}:${gateway.terminalMid}:${gateway.terminalCloudUrl}`}
      gateway={gateway} disabled={busy || loading}
      onSave={async terminalSettings => {
        checkVersion.current++;
        setReaderCheck(null);
        setGatewayNotice("");
        const saved = await run(() => api.updateCredential(gateway.credentialId, { terminalSettings }, gateway.locationId));
        if (saved) setGatewayNotice("Cloud settings saved. Reader credentials need checking again.");
        return saved;
      }} />}
    {gatewayNotice && <p role="status">{gatewayNotice}</p>}
    {legacyTree && error && <p role="alert" className="control-reader-error">{error}</p>}
    {legacyTree ? <LegacyPosCardTree locationId={locationId} /> : <>
    <header className="control-reader-header">
      <div><h3>Park card readers</h3><span>{readers.length} registered · {readers.filter(reader => reader.posDeviceId != null).length} assigned {tree?.mode ? `· ${tree.mode}` : ""}</span></div>
      <div className="control-reader-actions">
        <Button variant="ghost" size="sm" aria-label="Refresh readers" title="Refresh readers" disabled={busy || loading} onClick={load}><FiRefreshCw /></Button>
        <Button size="sm" disabled={busy || loading || !tree?.routed || !supported} onClick={() => openEditor(null)}><FiPlus /> Add card reader</Button>
      </div>
    </header>
    {error && <p role="alert" className="control-reader-error">{error}</p>}
    {loading && <p role="status">Loading reader inventory...</p>}
    {canCheck && <p className="control-reader-connectivity-note">
      Physical device connectivity is not available from the Nuvei register check. A successful check confirms cloud session access only.
      {" "}<a href="https://docs.nuvei.com/documentation/control-panel-docs/operations/terminal-management/" target="_blank" rel="noreferrer">View Nuvei instructions</a>
      {" "}to check each terminal's Cloud Service Connectivity Status and Last Heartbeat.
    </p>}
    {!loading && !tree?.routed && <div className="control-reader-empty">POS payment route not configured.
      {onConfigurePos && <Button size="sm" onClick={onConfigurePos}>Configure POS route</Button>}
    </div>}
    <div className="control-reader-list">
      {readers.map(reader => <div className="control-reader-row" key={reader.terminalId}>
        <FiCreditCard aria-hidden="true" />
        <div className="control-reader-description"><strong>{reader.displayName}</strong><span>{identity(reader)}</span>
          <span>{reader.providerMode || "Environment needs review"} · {reader.busy ? "Busy - unresolved payment" : reader.availabilityLabel}</span>
          <span><Badge tone="neutral">Device connectivity: unknown</Badge></span>
          {reader.busy && <div className="control-reader-pending">
            <p>Register checks, editing and unassigning are locked while a payment is unresolved. You can check the existing payment below.</p>
            {(reader.pendingPayments || []).map(payment => <div key={payment.transactionId} className="control-reader-pending-attempt">
              <span>Payment #{payment.transactionId} · {payment.currency} {Number(payment.amount).toFixed(2)} · {payment.status}</span>
              <Button variant="outline" size="sm" disabled={busy || loading} aria-label={`Check pending payment ${payment.transactionId}`}
                onClick={() => checkPendingPayment(payment)}>{checkingPaymentId === payment.transactionId ? "Checking payment..." : "Check pending payment"}</Button>
              {paymentChecks[payment.transactionId] && <div role="status" className="control-reader-check-result">
                <span>{paymentChecks[payment.transactionId].message}</span>
                {paymentChecks[payment.transactionId].reason && <span>Payment status code: <code>{paymentChecks[payment.transactionId].reason}</code></span>}
                <span>Checked: <time dateTime={paymentChecks[payment.transactionId].checkedAt}>{new Date(paymentChecks[payment.transactionId].checkedAt).toLocaleString()}</time></span>
              </div>}
            </div>)}
            {!reader.pendingPayments?.length && <span>Refresh readers to load the pending payment. If it is still unavailable, ask an administrator to review the reader reservation.</span>}
          </div>}
          {inventoryChecks[reader.terminalId] && <div role="status" className="control-reader-check-result">
            <Badge tone={inventoryChecks[reader.terminalId].ok ? "blue" : "amber"}>{inventoryChecks[reader.terminalId].ok ? "Register session accepted" : "Register check not verified"}</Badge>
            <span>{inventoryChecks[reader.terminalId].message}</span>
            <span>Checked: <time dateTime={inventoryChecks[reader.terminalId].checkedAt}>{new Date(inventoryChecks[reader.terminalId].checkedAt).toLocaleString()}</time> (your local time)</span>
          </div>}
          {reader.requiresAssignmentReview && <span className="control-reader-error">Assignment needs review{reader.assignmentReviewReasons?.some(reason => ["duplicate_physical_reader", "duplicate_reader_identity"].includes(reason)) ? ": duplicate terminal registration" : ""}.</span>}
          <details className="control-reader-details">
            <summary>Reader details</summary>
            <dl>
              <dt>Reader name</dt><dd>{reader.displayName}</dd>
              <dt>Model</dt><dd>{reader.model || "Not set"}</dd>
              <dt>Sl. no.</dt><dd>{reader.serialNumber || "Not set"}</dd>
              <dt>Terminal ID</dt><dd>{reader.providerTerminalId || "Not set"}</dd>
              <dt>Register ID</dt><dd>{reader.registerId || "Not set"}</dd>
              <dt>Register Auth Key</dt><dd>{reader.hasRegisterAuthKey ? "Saved securely" : "Not set"}</dd>
              {reader.bridgeEndpoint && <><dt>Bridge endpoint</dt><dd>{reader.bridgeEndpoint}</dd><dt>Bridge token</dt><dd>{reader.hasBridgeAuthToken ? "Saved securely" : "Not set"}</dd></>}
            </dl>
          </details>
        </div>
        <Badge tone={reader.posDeviceId == null ? "neutral" : "blue"}>{reader.posDeviceId == null ? "Unassigned" : stationFor(reader)?.name || `POS #${reader.posDeviceId}`}</Badge>
        <div className="control-reader-actions">
          {canCheck && <Button variant="outline" size="sm" disabled={busy || loading || reader.busy || !reader.compatible}
            title={reader.busy ? "Resolve the pending payment before checking the register" : !reader.compatible ? "Correct the reader configuration before checking" : "Check Nuvei register credentials; does not verify device online status"}
            aria-label={`Check register for ${reader.displayName}`} onClick={() => checkSavedReader(reader)}>
            {checkingReaderId === reader.terminalId ? "Checking register..." : "Check register"}
          </Button>}
          {reader.posDeviceId != null && <Button variant="outline" size="sm" title={reader.busy ? "Resolve the pending payment before unassigning" : "Unassign from this POS"} disabled={busy || reader.busy} onClick={() => unassign(reader)}>Unassign</Button>}
          <Button variant="ghost" size="sm" title={reader.busy ? "Resolve the pending payment before editing" : "Edit reader"} aria-label={`Edit ${reader.displayName}`} disabled={busy || reader.busy || (tree.providerId != null && Number(reader.providerId) !== Number(tree.providerId))} onClick={() => openEditor(reader)}><FiEdit2 /></Button>
          <Button variant="ghost" size="sm" title={reader.busy ? "Resolve the pending payment before removing" : reader.posDeviceId != null ? "Unassign the reader before removing it" : "Remove reader"} aria-label={`Remove ${reader.displayName}`} disabled={busy || reader.busy || reader.posDeviceId != null}
            onClick={async () => {
              if (await appConfirm({ title: "Remove card reader?", message: `Remove ${reader.displayName} from this park's inventory? Provider enrollment is not deleted.`, confirmLabel: "Remove" })) {
                run(() => api.removeReaderRow(reader.terminalId, locationId));
              }
            }}><FiTrash2 /></Button>
        </div>
      </div>)}
      {!loading && tree?.routed && !readers.length && <p className="control-reader-empty">No registered card readers.</p>}
    </div>
    <header className="control-reader-header control-reader-stations-heading">
      <h3>POS assignments</h3>
      <form className="control-reader-actions" onSubmit={event => {
        event.preventDefault();
        run(() => api.createTerminal({ locationId, name: stationName.trim() })).then(saved => { if (saved) setStationName(""); });
      }}>
        <Input aria-label="New POS name" placeholder="POS station name" value={stationName} onChange={event => setStationName(event.target.value)} maxLength={120} />
        <Button size="sm" disabled={busy || !stationName.trim()}><FiPlus /> Add POS</Button>
      </form>
    </header>
    {stations.map(station => {
      const assigned = readers.find(reader => Number(reader.posDeviceId) === Number(station.posDeviceId));
      return <div className="control-reader-row" key={station.posDeviceId}>
        <FiCpu aria-hidden="true" /><div className="control-reader-description"><strong>{station.name}</strong><span>{station.isActive === false ? "Inactive" : "Active POS"}{station.pairingCode ? ` · Pairing code ${station.pairingCode}` : ""}</span></div>
        <label className="control-reader-assignment"><span>Assigned card reader</span>
          <select aria-label={`Card reader for ${station.name}`} value={assigned?.terminalId || ""}
            disabled={busy || loading || station.isActive === false || !!assigned || !tree?.routed}
            onChange={async event => {
              const id = event.target.value;
              const selected = readers.find(reader => String(reader.terminalId) === id);
              if (selected?.requiresAssignmentReview && !await appConfirm({ title: "Confirm reader ownership", message: `Confirm that ${selectionLabel(selected)} belongs to this park and should be assigned only to ${station.name}. Any unresolved payments must be reviewed first.`, confirmLabel: "Confirm assignment" })) return;
              if (id) run(() => api.updateReader(id, { locationId, posDeviceId: station.posDeviceId }));
            }}>
            <option value="">Select unassigned reader</option>
            {readers.filter(reader => reader.posDeviceId == null || reader === assigned).map(reader => <option key={reader.terminalId} value={reader.terminalId}
              disabled={!reader.compatible || reader.busy || ["offline", "unpaired"].includes(reader.status)}>
              {selectionLabel(reader)} · {reader.busy ? "Busy" : !reader.compatible ? "Configuration needs review" : reader.availabilityLabel}
            </option>)}
          </select>
          {assigned && <span>{assigned.busy ? "Resolve the pending payment before changing this assignment." : "Unassign the current reader before choosing a replacement."}</span>}
        </label>
        {assigned && <Button variant="outline" size="sm" disabled={busy || assigned.busy} onClick={() => unassign(assigned)}>Unassign</Button>}
        <Button variant="ghost" size="sm" title="Regenerate pairing code" aria-label={`Regenerate pairing for ${station.name}`} disabled={busy}
          onClick={() => run(() => api.regenerateTerminalPairing(station.posDeviceId, locationId))}><FiRefreshCw /></Button>
      </div>;
    })}
    {editing && createPortal(<div className="control-reader-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) setEditing(null); }}>
      <form ref={editorRef} role="dialog" aria-modal="true" aria-label={editing === "new" ? "Add card reader" : "Edit card reader"} className="control-reader-editor" onSubmit={saveReader}>
        <header className="control-reader-header"><h3>{editing === "new" ? "Add card reader" : "Edit card reader"}</h3>
          <Button type="button" variant="ghost" aria-label="Close reader settings" disabled={busy} onClick={() => setEditing(null)}><FiX /></Button>
        </header>
        <span>{tree?.provider} · {editing === "new" ? tree?.mode : editing.providerMode || "Environment needs review"}</span>
        {canCheck && gateway && <dl className="control-reader-gateway-summary">
          <dt>Gateway</dt><dd>#{gateway.credentialId} · {gateway.locationId == null ? "Organization" : "Park"} · {gateway.mode}</dd>
          <dt>In-person MID</dt><dd>{gateway.terminalMid || "Not configured explicitly"}</dd>
          <dt>Cloud URL</dt><dd>{gateway.terminalCloudUrl || "Not configured"}</dd>
        </dl>}
        <fieldset disabled={busy} className="control-reader-form-fields">
        <label>Reader name<Input required maxLength={120} value={draft.label} onChange={event => set("label", event.target.value)} /></label>
        <div className="control-reader-fields"><label>Model<Input maxLength={120} placeholder="e.g. Verifone T650c" value={draft.model} onChange={event => set("model", event.target.value)} /></label>
          <label>Serial number<Input maxLength={120} placeholder="Serial on the device label" value={draft.serialNumber} onChange={event => set("serialNumber", event.target.value)} /></label></div>
        {nuvei ? <>
          <label>Terminal ID<Input required maxLength={120} value={draft.providerTerminalId} onChange={event => set("providerTerminalId", event.target.value)} /></label>
          {localBridge ? <>
            <label>Bridge endpoint<Input required type="url" value={draft.bridgeEndpoint} onChange={event => set("bridgeEndpoint", event.target.value)} /></label>
            <label>New bridge token (optional)<Input type="password" autoComplete="new-password" value={draft.bridgeAuthToken} onChange={event => set("bridgeAuthToken", event.target.value)} /></label>
          </> : <>
          <label>Register ID<Input required maxLength={120} value={draft.registerId} onChange={event => set("registerId", event.target.value)} /></label>
          <label>{editing === "new" ? "Register Auth Key" : "New Register Auth Key (optional)"}<Input type="password" autoComplete="new-password" required={editing === "new"} value={draft.registerAuthKey}
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" onChange={event => set("registerAuthKey", event.target.value)} /></label>
          </>}
        </> : editing === "new" ? <label>Stripe registration code<Input required value={draft.registrationCode} onChange={event => set("registrationCode", event.target.value)} /></label> : null}
        </fieldset>
        {canCheck && <div className="control-reader-check">
          {editing !== "new" && <span>Register Auth Key: {editing.hasRegisterAuthKey ? "saved securely; blank keeps the saved key" : "not set"}.</span>}
          <Button type="button" variant="outline" disabled={busy} onClick={checkCredentials}><FiRefreshCw />{busy ? "Working..." : "Check credentials"}</Button>
          {readerCheck && <p role="status" className={readerCheck.ok ? "control-reader-check-accepted" : "control-reader-error"}>{readerCheck.message}</p>}
        </div>}
        {error && <p role="alert" className="control-reader-error">{error}</p>}
        <footer className="control-reader-actions"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button>
          <Button type="submit" disabled={busy || (canCheck && !readerCheck?.ok)}>Save reader</Button></footer>
      </form>
    </div>, document.body)}
    </>}
  </section>;
}
