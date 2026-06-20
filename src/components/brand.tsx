import { Sparkles } from "lucide-react";

export function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  const icon = size === "lg" ? "h-9 w-9" : "h-7 w-7";
  return (
    <div className="flex items-center gap-2">
      <div className={`${icon} grid place-items-center rounded-xl gradient-primary text-white shadow-lg shadow-primary/30`}>
        <Sparkles className="h-4 w-4" />
      </div>
      <span className={`font-bold tracking-tight ${text}`}>
        Smart<span className="text-gradient">Spend</span> <span className="text-muted-foreground font-medium">AI</span>
      </span>
    </div>
  );
}
