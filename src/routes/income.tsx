import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IncomeForm } from "@/components/forms/income-form";
import { type Income } from "@/lib/types";
import { useFinance } from "@/store/finance";
import { useAuth } from "@/store/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/income")({
  head: () => ({ meta: [{ title: "Income — SmartSpend AI" }] }),
  component: () => <AppShell><IncomePage /></AppShell>,
});

function IncomePage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  const { incomes, addIncome, updateIncome, deleteIncome } = useFinance();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Income | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incomes
      .filter((i) => !q || i.source.toLowerCase().includes(q) || (i.notes ?? "").toLowerCase().includes(q))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [incomes, search]);

  const total = filtered.reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <PageHeader
        title="Income"
        description="Log all income sources and keep your cash flow clean."
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button className="gradient-primary text-white gap-2"><Plus className="h-4 w-4" />Add Income</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit income" : "New income"}</DialogTitle></DialogHeader>
              <IncomeForm
                initial={editing ?? undefined}
                onSubmit={(v) => {
                  if (editing) { updateIncome(editing.id, v); toast.success("Income updated"); }
                  else { addIncome(v); toast.success("Income added"); }
                  setOpen(false); setEditing(null);
                }}
                onCancel={() => { setOpen(false); setEditing(null); }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search source or notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Source</TableHead><TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(i.date)}</TableCell>
                  <TableCell className="font-medium">{i.source}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-muted-foreground">{i.notes ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-secondary-foreground">+{formatCurrency(i.amount, currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(i); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { deleteIncome(i.id); toast.success("Deleted"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No income recorded yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 flex justify-end text-sm text-muted-foreground">Total: <span className="ml-2 font-semibold text-foreground">{formatCurrency(total, currency)}</span></div>
      </div>
    </>
  );
}
