import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Utensils, Trash2, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type PinRow = Tables<"pins"> & { meal: Tables<"meals"> | null };
type Nutrition = {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

export const Route = createFileRoute("/app/ate")({
  component: AtePage,
});

function mealSlotForDate(d: Date): "breakfast" | "lunch" | "dinner" {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "breakfast";
  if (h >= 12 && h < 18) return "lunch";
  return "dinner"; // 18:00–04:59
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function AtePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PinRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("pins")
        .select("*, meal:meals(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data as PinRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  async function remove(id: string) {
    await supabase.from("pins").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Removed");
  }

  const today = useMemo(() => rows.filter((r) => isToday(r.created_at)), [rows]);

  const totals = useMemo(() => {
    return today.reduce(
      (acc, r) => {
        const n = (r.meal?.nutrition ?? {}) as Nutrition;
        acc.calories += Math.round(n.calories ?? 0);
        acc.protein += Math.round(n.protein_g ?? 0);
        acc.carbs += Math.round(n.carbs_g ?? 0);
        acc.fat += Math.round(n.fat_g ?? 0);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [today]);

  const grouped = useMemo(() => {
    const g: Record<"breakfast" | "lunch" | "dinner", PinRow[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
    };
    for (const r of today) g[mealSlotForDate(new Date(r.created_at))].push(r);
    return g;
  }, [today]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center">
        <Utensils className="mx-auto mb-3 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Nothing eaten yet</h1>
        <p className="mt-2 text-muted-foreground">Open a match and tap "Ate" to log it here.</p>
        <Link to="/app/matches" className="mt-5 inline-block">
          <Button style={{ background: "var(--gradient-warm)", color: "white" }}>View matches</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold">Ate</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {rows.length} total · {today.length} today
      </p>

      {/* Today's totals */}
      <section
        className="mt-4 rounded-2xl p-4 text-white"
        style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide opacity-90">Today</h2>
          <Flame size={14} className="opacity-90" />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          <Stat label="kcal" value={totals.calories.toString()} />
          <Stat label="protein" value={`${totals.protein}g`} />
          <Stat label="carbs" value={`${totals.carbs}g`} />
          <Stat label="fat" value={`${totals.fat}g`} />
        </div>
        {today.length === 0 && (
          <p className="mt-2 text-xs opacity-90">Log a meal today to see your totals.</p>
        )}
      </section>

      {/* Today by meal time */}
      {today.length > 0 && (
        <div className="mt-6 space-y-5">
          {(["breakfast", "lunch", "dinner"] as const).map((slot) =>
            grouped[slot].length > 0 ? (
              <section key={slot}>
                <h3 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
                  {slot}
                </h3>
                <PinGrid rows={grouped[slot]} onRemove={remove} />
              </section>
            ) : null,
          )}
        </div>
      )}

      {/* All history */}
      <h3 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">All history</h3>
      <PinGrid rows={rows} onRemove={remove} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-2 backdrop-blur">
      <div className="text-lg font-bold leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-90">{label}</div>
    </div>
  );
}

function PinGrid({ rows, onRemove }: { rows: PinRow[]; onRemove: (id: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((p) => (
        <article
          key={p.id}
          className="group relative overflow-hidden rounded-2xl bg-card"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {p.meal?.image_url && (
            <div
              className="h-40 w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${p.meal.image_url})` }}
            />
          )}
          <div className="p-3">
            <h3 className="font-semibold leading-tight">{p.meal?.name ?? "Meal"}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{p.meal?.cuisine}</p>
          </div>
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onRemove(p.id)}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        </article>
      ))}
    </div>
  );
}
