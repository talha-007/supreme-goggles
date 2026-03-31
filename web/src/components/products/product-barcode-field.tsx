"use client";

/**
 * Barcode input tuned for USB / Bluetooth keyboard-wedge scanners (rapid key events + Enter).
 * Keeps browser autocomplete from stealing focus or suggesting past values.
 */
export function ProductBarcodeField({
  defaultValue,
  autoFocus,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      id="barcode"
      name="barcode"
      type="text"
      inputMode="text"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      defaultValue={defaultValue ?? ""}
      autoFocus={autoFocus}
      aria-label="Product barcode. Use a USB or Bluetooth scanner; it types digits here like a keyboard."
      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
    />
  );
}
