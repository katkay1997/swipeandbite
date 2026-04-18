import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Utensils, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type PinRow = Tables<"pins"> & { meal: Tables<"meals"> | null };

export const Route = createFileRoute("/app/ate")({
  component: AtePage,
});

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
      <p className="mt-1 text-sm text-muted-foreground">{rows.length} meals logged</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
              onClick={() => remove(p.id)}
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
