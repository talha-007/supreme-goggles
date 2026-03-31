/** Heuristic: codes from scanners are usually 6+ alphanumeric chars (EAN/UPC/Code128). */
export function looksLikeBarcode(q: string): boolean {
  const t = q.trim();
  if (t.length < 6 || t.length > 80) return false;
  return /^[\dA-Za-z][\dA-Za-z\-]*$/.test(t);
}
