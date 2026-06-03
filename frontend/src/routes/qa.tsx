import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { BRAND_FULL_TITLE } from "@/lib/brand";

export const Route = createFileRoute("/qa")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/qa" || location.pathname === "/qa/") {
      throw redirect({ to: "/qa/pending" });
    }
  },
  head: () => ({ meta: [{ title: BRAND_FULL_TITLE }] }),
  component: QALayout,
});

function QALayout() {
  return (
    <AppShell>
      <Toaster richColors position="top-right" />
      <Outlet />
    </AppShell>
  );
}
