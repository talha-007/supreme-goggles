/** Trial length when auto-setting `subscription_ends_at` for new trial rows. */
export const SUBSCRIPTION_TRIAL_DAYS = 14;

/** Trial end = business `created_at` + trial days (used when saving status `trial` with no end date). */
export function defaultTrialEndsAtIso(createdAtIso: string): string {
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + SUBSCRIPTION_TRIAL_DAYS);
    return fallback.toISOString();
  }
  const end = new Date(d);
  end.setDate(end.getDate() + SUBSCRIPTION_TRIAL_DAYS);
  return end.toISOString();
}

/** End of current paid billing period when status becomes Active (calendar month from `from`). */
export function defaultActiveBillingPeriodEndsAtIso(from: Date = new Date()): string {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
