import { useEffect, useState } from "react";
import { Instagram } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function InstagramIconLink() {
  const [href, setHref] = useState("https://instagram.com");

  useEffect(() => {
    supabase
      .from("brand_settings")
      .select("social_instagram")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data?.social_instagram) setHref(data.social_instagram); });
  }, []);

  return (
    <div className="flex justify-center py-10 sm:py-14">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="size-12 border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Instagram className="size-5" />
      </a>
    </div>
  );
}
