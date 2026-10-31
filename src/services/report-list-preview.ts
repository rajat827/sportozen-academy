export const REPORT_PAGE_SIZE = 8;

/** Page the existing authorised list without changing its selected report or order. */
export function reportListPage<T>(rows: readonly T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / REPORT_PAGE_SIZE));
  const page = Math.max(
    1,
    Math.min(Math.trunc(requestedPage) || 1, totalPages),
  );
  const offset = (page - 1) * REPORT_PAGE_SIZE;
  return {
    page,
    totalPages,
    items: rows.slice(offset, offset + REPORT_PAGE_SIZE),
    first: rows.length ? offset + 1 : 0,
    last: Math.min(offset + REPORT_PAGE_SIZE, rows.length),
  };
}

/** Literal preview only. The full original text remains in the report and PDF. */
export function reportPreviewExcerpt(text: string, limit = 240) {
  const characters = Array.from(text);
  if (characters.length <= limit) return text;
  const prefix = characters.slice(0, limit).join("");
  const wordBoundary = prefix.lastIndexOf(" ");
  return `${(wordBoundary >= prefix.length / 2 ? prefix.slice(0, wordBoundary) : prefix).trimEnd()}…`;
}
