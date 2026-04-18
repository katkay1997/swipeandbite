import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat, MapPin } from "lucide-react";

export const Route = createFileRoute("/app/mode")({
  component: ModePage,
});

function ModePage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold tracking-tight">What sounds good?</h1>
      <p className="mt-1 text-muted-foreground">Pick how you want to eat today.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          to="/app/swipe"
          search={{ mode: "cook" }}
          className="group relative overflow-hidden rounded-3xl bg-card p-6 transition-transform hover:-translate-y-1"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="mb-4 grid h-12 w-12 place-items-center rounded-2xl text-white"
            style={{ background: "var(--gradient-warm)" }}
          >
            <ChefHat />
          </div>
          <h2 className="text-xl font-semibold">Cook your match</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recipes with ingredients, prep time and the tools you'll need.
          </p>
        </Link>
        <Link
          to="/app/swipe"
          search={{ mode: "takeout" }}
          className="group relative overflow-hidden rounded-3xl bg-card p-6 transition-transform hover:-translate-y-1"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="mb-4 grid h-12 w-12 place-items-center rounded-2xl text-white"
            style={{ background: "var(--gradient-warm)" }}
          >
            <MapPin />
          </div>
          <h2 className="text-xl font-semibold">Takeout</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Order from Uber Eats, DoorDash, or find a spot nearby.
          </p>
        </Link>
      </div>
      <p className="mt-8 rounded-2xl bg-accent p-4 text-xs text-muted-foreground">
        ⚠️ Health tags are informational only and not medical advice. Talk to a clinician about
        your dietary needs.
      </p>
    </div>
  );
}
