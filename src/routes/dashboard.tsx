import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "@/store/finance";
import { useAuth } from "@/store/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { ExpenseForm } from "@/components/forms/expense-form";
import { IncomeForm } from "@/components/forms/income-form";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SmartSpend AI" }] }),
  component: () => <AppShell><Dashboard /></AppShell>,
});

const COLORS = ["#6366F1","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899","#84CC16"];

function Dashboard() {
  const { user } = useAuth();
  const { expenses, incomes, addExpense, addIncome } = useFinance();
  const navigate = useNavigate();
  const [openExp, setOpenExp] = useState(false);
  const [openInc, setOpenInc] = useState(false);
  const currency = user?.currency ?? "USD";

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalIncome = useMemo(() => incomes.reduce((s, e) => s + e.amount, 0), [incomes]);
  const balance = totalIncome - totalExpenses;
  const savings = Math.max(0, balance);

  const monthlyTrend = useMemo(() => {
    const months: Record<string, { month: string; expense: number; income: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString(undefined, { month: "short" });
      months[key] = { month: key, expense: 0, income: 0 };
    }
    expenses.forEach((e) => {
      const d = new Date(e.date);
      const key = d.toLocaleString(undefined, { month: "short" });
      if (months[key]) months[key].expense += e.amount;
    });
    incomes.forEach((i) => {
      const d = new Date(i.date);
      const key = d.toLocaleString(undefined, { month: "short" });
      if (months[key]) months[key].income += i.amount;
    });
    return Object.values(months);
  }, [expenses, incomes]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [expenses]);

  const recent = [...expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6);

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Here's your financial snapshot for this month."
        action={
          <div className="hidden gap-2 sm:flex">
            <Dialog open={openExp} onOpenChange={setOpenExp}>
              <DialogTrigger asChild><Button className="gradient-primary text-white gap-2"><Plus className="h-4 w-4" />Add Expense</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
                <ExpenseForm onSubmit={(v) => { addExpense(v); setOpenExp(false); toast.success("Expense added"); }} onCancel={() => setOpenExp(false)} />
              </DialogContent>
            </Dialog>
            <Dialog open={openInc} onOpenChange={setOpenInc}>
              <DialogTrigger asChild><Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Add Income</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>New income</DialogTitle></DialogHeader>
                <IncomeForm onSubmit={(v) => { addIncome(v); setOpenInc(false); toast.success("Income added"); }} onCancel={() => setOpenInc(false)} />
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="gap-2" onClick={() => navigate({ to: "/ai-insights" })}><Sparkles className="h-4 w-4 text-primary" />AI Report</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Balance" value={formatCurrency(balance, currency)} icon={Wallet} tone="primary" hint="Net of income − expenses" />
        <StatCard label="Total Income" value={formatCurrency(totalIncome, currency)} icon={TrendingUp} tone="secondary" hint="All time" />
        <StatCard label="Total Expenses" value={formatCurrency(totalExpenses, currency)} icon={TrendingDown} tone="destructive" hint="All time" />
        <StatCard label="Savings" value={formatCurrency(savings, currency)} icon={PiggyBank} tone="accent" hint="Estimated" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Income vs Expense</h3>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke="currentColor" className="text-xs text-muted-foreground" />
                <YAxis stroke="currentColor" className="text-xs text-muted-foreground" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="income" fill="#10B981" radius={[8,8,0,0]} />
                <Bar dataKey="expense" fill="#6366F1" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 font-semibold">Category Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {byCategory.slice(0,4).map((c, i) => (
              <span key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{c.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Monthly Expense Trend</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="expense" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Recent Transactions</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/expenses" })}>View all</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Category</TableHead>
                <TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(e.date)}</TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell className="max-w-[240px] truncate">{e.description ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">−{formatCurrency(e.amount, currency)}</TableCell>
                  <TableCell><Badge className="bg-secondary/20 text-secondary-foreground border-0">Completed</Badge></TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
// keep CATEGORIES import side-effect tolerant
void CATEGORIES;
