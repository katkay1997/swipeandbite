import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
});

const DIETARY = ["Vegetarian", "Vegan", "Pescatarian", "Halal", "Kosher", "Gluten-free", "Dairy-free", "Keto", "Low-carb"];
const ALLERGENS = ["Peanuts", "Tree nuts", "Shellfish", "Fish", "Eggs", "Dairy", "Soy", "Wheat", "Sesame"];
const HEALTH = ["Diabetes", "Pregnancy", "High blood pressure", "High cholesterol", "Heart condition", "IBS"];
const RELIGIONS = ["None", "Muslim (Halal)", "Jewish (Kosher)", "Hindu", "Buddhist", "Christian", "Other"];
const BUDGETS = ["$ (under $10/meal)", "$$ ($10–25/meal)", "$$$ ($25+/meal)"];
const LIVING = ["Alone", "With roommates", "With family"];
const KITCHENS = ["Full kitchen", "Limited (microwave/stovetop)", "None"];
const GOALS = ["Lose weight", "Gain muscle", "Eat balanced", "Save money", "Save time", "Try new things"];

function CheckGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const checked = value.includes(o);
        return (
          <button
            type="button"
            key={o}
            onClick={() => onChange(checked ? value.filter((x) => x !== o) : [...value, o])}
            className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors ${
              checked
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
              {checked && <Check size={12} />}
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [dietary, setDietary] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [religion, setReligion] = useState("None");
  const [health, setHealth] = useState<string[]>([]);
  const [glp1, setGlp1] = useState(false);
  const [budget, setBudget] = useState("");
  const [living, setLiving] = useState("");
  const [cookTime, setCookTime] = useState(30);
  const [kitchen, setKitchen] = useState("");
  const [goal, setGoal] = useState("");
  const [bio, setBio] = useState("");
  const [missing, setMissing] = useState("");

  const steps = [
    "Dietary",
    "Allergies",
    "Religion",
    "Health",
    "GLP-1",
    "Budget",
    "Living",
    "Cook time",
    "Kitchen",
    "Goal",
    "Bio",
  ];

  // Prefill if exists
  useEffect(() => {
    if (!user) return;
    supabase
      .from("preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setDietary(data.dietary_restrictions ?? []);
        setAllergies(data.allergies ?? []);
        setReligion(data.religion ?? "None");
        setHealth(data.health_conditions ?? []);
        setGlp1(data.glp1_user ?? false);
        setBudget(data.budget_range ?? "");
        setLiving(data.living_situation ?? "");
        setCookTime(data.cook_time_minutes ?? 30);
        setKitchen(data.kitchen_access ?? "");
        setGoal(data.eating_goal ?? "");
      });
    supabase
      .from("profiles")
      .select("food_bio")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.food_bio) setBio(data.food_bio);
      });
  }, [user]);

  async function finish() {
    if (!user) return;
    setSaving(true);
    try {
      const { error: pErr } = await supabase.from("preferences").upsert({
        user_id: user.id,
        dietary_restrictions: dietary,
        allergies,
        religion,
        health_conditions: health,
        glp1_user: glp1,
        budget_range: budget,
        living_situation: living,
        cook_time_minutes: cookTime,
        kitchen_access: kitchen,
        eating_goal: goal,
      });
      if (pErr) throw pErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ food_bio: bio || null, onboarding_complete: true })
        .eq("id", user.id);
      if (profErr) throw profErr;

      if (missing.trim()) {
        await supabase.from("reports").insert({
          user_id: user.id,
          kind: "missing_restriction",
          message: missing.trim(),
        });
      }

      toast.success("All set! Let's find your match.");
      navigate({ to: "/app/mode" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  const last = step === steps.length - 1;

  return (
    <div className="py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {step + 1} of {steps.length}</span>
          <span>{steps[step]}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full transition-all"
            style={{ width: `${((step + 1) / steps.length) * 100}%`, background: "var(--gradient-warm)" }}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        {step === 0 && (
          <Step title="Any dietary restrictions?" sub="Pick all that apply.">
            <CheckGroup options={DIETARY} value={dietary} onChange={setDietary} />
            <div className="mt-4">
              <Label htmlFor="missing" className="text-xs text-muted-foreground">
                Restriction not listed? Tell us:
              </Label>
              <Input
                id="missing"
                value={missing}
                onChange={(e) => setMissing(e.target.value)}
                placeholder="e.g. FODMAP, low-purine…"
                className="mt-1"
              />
            </div>
          </Step>
        )}
        {step === 1 && (
          <Step title="Any allergies?" sub="We'll never show meals with these.">
            <CheckGroup options={ALLERGENS} value={allergies} onChange={setAllergies} />
          </Step>
        )}
        {step === 2 && (
          <Step title="Religious preferences?">
            <RadioGroup value={religion} onValueChange={setReligion}>
              {RELIGIONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent">
                  <RadioGroupItem value={r} />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </RadioGroup>
          </Step>
        )}
        {step === 3 && (
          <Step title="Health conditions to consider?" sub="Optional. Used to flag meals — not medical advice.">
            <CheckGroup options={HEALTH} value={health} onChange={setHealth} />
          </Step>
        )}
        {step === 4 && (
          <Step title="Are you on a GLP-1 medication?" sub="Like Ozempic, Wegovy, or Mounjaro. We'll prioritize balanced, lower-volume meals.">
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-4">
              <Checkbox checked={glp1} onCheckedChange={(v) => setGlp1(Boolean(v))} />
              <span>Yes, I'm taking a GLP-1</span>
            </label>
          </Step>
        )}
        {step === 5 && (
          <Step title="What's your budget per meal?">
            <RadioGroup value={budget} onValueChange={setBudget}>
              {BUDGETS.map((b) => (
                <label key={b} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent">
                  <RadioGroupItem value={b} />
                  <span className="text-sm">{b}</span>
                </label>
              ))}
            </RadioGroup>
          </Step>
        )}
        {step === 6 && (
          <Step title="Living situation?">
            <RadioGroup value={living} onValueChange={setLiving}>
              {LIVING.map((l) => (
                <label key={l} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent">
                  <RadioGroupItem value={l} />
                  <span className="text-sm">{l}</span>
                </label>
              ))}
            </RadioGroup>
          </Step>
        )}
        {step === 7 && (
          <Step title="How much time do you have to cook?" sub={`${cookTime} minutes`}>
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={cookTime}
              onChange={(e) => setCookTime(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>5 min</span><span>2 hrs</span>
            </div>
          </Step>
        )}
        {step === 8 && (
          <Step title="Kitchen access?">
            <RadioGroup value={kitchen} onValueChange={setKitchen}>
              {KITCHENS.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent">
                  <RadioGroupItem value={k} />
                  <span className="text-sm">{k}</span>
                </label>
              ))}
            </RadioGroup>
          </Step>
        )}
        {step === 9 && (
          <Step title="What's your eating goal?">
            <RadioGroup value={goal} onValueChange={setGoal}>
              {GOALS.map((g) => (
                <label key={g} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent">
                  <RadioGroupItem value={g} />
                  <span className="text-sm">{g}</span>
                </label>
              ))}
            </RadioGroup>
          </Step>
        )}
        {step === 10 && (
          <Step title="Tell us about your relationship with food" sub="Optional — helps us match your vibe.">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="I love spicy things, I'm a slow Sunday cook, I avoid mushrooms…"
              rows={4}
            />
          </Step>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft size={16} /> Back
        </Button>
        {last ? (
          <Button onClick={finish} disabled={saving} className="rounded-full">
            {saving ? "Saving…" : "Finish"} <Check size={16} />
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)} className="rounded-full">
            Next <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-5">{children}</div>
    </>
  );
}
