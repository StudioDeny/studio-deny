import { useState } from "react";
import { toast } from "sonner";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Drop a real email");
        setBusy(true);
        await new Promise((r) => setTimeout(r, 500));
        toast.success("You're in. Watch your inbox.");
        setEmail("");
        setBusy(false);
      }}
      className="flex gap-0 border border-border bg-background"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@street.com"
        className="flex-1 bg-transparent px-3 h-11 outline-none text-sm placeholder:text-muted-foreground/60"
      />
      <button disabled={busy} className="bg-primary text-primary-foreground text-mono text-xs tracking-widest px-4 hover:glow-primary disabled:opacity-50">
        {busy ? "…" : "JOIN →"}
      </button>
    </form>
  );
}
