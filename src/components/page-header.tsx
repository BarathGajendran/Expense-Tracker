import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  action,
  showBack = true,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  showBack?: boolean;
}) {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else router.navigate({ to: "/dashboard" });
  };
  return (
    <div className="mb-6 space-y-3">
      {showBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="-ml-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="w-full sm:w-auto sm:shrink-0">{action}</div>}
      </div>
    </div>
  );
}
