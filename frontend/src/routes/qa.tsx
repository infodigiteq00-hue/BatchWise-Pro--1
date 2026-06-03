import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/qa")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/qa" || location.pathname === "/qa/") {
      throw redirect({ to: "/qa/pending" });
    }
  },
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
