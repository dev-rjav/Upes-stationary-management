// The cart is a LIST (product decision), reached from the sticky bar.
// Norman pass: same state as the grid (mapping), every row adjustable (−/× = undo),
// totals always visible, one big "Place request" (leverage), error recovery panel
// if the server ever rejects.
export default function KioskCart({ open, onClose, lines, caps, setQty, totalQty, totalRs, onPlace, placing, error }) {
  const capMap = Object.fromEntries((caps || []).map((c) => [c.item_id, c]));
  const maxFor = (it) => {
    const cap = capMap[it.id];
    if (!cap || cap.is_bulk) return 999;
    return Math.max(0, Math.min(cap.monthly_left ?? 999, cap.weekly_left ?? 999));
  };
  if (!open) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Your request">
        <div className="head">
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>
            Your request <span className="muted small">({lines.length} item{lines.length === 1 ? "" : "s"})</span>
          </h3>
          <button type="button" className="sheet-x" aria-label="Close and keep picking" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && (
          <div className="err" style={{ margin: "0 0 12px", whiteSpace: "normal" }}>
            {error}
          </div>
        )}

        <div className="body">
          {lines.length === 0 ? (
            <div className="empty">Nothing here yet — tap + on an item.</div>
          ) : (
            lines.map(({ it, qty }) => (
              <div className="cart-row" key={it.id}>
                <div className="nm">
                  {it.name}
                  <small>
                    {it.unit}
                    {it.rate ? ` · ₹${Number(it.rate).toLocaleString("en-IN")} each` : ""}
                    {qty >= maxFor(it) && capMap[it.id] && !capMap[it.id].is_bulk ? " · limit reached" : ""}
                  </small>
                </div>
                <div className="k-stepper small">
                  <button type="button" aria-label={`Less ${it.name}`} onClick={() => setQty(it.id, Math.max(0, qty - 1))}>
                    −
                  </button>
                  <span className="qv">{qty}</span>
                  <button
                    type="button"
                    className="plus"
                    aria-label={`More ${it.name}`}
                    disabled={qty >= maxFor(it)}
                    onClick={() => setQty(it.id, Math.min(maxFor(it), qty + 1))}
                  >
                    +
                  </button>
                </div>
                                <div className="row-total" style={{ minWidth: 58, textAlign: "right", fontWeight: 700 }}>
                  {it.rate ? `₹${Math.round(it.rate * qty).toLocaleString("en-IN")}` : "—"}
                </div>
                <button type="button" className="rm" aria-label={`Remove ${it.name}`} onClick={() => setQty(it.id, 0)}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        <div className="foot">
          <div className="inline" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <span className="muted">{totalQty} unit{totalQty === 1 ? "" : "s"} total</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>
              {totalRs > 0 ? `₹${Math.round(totalRs).toLocaleString("en-IN")}` : "Free issue"}
            </span>
          </div>
          <button type="button" className="btn primary xl" disabled={placing || lines.length === 0} onClick={onPlace}>
            {placing ? "Placing your request…" : "Place request →"}
          </button>
          <button type="button" className="sheet-keep" onClick={onClose}>
            ← Keep picking
          </button>
        </div>
      </div>
    </>
  );
}