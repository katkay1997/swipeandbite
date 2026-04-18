import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Heart, ChefHat, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import heroImg from "@/assets/hero-meal.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwipeBite — Find your next meal match" },
      {
        name: "description",
        content:
          "Tinder-style meal discovery. Swipe right to match meals you'll love, then cook them or order takeout.",
      },
      { property: "og:title", content: "SwipeBite — Find your next meal match" },
      {
        property: "og:description",
        content: "Swipe right on your next meal. Cook or takeout, tailored to you.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/contact" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
            Contact
          </Link>
          <Button size="sm" className="rounded-full" onClick={() => navigate({ to: "/app/mode" })}>
            Open app
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-8 lg:grid-cols-2 lg:gap-16 lg:pt-16">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
            <Sparkles size={12} /> Find your next bite
          </span>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Swipe right on
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-warm)" }}
            >
              your next meal
            </span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            A romance-style food discovery app. Match meals you'll love, then cook them at home or
            order takeout — all tailored to your dietary preferences.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="rounded-full text-base"
              onClick={() => navigate({ to: "/app/mode" })}
            >
              Find my match <ArrowRight className="ml-1" size={18} />
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            <Feature icon={<Heart size={18} />} label="Match meals" />
            <Feature icon={<ChefHat size={18} />} label="Cook at home" />
            <Feature icon={<MapPin size={18} />} label="Order takeout" />
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-6 rounded-[3rem] opacity-30 blur-3xl"
            style={{ background: "var(--gradient-warm)" }}
            aria-hidden
          />
          <img
            src={heroImg}
            alt="A beautifully plated meal on a soft pink background"
            width={1280}
            height={1280}
            className="relative aspect-square w-full rounded-[2rem] object-cover"
            style={{ boxShadow: "var(--shadow-romantic)" }}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { n: 1, t: "Tell us about you", d: "Allergies, goals, and how much time you have to cook." },
            { n: 2, t: "Swipe to match", d: "Right for love, left to pass. Rewind if you change your mind." },
            { n: 3, t: "Cook or order", d: "Get the recipe with tools needed, or order via Uber Eats / DoorDash." },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-3xl bg-card p-6"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="mb-4 grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-primary-foreground"
                style={{ background: "var(--gradient-warm)" }}
              >
                {s.n}
              </div>
              <h3 className="text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} SwipeBite</span>
          <div className="flex gap-4">
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
            <Link to="/legal/disclaimer" className="hover:text-foreground">Health disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 text-center text-xs font-medium" style={{ boxShadow: "var(--shadow-card)" }}>
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  );
}
