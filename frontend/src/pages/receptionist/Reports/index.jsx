import { useCallback, useEffect, useState } from "react";
import { listReports, getReport, reportCsvUrl } from "../../../api/reports";

export default function Reports() {
  const [kinds, setKinds] = useState({});
  const [kind, setKind] = useState("monthly");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    listReports().then((r) => setKinds(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setErr("");
    setRows(null);
    getReport(kind, month)
      .then((r) => setRows(r.data.rows))
      .catch((e) => setErr(e.response?.data?.error || "failed to load"));
  }, [kind, month]);

  useEffect(load, [load]);

  const inr = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
  const COLS = {
    monthly: [["date", "Date"], ["teacher", "Teacher"], ["cluster", "Cluster"], ["item", "Item"], ["qty", "Qty"], ["rate", "Rate"], ["amount", "Amount"], ["override", "Ovr"]],
    top_items: [["item", "Item"], ["qty", "Qty"], ["amount", "Spend"]],
    cluster: [["cluster", "Cluster"], ["qty", "Units"], ["amount", "Spend"]],
    teacher: [["teacher", "Teacher"], ["sap", "SAP ID"], ["cluster", "Cluster"], ["qty", "Units"], ["amount", "Spend"]],
  }[kind];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p>{kinds[kind] || ""} · CSV download only (D22).</p>
        </div>
        <div className="inline">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 170 }} />
          <a className="btn primary" href={reportCsvUrl(kind, month)} target="_blank" rel="noreferrer" download>
            ⬇ Download CSV
          </a>
        </div>
      </div>

      <div className="tabs">
        {Object.keys(COLS || { monthly: 1, top_items: 1, cluster: 1, teacher: 1 }).map((k) => (
          <button key={k} className={kind === k ? "active" : ""} onClick={() => setKind(k)}>
            {k === "top_items" ? "Top items" : k === "cluster" ? "By cluster" : k === "teacher" ? "By teacher" : "Month detail"}
          </button>
        ))}
      </div>

      {err && <div className="err">{err}</div>}
      {!rows && !err && <div className="spinner" />}
      {rows && (
        <div className="card">
          <p className="muted small mb" style={{ marginBottom: 10 }}>{rows.length} rows · month {month}</p>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  {COLS.map(([k, label]) => (
                    <th key={k} className={/\d/.test(label) || label === "Qty" || label === "Rate" || label === "Amount" || label === "Spend" || label === "Units" ? "num" : ""}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i}>
                    {COLS.map(([k]) => {
                      let v = r[k];
                      if (["qty", "rate", "amount", "spend"].includes(k.toLowerCase()) || (k === "rate")) v = typeof v === "number" && (k === "amount" || k === "rate") ? inr(v) : v;
                      if (k === "override") v = r[k] ? "OVERRIDE" : "";
                      return <td key={k} className={typeof v === "number" ? "num" : ""}>{v ?? "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 200 && <p className="muted small mt">Showing first 200 — download the CSV for the full set.</p>}
        </div>
      )}
    </>
  );
}