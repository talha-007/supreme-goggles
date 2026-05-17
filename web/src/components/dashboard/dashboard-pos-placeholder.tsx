/**
 * Shown while the split POS chunk loads — keeps layout height stable to limit CLS in Lighthouse.
 */
export function DashboardPosPlaceholder() {
  return (
    <div
      className="min-h-[360px] w-full overflow-hidden rounded-xl border border-dashed border-zinc-200 bg-zinc-100/30"
    >
      <div className="h-full w-full animate-pulse bg-gradient-to-b from-zinc-100/80 to-zinc-50/50" />
    </div>
  );
}
