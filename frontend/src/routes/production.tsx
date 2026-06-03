import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/production")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/production" || location.pathname === "/production/") {
      throw redirect({ to: "/production/newrequest" });
    }
  },
  head: () => ({ meta: [{ title: "RP Industries — BMR Issuance System" }] }),
  component: ProductionLayout,
});

function ProductionLayout() {
  return (
    <AppShell>
      <Toaster richColors position="top-right" />
      <Outlet />
    </AppShell>
  );
}
