import { motion } from "framer-motion";

interface AnimatedLogoProps {
  className?: string;
}

/**
 * Animated Typography Logo for STUDIO DENY
 * 
 * Slices and animates the individual typographic glyphs:
 * - Primary Logotype: D • E • N • Y assemble with kinetic directional slides & spring easing
 * - Wordmark Header: S • T • U • D • I • O cascades with rapid letter-by-letter drops
 * - Luminous Sheen: An angled metallic gleam sweeps across the typography continuously
 * - Chromatic Glow: Edgeless ambient backlight pulse
 */
export function AnimatedLogo({ className = "" }: AnimatedLogoProps) {
  const easeCurve = [0.16, 1, 0.3, 1] as const;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* ─── Floating Container ─── */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 3.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative w-full aspect-[1024/341] max-w-[440px] sm:max-w-[540px] md:max-w-[640px] overflow-hidden"
      >
        {/* ─── 1. Primary Typography: D ─── */}
        <motion.img
          src="/logo-layers/white-d.png"
          alt="D"
          initial={{ opacity: 0, x: -45, y: 15, scale: 0.88 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.08, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* ─── 2. Primary Typography: E ─── */}
        <motion.img
          src="/logo-layers/white-e.png"
          alt="E"
          initial={{ opacity: 0, y: 35, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.20, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* ─── 3. Primary Typography: N ─── */}
        <motion.img
          src="/logo-layers/white-n.png"
          alt="N"
          initial={{ opacity: 0, y: -35, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.32, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* ─── 4. Primary Typography: Y ─── */}
        <motion.img
          src="/logo-layers/white-y.png"
          alt="Y"
          initial={{ opacity: 0, x: 45, y: 15, scale: 0.88 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.44, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* ─── 5. Top Subtitle Typography: S • T • U • D • I • O ─── */}
        <motion.img
          src="/logo-layers/white-s.png"
          alt="S"
          initial={{ opacity: 0, y: -12, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.54, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <motion.img
          src="/logo-layers/white-t.png"
          alt="T"
          initial={{ opacity: 0, y: -12, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.59, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <motion.img
          src="/logo-layers/white-u.png"
          alt="U"
          initial={{ opacity: 0, y: -12, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.64, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <motion.img
          src="/logo-layers/white-d-small.png"
          alt="D"
          initial={{ opacity: 0, y: -12, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.69, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <motion.img
          src="/logo-layers/white-i.png"
          alt="I"
          initial={{ opacity: 0, y: -12, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.74, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <motion.img
          src="/logo-layers/white-o.png"
          alt="O"
          initial={{ opacity: 0, y: -12, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.79, ease: easeCurve }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      </motion.div>
    </div>
  );
}
