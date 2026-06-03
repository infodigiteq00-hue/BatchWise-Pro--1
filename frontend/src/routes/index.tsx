import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthToken } from "@/lib/api/client";
import { tryGetSession } from "@/lib/auth";
import { getHomePathFromDashboard } from "@/lib/authSession";
import { isRoleNotAssignedError } from "@/lib/roleNotAssigned";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      throw redirect({ to: "/login" });
    }
    if (!getAuthToken()) {
      throw redirect({ to: "/login" });
    }
    try {
      const session = await tryGetSession();
      if (session) {
        throw redirect({ to: getHomePathFromDashboard(session.dashboard) });
      }
    } catch (error) {
      if (isRoleNotAssignedError(error)) {
        throw redirect({ to: "/awaiting-role" });
      }
    }
    throw redirect({ to: "/login" });
  },
});
