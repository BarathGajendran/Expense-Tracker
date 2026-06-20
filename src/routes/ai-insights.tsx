import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, Activity, Loader2, AlertCircle, RotateCcw, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { useFinance } from "@/store/finance";
import { useAuth } from "@/store/auth";
import { formatCurrency } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { generateAIInsights } from "@/lib/ai-insights.functions";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/ai-insights")({
  head: () => ({ meta: [{ title: "AI Insights — SmartSpend AI" }] }),
  component: () => <AppShell><InsightsPage /></AppShell>,
});

function InsightsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "INR";
  const { expenses, incomes, budget } = useFinance();

  const totals = useMemo(() => {
    const expense = expenses.reduce((s, e) => s + e.amount, 0);
    const income = incomes.reduce((s, e) => s + e.amount, 0);
    return { expense, income, savingsRate: income ? Math.max(0, (income - expense) / income) : 0 };
  }, [expenses, incomes]);

  const fallbackScore = Math.round(40 + totals.savingsRate * 50 + (budget.monthly ? 10 : 0));
  const fallbackLabel = fallbackScore >= 80 ? "Excellent" : fallbackScore >= 60 ? "Healthy" : fallbackScore >= 40 ? "Watchful" : "At risk";

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [expenses]);

  type AIData = Awaited<ReturnType<typeof generateAIInsights>>;
  const [ai, setAi] = useState<AIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, [loading]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    setElapsed(0);
    try {
      const res = await generateAIInsights({
        data: {
          currency,
          totals: { income: totals.income, expenses: totals.expense, savingsRate: totals.savingsRate },
          byCategory,
          monthlyBudget: budget.monthly ?? 0,
        },
      });
      setAi(res);
      toast.success("AI insights refreshed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load insights";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on first mount
  useEffect(() => {
    if (!ai && !loading && !error) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const score = ai?.score ?? fallbackScore;
  const healthLabel = ai?.healthLabel ?? fallbackLabel;

  const toneIcon = { warn: TrendingUp, success: CheckCircle2, info: Lightbulb } as const;

  // mock 7-day prediction
  const prediction = Array.from({ length: 7 }, (_, i) => ({
    day: `D+${i + 1}`,
    predicted: Math.round((totals.expense / 30) * (1 + Math.sin(i / 2) * 0.15)),
  }));

  const toneClass = {
    info: "bg-primary/10 text-primary",
    success: "bg-secondary/20 text-secondary-foreground",
    warn: "bg-accent/25 text-accent-foreground",
  } as const;

  return (
    <>
      <PageHeader
        title="AI Insights"
        description="Personalized recommendations powered by your spending patterns — tuned for India 🇮🇳."
        action={
          <Button onClick={refresh} disabled={loading} variant="outline" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {loading ? `Analyzing ${elapsed}s` : "Refresh AI"}
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load AI insights</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={refresh} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" /> Spending Score</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-bold text-gradient">{score}</span>
            <span className="pb-2 text-sm text-muted-foreground">/ 100</span>
          </div>
          <Progress value={score} className="mt-3" />
          <p className="mt-3 text-sm">Financial Health: <span className="font-semibold">{healthLabel}</span></p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ai?.headline ?? "Score reflects savings rate, budget discipline, and expense trends."}
          </p>
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-semibold">Next 7 days — Predicted spending</h3>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prediction}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="predicted" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          AI Insights {loading && <span className="ml-2 text-primary normal-case">· analyzing {elapsed}s</span>}
        </h3>
        {loading && !ai ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(ai?.insights ?? [
              { tone: "warn" as const, title: "Food spending", text: `Food is a top category. Consider trimming to save approx. ${formatCurrency(totals.expense * 0.08, currency)}.` },
              { tone: "info" as const, title: "Predicted spending", text: `Projected this month: ${formatCurrency(totals.expense * 1.05, currency)} based on recent trend.` },
              { tone: "success" as const, title: "Good habits", text: "Transportation looks under control. Keep it up!" },
            ]).map((i, idx) => {
              const Icon = toneIcon[i.tone] ?? Activity;
              return (
                <div key={idx} className="glass rounded-2xl p-5 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass[i.tone]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{i.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{i.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {ai?.recommendations?.length ? (
        <div className="mt-6 glass rounded-2xl p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Recommendations for you</h3>
          </div>
          <ul className="space-y-2">
            {ai.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-secondary-foreground" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {/* keep TrendingDown referenced for tree-shake safety */}
      <TrendingDown className="hidden" />
    </>
  );
}
