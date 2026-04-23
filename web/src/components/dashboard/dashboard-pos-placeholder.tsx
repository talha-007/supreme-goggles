/**
 * Shown while the split POS chunk loads — keeps layout height stable to limit CLS in Lighthouse.
 */
export function DashboardPosPlaceholder() {
  return (
    <div
      className="min-h-[360px] w-full overflow-hidden rounded-xl border border-dashed border-zinc-200 bg-zinc-100/30 dark:border-zinc-800 dark:bg-zinc-900/20"
    >
      <div className="h-full w-full animate-pulse bg-gradient-to-b from-zinc-100/80 to-zinc-50/50 dark:from-zinc-900/60 dark:to-zinc-950/40" />
    </div>
  );
}
