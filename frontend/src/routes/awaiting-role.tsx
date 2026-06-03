import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ROLE_NOT_ASSIGNED_MESSAGE } from "@/lib/roleNotAssigned";
import { clearAuthSession } from "@/lib/authSession";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/awaiting-role")({
  component: AwaitingRolePage,
});

function AwaitingRolePage() {
  const navigate = useNavigate();

  const signOut = async () => {
    clearAuthSession();
    await navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Role not assigned</h1>
        <p className="mt-3 text-sm text-muted-foreground">{ROLE_NOT_ASSIGNED_MESSAGE}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={signOut}>
            Sign out
          </Button>
          <Link
            to="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
