export default function StockTable({ rows }) {
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit</th>
            <th className="num">Rate</th>
            <th className="num">On hand</th>
            <th className="num">Threshold</th>
            <th>Status</th>
            <th className="num">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.item_id}>
              <td>{r.item}</td>
              <td className="muted">{r.unit}</td>
              <td className="num">₹{r.rate ? Number(r.rate).toLocaleString("en-IN") : "—"}</td>
              <td className="num"><b>{r.quantity_on_hand.toLocaleString("en-IN")}</b></td>
              <td className="num muted">{r.low_stock_threshold}</td>
              <td>{r.is_low ? <span className="badge low">LOW</span> : <span className="badge fulfilled">OK</span>}</td>
              <td className="num muted small">{r.last_updated || "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="empty">
                No stock rows.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}