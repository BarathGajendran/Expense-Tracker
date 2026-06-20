import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Filter } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpenseForm } from "@/components/forms/expense-form";
import { CATEGORIES, type Category, type Expense } from "@/lib/types";
import { useFinance } from "@/store/finance";
import { useAuth } from "@/store/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses — SmartSpend AI" }] }),
  component: () => <AppShell><ExpensesPage /></AppShell>,
});

function ExpensesPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  const { expenses, addExpense, updateExpense, deleteExpense } = useFinance();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [period, setPeriod] = useState<string>("all");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return expenses
      .filter((e) => category === "all" || e.category === category)
      .filter((e) => {
        if (period === "all") return true;
        const d = new Date(e.date);
        if (period === "7d") return now.getTime() - d.getTime() <= 7 * 86400000;
        if (period === "30d") return now.getTime() - d.getTime() <= 30 * 86400000;
        if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
      })
      .filter((e) => !q || (e.description ?? "").toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || (e.notes ?? "").toLowerCase().includes(q))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [expenses, search, category, period]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track, search, filter, and manage all your spending."
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white gap-2"><Plus className="h-4 w-4" />Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit expense" : "New expense"}</DialogTitle></DialogHeader>
              <ExpenseForm
                initial={editing ?? undefined}
                onSubmit={(v) => {
                  if (editing) { updateExpense(editing.id, v); toast.success("Expense updated"); }
                  else { addExpense(v); toast.success("Expense added"); }
                  setOpen(false); setEditing(null);
                }}
                onCancel={() => { setOpen(false); setEditing(null); }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search description, notes, category..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Category</TableHead>
                <TableHead>Description</TableHead><TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(e.date)}</TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell className="max-w-[280px] truncate">{e.description ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.paymentMethod}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(e.amount, currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { deleteExpense(e.id); toast.success("Deleted"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No expenses match your filters.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 flex justify-end text-sm text-muted-foreground">Filtered total: <span className="ml-2 font-semibold text-foreground">{formatCurrency(total, currency)}</span></div>
      </div>
    </>
  );
}
