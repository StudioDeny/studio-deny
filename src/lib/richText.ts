// Regex-based (not DOM-based) so this also works during SSR/build (meta
// tags, JSON-LD, search indexing) where `document` isn't available.
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function isEmptyRichText(html: string | undefined | null): boolean {
  return !html || stripHtml(html).length === 0;
}
