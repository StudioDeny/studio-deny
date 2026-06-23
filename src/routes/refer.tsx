import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/refer")({
  component: Refer,
  head: () => ({ meta: [{ title: "Refer & Earn — STUDIO DENY" }] }),
});

function Refer() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => {
    const base = (user?.name || "DENY").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "DENY";
    return `${base}300`;
  }, [user]);
  const link = typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : `https://studiodeny/?ref=${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied — go spread the chaos");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <section className="px-4 md:px-8 mt-8 md:mt-12 max-w-4xl mx-auto">
      <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ REFER & EARN</div>
      <h1 className="text-display text-5xl md:text-7xl mb-3">PUT YOUR CREW ON.</h1>
      <p className="text-muted-foreground max-w-2xl">
        Share your code. Your friend gets <span className="text-primary">₹300 off</span> their first drop.
        You get <span className="text-secondary">₹300 credit</span> when they cop. Simple.
      </p>

      <div className="mt-10 border-2 border-primary bg-surface p-6 md:p-10 relative grain">
        <div className="text-mono text-[10px] tracking-widest text-muted-foreground">YOUR CODE</div>
        <div className="text-display text-5xl md:text-7xl text-primary text-glow-primary mt-1">{code}</div>

        <div className="mt-6 flex gap-2">
          <input readOnly value={link} className="flex-1 bg-background border border-border px-3 h-11 text-mono text-xs" />
          <button onClick={copy} className="border border-border px-4 h-11 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:border-primary hover:text-primary">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "COPIED" : "COPY"}
          </button>
          <button
            onClick={() => navigator.share?.({ title: "Studio Deny", url: link }).catch(() => copy())}
            className="bg-primary text-primary-foreground px-4 h-11 inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:glow-primary"
          >
            <Share2 className="size-4" /> SHARE
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-6 text-mono text-xs tracking-widest">
        <div className="border border-border p-5">
          <div className="text-primary text-display text-3xl">01.</div>
          <p className="text-muted-foreground mt-2">Send your link to a friend who needs upgrading.</p>
        </div>
        <div className="border border-border p-5">
          <div className="text-primary text-display text-3xl">02.</div>
          <p className="text-muted-foreground mt-2">They cop their first piece with ₹300 off.</p>
        </div>
        <div className="border border-border p-5">
          <div className="text-primary text-display text-3xl">03.</div>
          <p className="text-muted-foreground mt-2">₹300 credit hits your account. Repeat.</p>
        </div>
      </div>
    </section>
  );
}
