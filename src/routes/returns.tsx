import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/returns")({
  component: Returns,
  head: () => ({ meta: [{ title: "Returns & Exchange — STUDIO DENY" }] }),
});

function Returns() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-4 sm:px-8 lg:px-16">
      <div className="max-w-[760px] mx-auto">
        <p className="text-mono text-[10px] tracking-[0.3em] text-primary mb-4">POLICIES</p>
        <h1 className="text-display text-[clamp(3rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase mb-10">
          RETURNS &<br />EXCHANGE
        </h1>

        <div className="space-y-10 text-mono text-sm leading-relaxed text-muted-foreground">
          <Section title="RETURN WINDOW">
            <p>We accept returns within <strong className="text-foreground">7 days of delivery</strong> for items in unworn, unwashed condition with all original tags attached.</p>
          </Section>

          <Section title="HOW TO INITIATE A RETURN">
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Email <a href="mailto:support@studiodeny.in" className="text-primary hover:underline">support@studiodeny.in</a> with your order number and reason for return.</li>
              <li>Our team will confirm eligibility within 24–48 hours.</li>
              <li>Pack the item securely and ship it to the address provided.</li>
              <li>Refund or store credit will be processed within 5–7 business days of receiving the returned item.</li>
            </ol>
          </Section>

          <Section title="EXCHANGE POLICY">
            <p>Exchanges are subject to size availability. If the desired size is out of stock, we will issue store credit for the full amount.</p>
          </Section>

          <Section title="NON-RETURNABLE ITEMS">
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Sale or discounted items</li>
              <li>Items marked as "Final Sale"</li>
              <li>Items showing signs of wear, wash, or missing tags</li>
            </ul>
          </Section>

          <Section title="DAMAGED OR INCORRECT ITEMS">
            <p>If you received a damaged or incorrect item, contact us within <strong className="text-foreground">48 hours of delivery</strong> at <a href="mailto:support@studiodeny.in" className="text-primary hover:underline">support@studiodeny.in</a>. We will arrange a free replacement or full refund.</p>
          </Section>
        </div>

        <div className="mt-14 pt-8 border-t border-border">
          <Link to="/contact" className="inline-flex items-center gap-2 text-mono text-xs tracking-widest hover:text-primary transition-colors">
            ← STILL HAVE QUESTIONS? CONTACT US
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-foreground text-xs tracking-[0.25em] text-mono mb-3">{title}</h2>
      {children}
    </div>
  );
}
