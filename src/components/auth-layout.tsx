import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* ambient gradient blobs */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-secondary/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/3 h-72 w-72 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="mb-6 flex justify-center">
          <Brand size="lg" />
        </div>
        <div className="glass rounded-3xl p-8 shadow-2xl shadow-primary/5">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        <p className="mt-4 text-center text-xs text-muted-foreground">Track expenses intelligently with AI insights.</p>
      </div>
    </div>
  );
}
