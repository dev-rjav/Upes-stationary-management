import { useState } from "react";
import { fulfillRequest, rejectRequest } from "../../api/requests";

export default function RequestCard({ req, onDone }) {
  const [busy, setBusy] = useState(false);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn(req.id);
      if (okMsg) alert(okMsg);
      onDone();
    } catch (e) {
      alert(e.response?.data?.error || "action failed");
    } finally {
      setBusy(false);
    }
  };

  const total = req.items.reduce((s, i) => s + (i.qty || 0), 0);

  return (
    <div className="card req-card">
      <div className="who">
        <b>{req.teacher}</b>{" "}
        {req.is_override && <span className="badge override" title={req.override_reason || ""}>OVERRIDE</span>}
        <div className="meta">
          {req.teacher_sap} · {req.cluster} · {req.created_at} · {req.created_by === "teacher" ? "via kiosk" : `by ${req.created_by}`}
        </div>
        {req.is_override && req.override_reason && <div className="meta" style={{ marginTop: 4 }}>Reason: {req.override_reason}</div>}
        <div className="lines">
          {req.items.map((i) => (
            <span key={i.id}>
              {i.qty} {i.unit || ""} {i.item}
            </span>
          ))}
        </div>
      </div>
      <div className="actions">
        {req.status === "pending" ? (
          <>
            <button className="btn ok sm" disabled={busy} onClick={() => act(fulfillRequest, null)}>
              ✓ Fulfill ({total})
            </button>
            <button className="btn bad sm" disabled={busy} onClick={() => act(rejectRequest)}>
              ✕ Reject
            </button>
          </>
        ) : (
          <span className={`badge ${req.status}`}>{req.status}</span>
        )}
      </div>
    </div>
  );
}