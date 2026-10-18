import { useEffect, useState } from "react";
import { getBrandSettings } from "@/lib/brand";

/** The contact email from Admin → Settings, as a mailto link. */
export function ContactEmailLink({
  className = "text-primary hover:underline",
}: {
  className?: string;
}) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    getBrandSettings().then((b) => setEmail(b.contact_email?.trim() || null));
  }, []);
  if (!email) return null;
  return (
    <a href={`mailto:${email}`} className={className}>
      {email}
    </a>
  );
}
