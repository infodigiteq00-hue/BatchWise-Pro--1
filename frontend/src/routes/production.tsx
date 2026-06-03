import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { BRAND_FULL_TITLE } from "@/lib/brand";

export const Route = createFileRoute("/production")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/production" || location.pathname === "/production/") {
      throw redirect({ to: "/production/newrequest" });
    }
  },
  head: () => ({ meta: [{ title: BRAND_FULL_TITLE }] }),
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
