import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/matches")({
  component: () => (
    <div className="py-12 text-center">
      <h1 className="text-2xl font-bold">Your matches</h1>
      <p className="mt-2 text-muted-foreground">Match grid coming next.</p>
    </div>
  ),
});
