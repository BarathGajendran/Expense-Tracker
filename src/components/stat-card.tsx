import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon: Icon, hint, tone = "primary",
}: {
  label: string; value: string; icon: LucideIcon; hint?: string;
  tone?: "primary" | "secondary" | "accent" | "destructive";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/20 text-secondary-foreground",
    accent: "bg-accent/25 text-accent-foreground",
    destructive: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <div className="glass rounded-2xl p-5 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
