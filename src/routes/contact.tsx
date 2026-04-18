import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact us — SwipeBite" },
      { name: "description", content: "Get in touch with the SwipeBite team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      email,
      message,
      user_id: user?.id ?? null,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Message sent — we'll be in touch.");
      setMessage("");
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <header className="mx-auto flex max-w-md items-center justify-between px-6 py-5">
        <Logo />
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
      </header>
      <main className="mx-auto max-w-md px-6 pb-12">
        <form onSubmit={submit} className="rounded-3xl bg-card p-7" style={{ boxShadow: "var(--shadow-card)" }}>
          <h1 className="text-2xl font-bold">Contact us</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Questions, feedback, or a meal you want to see? Drop us a line.
          </p>
          <div className="mt-5 space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="msg">Message</Label>
              <Textarea id="msg" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="mt-4 w-full rounded-full">
            {loading ? "Sending…" : "Send"}
          </Button>
          {!user && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              You'll need to <Link to="/auth" className="underline">sign in</Link> first.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
