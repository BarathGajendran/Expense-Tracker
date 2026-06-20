import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    const u = authService.getSession();
    setTarget(u ? "/dashboard" : "/login");
  }, []);
  if (!target) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
  return <Navigate to={target} />;
}
