import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () => ({ meta: [{ title: "Privacy Policy — STUDIO DENY" }] }),
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-4 sm:px-8 lg:px-16">
      <div className="max-w-[760px] mx-auto">
        <p className="text-mono text-[10px] tracking-[0.3em] text-primary mb-4">LEGAL</p>
        <h1 className="text-display text-[clamp(3rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase mb-4">PRIVACY<br />POLICY</h1>
        <p className="text-muted-foreground text-mono text-xs mb-10">Last updated: January 2025</p>

        <div className="space-y-10 text-mono text-sm leading-relaxed text-muted-foreground">
          <Section title="INFORMATION WE COLLECT">
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Name, email, and shipping address when you place an order</li>
              <li>Payment information (processed securely by our payment provider — we never store card details)</li>
              <li>Browsing behavior and device information via cookies</li>
            </ul>
          </Section>

          <Section title="HOW WE USE YOUR INFORMATION">
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>To process and fulfil your orders</li>
              <li>To send order confirmations and shipping updates</li>
              <li>To send promotional emails (only with your consent)</li>
              <li>To improve our site and services</li>
            </ul>
          </Section>

          <Section title="DATA SHARING">
            <p>We do not sell your personal data. We share it only with third parties necessary to complete your order (e.g., shipping carriers, payment processors).</p>
          </Section>

          <Section title="COOKIES">
            <p>We use cookies to enhance your browsing experience and for analytics. You can disable cookies in your browser settings, though some features may not function properly.</p>
          </Section>

          <Section title="YOUR RIGHTS">
            <p>You have the right to access, update, or delete your personal data. To make a request, email <a href="mailto:support@studiodeny.in" className="text-primary hover:underline">support@studiodeny.in</a>.</p>
          </Section>

          <Section title="DATA RETENTION">
            <p>We retain your data only as long as necessary to fulfil the purposes outlined above, or as required by law.</p>
          </Section>

          <Section title="CONTACT">
            <p>For privacy-related enquiries, contact us at <a href="mailto:support@studiodeny.in" className="text-primary hover:underline">support@studiodeny.in</a>.</p>
          </Section>
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
