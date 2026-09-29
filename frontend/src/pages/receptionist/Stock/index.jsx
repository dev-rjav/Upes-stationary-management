import { useCallback, useEffect, useState } from "react";
import { listStock, stockIn, stockHistory } from "../../../api/stock";
import StockTable from "../../../components/StockTable";

export default function Stock() {
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState({ item_id: "", qty: "", unit_rate: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listStock({ q: q || undefined, low: lowOnly ? 1 : undefined })
      .then((r) => setRows(r.data))
      .catch((e) => alert(e.response?.data?.error || "failed to load"));
    stockHistory().then((r) => setHistory(r.data)).catch(() => {});
  }, [q, lowOnly]);

  useEffect(load, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.item_id || !form.qty) return;
    setBusy(true);
    try {
      await stockIn({ item_id: Number(form.item_id), qty: Number(form.qty), unit_rate: Number(form.unit_rate || 0) });
      setForm({ item_id: "", qty: "", unit_rate: "" });
      load();
    } catch (err) {
      alert(err.response?.data?.error || "stock-in failed");
    } finally {
      setBusy(false);
    }
  };

  const lowCount = rows.filter((r) => r.is_low).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Stock</h1>
          <p>{rows.length} items tracked · {lowCount} below threshold</p>
        </div>
        <div className="inline">
          <input placeholder="Filter items…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
          <label className="inline" style={{ fontWeight: 500, cursor: "pointer", gap: 6 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low only
          </label>
        </div>
      </div>

      <div className="card mb" style={{ marginBottom: 16 }}>
        <h3>Quick stock-in</h3>
        <form onSubmit={submit} className="row" style={{ alignItems: "flex-end" }}>
          <label className="fld" style={{ flex: 3, marginBottom: 0 }}>
            <span>Item</span>
            <select value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })} required>
              <option value="">Select item…</option>
              {rows.map((r) => (
                <option key={r.item_id} value={r.item_id}>
                  {r.item} ({r.quantity_on_hand} on hand)
                </option>
              ))}
            </select>
          </label>
          <label className="fld" style={{ flex: 1, marginBottom: 0 }}>
            <span>Qty</span>
            <input type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} required />
          </label>
          <label className="fld" style={{ flex: 1, marginBottom: 0 }}>
            <span>Rate / unit (₹)</span>
            <input type="number" min="0" step="0.01" value={form.unit_rate} onChange={(e) => setForm({ ...form, unit_rate: e.target.value })} />
          </label>
          <button className="btn primary" disabled={busy} style={{ marginBottom: 0 }}>
            {busy ? "Saving…" : "Add stock"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>On hand</h3>
        <StockTable rows={rows} />
      </div>

      {history.length > 0 && (
        <div className="card mt" style={{ marginTop: 16 }}>
          <h3>Recent stock-in batches (rate frozen at purchase — D11)</h3>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Amount</th>
                  <th>Source</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="muted small">{h.created_at}</td>
                    <td>{h.item}</td>
                    <td className="num">{h.qty}</td>
                    <td className="num">₹{h.unit_rate}</td>
                    <td className="num">₹{h.amount.toLocaleString("en-IN")}</td>
                    <td><span className="badge muted">{h.source}</span></td>
                    <td className="muted small">{h.created_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}