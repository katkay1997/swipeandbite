import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Heart, X, Undo2, Clock, Flame, ChefHat, MapPin, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Meal = Tables<"meals">;

export const Route = createFileRoute("/app/swipe")({
  validateSearch: z.object({
    mode: z.enum(["cook", "takeout"]).default("cook"),
  }),
  component: SwipePage,
});

function SwipePage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deck, setDeck] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<{ meal: Meal; direction: "left" | "right"; swipeId?: string; matchId?: string }[]>([]);
  const [matchMeal, setMatchMeal] = useState<Meal | null>(null);
  const lockRef = useRef(false);

  // Load deck: meals not yet swiped by the user
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: swiped } = await supabase
        .from("swipes")
        .select("meal_id")
        .eq("user_id", user.id)
        .eq("mode", mode);
      const swipedIds = new Set((swiped || []).map((s) => s.meal_id));

      const { data: meals, error } = await supabase
        .from("meals")
        .select("*")
        .eq("is_alcohol", false)
        .limit(200);
      if (error) {
        toast.error("Couldn't load meals");
        setLoading(false);
        return;
      }
      const fresh = (meals || []).filter((m) => !swipedIds.has(m.id));
      // shuffle
      for (let i = fresh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
      }
      if (!cancelled) {
        setDeck(fresh.slice(0, 30));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, mode]);

  async function commitSwipe(meal: Meal, direction: "left" | "right") {
    if (!user) return;
    // Insert swipe
    const { data: swipeRow } = await supabase
      .from("swipes")
      .insert({ user_id: user.id, meal_id: meal.id, mode, direction })
      .select("id")
      .single();
    let matchId: string | undefined;
    if (direction === "right") {
      const { data: matchRow } = await supabase
        .from("matches")
        .insert({ user_id: user.id, meal_id: meal.id, mode })
        .select("id")
        .single();
      matchId = matchRow?.id;
      setMatchMeal(meal);
    }
    setHistory((h) => [...h, { meal, direction, swipeId: swipeRow?.id, matchId }].slice(-10));
  }

  function handleSwipe(direction: "left" | "right") {
    if (lockRef.current || deck.length === 0) return;
    lockRef.current = true;
    const top = deck[deck.length - 1];
    setDeck((d) => d.slice(0, -1));
    void commitSwipe(top, direction).finally(() => {
      lockRef.current = false;
    });
  }

  async function handleRewind() {
    const last = history[history.length - 1];
    if (!last) {
      toast("Nothing to rewind");
      return;
    }
    setHistory((h) => h.slice(0, -1));
    setDeck((d) => [...d, last.meal]);
    if (last.swipeId) await supabase.from("swipes").delete().eq("id", last.swipeId);
    if (last.matchId) await supabase.from("matches").delete().eq("id", last.matchId);
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        Loading meals…
      </div>
    );
  }

  if (deck.length === 0 && !matchMeal) {
    return (
      <div className="py-12 text-center">
        <div
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl text-white"
          style={{ background: "var(--gradient-warm)" }}
        >
          <Sparkles />
        </div>
        <h1 className="text-2xl font-bold">You've seen them all!</h1>
        <p className="mt-2 text-muted-foreground">
          Check your matches or come back later for more.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => navigate({ to: "/app/matches" })}>View matches</Button>
          <Button variant="outline" onClick={() => navigate({ to: "/app/mode" })}>
            Change mode
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pt-2 pb-32">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {mode === "cook" ? <ChefHat size={14} /> : <MapPin size={14} />}
          {mode === "cook" ? "Cook mode" : "Takeout mode"}
        </span>
        <span>{deck.length} left</span>
      </div>

      <div className="relative mx-auto h-[520px] w-full max-w-sm">
        {deck.slice(-3).map((meal, idx, arr) => {
          const isTop = idx === arr.length - 1;
          const offset = arr.length - 1 - idx;
          return (
            <SwipeCard
              key={meal.id}
              meal={meal}
              offset={offset}
              isTop={isTop}
              onSwipe={handleSwipe}
            />
          );
        })}
      </div>

      <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-3">
        <ActionBtn label="Nope" onClick={() => handleSwipe("left")}>
          <X size={22} />
        </ActionBtn>
        <ActionBtn label="Rewind" variant="ghost" onClick={handleRewind}>
          <Undo2 size={18} />
        </ActionBtn>
        <ActionBtn label="Yum" variant="primary" onClick={() => handleSwipe("right")}>
          <Heart size={22} />
        </ActionBtn>
      </div>

      <AnimatePresence>
        {matchMeal && (
          <MatchOverlay
            meal={matchMeal}
            mode={mode}
            onClose={() => setMatchMeal(null)}
            onView={() => {
              setMatchMeal(null);
              navigate({ to: "/app/matches" });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SwipeCard({
  meal,
  offset,
  isTop,
  onSwipe,
}: {
  meal: Meal;
  offset: number;
  isTop: boolean;
  onSwipe: (dir: "left" | "right") => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -20], [1, 0]);

  function onDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const threshold = 110;
    if (info.offset.x > threshold) onSwipe("right");
    else if (info.offset.x < -threshold) onSwipe("left");
  }

  const scale = 1 - offset * 0.04;
  const y = offset * 10;

  return (
    <motion.div
      className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl bg-card active:cursor-grabbing"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale,
        y,
        zIndex: 10 - offset,
        boxShadow: "var(--shadow-card)",
        touchAction: "none",
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={onDragEnd}
    >
      <div
        className="h-2/3 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${meal.image_url})` }}
        aria-label={meal.name}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
        <h2 className="text-2xl font-bold leading-tight">{meal.name}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-90">
          {meal.cuisine && <span>{meal.cuisine}</span>}
          {meal.prep_minutes && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {meal.prep_minutes}m
            </span>
          )}
          {meal.health_flags?.slice(0, 2).map((f) => (
            <span
              key={f}
              className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide"
            >
              {f.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>

      {isTop && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute left-5 top-5 rotate-[-12deg] rounded-xl border-4 px-3 py-1 text-2xl font-extrabold uppercase"
            aria-hidden
          >
            <span className="text-success" style={{ borderColor: "var(--success)" }}>
              <span style={{ color: "var(--success)" }}>Yum</span>
            </span>
          </motion.div>
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="absolute right-5 top-5 rotate-[12deg] rounded-xl border-4 px-3 py-1 text-2xl font-extrabold uppercase"
            aria-hidden
          >
            <span className="text-destructive" style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>
              Nope
            </span>
          </motion.div>
        </>
      )}

      <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] font-medium uppercase text-white">
        <Flame size={12} /> {meal.affordability ?? "$$"}
      </div>
    </motion.div>
  );
}

function ActionBtn({
  children,
  onClick,
  label,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  variant?: "default" | "primary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? { background: "var(--gradient-warm)", color: "white", boxShadow: "var(--shadow-romantic)" }
      : variant === "ghost"
        ? { background: "transparent", color: "var(--muted-foreground)" }
        : { background: "var(--card)", color: "var(--foreground)", boxShadow: "var(--shadow-card)" };
  const size = variant === "ghost" ? "h-11 w-11" : "h-14 w-14";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid ${size} place-items-center rounded-full transition-transform active:scale-90`}
      style={styles}
    >
      {children}
    </button>
  );
}

function MatchOverlay({
  meal,
  mode,
  onClose,
  onView,
}: {
  meal: Meal;
  mode: "cook" | "takeout";
  onClose: () => void;
  onView: () => void;
}) {
  const ingredients = useMemo(() => {
    const arr = (meal.ingredients as Array<{ name: string; measure?: string }>) || [];
    return arr.slice(0, 6);
  }, [meal.ingredients]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center p-5"
      style={{ background: "color-mix(in oklab, var(--primary) 35%, black 65%)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 240 }}
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative h-56 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${meal.image_url})` }}
        >
          <div className="absolute inset-0" style={{ background: "var(--gradient-warm)", mixBlendMode: "multiply", opacity: 0.45 }} />
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center text-white">
              <Heart className="mx-auto mb-2" fill="white" />
              <h3 className="text-3xl font-extrabold tracking-tight">It's a match!</h3>
            </div>
          </div>
        </div>
        <div className="p-5">
          <h4 className="text-xl font-bold">{meal.name}</h4>
          {meal.cuisine && (
            <p className="mt-0.5 text-sm text-muted-foreground">{meal.cuisine}</p>
          )}
          {mode === "cook" && ingredients.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">You'll need</p>
              <ul className="mt-1 grid grid-cols-2 gap-1 text-sm">
                {ingredients.map((ing, i) => (
                  <li key={i} className="truncate">
                    • {ing.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Keep swiping
            </Button>
            <Button
              className="flex-1"
              style={{ background: "var(--gradient-warm)", color: "white" }}
              onClick={onView}
            >
              View match
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
