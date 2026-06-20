import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { RequireAuth } from "@/components/auth-guard";
import { AIAssistant } from "@/components/ai-assistant";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          </SidebarInset>
        </div>
        <AIAssistant />
      </SidebarProvider>
    </RequireAuth>
  );
}
