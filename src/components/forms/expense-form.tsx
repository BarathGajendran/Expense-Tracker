import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef, useState } from "react";
import { CalendarIcon, Upload } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CATEGORIES, PAYMENT_METHODS, type Category, type Expense, type PaymentMethod } from "@/lib/types";

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be > 0").max(10_000_000),
  category: z.enum(CATEGORIES as [Category, ...Category[]]),
  date: z.string(),
  paymentMethod: z.enum(PAYMENT_METHODS as unknown as [PaymentMethod, ...PaymentMethod[]]),
  description: z.string().trim().max(140).optional(),
  notes: z.string().trim().max(500).optional(),
  receipt: z.string().optional(),
});
export type ExpenseFormValues = z.infer<typeof schema>;

export function ExpenseForm({ initial, onSubmit, onCancel }: { initial?: Partial<Expense>; onSubmit: (v: ExpenseFormValues) => void; onCancel?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: initial?.amount ?? ("" as unknown as number),
      category: (initial?.category as Category) ?? "Food",
      date: initial?.date ?? new Date().toISOString(),
      paymentMethod: (initial?.paymentMethod as PaymentMethod) ?? "Card",
      description: initial?.description ?? "",
      notes: initial?.notes ?? "",
      receipt: initial?.receipt,
    },
  });

  const date = watch("date");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="1" {...register("amount")} placeholder="₹ 0" />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={watch("category")} onValueChange={(v) => setValue("category", v as Category)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(new Date(date), "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date ? new Date(date) : undefined} onSelect={(d) => d && setValue("date", d.toISOString())} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v as PaymentMethod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register("description")} placeholder="What was this for?" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} {...register("notes")} placeholder="Optional notes" />
      </div>
      <div className="space-y-2">
        <Label>Receipt</Label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Upload receipt" title="Upload receipt" placeholder="Upload receipt" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => { setValue("receipt", String(reader.result)); setReceiptName(file.name); };
          reader.readAsDataURL(file);
        }} />
        <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {receiptName ?? (watch("receipt") ? "Receipt attached" : "Upload receipt image")}
        </Button>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" className="gradient-primary text-white" disabled={isSubmitting}>Save expense</Button>
      </div>
    </form>
  );
}


