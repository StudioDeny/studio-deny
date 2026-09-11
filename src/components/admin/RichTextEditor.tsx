import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Bold as BoldIcon } from "lucide-react";

// Minimal rich-text field for admin copy (product description, materials,
// care instructions): select text, make it bold or a color. Stores HTML —
// the storefront renders it back with the RichText component
// (src/components/ui/RichText.tsx), and stripHtml() (src/lib/richText.ts)
// gets a plain-text version anywhere HTML markup wouldn't make sense
// (meta description, search indexing).
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  // The native color input fires on every drag across the picker (React's
  // onChange = the native `input` event, not `change`) — only stage the
  // pick here and commit it to the actual text selection on Apply, so
  // dragging around the wheel doesn't repaint the selection live.
  const [pendingColor, setPendingColor] = useState("#e63946");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, bulletList: false, orderedList: false, blockquote: false, codeBlock: false, horizontalRule: false }),
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "focus:outline-none",
        // No fixed height here (unlike the shared .inp class, which is
        // built for single-line inputs) — height:auto so the box grows
        // with content instead of clipping/overflowing it. min-height is
        // just the initial floor for `rows`.
        style: `background:var(--background); width:100%; font-family:var(--font-mono,monospace); font-size:14px; padding:10px 12px; min-height:${rows * 22 + 16}px;`,
      },
    },
  });

  if (!editor) return null;

  const isEmpty = editor.isEmpty;

  return (
    <div className="border border-border">
      <div className="flex items-center gap-1 border-b border-border p-1.5 bg-muted/30">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`size-7 flex items-center justify-center border ${editor.isActive("bold") ? "border-primary text-primary bg-primary/10" : "border-transparent text-muted-foreground hover:border-border"}`}
          aria-label="Bold"
          title="Bold selected text"
        >
          <BoldIcon className="size-3.5" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <label
          className="relative size-7 rounded-full border border-border cursor-pointer overflow-hidden shrink-0"
          style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
          title="Pick any color, then hit Apply"
        >
          <input
            type="color"
            value={pendingColor}
            onChange={(e) => setPendingColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Pick a color"
          />
        </label>
        <span
          className="size-4 rounded-full border border-border shrink-0"
          style={{ backgroundColor: pendingColor }}
          aria-hidden="true"
          title="Picked color (not yet applied)"
        />
        <button
          type="button"
          onClick={() => editor.chain().focus().setColor(pendingColor).run()}
          className="border border-border h-7 px-2 text-mono text-[9px] tracking-widest text-foreground hover:border-primary hover:text-primary"
          title="Apply the picked color to the selected text"
        >
          APPLY
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          className="text-mono text-[9px] tracking-widest text-muted-foreground hover:text-primary px-1.5"
          title="Remove color from selected text"
        >
          CLEAR COLOR
        </button>
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <div className="absolute left-3 top-2 text-sm text-muted-foreground pointer-events-none">{placeholder}</div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
