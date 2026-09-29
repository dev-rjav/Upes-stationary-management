// Kiosk item GRID. Norman pass:
// - One obvious action per card: unselected shows a single big "+ Add"; selected shows the stepper.
// - Hard constraint: + is disabled at cap; the card says why in plain words with the real number.
// - Selected state is unmistakable: accent border + tinted card + check mark.
export default function ItemSelector({ items, caps, selected, setQty }) {
  const capMap = Object.fromEntries((caps || []).map((c) => [c.item_id, c]));

  const maxFor = (it) => {
    const cap = capMap[it.id];
    if (!cap || cap.is_bulk) return 999;
    return Math.max(0, Math.min(cap.monthly_left ?? 999, cap.weekly_left ?? 999));
  };

  const capWord = (it) => {
    const cap = capMap[it.id];
    if (!cap || cap.is_bulk) return null;
    const m = cap.monthly_left ?? 999;
    const w = cap.weekly_left ?? 999;
    // say the binding limit, in plain words
    return w < m ? `up to ${w} this week` : `up to ${m} this month`;
  };

  return (
    <div className="k-grid">
      {items.map((it) => {
        const qty = selected[it.id] || 0;
        const cap = capMap[it.id];
        const max = maxFor(it);
        const atMax = qty >= max;
        const word = capWord(it);
        return (
          <div className={`k-card ${qty > 0 ? "sel" : ""}`} key={it.id}>
            <div className="k-card-top">
              <div className="nm">
                {it.name}
                <small>
                  {it.unit}
                  {it.rate ? ` · ₹${Number(it.rate).toLocaleString("en-IN")}` : ""}
                </small>
              </div>
              {qty > 0 && <span className="k-check" aria-hidden="true">✓</span>}
            </div>

            {qty === 0 ? (
              <button type="button" className="k-add" disabled={max <= 0} onClick={() => setQty(it.id, 1)}>
                {max <= 0 ? "Limit reached" : "+ Add"}
              </button>
            ) : (
              <>
                <div className="k-stepper">
                  <button type="button" aria-label={`Less ${it.name}`} onClick={() => setQty(it.id, Math.max(0, qty - 1))}>
                    −
                  </button>
                  <span className="qv" aria-live="polite">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="plus"
                    aria-label={`More ${it.name}`}
                    disabled={atMax}
                    onClick={() => setQty(it.id, Math.min(max, qty + 1))}
                  >
                    +
                  </button>
                </div>
                {atMax && cap && !cap.is_bulk && (
                  <div className="k-limit">
                    That's the limit — {word ? word.replace("up to ", "") : max}.
                  </div>
                )}
              </>
            )}

            {qty === 0 && word && (
              <div className="k-cap">{word}</div>
            )}
            {qty === 0 && cap?.is_bulk && <div className="k-cap ok">no limit</div>}
          </div>
        );
      })}
    </div>
  );
}