import { useRef, useState } from "react";
import { Upload, Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary, uploadVideoToCloudinary } from "@/lib/cloudinary";

export type MediaType = "image" | "video";
export type MediaValue = { url: string; type: MediaType };

/**
 * Universal media input: a TYPE toggle (image / video) plus a SOURCE toggle
 * (paste a URL / upload a file) — only one source control shows at a time,
 * unlike the older side-by-side "URL input + upload button" pattern this
 * replaces. Used everywhere a section/product/setting attaches media.
 */
export function MediaField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: MediaValue;
  onChange: (next: MediaValue) => void;
}) {
  const [source, setSource] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const result = value.type === "video" ? await uploadVideoToCloudinary(file) : await uploadToCloudinary(file);
      onChange({ url: result.secure_url, type: value.type });
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      {label && <div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">{label}</div>}

      <div className="flex items-center gap-3 mb-2">
        {/* TYPE toggle */}
        <div className="inline-flex border border-border rounded overflow-hidden">
          {(["image", "video"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ url: value.url, type: t })}
              className={`px-3 h-7 text-[10px] font-semibold tracking-widest uppercase transition-colors ${
                value.type === t ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* SOURCE toggle */}
        <div className="inline-flex border border-border rounded overflow-hidden">
          {([
            { key: "url" as const, icon: LinkIcon, label: "URL" },
            { key: "upload" as const, icon: Upload, label: "UPLOAD" },
          ]).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSource(s.key)}
              className={`px-3 h-7 text-[10px] font-semibold tracking-widest uppercase inline-flex items-center gap-1.5 transition-colors ${
                source === s.key ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <s.icon className="size-3" /> {s.label}
            </button>
          ))}
        </div>
      </div>

      {source === "url" ? (
        <input
          value={value.url}
          onChange={(e) => onChange({ url: e.target.value, type: value.type })}
          className="inp"
          placeholder={value.type === "video" ? "Paste a video URL…" : "Paste an image URL…"}
        />
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={value.type === "video" ? "video/*" : "image/*"}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="border border-border h-10 px-4 text-mono text-[10px] tracking-widest hover:border-primary hover:text-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
            {uploading ? "UPLOADING…" : `UPLOAD ${value.type.toUpperCase()}`}
          </button>
          {value.url && !uploading && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[220px]" title={value.url}>{value.url}</span>
          )}
        </div>
      )}
    </div>
  );
}
