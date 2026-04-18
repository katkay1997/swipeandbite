import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getA11y, setColorBlind, setReduceMotion } from "@/lib/a11y";
import { Camera } from "lucide-react";
import {
  ALLERGENS,
  CheckGroup,
  DIETARY,
  GoalRadio,
  HEALTH,
  HEALTH_GLP1_OPTION,
  OtherInput,
} from "@/components/preferences-form";

export const Route = createFileRoute("/app/settings")({
  component: Settings,
});

// Split saved values back into preset selections + free-text "Other: ..." entry.
function splitOther(values: string[] | null | undefined) {
  const v = values ?? [];
  const other = v.find((x) => x.startsWith("Other: "));
  return {
    selected: v.filter((x) => !x.startsWith("Other: ")),
    other: other ? other.replace(/^Other:\s*/, "") : "",
  };
}

function Settings() {
  const { user } = useAuth();
  const [displayName, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cb, setCb] = useState(false);
  const [rm, setRm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Preferences (scrollable)
  const [dietary, setDietary] = useState<string[]>([]);
  const [dietaryOther, setDietaryOther] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergiesOther, setAllergiesOther] = useState("");
  const [health, setHealth] = useState<string[]>([]);
  const [healthOther, setHealthOther] = useState("");
  const [glp1, setGlp1] = useState(false);
  const [goal, setGoal] = useState("");

  useEffect(() => {
    const a = getA11y();
    setCb(a.colorBlind);
    setRm(a.reduceMotion);
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, food_bio, avatar_url, color_blind, reduce_motion")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setName(data.display_name ?? "");
        setBio(data.food_bio ?? "");
        setAvatar(data.avatar_url);
      });
    supabase
      .from("preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = splitOther(data.dietary_restrictions);
        const a = splitOther(data.allergies);
        const h = splitOther(data.health_conditions);
        setDietary(d.selected);
        setDietaryOther(d.other);
        setAllergies(a.selected);
        setAllergiesOther(a.other);
        setHealth(h.selected);
        setHealthOther(h.other);
        setGlp1(data.glp1_user ?? false);
        setGoal(data.eating_goal ?? "");
      });
  }, [user]);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatar(data.publicUrl);
    await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", user.id);
    toast.success("Avatar updated");
  }

  async function save() {
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

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          food_bio: bio,
          color_blind: cb,
          reduce_motion: rm,
        })
        .eq("id", user.id);
      if (profErr) throw profErr;

      const { error: prefErr } = await supabase.from("preferences").upsert({
        user_id: user.id,
        dietary_restrictions: mergedDietary,
        allergies: mergedAllergies,
        health_conditions: mergedHealth,
        glp1_user: glp1,
        eating_goal: goal,
      });
      if (prefErr) throw prefErr;

      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="py-6 pb-24">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <section
        className="mt-6 rounded-3xl bg-card p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <label className="relative cursor-pointer">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatar ?? undefined} />
              <AvatarFallback>
                {displayName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -right-1 -bottom-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
              <Camera size={12} />
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadAvatar}
            />
          </label>
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="dn">Name</Label>
              <Input
                id="dn"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="bio">Food bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />
        </div>
      </section>

      <section
        className="mt-4 rounded-3xl bg-card p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="font-semibold">Accessibility</h2>
        <div className="mt-4 space-y-4">
          <Row
            label="Color-blind palette"
            sub="Switches the brand colors to a high-contrast blue scheme."
          >
            <Switch
              checked={cb}
              onCheckedChange={(v) => {
                setCb(v);
                setColorBlind(v);
              }}
            />
          </Row>
          <Row label="Reduce motion" sub="Disables swipe physics and animations.">
            <Switch
              checked={rm}
              onCheckedChange={(v) => {
                setRm(v);
                setReduceMotion(v);
              }}
            />
          </Row>
        </div>
      </section>

      <section
        className="mt-4 rounded-3xl bg-card p-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="font-semibold">Preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scroll and tweak anything — changes save together.
        </p>

        <div className="mt-5">
          <h3 className="text-sm font-medium">Dietary restrictions</h3>
          <div className="mt-2">
            <CheckGroup
              options={DIETARY}
              value={dietary}
              onChange={setDietary}
            />
            <OtherInput
              id="set-dietary-other"
              value={dietaryOther}
              onChange={setDietaryOther}
              placeholder="e.g. FODMAP, low-purine…"
              label="Restriction not listed? Tell us:"
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium">Allergies</h3>
          <div className="mt-2">
            <CheckGroup
              options={ALLERGENS}
              value={allergies}
              onChange={setAllergies}
            />
            <OtherInput
              id="set-allergies-other"
              value={allergiesOther}
              onChange={setAllergiesOther}
              placeholder="e.g. mustard, celery, sulfites…"
              label="Allergy not listed? Tell us:"
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium">Health conditions</h3>
          <p className="text-xs text-muted-foreground">
            Used to flag meals — not medical advice.
          </p>
          <div className="mt-2">
            <CheckGroup options={HEALTH} value={health} onChange={setHealth} />
            <OtherInput
              id="set-health-other"
              value={healthOther}
              onChange={setHealthOther}
              placeholder="e.g. gout, anemia, migraine triggers…"
              label="Condition not listed? Tell us:"
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium">GLP-1 medication</h3>
          <p className="text-xs text-muted-foreground">
            Like Ozempic, Wegovy, or Mounjaro.
          </p>
          <div className="mt-2">
            <Glp1Toggle value={glp1} onChange={setGlp1} />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium">Eating goal</h3>
          <div className="mt-2">
            <GoalRadio value={goal} onChange={setGoal} />
          </div>
        </div>
      </section>

      <Button
        onClick={save}
        disabled={saving}
        className="mt-5 w-full rounded-full"
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      {children}
    </div>
  );
}
