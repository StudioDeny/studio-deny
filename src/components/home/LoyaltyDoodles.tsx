// Hand-authored inline SVG "doodle" decorations for the homepage Loyalty
// section. These stand in for the AI-generated PNG doodle assets described
// in the Task 6 brief (star / flame / drip / tag), since no image-generation
// capability is available in this environment. Each is a loose, sketchy
// line-art shape meant to sit subtly on the section's dark `bg-foreground`
// panel — stroke-only, `currentColor`-driven so callers control color/size
// via the `className` prop (matching how the brief's <img> tags were styled).

interface DoodleProps {
  className?: string;
}

/** A scribbly, slightly lopsided 4-point star — two overlapping strokes for a sketched-twice feel. */
export function StarDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M50 6 C55 32, 60 38, 91 47 C61 54, 55 60, 51 92 C46 61, 41 55, 9 49 C40 43, 45 36, 50 6 Z" />
      <path
        d="M51 12 C55 33, 61 40, 88 48 C60 55, 54 61, 50 88"
        opacity={0.55}
      />
    </svg>
  );
}

/** A loose flame outline, tongue leaning slightly off-axis with an inner lick line. */
export function FlameDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M52 4 C34 24, 22 40, 26 60 C29 76, 42 88, 54 90 C72 93, 87 79, 84 61 C82 50, 73 46, 71 36 C70 48, 62 50, 60 41 C58 29, 66 22, 58 6 C56 10, 54 7, 52 4 Z" />
      <path d="M50 46 C42 58, 41 70, 51 79 C58 84, 66 80, 65 71" opacity={0.5} />
    </svg>
  );
}

/** A paint blob dripping downward — a rounded top pooling into a thin, tapering tail with a stray droplet. */
export function DripDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 100 60"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 8 C6 4, 14 2, 22 3 C46 5, 70 2, 86 6 C93 8, 90 14, 78 15 C68 16, 66 20, 63 30 C61 38, 55 44, 50 43 C45 42, 44 33, 46 24 C47 18, 40 16, 34 17 C24 18, 14 14, 8 8 Z" />
      <path d="M47 46 C44 50, 45 55, 50 56 C55 57, 57 52, 54 48 C52 46, 49 45, 47 46 Z" opacity={0.6} />
    </svg>
  );
}

/** A rough sticker/tag outline with a jagged edge and a punch-hole, plus a loose diagonal scribble across it. */
export function TagDoodle({ className }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 100 80"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 20 L28 5 L52 10 L70 4 L91 18 L86 34 L94 48 L82 62 L88 74 L64 70 L44 76 L24 66 L16 70 L20 52 L6 40 Z" />
      <circle cx="30" cy="24" r="5" opacity={0.7} />
      <path d="M40 38 L74 56" opacity={0.5} />
    </svg>
  );
}
