import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Bold as BoldIcon } from "lucide-react";

const SWATCHES = ["#e63946", "#2a9d8f", "#e9c46a", "#264653", "#9c27b0"];

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
        class: "inp focus:outline-none",
        style: `min-height:${rows * 22 + 16}px; padding-top:8px; padding-bottom:8px;`,
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
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => editor.chain().focus().setColor(hex).run()}
            className={`size-5 rounded-full border ${editor.isActive("textStyle", { color: hex }) ? "border-foreground ring-2 ring-offset-1 ring-foreground/40" : "border-border"}`}
            style={{ backgroundColor: hex }}
            aria-label={`Color selected text ${hex}`}
            title="Color selected text"
          />
        ))}
        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="size-5 border border-border cursor-pointer bg-transparent p-0"
          aria-label="Custom color"
          title="Custom color"
        />
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
