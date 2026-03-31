/** Strip SQL-like wildcards from user input for ILIKE-based search. */
export function sanitizeProductSearchQuery(q: string): string {
  return q.trim().slice(0, 80).replace(/[%_]/g, "");
}
