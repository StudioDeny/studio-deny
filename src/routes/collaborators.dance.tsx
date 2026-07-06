import { createFileRoute } from "@tanstack/react-router";
import { CollabPage } from "./collaborators.art";

export const Route = createFileRoute("/collaborators/dance")({
  component: CollabDance,
  head: () => ({ meta: [{ title: "Dance Collaborators — STUDIO DENY" }] }),
});

function CollabDance() {
  return <CollabPage category="DANCE" desc="Studio Deny collaborates with dancers, choreographers, and movement artists who embody the energy of the streets." />;
}
