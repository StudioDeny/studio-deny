import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getHomeSections, saveHomeSections, type HomeSections, type CommunityItem } from "@/lib/homeSections";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/admin/community-cms")({
  component: CommunityCmsAdmin,
  head: () => ({ meta: [{ title: "Community — STUDIO DENY" }] }),
});

function CommunityCmsAdmin() {
  const [hs, setHs] = useState<HomeSections | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { setHs(getHomeSections()); }, []);

  if (!hs) return <div className="text-mono text-xs">LOADING…</div>;

  const cm = hs.community;
  const setCm = <K extends keyof typeof cm>(k: K, v: (typeof cm)[K]) =>
    setHs({ ...hs, community: { ...cm, [k]: v } });

  const updateItem = (id: string, patch: Partial<CommunityItem>) =>
    setCm("items", cm.items.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addItem = () => {
    const id = Date.now().toString();
    setCm("items", [...cm.items, { id, image: "", handle: "" }]);
  };

  const removeItem = (id: string) => setCm("items", cm.items.filter((x) => x.id !== id));

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
      <h1 className="text-display text-4xl md:text-5xl mb-2">COMMUNITY.</h1>
      <p className="text-muted-foreground text-sm mb-8">Manage the "Worn by Our Community" photo grid on the homepage.</p>

      <div className="border border-border bg-surface p-6 mb-6 grid sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={cm.enabled} onChange={(e) => setCm("enabled", e.target.checked)} className="accent-primary" />
          <span className="text-mono text-xs tracking-widest">SHOW SECTION ON HOME</span>
        </label>
        <Field label="TITLE"><input value={cm.title} onChange={(e) => setCm("title", e.target.value)} className="inp" /></Field>
        <Field label="SUBTITLE"><input value={cm.subtitle} onChange={(e) => setCm("subtitle", e.target.value)} className="inp" /></Field>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {cm.items.map((item) => (
          <div key={item.id} className="relative border border-border overflow-hidden bg-surface">
            <div className="relative aspect-square">
              {item.image ? (
                <>
                  <img src={item.image} alt={item.handle} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => updateItem(item.id, { image: "" })}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5">
                    <X className="size-3" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer bg-background hover:bg-surface/50 gap-2">
                  {uploading === item.id ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4 text-muted-foreground" />}
                  <span className="text-mono text-[9px] tracking-widest text-muted-foreground">UPLOAD</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(item.id, f); }} />
                </label>
              )}
            </div>
            <div className="p-2 flex items-center gap-2">
              <input value={item.handle} onChange={(e) => updateItem(item.id, { handle: e.target.value })}
                className="flex-1 bg-background border border-border h-7 px-2 text-xs font-mono" placeholder="@handle" />
              <button type="button" onClick={() => removeItem(item.id)}
                className="border border-border h-7 w-7 inline-flex items-center justify-center hover:border-destructive hover:text-destructive shrink-0">
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Add new */}
        <button type="button" onClick={addItem}
          className="aspect-square border border-dashed border-border hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-2 transition-colors">
          <Plus className="size-5 text-muted-foreground" />
          <span className="text-mono text-[10px] tracking-widest text-muted-foreground">ADD PHOTO</span>
        </button>
      </div>

      <div className="border-t border-border pt-6">
        <button type="button" onClick={() => { saveHomeSections(hs); toast.success("Community saved"); }}
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
