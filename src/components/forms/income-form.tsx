import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { Income } from "@/lib/types";

const schema = z.object({
  source: z.string().trim().min(1, "Source required").max(80),
  amount: z.coerce.number().positive("Amount must be > 0"),
  date: z.string(),
  notes: z.string().trim().max(500).optional(),
});
export type IncomeFormValues = z.infer<typeof schema>;

export function IncomeForm({ initial, onSubmit, onCancel }: { initial?: Partial<Income>; onSubmit: (v: IncomeFormValues) => void; onCancel?: () => void }) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<IncomeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: initial?.source ?? "",
      amount: initial?.amount ?? ("" as unknown as number),
      date: initial?.date ?? new Date().toISOString(),
      notes: initial?.notes ?? "",
    },
  });
  const date = watch("date");
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="source">Source</Label>
        <Input id="source" {...register("source")} placeholder="Salary, Freelance, ..." />
        {errors.source && <p className="text-xs text-destructive">{errors.source.message}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="1" {...register("amount")} placeholder="₹ 0" />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={2} {...register("notes")} placeholder="Optional notes" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" className="gradient-primary text-white" disabled={isSubmitting}>Save income</Button>
      </div>
    </form>
  );
}
