import { createFileRoute } from "@tanstack/react-router";
import { CollabPage } from "./collaborators.art";

export const Route = createFileRoute("/collaborators/influencers")({
  component: CollabInfluencers,
  head: () => ({ meta: [{ title: "Influencers — STUDIO DENY" }] }),
});

function CollabInfluencers() {
  return <CollabPage category="INFLUENCERS" desc="We work with creators who are authentic to their audience. No templates — just real people who genuinely rep what Studio Deny stands for." />;
}
