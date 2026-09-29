import { useState } from "react";
import { fulfillRequest, rejectRequest, recordReturn } from "../../api/requests";

export default function RequestCard({ req, onDone }) {
  const [busy, setBusy] = useState("");
  const [returning, setReturning] = useState(false);
  const [ret, setRet] = useState({ item_id: "", qty: 1, reason: "" });
  const [msg, setMsg] = useState("");

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    setMsg("");
    try {
      const r = await fn();
      if (okMsg) setMsg(okMsg(r));
      onDone();
    } catch (e) {
      const d = e.response?.data || {};
      setMsg(
        d.error === "insufficient stock" && d.shortages
          ? "Not enough stock: " + d.shortages.map((s) => `${s.item} (need ${s.requested}, have ${s.available})`).join("; ")
          : d.error || "action failed"
      );
    } finally {
      setBusy("");
    }
  };

  const doReturn = () =>
    act(
      "ret",
      () => recordReturn(req.id, { item_id: Number(ret.item_id), qty: Number(ret.qty), reason: ret.reason }),
      (r) => {
        const d = r.data;
        return `Returned ${d.return.qty} × ${d.line.item} — stock updated (${d.line.issued - d.line.returned} consumed).`;
      }
    );

  const total = req.items.reduce((s, i) => s + (i.qty || 0), 0);
  const returnable = req.items.filter((i) => i.qty - (i.returned || 0) > 0);

  return (
    <div className="card req-card">
      <div className="who">
        <b>{req.teacher}</b>{" "}
        {req.is_override && <span className="badge override" title={req.override_reason || ""}>OVERRIDE</span>}
        <div className="meta">
          #{req.id} · {req.teacher_sap} · {req.cluster} · {req.created_at} · {req.created_by === "teacher" ? "via kiosk" : `by ${req.created_by}`}
          {req.acted_by && <> · acted by <b>{req.acted_by}</b></>}
        </div>
        {req.is_override && req.override_reason && <div className="meta" style={{ marginTop: 4 }}>Override reason: {req.override_reason}</div>}
        {req.status === "rejected" && req.reject_reason && <div className="meta" style={{ marginTop: 4, color: "var(--bad)" }}>Rejected: {req.reject_reason}</div>}
        <div className="lines">
          {req.items.map((i) => (
            <span key={i.id} title={`issued ${i.qty}${i.returned ? ` · returned ${i.returned} · consumed ${i.qty - i.returned}` : ""}`}>
              {i.qty} {i.unit || ""} {i.item}
              {i.returned > 0 && <b style={{ color: "var(--ok)" }}> (↩{i.returned})</b>}
            </span>
          ))}
        </div>
        {msg && <div className="small mt" style={{ marginTop: 8, color: msg.startsWith("Returned") ? "var(--ok)" : "var(--bad)", fontWeight: 600 }}>{msg}</div>}
        {returning && req.status === "fulfilled" && returnable.length > 0 && (
          <div className="ret-form">
            <select value={ret.item_id} onChange={(e) => setRet({ ...ret, item_id: e.target.value })} required>
              <option value="">Item…</option>
              {returnable.map((i) => (
                <option key={i.id} value={i.item_id}>
                  {i.item} (can return {i.qty - (i.returned || 0)})
                </option>
              ))}
            </select>
            <input type="number" min="1" value={ret.qty} onChange={(e) => setRet({ ...ret, qty: e.target.value })} style={{ width: 80 }} aria-label="Return quantity" />
            <input placeholder="Reason (optional)" value={ret.reason} onChange={(e) => setRet({ ...ret, reason: e.target.value })} style={{ flex: 2 }} />
            <button className="btn ok sm" disabled={busy === "ret" || !ret.item_id} onClick={doReturn}>
              {busy === "ret" ? "Saving…" : "Record return"}
            </button>
            <button className="btn sm" onClick={() => setReturning(false)}>Cancel</button>
          </div>
        )}
      </div>
      <div className="actions">
        {req.status === "pending" ? (
          <>
            <button className="btn ok sm" disabled={!!busy} onClick={() => act("f", () => fulfillRequest(req.id))}>
              {busy === "f" ? "…" : `✓ Fulfill (${total})`}
            </button>
            <button className="btn bad sm" disabled={!!busy} onClick={() => act("r", () => rejectRequest(req.id))}>
              {busy === "r" ? "…" : "✕ Reject"}
            </button>
          </>
        ) : (
          <span className={`badge ${req.status}`}>{req.status}</span>
        )}
        {req.status === "fulfilled" && returnable.length > 0 && !returning && (
          <button className="btn sm" onClick={() => { setReturning(true); setRet({ item_id: "", qty: 1, reason: "" }); }}>
            ↩ Return
          </button>
        )}
      </div>
    </div>
  );
}