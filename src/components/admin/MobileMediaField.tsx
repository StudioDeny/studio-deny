import { Smartphone } from "lucide-react";
import { MediaField, type MediaValue } from "./MediaField";

/**
 * The phone version of a section's photo/video. Phones show this one; when
 * it's empty they show the desktop media. Opens straight on the upload
 * button so it reads as "upload a mobile image", not a URL box.
 */
export function MobileMediaField({
  value,
  onChange,
}: {
  value: { url?: string; type?: MediaValue["type"] };
  onChange: (next: { url: string; type?: MediaValue["type"] }) => void;
}) {
  const url = value.url ?? "";
  return (
    <div className="border border-dashed border-border rounded p-3 bg-background/60">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-foreground">
          <Smartphone className="size-3.5" /> MOBILE IMAGE / VIDEO (PHONES)
        </div>
        {url && (
          <button
            type="button"
            onClick={() => onChange({ url: "", type: undefined })}
            className="text-mono text-[10px] tracking-widest text-red-500 hover:underline"
          >
            REMOVE
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        Optional. Shown on phones instead of the desktop media above. Leave empty to use the desktop
        one.
      </p>
      <MediaField
        defaultSource={url ? "url" : "upload"}
        value={{ url, type: value.type ?? "image" }}
        onChange={(v) => onChange({ url: v.url, type: v.type })}
      />
    </div>
  );
}
