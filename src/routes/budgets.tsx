import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Target, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CATEGORIES, type Category } from "@/lib/types";
import { useFinance } from "@/store/finance";
import { useAuth } from "@/store/auth";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/budgets")({
  head: () => ({ meta: [{ title: "Budgets — SmartSpend AI" }] }),
  component: () => <AppShell><BudgetsPage /></AppShell>,
});

function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  const { budget, expenses, setMonthlyBudget, setCategoryBudget } = useFinance();

  const spentByCategory = useMemo(() => {
    const now = new Date();
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
        map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return map;
  }, [expenses]);

  const spentThisMonth = Object.values(spentByCategory).reduce((s, n) => s + n, 0);
  const monthlyPct = budget.monthly ? Math.min(100, (spentThisMonth / budget.monthly) * 100) : 0;

  return (
    <>
      <PageHeader title="Budgets" description="Set monthly and category budgets. We'll alert you when you're close." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground"><Target className="h-4 w-4" /> Monthly budget</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{formatCurrency(spentThisMonth, currency)}</span>
            <span className="text-sm text-muted-foreground">of {formatCurrency(budget.monthly, currency)}</span>
          </div>
          <Progress value={monthlyPct} className="mt-3" />
          {monthlyPct >= 90 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlert className="h-4 w-4 mt-0.5" /> You've used {monthlyPct.toFixed(0)}% of your monthly budget.
            </div>
          )}
          <label className="mt-5 block text-sm font-medium">Set monthly budget</label>
          <Input type="number" min={0} value={budget.monthly || ""} onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)} className="mt-1" />
        </div>

        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-semibold">Category budgets</h3>
          <p className="text-sm text-muted-foreground">Spending this month tracked against your category caps.</p>
          <div className="mt-4 space-y-4">
            {CATEGORIES.map((c) => {
              const cap = budget.categories[c] ?? 0;
              const spent = spentByCategory[c] ?? 0;
              const pct = cap ? Math.min(100, (spent / cap) * 100) : 0;
              const over = cap > 0 && spent > cap;
              return (
                <div key={c} className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_140px] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c}</span>
                      <span className={`text-xs ${over ? "text-destructive" : "text-muted-foreground"}`}>
                        {formatCurrency(spent, currency)} {cap ? `/ ${formatCurrency(cap, currency)}` : ""}
                      </span>
                    </div>
                    <Progress value={pct} className="mt-2" />
                  </div>
                  <Input
                    type="number" min={0} placeholder="Cap"
                    value={cap || ""} onChange={(e) => setCategoryBudget(c as Category, Number(e.target.value) || 0)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
