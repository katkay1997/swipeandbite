import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Trash2, ChefHat, MapPin, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type MatchRow = Tables<"matches"> & { meal: Tables<"meals"> | null };

export const Route = createFileRoute("/app/matches")({
  component: MatchesPage,
});

function MatchesPage() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"cook" | "takeout">("cook");

  useEffect(() => {
    if (!userId) return;
    void load();
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("matches")
        .select("*, meal:meals(*)")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("matched_at", { ascending: false });
      setRows((data as MatchRow[]) || []);
      setLoading(false);
    }
  }, [userId]);

  const cook = useMemo(() => rows.filter((r) => r.mode === "cook"), [rows]);
  const takeout = useMemo(() => rows.filter((r) => r.mode === "takeout"), [rows]);

  async function remove(id: string) {
    if (!userId) return;
    await supabase.from("matches").delete().eq("id", id).eq("user_id", userId);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Removed");
  }

  async function clearAll() {
    if (!userId) return;
    const { error } = await supabase.from("matches").delete().eq("user_id", userId);
    if (error) {
      toast.error("Couldn't clear matches");
      return;
    }
    setRows([]);
    toast.success("All matches cleared");
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your matches</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rows.length} saved meals</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Trash2 size={14} /> Clear all
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all matches?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes every match from both Cook and Takeout. You can't undo this.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearAll}>Clear all</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "cook" | "takeout")} className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cook" className="gap-1.5">
            <ChefHat size={14} /> Cook ({cook.length})
          </TabsTrigger>
          <TabsTrigger value="takeout" className="gap-1.5">
            <MapPin size={14} /> Takeout ({takeout.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cook" className="mt-4">
          <MatchGrid rows={cook} onRemove={remove} mode="cook" />
        </TabsContent>
        <TabsContent value="takeout" className="mt-4">
          <MatchGrid rows={takeout} onRemove={remove} mode="takeout" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchGrid({
  rows,
  onRemove,
  mode,
}: {
  rows: MatchRow[];
  onRemove: (id: string) => void;
  mode: "cook" | "takeout";
}) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No {mode === "cook" ? "cook" : "takeout"} matches yet.
        <div className="mt-3">
          <Link to="/app/mode">
            <Button variant="outline" size="sm">
              Swipe in {mode === "cook" ? "Cook" : "Takeout"} mode
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((m) => (
        <article
          key={m.id}
          className="group relative overflow-hidden rounded-2xl bg-card"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Link
            to="/app/match/$id"
            params={{ id: m.id }}
            className="block"
            aria-label={`Open ${m.meal?.name ?? "match"}`}
          >
            {m.meal?.image_url && (
              <div
                className="h-40 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${m.meal.image_url})` }}
              />
            )}
            <div className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold leading-tight">{m.meal?.name ?? "Meal"}</h3>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {m.meal?.cuisine && <span className="truncate">{m.meal.cuisine}</span>}
                  {mode === "cook" && m.meal?.prep_minutes && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} /> {m.meal.prep_minutes}m
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </div>
          </Link>
          <button
            type="button"
            aria-label="Remove match"
            onClick={() => onRemove(m.id)}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        </article>
      ))}
    </div>
  );
}
