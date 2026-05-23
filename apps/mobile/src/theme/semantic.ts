import type { ThemePreference } from "../contexts/theme-context";

export type ResolvedScheme = "light" | "dark";

/** Root screen background + common chrome (light mode matches web zinc paper). */
export function screenRootClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "flex-1 bg-neutral-950" : "flex-1 bg-zinc-100";
}

export function activityIndicatorColor(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "#8f66f0" : "#5c22d4";
}

export function refreshControlTint(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "#8f66f0" : "#5c22d4";
}

/** Modal / bottom sheet backdrop panel. */
export function sheetSurfaceClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "bg-neutral-950" : "bg-white";
}

export function headerSurfaceStyle(resolved: ResolvedScheme): { backgroundColor: string } {
  return { backgroundColor: resolved === "dark" ? "#171717" : "#ffffff" };
}

export function headerTint(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "#fafafa" : "#18181b";
}

export function tabBarActiveTint(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "#b89fff" : "#5c22d4";
}

export function tabBarInactiveTint(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "#737373" : "#52525b";
}

/** Primary CTA (Taplite brand violet). */
export function primaryButtonClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mt-2 rounded-xl bg-violet-600 px-4 py-4 active:opacity-90 disabled:opacity-60"
    : "mt-2 rounded-xl bg-violet-600 px-4 py-4 active:opacity-90 disabled:opacity-60";
}

/** “Selected” chip / pill (segmented controls, toggles). */
export function chipActiveBorder(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "border-violet-500 bg-violet-500/15" : "border-violet-600 bg-violet-100";
}

export function chipInactiveBorder(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "border-neutral-700 bg-neutral-900" : "border-zinc-400 bg-zinc-100";
}

export function chipActiveText(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-violet-300" : "text-violet-800";
}

export function chipInactiveText(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-neutral-300" : "text-zinc-800";
}

export function positiveAmountClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-violet-300" : "text-violet-700";
}

export function subtlePositiveClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-violet-400" : "text-violet-700";
}

export function paidBadgeClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "bg-brand-950 text-brand-400" : "bg-brand-100 text-brand-800";
}

/** Centered loading / empty state on the main canvas. */
export function screenCenterRootClass(resolved: ResolvedScheme): string {
  return `${screenRootClass(resolved)} items-center justify-center`;
}

/** Primary scroll surface under headers (tabs). */
export function scrollCanvasClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "flex-1 bg-neutral-950" : "flex-1 bg-zinc-100";
}

export function textPageTitleClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-neutral-100" : "text-zinc-900";
}

export function textSectionBodyClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-neutral-200" : "text-zinc-800";
}

export function textBodyClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-neutral-300" : "text-zinc-800";
}

export function textMutedClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-neutral-500" : "text-zinc-600";
}

export function textSubtleClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-neutral-400" : "text-zinc-700";
}

export function textFieldLabelClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-neutral-300" : "text-zinc-800";
}

export function textStrongOnSurfaceClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-neutral-100" : "text-zinc-900";
}

export function listEntityCardClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mb-2 rounded-2xl border border-neutral-800 bg-neutral-900/90 px-4 py-4 active:opacity-90"
    : "mb-2 rounded-2xl border border-zinc-200 bg-white px-4 py-4 active:opacity-90 shadow-sm";
}

export function bottomSheetContainerClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-t-2xl bg-neutral-950"
    : "rounded-t-2xl border-t border-zinc-300 bg-white";
}

export function rowLinkCardClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 active:opacity-90"
    : "rounded-xl border border-zinc-200 bg-white px-4 py-3.5 active:opacity-90 shadow-sm";
}

export function metricCardClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "min-w-[46%] flex-1 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4"
    : "min-w-[46%] flex-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm";
}

export function metricCardCompactClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "min-w-[46%] flex-1 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3"
    : "min-w-[46%] flex-1 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm";
}

export function insetPanelClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3"
    : "rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm";
}

export function insetPanelRowClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "flex-row items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3"
    : "flex-row items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm";
}

export function settingsWideRowClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mt-4 flex-row items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3.5 active:opacity-90"
    : "mt-4 flex-row items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 active:opacity-90 shadow-sm";
}

export function formLineItemClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mb-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3"
    : "mb-4 rounded-xl border border-zinc-300 bg-white p-3";
}

export function stackedMutedPanelClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mt-3 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-3"
    : "mt-3 rounded-xl border border-zinc-300 bg-white px-3 py-3";
}

