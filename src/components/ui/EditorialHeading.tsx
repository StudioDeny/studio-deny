import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// Ultra-dramatic streetwear easing (punchy initial sweep + smooth luxury snap)
const STRONG_EASE = [0.16, 1, 0.3, 1] as const;

interface EditorialHeadingProps {
  children: string | ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div";
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  wordStagger?: boolean;
}

/**
 * Editorial Heading:
 * Strong 100% full-line overflow clip mask reveal
 * - Opacity 0 -> 1
 * - TranslateY 115% -> 0
 * - Duration 850ms
 * - Sharp ease [0.16, 1, 0.3, 1]
 */
export function EditorialHeading({
  children,
  as = "h2",
  className = "",
  style,
  delay = 0,
  wordStagger = false,
}: EditorialHeadingProps) {
  const shouldReduceMotion = useReducedMotion();
  const Tag = as;

  if (wordStagger && typeof children === "string" && children.trim() !== "") {
    const words = children.split(" ");

    return (
      <Tag className={className} style={style}>
        {words.map((word, idx) => (
          <span key={`${word}-${idx}`} className="inline-block overflow-hidden py-1 px-2 -mx-2 mr-[0.25em] align-top">
            <motion.span
              key={`${word}-${idx}`}
              className="inline-block pr-[0.05em]"
              initial={{ opacity: 0, y: shouldReduceMotion ? "0%" : "120%" }}
              whileInView={{ opacity: 1, y: "0%" }}
              animate={{ opacity: 1, y: "0%" }}
              transition={{
                duration: 0.7,
                ease: STRONG_EASE,
                delay: delay + idx * 0.06,
              }}
              viewport={{ amount: 0.1 }}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </Tag>
    );
  }

  if (typeof children === "string" && children.trim() !== "") {
    const lines = children.split("\n");

    return (
      <Tag className={className} style={style}>
        {lines.map((line, lineIdx) => (
          <span key={`${line}-${lineIdx}`} className="block overflow-hidden py-1 px-2 -mx-2">
            <motion.span
              key={`${line}-${lineIdx}`}
              className="block pr-[0.05em]"
              initial={{ opacity: 0, y: shouldReduceMotion ? "0%" : "115%" }}
              whileInView={{ opacity: 1, y: "0%" }}
              animate={{ opacity: 1, y: "0%" }}
              transition={{
                duration: 0.85,
                ease: STRONG_EASE,
                delay: delay + lineIdx * 0.1,
              }}
              viewport={{ amount: 0.1 }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag className={className} style={style}>
      <span className="block overflow-hidden py-1 px-2 -mx-2">
        <motion.span
          className="block pr-[0.05em]"
          initial={{ opacity: 0, y: shouldReduceMotion ? "0%" : "115%" }}
          whileInView={{ opacity: 1, y: "0%" }}
          animate={{ opacity: 1, y: "0%" }}
          transition={{ duration: 0.85, ease: STRONG_EASE, delay }}
          viewport={{ amount: 0.1 }}
        >
          {children}
        </motion.span>
      </span>
    </Tag>
  );
}

interface EditorialTextProps {
  children: ReactNode;
  as?: "h3" | "h4" | "p" | "span" | "div";
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}

/**
 * Editorial Subheading:
 * Strong overflow line mask reveal with 200ms delay offset
 */
export function EditorialSubheading({
  children,
  as = "p",
  className = "",
  style,
  delay = 0.2,
}: EditorialTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const Tag = as;

  return (
    <Tag className={className} style={style}>
      <span className="block overflow-hidden py-0.5 px-2 -mx-2">
        <motion.span
          key={typeof children === "string" ? children : undefined}
          className="block pr-[0.05em]"
          initial={{ opacity: 0, y: shouldReduceMotion ? "0%" : "110%" }}
          whileInView={{ opacity: 1, y: "0%" }}
          animate={{ opacity: 1, y: "0%" }}
          transition={{ duration: 0.75, ease: STRONG_EASE, delay }}
          viewport={{ amount: 0.1 }}
        >
          {children}
        </motion.span>
      </span>
    </Tag>
  );
}

/**
 * Editorial Paragraph:
 * Strong overflow line mask reveal with 300ms delay offset
 */
export function EditorialParagraph({
  children,
  as = "p",
  className = "",
  style,
  delay = 0.3,
}: EditorialTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const Tag = as;

  return (
    <Tag className={className} style={style}>
      <span className="block overflow-hidden py-0.5 px-2 -mx-2">
        <motion.span
          key={typeof children === "string" ? children : undefined}
          className="block pr-[0.05em]"
          initial={{ opacity: 0, y: shouldReduceMotion ? "0%" : "105%" }}
          whileInView={{ opacity: 1, y: "0%" }}
          animate={{ opacity: 1, y: "0%" }}
          transition={{ duration: 0.65, ease: STRONG_EASE, delay }}
          viewport={{ amount: 0.1 }}
        >
          {children}
        </motion.span>
      </span>
    </Tag>
  );
}
