import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () => ({ meta: [{ title: "Terms & Conditions — STUDIO DENY" }] }),
});

function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-24 px-4 sm:px-8 lg:px-16">
      <div className="max-w-[760px] mx-auto">
        <p className="text-mono text-[10px] tracking-[0.3em] text-primary mb-4">LEGAL</p>
        <h1 className="text-display text-[clamp(3rem,8vw,5rem)] leading-none tracking-[-0.03em] uppercase mb-4">TERMS &<br />CONDITIONS</h1>
        <p className="text-muted-foreground text-mono text-xs mb-10">Last updated: January 2025</p>

        <div className="space-y-10 text-mono text-sm leading-relaxed text-muted-foreground">
          <Section title="ACCEPTANCE OF TERMS">
            <p>By accessing or using studiodeny.in, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the site.</p>
          </Section>

          <Section title="USE OF THE SITE">
            <p>You may use this site only for lawful purposes. You agree not to misuse, reproduce, or distribute any content without our express written permission.</p>
          </Section>

          <Section title="ORDERS & PAYMENTS">
            <p>All orders are subject to availability. Prices are listed in Indian Rupees (INR) and inclusive of applicable taxes. We reserve the right to cancel any order at our discretion.</p>
          </Section>

          <Section title="INTELLECTUAL PROPERTY">
            <p>All content on this site — including logos, graphics, photography, and copy — is the exclusive property of Studio Deny and may not be used without permission.</p>
          </Section>

          <Section title="LIMITATION OF LIABILITY">
            <p>Studio Deny shall not be liable for any indirect, incidental, or consequential damages arising from your use of this site or purchase of products.</p>
          </Section>

          <Section title="GOVERNING LAW">
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.</p>
          </Section>

          <Section title="CHANGES TO TERMS">
            <p>We may update these terms at any time. Continued use of the site after changes constitutes your acceptance.</p>
          </Section>

          <Section title="CONTACT">
            <p>For questions about these terms, email <a href="mailto:support@studiodeny.in" className="text-primary hover:underline">support@studiodeny.in</a>.</p>
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
