import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Clock,
  Flame,
  ChefHat,
  MapPin,
  ExternalLink,
  Loader2,
  Sparkles,
  Search,
  Utensils,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { estimateMealNutrition, searchTakeoutNearby } from "@/server/match.functions";

type MatchRow = Tables<"matches"> & { meal: Tables<"meals"> | null };
type Nutrition = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  cost_usd_low: number;
  cost_usd_high: number;
  notes?: string;
};

export const Route = createFileRoute("/app/match/$id")({
  component: MatchDetailPage,
});

function MatchDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("matches")
        .select("*, meal:meals(*)")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setMatch((data as MatchRow) ?? null);
      setLoading(false);
    })();
  }, [user, id]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!match || !match.meal) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-xl font-bold">Match not found</h1>
        <Button className="mt-4" onClick={() => navigate({ to: "/app/matches" })}>
          Back to matches
        </Button>
      </div>
    );
  }

  const meal = match.meal;
  const isCook = match.mode === "cook";

  async function markAte() {
    if (!user || !meal) return;
    const { error } = await supabase.from("pins").insert({ user_id: user.id, meal_id: meal.id });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast.error("Couldn't log it");
      return;
    }
    toast.success("Logged to Ate");
    navigate({ to: "/app/ate" });
  }

  return (
    <div className="pb-20">
      <div className="-mx-4 sm:mx-0">
        <div
          className="relative h-64 w-full bg-cover bg-center sm:rounded-3xl"
          style={{ backgroundImage: `url(${meal.image_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent sm:rounded-3xl" />
          <button
            type="button"
            onClick={() => navigate({ to: "/app/matches" })}
            aria-label="Back"
            className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
              {isCook ? <ChefHat size={12} /> : <MapPin size={12} />}
              {isCook ? "Cook your match" : "Takeout"}
            </div>
            <h1 className="text-2xl font-extrabold leading-tight">{meal.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-90">
              {meal.cuisine && <span>{meal.cuisine}</span>}
              {meal.prep_minutes && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {meal.prep_minutes} min
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Flame size={12} /> {meal.affordability ?? "$$"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 px-1">
        <Button
          onClick={markAte}
          className="w-full gap-2"
          style={{ background: "var(--gradient-warm)", color: "white" }}
        >
          <Utensils size={16} /> Ate it
        </Button>
      </div>

      {isCook ? <CookView meal={meal} /> : <TakeoutView meal={meal} />}
    </div>
  );
}

function CookView({ meal }: { meal: Tables<"meals"> }) {
  const ingredients = useMemo(() => {
    const arr = (meal.ingredients as Array<{ name: string; measure?: string }>) || [];
    return arr;
  }, [meal.ingredients]);

  return (
    <div className="mt-5 space-y-5 px-1">
      <NutritionPanel mealId={meal.id} initial={meal.nutrition as Nutrition | null} prepMinutes={meal.prep_minutes} />

      {ingredients.length > 0 && (
        <section
          className="rounded-2xl bg-card p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ingredients
          </h2>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {ingredients.map((ing, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{ing.name}</span>
                {ing.measure && <span className="text-muted-foreground"> — {ing.measure}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {meal.instructions && (
        <section
          className="rounded-2xl bg-card p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Instructions
          </h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed">
            {meal.instructions
              .split(/\n+/)
              .filter((s) => s.trim())
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NutritionPanel({
  mealId,
  initial,
  prepMinutes,
}: {
  mealId: string;
  initial: Nutrition | null;
  prepMinutes: number | null;
}) {
  const estimate = useServerFn(estimateMealNutrition);
  const hasInitial = !!(initial && typeof initial.calories === "number");
  const [nutrition, setNutrition] = useState<Nutrition | null>(hasInitial ? initial : null);
  const [loading, setLoading] = useState(!hasInitial);

  useEffect(() => {
    if (hasInitial) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await estimate({ data: { mealId } });
        if (!cancelled) {
          if (res.nutrition) setNutrition(res.nutrition);
          else if (res.error) toast.error(res.error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mealId, hasInitial, estimate]);

  return (
    <section
      className="rounded-2xl bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Estimates
        </h2>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
          <Sparkles size={10} /> AI estimate
        </span>
      </div>

      {loading && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!loading && nutrition && (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Stat label="kcal" value={Math.round(nutrition.calories).toString()} />
            <Stat label="protein" value={`${Math.round(nutrition.protein_g)}g`} />
            <Stat label="carbs" value={`${Math.round(nutrition.carbs_g)}g`} />
            <Stat label="fat" value={`${Math.round(nutrition.fat_g)}g`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Flame size={12} className="mr-1" />~ ${nutrition.cost_usd_low.toFixed(2)}–$
              {nutrition.cost_usd_high.toFixed(2)} / serving
            </Badge>
            {prepMinutes && (
              <Badge variant="secondary">
                <Clock size={12} className="mr-1" />~ {prepMinutes} min
              </Badge>
            )}
          </div>
          {nutrition.notes && (
            <p className="mt-2 text-xs text-muted-foreground">{nutrition.notes}</p>
          )}
        </>
      )}

      {!loading && !nutrition && (
        <p className="mt-3 text-sm text-muted-foreground">
          Couldn't estimate nutrition right now.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-2">
      <div className="text-lg font-bold leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function TakeoutView({ meal }: { meal: Tables<"meals"> }) {
  const search = useServerFn(searchTakeoutNearby);
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<{ title: string; url: string; snippet: string }[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sb_takeout_location");
    if (saved) setLocation(saved);
  }, []);

  const dishQuery = encodeURIComponent(`${meal.name} takeout`);
  const mapsQuery = encodeURIComponent(
    location.trim() ? `${meal.name} takeout near ${location.trim()}` : `${meal.name} takeout near me`,
  );
  const deepLinks = [
    { name: "Uber Eats", href: `https://www.ubereats.com/search?q=${dishQuery}` },
    { name: "DoorDash", href: `https://www.doordash.com/search/store/${dishQuery}` },
    { name: "Grubhub", href: `https://www.grubhub.com/search?queryText=${dishQuery}` },
    { name: "Google Maps", href: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}` },
  ];


  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!location.trim()) {
      toast.error("Enter your city or zip");
      return;
    }
    localStorage.setItem("sb_takeout_location", location.trim());
    setLoading(true);
    setSearched(true);
    try {
      const res = await search({
        data: {
          mealName: meal.name,
          cuisine: meal.cuisine ?? undefined,
          location: location.trim(),
        },
      });
      setResults(res.results ?? []);
      setAnswer(res.answer ?? null);
      if (res.error) toast.error(res.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 space-y-5 px-1">
      <section
        className="rounded-2xl bg-card p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Order it on
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {deepLinks.map((l) => (
            <a
              key={l.name}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              {l.name}
              <ExternalLink size={14} className="text-muted-foreground" />
            </a>
          ))}
        </div>
      </section>

      <section
        className="rounded-2xl bg-card p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Find nearby
        </h2>
        <form onSubmit={runSearch} className="mt-2 flex gap-2">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, neighborhood, or zip"
            className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </Button>
        </form>

        {answer && (
          <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm leading-relaxed">{answer}</p>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No nearby spots found. Try a broader area.</p>
        )}

        {results.length > 0 && (
          <ul className="mt-3 space-y-2">
            {results.map((r, i) => (
              <li key={i}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border bg-background p-3 hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {r.snippet}
                      </p>
                    </div>
                    <ExternalLink size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="px-2 text-center text-xs text-muted-foreground">
        Restaurant data from web search — verify hours and menus on the restaurant's site.
      </p>
      <Link to="/app/matches" className="block text-center text-sm text-muted-foreground underline">
        ← Back to matches
      </Link>
    </div>
  );
}
