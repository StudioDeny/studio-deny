import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getHomeSections, saveHomeSections, type HomeSections, type LookbookItem } from "@/lib/homeSections";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Loader2, X, GripVertical } from "lucide-react";

export const Route = createFileRoute("/admin/lookbook-cms")({
  component: LookbookCmsAdmin,
  head: () => ({ meta: [{ title: "Look Book — STUDIO DENY" }] }),
});

function LookbookCmsAdmin() {
  const [hs, setHs] = useState<HomeSections | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { setHs(getHomeSections()); }, []);

  if (!hs) return <div className="text-mono text-xs">LOADING…</div>;

  const lb = hs.lookBook;
  const setLb = <K extends keyof typeof lb>(k: K, v: (typeof lb)[K]) =>
    setHs({ ...hs, lookBook: { ...lb, [k]: v } });

  const updateItem = (id: string, patch: Partial<LookbookItem>) =>
    setLb("items", lb.items.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addItem = () => {
    const id = Date.now().toString();
    setLb("items", [...lb.items, { id, image: "", title: "" }]);
  };

  const removeItem = (id: string) => setLb("items", lb.items.filter((x) => x.id !== id));

  const uploadImage = async (id: string, file: File) => {
    setUploading(id);
    try {
      const res = await uploadToCloudinary(file);
      updateItem(id, { image: res.secure_url });
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div>
      <h1 className="text-display text-4xl md:text-5xl mb-2">LOOK BOOK.</h1>
      <p className="text-muted-foreground text-sm mb-8">Manage the scrolling lookbook gallery on the homepage.</p>

      <div className="border border-border bg-surface p-4 mb-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lb.enabled} onChange={(e) => setLb("enabled", e.target.checked)} className="accent-primary" />
          <span className="text-mono text-xs tracking-widest">SHOW SECTION ON HOME</span>
        </label>
      </div>

      <div className="space-y-3 mb-6">
        {lb.items.map((item, idx) => (
          <div key={item.id} className="border border-border bg-surface p-4 flex items-center gap-4">
            <GripVertical className="size-4 text-muted-foreground shrink-0" />
            <div className="relative w-20 h-24 border border-border overflow-hidden shrink-0">
              {item.image ? (
                <>
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => updateItem(item.id, { image: "" })}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5">
                    <X className="size-3" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer bg-background hover:bg-surface/50 gap-1">
                  {uploading === item.id ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3 text-muted-foreground" />}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(item.id, f); }} />
                </label>
              )}
            </div>
            <div className="flex-1 grid gap-2">
              <Field label={`TITLE (item ${idx + 1})`}>
                <input value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })}
                  className="inp" placeholder="SS26&#10;COLLECTION (use \n for line break)" />
              </Field>
            </div>
            <button type="button" onClick={() => removeItem(item.id)}
              className="border border-border h-8 w-8 inline-flex items-center justify-center hover:border-destructive hover:text-destructive shrink-0">
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addItem}
        className="border border-border h-10 px-4 text-mono text-xs tracking-widest hover:border-primary hover:text-primary inline-flex items-center gap-2 mb-8">
        <Plus className="size-3" /> ADD PHOTO
      </button>

      <div className="border-t border-border pt-6">
        <button type="button" onClick={() => { saveHomeSections(hs); toast.success("Look Book saved"); }}
          className="bg-primary text-primary-foreground h-12 px-6 text-mono text-xs tracking-widest hover:glow-primary">
          SAVE
        </button>
      </div>
      <style>{`.inp{background:var(--background);border:1px solid var(--border);height:40px;padding:0 12px;width:100%;font-family:var(--font-mono,monospace);font-size:13px}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-mono text-[10px] tracking-widest text-muted-foreground mb-1">{label}</div>{children}</label>;
}
