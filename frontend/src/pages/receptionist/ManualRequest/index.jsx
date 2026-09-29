import { useEffect, useState } from "react";
import { listItems, addAlias } from "../../../api/items";
import { createManualRequest } from "../../../api/requests";
import { teacherSuggestions } from "../../../api/teacher";
import useCapCheck from "../../../hooks/useCapCheck";

// D12: receptionist-created request; the override flag bypasses caps and is logged with a reason.
export default function ManualRequest() {
  const [items, setItems] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [q, setQ] = useState("");
  const [sugg, setSugg] = useState([]);
  const [lines, setLines] = useState([{ item_id: "", qty: 1 }]);
  const [isOverride, setIsOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState("");
  const { caps } = useCapCheck(teacher?.sap_id);

  useEffect(() => {
    listItems().then((r) => setItems(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    if (q.length < 2) return setSugg([]);
    const t = setTimeout(() => teacherSuggestions(q).then((r) => setSugg(r.data)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  const capOf = (id) => (caps || []).find((c) => c.item_id === id);

  const submit = async (e) => {
    e.preventDefault();
    if (!teacher) return setDone("Pick a teacher first.");
    const payload = {
      teacher_id: teacher.id,
      items: lines.filter((l) => l.item_id).map((l) => ({ item_id: Number(l.item_id), qty: Number(l.qty) })),
      is_override: isOverride,
      override_reason: reason,
    };
    try {
      const r = await createManualRequest(payload);
      setDone(`Created request #${r.data.request.id} (${r.data.request.status}).`);
      setLines([{ item_id: "", qty: 1 }]);
      setReason("");
    } catch (err) {
      setDone(err.response?.data?.error + (err.response?.data?.details ? "\n" + err.response.data.details.map((d) => d.error).join("\n") : ""));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Manual / Override</h1>
          <p>
            For issues made at the counter without the kiosk, and for cap overrides (cluster-head approval is
            offline — log the reason here). Overrides never consume the teacher's cap budget.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="card">
        <div className="row">
          <div style={{ flex: 2, position: "relative" }}>
            <label className="fld">
              <span>Teacher (type name — historical records have no SAP IDs)</span>
              <input value={teacher ? `${teacher.name} · ${teacher.cluster}` : q} onChange={(e) => { setTeacher(null); setQ(e.target.value); }} placeholder="Search name…" />
            </label>
            {sugg.length > 0 && !teacher && (
              <div className="card" style={{ position: "absolute", zIndex: 5, width: "100%", boxShadow: "var(--shadow)" }}>
                {sugg.map((s) => (
                  <div key={s.id} className="item-row" style={{ cursor: "pointer" }} onClick={() => { setTeacher(s); setQ(""); }}>
                    <span className="nm">{s.name}<small>{s.cluster}</small></span>
                    <span className="cap-chip">match {s.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 12 }}>
            <label className="inline" style={{ cursor: "pointer", gap: 6, fontWeight: 600 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={isOverride} onChange={(e) => setIsOverride(e.target.checked)} /> Cap override
            </label>
          </div>
        </div>
        {isOverride && (
          <label className="fld">
            <span>Override reason (required, stored on the request)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder='e.g. "Cluster head approved 5 extra files for the audit"' required={isOverride} />
          </label>
        )}

        <h3 style={{ fontSize: 13.5, color: "var(--ink-2)", fontWeight: 600, margin: "10px 0 8px" }}>Items</h3>
        {lines.map((l, i) => {
          const cap = capOf(Number(l.item_id));
          return (
            <div className="item-row" key={i}>
              <select value={l.item_id} onChange={(e) => { const nx = [...lines]; nx[i] = { ...l, item_id: e.target.value }; setLines(nx); }} style={{ flex: 3 }}>
                <option value="">Select item…</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>{it.name}</option>
                ))}
              </select>
              <input type="number" min="1" value={l.qty} onChange={(e) => { const nx = [...lines]; nx[i] = { ...l, qty: e.target.value }; setLines(nx); }} className="qty-input" />
              {cap && !cap.is_bulk && (
                <span className={`cap-chip ${!isOverride && cap.monthly_left != null && l.qty > cap.monthly_left ? "hot" : ""}`}>
                  {isOverride ? "override: cap ignored" : `left this month: ${cap.monthly_left ?? "∞"}`}
                </span>
              )}
              {cap?.is_bulk && <span className="badge bulk">bulk</span>}
              <button type="button" className="btn sm bad" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>
            </div>
          );
        })}
        <div className="mt" style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <button type="button" className="btn sm" onClick={() => setLines([...lines, { item_id: "", qty: 1 }])}>+ Add line</button>
          <button type="submit" className="btn primary sm" style={{ marginLeft: "auto" }} disabled={!teacher}>
            {isOverride ? "Create override request" : "Create request"}
          </button>
        </div>
        {done && <div className={done.startsWith("Created") ? "ok-msg" : "err"} style={{ marginTop: 12 }}>{done}</div>}
      </form>
    </>
  );
}