import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/lib/auth-context";

const search = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SwipeBite" },
      { name: "description", content: "Sign in or create your SwipeBite account to start matching meals." },
    ],
  }),
  validateSearch: search,
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: "/app/mode" });
    }
  }, [user, authLoading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a reset link");
        setResetMode(false);
        return;
      }
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <header className="mx-auto max-w-md px-6 py-5">
        <Logo />
      </header>
      <main className="mx-auto max-w-md px-6 pb-12">
        <div className="rounded-3xl bg-card p-7" style={{ boxShadow: "var(--shadow-card)" }}>
          <h1 className="text-2xl font-bold tracking-tight">
            {resetMode ? "Reset password" : isSignup ? "Create account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {resetMode
              ? "We'll email you a link to set a new password."
              : isSignup
                ? "Start matching meals you'll love."
                : "Sign in to continue."}
          </p>


          <form onSubmit={submit} className="space-y-3">
            {isSignup && !resetMode && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {!resetMode && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? "Please wait…" : resetMode ? "Send reset link" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            {resetMode ? (
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="text-primary hover:underline"
              >
                Back to sign in
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
                <Link
                  to="/auth"
                  search={{ mode: isSignup ? "signin" : "signup" }}
                  className="text-primary hover:underline"
                >
                  {isSignup ? "Have an account? Sign in" : "New here? Create account"}
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link to="/legal/disclaimer" className="underline">health disclaimer</Link>.
        </p>
      </main>
    </div>
  );
}

