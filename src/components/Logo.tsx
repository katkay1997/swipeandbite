import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  const icon = size === "lg" ? 28 : size === "sm" ? 18 : 22;
  return (
    <Link to="/" className="inline-flex items-center gap-2 font-bold tracking-tight">
      <span
        className="grid place-items-center rounded-full p-1.5"
        style={{ background: "var(--gradient-warm)" }}
      >
        <Heart size={icon} className="fill-white text-white" />
      </span>
      <span className={`${text} text-foreground`}>
        Swipe<span className="text-primary">Bite</span>
      </span>
    </Link>
  );
}
