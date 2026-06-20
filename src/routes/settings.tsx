import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/store/auth";
import { useFinance } from "@/store/finance";
import { authService } from "@/services/auth";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — SmartSpend AI" }] }),
  component: () => <AppShell><SettingsPage /></AppShell>,
});

const currencies = ["INR","USD","EUR","GBP","JPY","CAD","AUD","SGD","AED"];

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, setUser } = useAuth();
  const { expenses, incomes, budget, seedDemo } = useFinance();
  const [notif, setNotif] = useState({ budget: true, weekly: true, ai: false });

  const backup = () => {
    const data = { user, expenses, incomes, budget };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "smartspend-backup.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  return (
    <>
      <PageHeader title="Settings" description="Customize SmartSpend AI to your preferences." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold">Appearance</h3>
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Theme</p><p className="text-sm text-muted-foreground">Choose light, dark, or follow system.</p></div>
            <Select value={theme ?? "system"} onValueChange={setTheme}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold">Currency</h3>
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Preferred currency</p><p className="text-sm text-muted-foreground">Used for all amounts shown.</p></div>
            <Select value={user?.currency ?? "INR"} onValueChange={(v) => { const u = authService.updateProfile({ currency: v }); setUser(u); toast.success("Currency updated"); }}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold">Notifications</h3>
          {([
            ["budget", "Budget alerts", "Notify me when I'm close to a budget cap."],
            ["weekly", "Weekly summary", "Get a weekly digest of spending."],
            ["ai", "AI insights", "Personalized tips and predictions."],
          ] as const).map(([k, label, desc]) => (
            <div key={k} className="flex items-center justify-between">
              <div><p className="font-medium">{label}</p><p className="text-sm text-muted-foreground">{desc}</p></div>
              <Switch checked={notif[k]} onCheckedChange={(v) => setNotif((s) => ({ ...s, [k]: v }))} />
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold">Data & backups</h3>
          <p className="text-sm text-muted-foreground">Export your local data as JSON or restore the demo dataset.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={backup}><Download className="h-4 w-4" />Download backup</Button>
            <Button variant="outline" className="gap-2" onClick={() => { seedDemo(); toast.success("Demo data restored"); }}>Reset to demo data</Button>
            <Button variant="ghost" className="gap-2 text-destructive" onClick={() => { localStorage.removeItem("smartspend.finance"); location.reload(); }}><Trash2 className="h-4 w-4" />Clear local data</Button>
          </div>
        </div>
      </div>
    </>
  );
}
