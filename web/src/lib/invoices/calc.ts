/** Line total: qty × unit price after line discount %. */
export function lineTotal(
  quantity: number,
  unitPrice: number,
  discountPct: number,
): number {
  const gross = quantity * unitPrice;
  const factor = 1 - Math.min(100, Math.max(0, discountPct)) / 100;
  return Math.round(gross * factor * 100) / 100;
}

export function invoiceTotals(
  lineTotals: number[],
  discountAmount: number,
  taxRatePct: number,
): { subtotal: number; tax_amount: number; total_amount: number } {
  const subtotal = Math.round(lineTotals.reduce((a, b) => a + b, 0) * 100) / 100;
  const afterDisc = Math.max(0, subtotal - discountAmount);
  const tax_amount =
    Math.round(afterDisc * (Math.max(0, Math.min(100, taxRatePct)) / 100) * 100) / 100;
  const total_amount = Math.round((afterDisc + tax_amount) * 100) / 100;
  return { subtotal, tax_amount, total_amount };
}
