import { Link } from "@tanstack/react-router";
import { Sparkles, Wallet, PiggyBank, BarChart3, FileText, ShieldCheck, IndianRupee, Mail } from "lucide-react";

const features = [
  { to: "/dashboard", icon: BarChart3, label: "Dashboard", desc: "Live spending snapshot" },
  { to: "/expenses", icon: Wallet, label: "Expenses", desc: "Track every rupee, UPI-friendly" },
  { to: "/income", icon: IndianRupee, label: "Income", desc: "Salary, freelance & more" },
  { to: "/budgets", icon: PiggyBank, label: "Budgets", desc: "Monthly & category caps" },
  { to: "/ai-insights", icon: Sparkles, label: "AI Insights", desc: "Personalized for India" },
  { to: "/reports", icon: FileText, label: "Reports", desc: "Export CSV / PDF / AI" },
] as const;

export function Footer() {
  return (
    <footer className="mt-10 border-t bg-background/60 backdrop-blur-xl">
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold tracking-tight">SmartSpend AI</p>
                <p className="text-xs text-muted-foreground">AI-powered expense tracker for India 🇮🇳</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Track expenses in ₹, set budgets, and get AI-powered insights tailored to Indian spending habits — UPI, EMIs, festivals, and more.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Local-first</span>
              <span className="inline-flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Rupee native</span>
              <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI insights</span>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Features</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <li key={f.to}>
                  <Link
                    to={f.to}
                    className="group flex items-start gap-2 rounded-lg p-2 -m-2 transition-colors hover:bg-muted/60"
                  >
                    <f.icon className="h-4 w-4 mt-0.5 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight group-hover:text-primary">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse items-center justify-between gap-3 border-t pt-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SmartSpend AI. Made in India.</p>
          <a href="mailto:hello@smartspend.ai" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <Mail className="h-3.5 w-3.5" /> hello@smartspend.ai
          </a>
        </div>
      </div>
    </footer>
  );
}