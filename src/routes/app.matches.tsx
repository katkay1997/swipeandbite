import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type MatchRow = Tables<"matches"> & { meal: Tables<"meals"> | null };

export const Route = createFileRoute("/app/matches")({
  component: MatchesPage,
});

function MatchesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("matches")
        .select("*, meal:meals(*)")
        .eq("user_id", user!.id)
        .eq("archived", false)
        .order("matched_at", { ascending: false });
      setRows((data as MatchRow[]) || []);
      setLoading(false);
    }
  }, [user]);

  async function remove(id: string) {
    await supabase.from("matches").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Removed");
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center">
        <Heart className="mx-auto mb-3 text-muted-foreground" />
        <h1 className="text-2xl font-bold">No matches yet</h1>
        <p className="mt-2 text-muted-foreground">Start swiping to find your next meal.</p>
        <Link to="/app/mode" className="mt-5 inline-block">
          <Button style={{ background: "var(--gradient-warm)", color: "white" }}>Find a match</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold">Your matches</h1>
      <p className="mt-1 text-sm text-muted-foreground">{rows.length} saved meals</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows.map((m) => (
          <article
            key={m.id}
            className="group relative overflow-hidden rounded-2xl bg-card"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {m.meal?.image_url && (
              <div
                className="h-40 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${m.meal.image_url})` }}
              />
            )}
            <div className="p-3">
              <h3 className="font-semibold leading-tight">{m.meal?.name ?? "Meal"}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{m.meal?.cuisine}</p>
            </div>
            <button
              type="button"
              aria-label="Remove match"
              onClick={() => remove(m.id)}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
