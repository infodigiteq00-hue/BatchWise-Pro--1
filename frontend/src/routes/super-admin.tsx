import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SuperAdminShell } from "@/components/SuperAdminShell";
import { Toaster } from "@/components/ui/sonner";
import { getCachedDashboard } from "@/lib/authSession";
import { BRAND_FULL_TITLE } from "@/lib/brand";

export const Route = createFileRoute("/super-admin")({
  beforeLoad: () => {
    const dashboard = getCachedDashboard();
    if (dashboard && dashboard.role !== "super_admin") {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: `Super Admin — ${BRAND_FULL_TITLE}` }] }),
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  return (
    <SuperAdminShell>
      <Toaster richColors position="top-right" />
      <Outlet />
    </SuperAdminShell>
  );
}
