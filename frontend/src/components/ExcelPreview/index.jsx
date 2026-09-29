export default function ExcelPreview({ matched, unmatched, onApply, applying }) {
  return (
    <div>
      <div className="card mb" style={{ marginBottom: 14 }}>
        <h3>
          Matched — {matched.length} rows{" "}
          <span className="muted small">(alias = learned name · fuzzy = thefuzz match, alias saved for next time)</span>
        </h3>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Vendor name</th>
                <th>Canonical item</th>
                <th>Method</th>
                <th className="num">Qty</th>
                <th className="num">Rate</th>
              </tr>
            </thead>
            <tbody>
              {matched.map((m, i) => (
                <tr key={i}>
                  <td>{m.alias}</td>
                  <td>
                    {m.item} {m.method === "fuzzy" && <span className="badge muted">score {m.score}</span>}
                  </td>
                  <td><span className={`badge ${m.method === "fuzzy" ? "pending" : "fulfilled"}`}>{m.method}</span></td>
                  <td className="num">{m.qty}</td>
                  <td className="num">₹{m.rate}</td>
                </tr>
              ))}
              {matched.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    Nothing matched yet — upload a file with Item / Qty / Rate columns.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {unmatched.length > 0 && (
        <div className="card mb" style={{ marginBottom: 14 }}>
          <h3>Unmatched — {unmatched.length} rows (ignored unless you add the item first)</h3>
          <div className="lines" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {unmatched.map((u, i) => (
              <span key={i} className="badge low">{u.alias} × {u.qty}</span>
            ))}
          </div>
        </div>
      )}
      {matched.length > 0 && (
        <button className="btn ok" disabled={applying} onClick={onApply}>
          {applying ? "Applying…" : `Apply ${matched.length} stock-in rows`}
        </button>
      )}
    </div>
  );
}