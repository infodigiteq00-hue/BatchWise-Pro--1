import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import {
  applyAuthResponse,
  dashboardToUiRole,
  getHomePathFromDashboard,
  isCompanyAccessBlocked,
} from "@/lib/authSession";
import { hydrateStoreFromApi } from "@/lib/actions";
import { setState } from "@/lib/store";
import { isRoleNotAssignedError } from "@/lib/roleNotAssigned";
import { toast } from "sonner";

type LoginSearch = {
  redirect?: string;
  expired?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    expired: typeof search.expired === "string" ? search.expired : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect, expired } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expired === "1") {
      toast.message("Session expired", {
        description:
          "Please sign in again. This can happen after the local API restarts.",
      });
    }
  }, [expired]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.login({
        email: email.trim(),
        password,
      });
      applyAuthResponse(res);
      if (isCompanyAccessBlocked()) {
        toast.info("Dashboard access is paused");
        await navigate({ to: "/company-paused" });
        return;
      }
      setState({ role: dashboardToUiRole(res.dashboard) });
      const home = getHomePathFromDashboard(res.dashboard);
      if ((res.dashboard as { role?: string }).role === "super_admin") {
        toast.success("Signed in successfully");
        await navigate({ to: "/super-admin" });
        return;
      }
      await hydrateStoreFromApi();
      const target =
        redirect &&
        redirect !== "/login" &&
        redirect !== "/signup" &&
        redirect !== "/forgot-password" &&
        redirect !== "/reset-password" &&
        !redirect.startsWith("/super-admin")
          ? redirect
          : home;
      toast.success("Signed in successfully");
      await navigate({ to: target });
    } catch (err: unknown) {
      if (isRoleNotAssignedError(err)) {
        await navigate({ to: "/awaiting-role" });
        return;
      }
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Login failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Login"
      subtitle="Enter your email and password to access your account."
    >
      <p className="mb-4 text-sm text-muted-foreground">
        New user?{" "}
        <Link
          to="/download"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Download desktop app
        </Link>{" "}
        first
      </p>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
