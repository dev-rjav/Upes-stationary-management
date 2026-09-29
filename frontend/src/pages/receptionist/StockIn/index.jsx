import { useState } from "react";
import { parseImport, runImport } from "../../../api/stock";
import ExcelPreview from "../../../components/ExcelPreview";

export default function StockIn() {
  const [file, setFile] = useState(null);
  const [matched, setMatched] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");

  const onFile = async (f) => {
    setFile(f);
    setDone("");
    setErr("");
    setMatched([]);
    setUnmatched([]);
    if (!f) return;
    setParsing(true);
    try {
      const r = await parseImport(f);
      const rows = r.data.rows;
      const res = await runImport({ rows, apply: false });
      setMatched(res.data.matched);
      setUnmatched(res.data.unmatched);
    } catch (e) {
      setErr(e.response?.data?.error || "could not parse file");
    } finally {
      setParsing(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      const res = await runImport({ rows: matched.map((m) => ({ item: m.alias, qty: m.qty, rate: m.rate })), apply: true });
      setDone(`Applied ${res.data.matched.length} rows — stock updated, rates frozen.`);
      setMatched([]);
      setFile(null);
    } catch (e) {
      setErr(e.response?.data?.error || "apply failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Stock In</h1>
          <p>
            Vendor Excel import — inconsistent names are fuzzy-matched and learned, so the same file works
            next month with zero setup.
          </p>
        </div>
      </div>

      <div className="card mb" style={{ marginBottom: 16 }}>
        <input type="file" accept=".xlsx,.xls" onChange={(e) => onFile(e.target.files[0])} />
        {parsing && <div className="spinner" />}
        {err && <div className="err">{err}</div>}
        {done && <div className="ok-msg">{done}</div>}
        <p className="muted small" style={{ marginTop: 12 }}>
          Expected columns (any header row in the top 10): <b>Item</b> / <b>Qty</b> / <b>Rate</b> (Rate is
          optional — falls back to the item's current rate).
        </p>
      </div>

      <ExcelPreview matched={matched} unmatched={unmatched} onApply={apply} applying={applying} />
    </>
  );
}