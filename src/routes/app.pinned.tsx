import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/pinned")({
  component: () => (
    <div className="py-12 text-center">
      <h1 className="text-2xl font-bold">Pinned for later</h1>
      <p className="mt-2 text-muted-foreground">Saved meals will show up here.</p>
    </div>
  ),
});
