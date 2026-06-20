import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, FileText, Sparkles, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFinance } from "@/store/finance";
import { useAuth } from "@/store/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { generateAIReport } from "@/lib/ai-report.functions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — SmartSpend AI" }] }),
  component: () => <AppShell><ReportsPage /></AppShell>,
});

function ReportsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "INR";
  const { expenses, incomes } = useFinance();
  const [range, setRange] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStartedAt, setAiStartedAt] = useState<number | null>(null);
  const [aiElapsed, setAiElapsed] = useState(0);

  // Tick a small elapsed timer while loading
  useEffect(() => {
    if (!aiLoading || !aiStartedAt) return;
    const id = setInterval(() => setAiElapsed(Math.floor((Date.now() - aiStartedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [aiLoading, aiStartedAt]);

  const now = new Date();
  const filteredExpenses = useMemo(() => expenses.filter((e) => {
    const d = new Date(e.date);
    if (range === "weekly") return now.getTime() - d.getTime() <= 7 * 86400000;
    if (range === "monthly") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear();
  }), [expenses, range, now]);

  const filteredIncomes = useMemo(() => incomes.filter((i) => {
    const d = new Date(i.date);
    if (range === "weekly") return now.getTime() - d.getTime() <= 7 * 86400000;
    if (range === "monthly") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear();
  }), [incomes, range, now]);

  const totalExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalInc = filteredIncomes.reduce((s, i) => s + i.amount, 0);

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    filteredExpenses.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const generateReport = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiReport(null);
    setAiStartedAt(Date.now());
    setAiElapsed(0);

    // Client-side soft timeout (server enforces 30s; this guards UI)
    const clientTimeout = setTimeout(() => {
      // do not abort the in-flight call — server returns its own timeout error
    }, 35_000);

    try {
      const topExpenses = [...filteredExpenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8)
        .map((e) => ({
          date: e.date.slice(0, 10),
          category: e.category,
          description: e.description ?? "",
          amount: e.amount,
        }));
      if (filteredExpenses.length === 0 && filteredIncomes.length === 0) {
        throw new Error("No transactions in the selected range. Add some data first.");
      }
      const res = await generateAIReport({
        data: {
          range,
          currency,
          totals: { income: totalInc, expenses: totalExp, net: totalInc - totalExp },
          byCategory: byCat,
          topExpenses,
        },
      });
      if (!res?.report?.trim()) throw new Error("AI returned an empty report. Please retry.");
      setAiReport(res.report);
      toast.success("AI report generated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate report";
      setAiError(msg);
      toast.error(msg);
    } finally {
      clearTimeout(clientTimeout);
      setAiLoading(false);
      setAiStartedAt(null);
    }
  };

  const downloadCSV = () => {
    const rows = [["Date", "Type", "Category/Source", "Description", "Amount"]];
    filteredExpenses.forEach((e) => rows.push([e.date.slice(0,10), "Expense", e.category, e.description ?? "", String(e.amount)]));
    filteredIncomes.forEach((i) => rows.push([i.date.slice(0,10), "Income", i.source, i.notes ?? "", String(i.amount)]));
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `smartspend-${range}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const downloadPDF = () => {
    const html = `<html><head><title>SmartSpend Report</title>
      <style>body{font-family:sans-serif;padding:24px}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #eee;padding:8px;text-align:left}</style></head>
      <body><h1>SmartSpend AI — ${range[0].toUpperCase()+range.slice(1)} Report</h1>
      <p>Income: ${formatCurrency(totalInc, currency)} • Expenses: ${formatCurrency(totalExp, currency)} • Net: ${formatCurrency(totalInc - totalExp, currency)}</p>
      <table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
      <tbody>${[
        ...filteredExpenses.map((e) => `<tr><td>${formatDate(e.date)}</td><td>Expense</td><td>${e.category}</td><td>${e.description ?? ""}</td><td>−${formatCurrency(e.amount, currency)}</td></tr>`),
        ...filteredIncomes.map((i) => `<tr><td>${formatDate(i.date)}</td><td>Income</td><td>${i.source}</td><td>${i.notes ?? ""}</td><td>+${formatCurrency(i.amount, currency)}</td></tr>`),
      ].join("")}</tbody></table></body></html>`;
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(html); w.document.close(); w.focus(); w.print();
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate weekly, monthly, and yearly reports."
        action={
          <div className="flex flex-wrap gap-2">
            <Button className="gradient-primary text-white gap-2" onClick={generateReport} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiLoading ? "Generating…" : "Generate AI Report"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadCSV}><Download className="h-4 w-4" />Export CSV</Button>
            <Button variant="outline" className="gap-2" onClick={downloadPDF}><FileText className="h-4 w-4" />Download PDF</Button>
          </div>
        }
      />

      <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>
        <TabsContent value={range} className="mt-4 space-y-6">
          {(aiLoading || aiReport || aiError) && (
            <div className="glass rounded-2xl p-6 animate-fade-in">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">AI Financial Report</h3>
                </div>
                {aiLoading && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing {aiElapsed}s
                  </span>
                )}
              </div>

              {aiLoading && !aiReport && !aiError && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Crunching your {range} numbers in ₹… usually 5–15 seconds. We&apos;ll time out at 30s.
                  </p>
                  <div className="space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              )}

              {aiError && !aiLoading && (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Could not generate report</AlertTitle>
                    <AlertDescription>{aiError}</AlertDescription>
                  </Alert>
                  <Button onClick={generateReport} variant="outline" className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Retry
                  </Button>
                </div>
              )}

              {aiReport && !aiLoading && (
                <>
                  <MarkdownReport text={aiReport} />
                  <div className="mt-4 flex justify-end">
                    <Button onClick={generateReport} variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                      <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl p-5"><p className="text-sm text-muted-foreground">Income</p><p className="mt-1 text-2xl font-bold">{formatCurrency(totalInc, currency)}</p></div>
            <div className="glass rounded-2xl p-5"><p className="text-sm text-muted-foreground">Expenses</p><p className="mt-1 text-2xl font-bold">{formatCurrency(totalExp, currency)}</p></div>
            <div className="glass rounded-2xl p-5"><p className="text-sm text-muted-foreground">Net</p><p className="mt-1 text-2xl font-bold text-gradient">{formatCurrency(totalInc - totalExp, currency)}</p></div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 font-semibold">By category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCat}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="value" fill="#6366F1" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-2xl p-5 overflow-x-auto">
            <h3 className="mb-3 font-semibold">Transactions</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Detail</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {[...filteredExpenses.map((e) => ({ kind: "expense" as const, id: e.id, date: e.date, label: e.category, desc: e.description ?? "", amount: e.amount })),
                  ...filteredIncomes.map((i) => ({ kind: "income" as const, id: i.id, date: i.date, label: i.source, desc: i.notes ?? "", amount: i.amount }))]
                  .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                  .map((r) => (
                    <TableRow key={r.kind + r.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(r.date)}</TableCell>
                      <TableCell><Badge variant={r.kind === "income" ? "secondary" : "outline"}>{r.kind === "income" ? "Income" : "Expense"}</Badge></TableCell>
                      <TableCell className="max-w-[320px] truncate">{r.label}{r.desc && <span className="text-muted-foreground"> — {r.desc}</span>}</TableCell>
                      <TableCell className={`text-right font-medium ${r.kind === "income" ? "text-secondary-foreground" : ""}`}>{r.kind === "income" ? "+" : "−"}{formatCurrency(r.amount, currency)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function MarkdownReport({ text }: { text: string }) {
  // Lightweight markdown renderer: ##/### headings, - bullets, **bold**, paragraphs.
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="ml-5 list-disc space-y-1 text-sm">
          {list.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(li) }} />)}
        </ul>,
      );
      list = [];
    }
  };
  const inline = (s: string) =>
    s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) {
      flushList();
      blocks.push(<h4 key={idx} className="mt-4 font-semibold">{line.replace(/^###\s+/, "")}</h4>);
    } else if (/^##\s+/.test(line)) {
      flushList();
      blocks.push(<h3 key={idx} className="mt-5 text-base font-semibold text-gradient">{line.replace(/^##\s+/, "")}</h3>);
    } else if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={idx} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(line) }} />);
    }
  });
  flushList();
  return <div className="space-y-2">{blocks}</div>;
}
