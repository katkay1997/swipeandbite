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

export const Route = createFileRoute("/app/settings")({
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const [displayName, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cb, setCb] = useState(false);
  const [rm, setRm] = useState(false);
  const [saving, setSaving] = useState(false);

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
  }, [user]);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatar(data.publicUrl);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    toast.success("Avatar updated");
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, food_bio: bio, color_blind: cb, reduce_motion: rm })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  return (
    <div className="py-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <section className="mt-6 rounded-3xl bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <label className="relative cursor-pointer">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatar ?? undefined} />
              <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="absolute -right-1 -bottom-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
              <Camera size={12} />
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </label>
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="dn">Name</Label>
              <Input id="dn" value={displayName} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="bio">Food bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
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

      <section className="mt-4 rounded-3xl bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-semibold">Preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Re-run onboarding to update allergies, restrictions, goals, and more.
        </p>
        <Button
          variant="outline"
          className="mt-3 rounded-full"
          onClick={() => (window.location.href = "/app/onboarding")}
        >
          Edit preferences
        </Button>
      </section>

      <Button onClick={save} disabled={saving} className="mt-5 w-full rounded-full">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
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
