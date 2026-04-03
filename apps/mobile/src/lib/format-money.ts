const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPkr(amount: number): string {
  return pkr.format(amount);
}
