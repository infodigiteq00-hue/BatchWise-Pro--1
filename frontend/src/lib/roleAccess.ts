import type { Role } from "@/lib/store";
import { setState } from "@/lib/store";

export const ROLE_HOME: Record<Role, string> = {
  production: "/production/newrequest",
  qaqc: "/qa/pending",
  admin: "/admin/templates",
};

const roleMeta: Record<Role, { prefix: string }> = {
  production: { prefix: "production" },
  qaqc: { prefix: "qa" },
  admin: { prefix: "admin" },
};

/** Role fixed at build time for segregated deployments (optional). */
export function getBuildLockedRole(): Role | null {
  const v = import.meta.env.VITE_APP_ROLE;
  if (v === "production" || v === "qaqc" || v === "admin") return v;
  return null;
}

export function roleFromPath(pathname: string): Role {
  if (pathname.startsWith("/qa")) return "qaqc";
  if (pathname.startsWith("/admin")) return "admin";
  return "production";
}

export function pathAllowedForRole(pathname: string, role: Role): boolean {
  if (pathname === "/") return true;
  return pathname.startsWith(`/${roleMeta[role].prefix}`);
}

/** Role follows the current URL (or build lock). */
export function resolveDashboardRole(pathname: string): Role {
  const buildLocked = getBuildLockedRole();
  if (buildLocked) return buildLocked;
  return roleFromPath(pathname);
}

export function syncDashboardRole(pathname: string): Role {
  const role = resolveDashboardRole(pathname);
  setState({ role });
  return role;
}

export function isSuperAdminPath(pathname: string): boolean {
  return pathname === "/super-admin" || pathname.startsWith("/super-admin/");
}

export function isFirmDashboardPath(pathname: string): boolean {
  return (
    pathname.startsWith("/production") ||
    pathname.startsWith("/qa") ||
    pathname.startsWith("/admin")
  );
}

export function assertRouteAccess(pathname: string, opts?: { ssr?: boolean }): string | null {
  if (isSuperAdminPath(pathname) || pathname === "/company-paused") {
    return null;
  }
  const role = opts?.ssr ? roleFromPath(pathname) : syncDashboardRole(pathname);
  if (!pathAllowedForRole(pathname, role)) {
    return ROLE_HOME[role];
  }
  return null;
}

/** Navigate to another dashboard via header role links. */
export function switchDashboardRole(role: Role) {
  setState({ role });
}
