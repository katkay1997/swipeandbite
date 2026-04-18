import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ALLERGENS,
  CheckGroup,
  DIETARY,
  Glp1Toggle,
  GoalRadio,
  HEALTH,
  OtherInput,
} from "@/components/preferences-form";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [dietary, setDietary] = useState<string[]>([]);
  const [dietaryOther, setDietaryOther] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergiesOther, setAllergiesOther] = useState("");
  const [health, setHealth] = useState<string[]>([]);
  const [healthOther, setHealthOther] = useState("");
  const [glp1, setGlp1] = useState(false);
  const [goal, setGoal] = useState("");

  const steps = ["Dietary", "Allergies", "Health", "GLP-1", "Goal"];

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
        setHealth(data.health_conditions ?? []);
        setGlp1(data.glp1_user ?? false);
        setGoal(data.eating_goal ?? "");
      });
  }, [user]);

  async function finish() {
    if (!user) return;
    setSaving(true);
    try {
      const mergedDietary = dietaryOther.trim()
        ? [...dietary, `Other: ${dietaryOther.trim()}`]
        : dietary;
      const mergedAllergies = allergiesOther.trim()
        ? [...allergies, `Other: ${allergiesOther.trim()}`]
        : allergies;
      const mergedHealth = healthOther.trim()
        ? [...health, `Other: ${healthOther.trim()}`]
        : health;

      const { error: pErr } = await supabase.from("preferences").upsert({
        user_id: user.id,
        dietary_restrictions: mergedDietary,
        allergies: mergedAllergies,
        health_conditions: mergedHealth,
        glp1_user: glp1,
        eating_goal: goal,
      });
      if (pErr) throw pErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", user.id);
      if (profErr) throw profErr;

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
          <span>
            Step {step + 1} of {steps.length}
          </span>
          <span>{steps[step]}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full transition-all"
            style={{
              width: `${((step + 1) / steps.length) * 100}%`,
              background: "var(--gradient-warm)",
            }}
          />
        </div>
      </div>

      <div
        className="rounded-3xl bg-card p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {step === 0 && (
          <Step title="Any dietary restrictions?" sub="Pick all that apply.">
            <CheckGroup options={DIETARY} value={dietary} onChange={setDietary} />
            <OtherInput
              id="dietary-other"
              value={dietaryOther}
              onChange={setDietaryOther}
              placeholder="e.g. FODMAP, low-purine…"
              label="Restriction not listed? Tell us:"
            />
          </Step>
        )}
        {step === 1 && (
          <Step title="Any allergies?" sub="We'll never show meals with these.">
            <CheckGroup
              options={ALLERGENS}
              value={allergies}
              onChange={setAllergies}
            />
            <OtherInput
              id="allergies-other"
              value={allergiesOther}
              onChange={setAllergiesOther}
              placeholder="e.g. mustard, celery, sulfites…"
              label="Allergy not listed? Tell us:"
            />
          </Step>
        )}
        {step === 2 && (
          <Step
            title="Health conditions to consider?"
            sub="Optional. Used to flag meals — not medical advice."
          >
            <CheckGroup options={HEALTH} value={health} onChange={setHealth} />
            <OtherInput
              id="health-other"
              value={healthOther}
              onChange={setHealthOther}
              placeholder="e.g. gout, anemia, migraine triggers…"
              label="Condition not listed? Tell us:"
            />
          </Step>
        )}
        {step === 3 && (
          <Step
            title="Are you on a GLP-1 medication?"
            sub="Like Ozempic, Wegovy, or Mounjaro. We'll prioritize balanced, lower-volume meals."
          >
            <Glp1Toggle value={glp1} onChange={setGlp1} />
          </Step>
        )}
        {step === 4 && (
          <Step title="What's your eating goal?">
            <GoalRadio value={goal} onChange={setGoal} />
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
          <Button
            onClick={() => setStep((s) => s + 1)}
            className="rounded-full"
          >
            Next <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-5">{children}</div>
    </>
  );
}
