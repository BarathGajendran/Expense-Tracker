import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/store/auth";
import { authService } from "@/services/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  currency: z.string().min(2),
  monthlyIncome: z.coerce.number().min(0).optional(),
  goals: z.string().trim().max(500).optional(),
});

const currencies = ["INR","USD","EUR","GBP","JPY","CAD","AUD","SGD","AED"];

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — SmartSpend AI" }] }),
  component: () => <AppShell><ProfilePage /></AppShell>,
});

function ProfilePage() {
  const { user, setUser } = useAuth();
  const { register, handleSubmit, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      currency: user?.currency ?? "INR",
      monthlyIncome: user?.monthlyIncome ?? 0,
      goals: user?.goals ?? "",
    },
  });

  const onSubmit = (v: z.infer<typeof schema>) => {
    const updated = authService.updateProfile(v);
    setUser(updated);
    toast.success("Profile updated");
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  return (
    <>
      <PageHeader title="Profile" description="Personal info, preferences, and goals." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="glass rounded-2xl p-6 text-center">
          <Avatar className="mx-auto h-24 w-24">
            <AvatarFallback className="gradient-primary text-2xl text-white">{initials}</AvatarFallback>
          </Avatar>
          <p className="mt-4 text-lg font-semibold">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="mt-4 rounded-xl border p-3 text-left">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Currency</p>
            <p className="mt-1 font-semibold">{watch("currency")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="glass rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Full name</Label><Input {...register("name")} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" {...register("email")} /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency preference</Label>
              <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Monthly income</Label><Input type="number" step="0.01" {...register("monthlyIncome")} /></div>
          </div>
          <div className="space-y-2"><Label>Financial goals</Label><Textarea rows={4} {...register("goals")} placeholder="e.g. Save $5,000 for an emergency fund this year." /></div>
          <div className="flex justify-end"><Button type="submit" className="gradient-primary text-white">Save changes</Button></div>
        </form>
      </div>
    </>
  );
}
