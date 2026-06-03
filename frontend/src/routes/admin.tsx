import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { BRAND_FULL_TITLE } from "@/lib/brand";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      throw redirect({ to: "/admin/templates" });
    }
  },
  head: () => ({ meta: [{ title: BRAND_FULL_TITLE }] }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AppShell>
      <Toaster richColors position="top-right" />
      <Outlet />
    </AppShell>
  );
}
