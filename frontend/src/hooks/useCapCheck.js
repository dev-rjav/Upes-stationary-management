export function capInfo(item) {
  const { per_checkout_cap, monthly_cap, monthly_used, monthly_remaining, on_hand } = item;
  const monthlyLeft = monthly_remaining !== undefined && monthly_remaining !== null
    ? monthly_remaining
    : monthly_cap !== null ? monthly_cap - (monthly_used || 0) : null;
  const maxQty = Math.min(
    per_checkout_cap || Infinity,
    monthlyLeft !== null ? monthlyLeft : Infinity,
    on_hand || 0,
  );
  const atCap = monthly_cap !== null && (monthly_used || 0) >= monthly_cap;
  return { maxQty: Math.max(0, maxQty), atCap, monthlyUsed: monthly_used || 0, monthlyLeft };
}
