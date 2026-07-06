import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getHomeSections, saveHomeSections, type HomeSections, type InfluencerItem } from "@/lib/homeSections";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/admin/influencer-picks")({
  component: InfluencerPicksAdmin,
  head: () => ({ meta: [{ title: "Influencer Picks — STUDIO DENY" }] }),
});

function InfluencerPicksAdmin() {
  const [hs, setHs] = useState<HomeSections | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { setHs(getHomeSections()); }, []);

  if (!hs) return <div className="text-mono text-xs">LOADING…</div>;

  const ip = hs.influencerPicks;
  const setIp = <K extends keyof typeof ip>(k: K, v: (typeof ip)[K]) =>
    setHs({ ...hs, influencerPicks: { ...ip, [k]: v } });

  const updateItem = (id: string, patch: Partial<InfluencerItem>) =>
    setIp("items", ip.items.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addItem = () => {
    const id = Date.now().toString();
    setIp("items", [...ip.items, { id, name: "", handle: "", image: "", productSlug: "", quote: "" }]);
  };

  const removeItem = (id: string) => setIp("items", ip.items.filter((x) => x.id !== id));

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
      <h1 className="text-display text-4xl md:text-5xl mb-2">INFLUENCER PICKS.</h1>
      <p className="text-muted-foreground text-sm mb-8">Manage the influencer picks section on the homepage.</p>

      <div className="border border-border bg-surface p-6 mb-6 grid sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={ip.enabled} onChange={(e) => setIp("enabled", e.target.checked)} className="accent-primary" />
          <span className="text-mono text-xs tracking-widest">SHOW SECTION ON HOME</span>
        </label>
        <Field label="EYEBROW"><input value={ip.eyebrow} onChange={(e) => setIp("eyebrow", e.target.value)} className="inp" /></Field>
        <Field label="TITLE"><input value={ip.title} onChange={(e) => setIp("title", e.target.value)} className="inp" /></Field>
      </div>

      <div className="space-y-4 mb-6">
        {ip.items.map((item) => (
          <div key={item.id} className="border border-border bg-surface p-4 grid sm:grid-cols-[120px_1fr] gap-4 items-start">
            {/* Image */}
            <div className="relative w-28 h-36 border border-border overflow-hidden shrink-0">
              {item.image ? (
                <>
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => updateItem(item.id, { image: "" })}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5">
                    <X className="size-3" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer bg-background hover:bg-surface/50 transition-colors gap-1">
                  {uploading === item.id ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4 text-muted-foreground" />}
                  <span className="text-mono text-[9px] tracking-widest text-muted-foreground">PHOTO</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(item.id, f); }} />
                </label>
              )}
            </div>
            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <Field label="NAME"><input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} className="inp" placeholder="Rahul Sharma" /></Field>
              <Field label="HANDLE"><input value={item.handle} onChange={(e) => updateItem(item.id, { handle: e.target.value })} className="inp" placeholder="@rahulstyle" /></Field>
              <Field label="PRODUCT SLUG"><input value={item.productSlug} onChange={(e) => updateItem(item.id, { productSlug: e.target.value })} className="inp" placeholder="heavy-tee-black" /></Field>
              <Field label="QUOTE">
                <input value={item.quote} onChange={(e) => updateItem(item.id, { quote: e.target.value })} className="inp" placeholder="This drop is fire." />
              </Field>
            </div>
            <button type="button" onClick={() => removeItem(item.id)}
              className="sm:col-span-2 justify-self-end border border-border h-8 w-8 inline-flex items-center justify-center hover:border-destructive hover:text-destructive">
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addItem}
        className="border border-border h-10 px-4 text-mono text-xs tracking-widest hover:border-primary hover:text-primary inline-flex items-center gap-2 mb-8">
        <Plus className="size-3" /> ADD INFLUENCER
      </button>

      <div className="border-t border-border pt-6">
        <button type="button" onClick={() => { saveHomeSections(hs); toast.success("Influencer picks saved"); }}
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
