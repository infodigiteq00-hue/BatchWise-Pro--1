import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getAccessBlocked, clearAuthSession } from "@/lib/authSession";
import { Button } from "@/components/ui/button";
import { PauseCircle } from "lucide-react";

export const Route = createFileRoute("/company-paused")({
  component: CompanyPausedPage,
});

function CompanyPausedPage() {
  const navigate = useNavigate();
  const blocked = getAccessBlocked();

  const signOut = async () => {
    clearAuthSession();
    await navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <PauseCircle className="mx-auto h-12 w-12 text-amber-600" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">
          Dashboard paused
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {blocked?.message ||
            "This dashboard has been paused by the super admin. Please contact the super admin to reactivate access."}
        </p>
        {blocked?.companyName && (
          <p className="mt-2 text-xs text-muted-foreground">
            Company: {blocked.companyName}
          </p>
        )}
        <Button type="button" className="mt-6" variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
