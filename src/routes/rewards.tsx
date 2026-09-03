import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, ShieldCheck, ArrowRight, Bell, Gift, Flame, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/rewards")({
  component: RewardsComingSoon,
  head: () => ({
    meta: [{ title: "DENY WORLD — Coming Soon | STUDIO DENY" }],
  }),
});

const ROTATING_PHRASES = [
  "DENY WORLD.",
  "EXCLUSIVE PRIVILEGES.",
  "PRIVATE VAULT ACCESS.",
  "TIER REWARD MULTIPLIERS.",
  "SECRET ARCHIVE RESTOCKS.",
  "BLACK CARD STATUS.",
];

const UPCOMING_PERKS = [
  {
    num: "01",
    title: "PRIVATE VAULT ACCESS",
    desc: "2-hour priority early entry before public releases. Lock down your size before drops sell out in seconds.",
    icon: Lock,
    tag: "PRIORITY ACCESS",
  },
  {
    num: "02",
    title: "TIER MULTIPLIERS",
    desc: "Earn points on every purchase and level up from ROOKIE to LEGEND. Convert points to instant checkout credits.",
    icon: Flame,
    tag: "CASHBACK CREDITS",
  },
  {
    num: "03",
    title: "SECRET ARCHIVES",
    desc: "Access unreleased samples, deadstock archival pieces, and 1-of-1 collaborative grails reserved strictly for members.",
    icon: Gift,
    tag: "1-OF-1 DROPS",
  },
  {
    num: "04",
    title: "BLACK CARD PRIVILEGE",
    desc: "Bespoke laser-etched metal membership card, custom matte-black packaging, and private event guestlist invites.",
    icon: Trophy,
    tag: "VIP INNER CIRCLE",
  },
];

function RewardsComingSoon() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cycle through rotating kinetic phrases every 2.4s
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubscribed(true);
      toast.success("You are on the VIP Deny World waitlist!");
    }, 600);
  };

  return (
    <section className="min-h-[85vh] bg-[#E2E2E4] text-foreground px-4 sm:px-8 lg:px-16 py-12 sm:py-20 overflow-hidden relative select-none">
      <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center pt-6 sm:pt-10">
        {/* ════════ HERO TYPOGRAPHY WITH OUTLINE & TRANSITION ════════ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mb-6"
        >
          <h1 className="text-display text-[clamp(3.8rem,11vw,9rem)] leading-[0.88] tracking-[-0.03em] uppercase font-black text-foreground">
            COMING SOON.
          </h1>

          <div className="h-[4.5rem] sm:h-[6rem] md:h-[7.5rem] flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={phraseIndex}
                initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -32, filter: "blur(6px)" }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="text-display text-[clamp(2.4rem,6.8vw,5.5rem)] leading-none tracking-[-0.02em] uppercase font-black text-transparent select-none whitespace-nowrap"
                style={{
                  WebkitTextStroke: "2px rgba(0, 0, 0, 0.75)",
                }}
              >
                {ROTATING_PHRASES[phraseIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ════════ SUBTITLE EXPLANATION ════════ */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm sm:text-base text-muted-foreground text-mono max-w-2xl leading-relaxed mb-10 font-medium"
        >
          Our private loyalty & rewards matrix is currently being forged. Members will receive exclusive early access, vault allocation, and tiered cash benefits.
        </motion.p>

        {/* ════════ VIP WAITLIST SIGNUP BOX ════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg mb-16 border border-border bg-surface/60 backdrop-blur-md p-6 sm:p-8 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-mono text-[11px] tracking-[0.25em] uppercase font-bold text-foreground">
                VIP EARLY ACCESS
              </span>
            </div>
            <span className="text-mono text-[9px] tracking-widest text-muted-foreground uppercase">
              DROP 01 WAITLIST
            </span>
          </div>

          {subscribed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 flex flex-col items-center gap-2 bg-foreground/5 border border-foreground/10"
            >
              <div className="flex items-center gap-2 text-primary text-mono text-xs tracking-widest font-bold uppercase">
                <ShieldCheck className="size-4" /> YOU ARE ENROLLED
              </div>
              <p className="text-xs text-muted-foreground text-mono">
                We'll notify your inbox the moment the loyalty vault opens.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ENTER YOUR EMAIL FOR VIP INVITE…"
                className="flex-1 bg-background border border-border px-4 py-3 text-mono text-xs tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground transition-colors"
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-foreground text-background text-mono text-xs tracking-widest uppercase font-bold hover:bg-primary hover:text-white transition-colors duration-200 shrink-0 inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? "ENROLLING…" : "GET NOTIFIED"} <Bell className="size-3.5" />
              </button>
            </form>
          )}

          <div className="flex items-center justify-center gap-6 mt-4 text-[10px] text-mono text-muted-foreground/70 tracking-widest uppercase">
            <span>✓ ZERO SPAM</span>
            <span>•</span>
            <span>✓ EARLY DROPS</span>
            <span>•</span>
            <span>✓ 100% PRIVATE</span>
          </div>
        </motion.div>

        {/* ════════ UPCOMING PRIVILEGES MATRIX ════════ */}
        <div className="w-full border-t border-border pt-16">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="text-left">
              <div className="text-mono text-[10px] tracking-[0.3em] text-primary uppercase font-bold mb-1">
                ◢ WHAT IS COMING
              </div>
              <h2 className="text-display text-3xl sm:text-4xl text-foreground uppercase tracking-wide">
                MEMBER PRIVILEGES
              </h2>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-border hover:border-foreground text-mono text-xs tracking-widest uppercase font-bold transition-colors"
            >
              EXPLORE COLLECTION <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {UPCOMING_PERKS.map((perk, idx) => (
              <motion.div
                key={perk.num}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * idx, ease: [0.16, 1, 0.3, 1] }}
                className="border border-border bg-surface/30 p-6 flex flex-col justify-between hover:border-foreground/40 hover:bg-surface/60 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-mono text-xs tracking-widest text-muted-foreground font-bold">
                      {perk.num}
                    </span>
                    <div className="p-2 border border-border bg-background group-hover:scale-110 group-hover:border-primary transition-all">
                      <perk.icon className="size-4 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-display text-xl sm:text-2xl text-foreground uppercase tracking-wider mb-2 font-bold leading-tight">
                    {perk.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-muted-foreground text-mono leading-relaxed mb-4">
                    {perk.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-mono text-[9px] tracking-widest text-primary font-bold uppercase">
                    {perk.tag}
                  </span>
                  <span className="text-mono text-[9px] tracking-widest text-muted-foreground">
                    PHASE 01
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ════════ BOTTOM EXPLORE LINK ════════ */}
        <div className="mt-16 flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/shop"
            className="px-8 py-4 bg-foreground text-background text-mono text-xs tracking-widest uppercase font-bold hover:bg-primary hover:text-white transition-colors"
          >
            SHOP CURRENT DROPS →
          </Link>
          <Link
            to="/"
            className="px-8 py-4 border border-border text-mono text-xs tracking-widest uppercase font-bold hover:border-foreground transition-colors"
          >
            BACK TO STORE
          </Link>
        </div>
      </div>
    </section>
  );
}
