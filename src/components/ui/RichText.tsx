// Renders admin-authored HTML (product description/materials/care —
// written via RichTextEditor, src/components/admin/RichTextEditor.tsx).
// Content is only ever written by authenticated admin/staff (enforced by
// RLS on the products table), so it's trusted the same way the rest of
// this app's admin-authored CMS content already is.
export function RichText({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  if (!html) return null;
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
