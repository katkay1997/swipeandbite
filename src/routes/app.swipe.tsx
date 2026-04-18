import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/app/swipe")({
  validateSearch: z.object({
    mode: z.enum(["cook", "takeout"]).default("cook"),
  }),
  component: SwipePlaceholder,
});

function SwipePlaceholder() {
  const { mode } = Route.useSearch();
  return (
    <div className="py-12 text-center">
      <h1 className="text-2xl font-bold">Swipe deck — {mode}</h1>
      <p className="mt-2 text-muted-foreground">
        Coming next: meal cards with drag-to-swipe, match overlay, and rewind.
      </p>
    </div>
  );
}
