import type { AccessBlocked, AuthResponse } from "@/lib/api";
import { setAuthToken, clearAuthToken } from "@/lib/api/client";

export interface DashboardTab {
  id: string;
  label: string;
  pathPrefix: string;
}

export interface AuthDashboard {
  role: string;
  department?: string | null;
  firmId?: string | null;
  tabs: DashboardTab[];
  defaultTab: string | null;
  homePath: string;
}

const DASHBOARD_KEY = "bp_auth_dashboard";
const USER_KEY = "bp_auth_user";
const ACCESS_BLOCKED_KEY = "bp_access_blocked";

export interface AuthUser {
  name?: string;
  email?: string;
  role?: string;
  department?: string | null;
}

export function applyAuthResponse(res: AuthResponse) {
  setAuthToken(res.token);
  if (typeof window !== "undefined") {
    localStorage.setItem(DASHBOARD_KEY, JSON.stringify(res.dashboard));
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    if (res.accessBlocked) {
      localStorage.setItem(ACCESS_BLOCKED_KEY, JSON.stringify(res.accessBlocked));
    } else {
      localStorage.removeItem(ACCESS_BLOCKED_KEY);
    }
  }
}

export function getCachedDashboard(): AuthDashboard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DASHBOARD_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthDashboard;
  } catch {
    return null;
  }
}

export function setCachedSessionFromMe(payload: {
  user: Record<string, unknown>;
  dashboard: Record<string, unknown>;
  accessBlocked?: AccessBlocked;
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DASHBOARD_KEY, JSON.stringify(payload.dashboard));
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  if (payload.accessBlocked) {
    localStorage.setItem(
      ACCESS_BLOCKED_KEY,
      JSON.stringify(payload.accessBlocked),
    );
  } else {
    localStorage.removeItem(ACCESS_BLOCKED_KEY);
  }
}

export function getAccessBlocked(): AccessBlocked | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCESS_BLOCKED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AccessBlocked;
  } catch {
    return null;
  }
}

export function isCompanyAccessBlocked(): boolean {
  return !!getAccessBlocked();
}

export function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  clearAuthToken();
  if (typeof window !== "undefined") {
    localStorage.removeItem(DASHBOARD_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCESS_BLOCKED_KEY);
  }
}

export function getHomePathFromDashboard(
  dashboard: AuthDashboard | Record<string, unknown>,
): string {
  const d = dashboard as AuthDashboard;
  if (d.homePath) return d.homePath;
  const tab = d.tabs?.[0];
  if (tab?.pathPrefix) {
    if (tab.id === "production") return "/production/newrequest";
    if (tab.id === "qaqc") return "/qa/pending";
    if (tab.id === "admin") return "/admin/templates";
    if (tab.id === "super_admin") return "/super-admin";
    return tab.pathPrefix;
  }
  return "/production/newrequest";
}

export function dashboardToUiRole(
  dashboard: AuthDashboard | Record<string, unknown>,
): "production" | "qaqc" | "admin" {
  const d = dashboard as AuthDashboard;
  if (d.role === "team_member" && d.department === "qaqc") return "qaqc";
  if (d.role === "team_member" && d.department === "admin") return "admin";
  if (d.defaultTab === "qaqc") return "qaqc";
  if (d.defaultTab === "admin") return "admin";
  return "production";
}
