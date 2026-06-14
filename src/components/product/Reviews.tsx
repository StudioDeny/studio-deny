import { Star } from "lucide-react";
import { reviewsFor, averageRating } from "@/lib/reviews";

export function Reviews({ slug }: { slug: string }) {
  const reviews = reviewsFor(slug);
  const { avg, count } = averageRating(slug);
  return (
    <section className="px-4 md:px-8 mt-24">
      <div className="text-mono text-[11px] tracking-[0.3em] text-primary mb-2">◢ THE FIELD REPORT</div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <h2 className="text-display text-4xl md:text-6xl">REVIEWS.</h2>
        <div className="flex items-center gap-2 text-mono text-sm">
          <Stars value={avg} />
          <span>{avg.toFixed(1)} / 5</span>
          <span className="text-muted-foreground">· {count} reviews</span>
        </div>
      </div>
      <ul className="grid md:grid-cols-3 gap-4">
        {reviews.map((r, i) => (
          <li key={i} className="border border-border bg-surface p-5">
            <Stars value={r.rating} />
            <h3 className="font-bold mt-3">{r.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.body}</p>
            <div className="text-mono text-[10px] tracking-widest text-muted-foreground mt-4">
              — {r.author.toUpperCase()} · {r.date}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-4 ${i <= Math.round(value) ? "fill-white text-white" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}