export function modalDialogSurfaceClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "z-10 w-[92%] max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 px-4 pb-4 pt-4"
    : "z-10 w-[92%] max-w-sm rounded-2xl border border-zinc-200 bg-white px-4 pb-4 pt-4 shadow-lg";
}

export function modalSecondaryButtonClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-xl bg-neutral-800 py-3.5 active:opacity-90 disabled:opacity-50"
    : "rounded-xl bg-zinc-300 py-3.5 active:opacity-90 disabled:opacity-50";
}

export function receiptSheetSurfaceClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-t-2xl border border-neutral-800 bg-neutral-950 px-4 pb-8 pt-4"
    : "rounded-t-2xl border border-zinc-200 bg-white px-4 pb-8 pt-4 shadow-xl";
}

export function searchBarWrapClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "flex-row items-center rounded-2xl border border-neutral-800/90 bg-neutral-900/90 px-3 shadow-sm"
    : "flex-row items-center rounded-2xl border border-zinc-300 bg-white px-3 shadow-sm";
}

export type FormInputVariant = "normal" | "error" | "warning";

export function formTextInputClass(resolved: ResolvedScheme, variant: FormInputVariant): string {
  const border =
    variant === "error"
      ? "border-rose-500/80"
      : variant === "warning"
        ? "border-amber-500/80"
        : resolved === "dark"
          ? "border-neutral-800"
          : "border-zinc-300";
  const surface =
    resolved === "dark" ? "bg-neutral-900 text-neutral-100" : "bg-white text-zinc-900";
  return `rounded-xl border text-base ${surface} ${border}`;
}

export function insightsPromoCardClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mt-4 rounded-xl border border-sky-600/40 bg-sky-950/25 px-4 py-3.5 active:opacity-90"
    : "mt-4 rounded-xl border border-sky-300 bg-sky-100 px-4 py-3.5 active:opacity-90";
}

export function insightsPromoTitleClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "text-center text-base font-semibold text-sky-300"
    : "text-center text-base font-semibold text-sky-800";
}

export function insightsPromoHintClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "mt-1 text-center text-xs text-neutral-500" : "mt-1 text-center text-xs text-zinc-700";
}

export function quickSalePromoCardClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mt-6 rounded-2xl border border-brand-600/40 bg-brand-950/35 px-4 py-4 active:opacity-90"
    : "mt-6 rounded-2xl border border-brand-300 bg-brand-100 px-4 py-4 active:opacity-90";
}

export function hairlineBorderBClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "border-b border-neutral-800" : "border-b border-zinc-300";
}

export function hairlineBorderTClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "border-t border-neutral-800" : "border-t border-zinc-300";
}

export function stickyFooterBarClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "absolute bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950 px-4 pt-2"
    : "absolute bottom-0 left-0 right-0 border-t border-zinc-300 bg-white px-4 pt-2";
}

export function listRowPressableClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "border-b border-neutral-800 px-4 py-3.5 active:bg-neutral-900"
    : "border-b border-zinc-300 px-4 py-3.5 active:bg-zinc-200";
}

export function compactPressableFieldClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 active:opacity-90"
    : "rounded-xl border border-zinc-300 bg-white px-3 py-2.5 active:opacity-90 shadow-sm";
}

export function borderedSurfaceClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
    : "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm";
}

export function subscriptionChoiceCardClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-xl border border-neutral-600 bg-neutral-900 py-4 active:opacity-90"
    : "rounded-xl border border-zinc-300 bg-white py-4 active:opacity-90 shadow-sm";
}

export function realtimeBannerClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "absolute left-0 right-0 border-b border-brand-900/50 bg-brand-950/95 px-3 py-2.5"
    : "absolute left-0 right-0 border-b border-brand-200 bg-brand-100 px-3 py-2.5";
}

export function realtimeBannerTextClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "min-w-0 flex-1 text-xs leading-4 text-brand-100"
    : "min-w-0 flex-1 text-xs leading-4 text-brand-900";
}

export function introFooterDividerClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "border-t border-neutral-800" : "border-t border-zinc-300";
}

export function pagerDotInactiveClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "bg-neutral-700" : "bg-zinc-400";
}

export function themePreferenceLabel(p: ThemePreference): string {
  if (p === "system") return "System";
  if (p === "light") return "Light";
  return "Dark";
}
