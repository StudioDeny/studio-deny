import { createFileRoute } from "@tanstack/react-router";
import { CollabPage } from "./collaborators.art";

export const Route = createFileRoute("/collaborators/models")({
  component: CollabModels,
  head: () => ({ meta: [{ title: "Models — STUDIO DENY" }] }),
});

function CollabModels() {
  return <CollabPage category="MODELS" desc="Our models are storytellers. We work with faces that carry culture — real people who wear our pieces like they were made for them." />;
}
