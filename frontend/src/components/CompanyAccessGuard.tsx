import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import * as api from "@/lib/api";
import { getAuthToken } from "@/lib/api/client";
import {
  isCompanyAccessBlocked,
  setCachedSessionFromMe,
} from "@/lib/authSession";

const PUBLIC_PATHS = new Set([
  "/login",
  "/signup",
  "/download",
  "/forgot-password",
  "/reset-password",
  "/company-paused",
  "/awaiting-role",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return pathname.startsWith("/super-admin");
}

export function CompanyAccessGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { pathname } = location;
    if (isPublicPath(pathname) || !getAuthToken()) return;

    let cancelled = false;

    async function syncAccess() {
      try {
        const session = await api.getMe();
        if (cancelled) return;
        setCachedSessionFromMe(session);
        if (
          (session.accessBlocked || isCompanyAccessBlocked()) &&
          pathname !== "/company-paused"
        ) {
          await navigate({ to: "/company-paused", replace: true });
        }
      } catch {
        /* 401 handled by api client */
      }
    }

    void syncAccess();
    const interval = setInterval(() => void syncAccess(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncAccess();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [location.pathname, navigate]);

  return null;
}
