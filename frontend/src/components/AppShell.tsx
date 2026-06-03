import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type Role } from "@/lib/store";
import { ROLE_HOME, roleFromPath } from "@/lib/roleAccess";
import {
  clearAuthSession,
  getCachedDashboard,
  getCachedUser,
} from "@/lib/authSession";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ClipboardList,
  FlaskConical,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";

const navByRole: Record<Role, { to: string; label: string }[]> = {
  production: [
    { to: "/production/newrequest", label: "New Request" },
    { to: "/production/history", label: "My Requests" },
  ],
  qaqc: [
    { to: "/qa/pending", label: "Pending" },
    { to: "/qa/approved", label: "Approved" },
    { to: "/qa/rejected", label: "Rejected" },
  ],
  admin: [
    { to: "/admin/templates", label: "Templates" },
    { to: "/admin/signatures", label: "Signatures" },
  ],
};

function getAdminNav(dashboardRole?: string) {
  const base = [...navByRole.admin];
  if (dashboardRole === "firm_admin") {
    base.push({ to: "/admin/teams", label: "Teams" });
  }
  return base;
}

function isSubNavActive(pathname: string, to: string): boolean {
  return pathname === to;
}

const roleSwitcherMeta: Record<
  Role,
  { label: string; to: string; icon: React.ComponentType<{ className?: string }> }
> = {
  production: { label: "Production", to: "/production/newrequest", icon: ClipboardList },
  qaqc: { label: "QA / QC", to: "/qa/pending", icon: ShieldCheck },
  admin: { label: "Admin", to: "/admin/templates", icon: Settings },
};

function roleFromTabId(tabId: string): Role | null {
  if (tabId === "production") return "production";
  if (tabId === "qaqc") return "qaqc";
  if (tabId === "admin") return "admin";
  return null;
}

function initialsFromName(name?: string) {
  if (!name) return "U";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const role = roleFromPath(loc.pathname);
  const dashboard = mounted ? getCachedDashboard() : null;
  const user = mounted ? getCachedUser() : null;
  const nav =
    role === "admin" ? getAdminNav(dashboard?.role) : navByRole[role];
  const home = ROLE_HOME[role];
  const firmAdminRoleTabs =
    dashboard?.role === "firm_admin"
      ? (dashboard.tabs
          .map((tab) => roleFromTabId(tab.id))
          .filter((tab): tab is Role => tab !== null))
      : [];

  const signOut = async () => {
    clearAuthSession();
    await navigate({ to: "/login" });
  };

  const roleLabel =
    dashboard?.role === "firm_admin"
      ? "Firm Admin"
      : dashboard?.department === "qaqc"
        ? "QA / QC"
        : dashboard?.department === "production"
          ? "Production"
          : dashboard?.department === "admin"
            ? "Admin"
            : "User";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to={home} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide text-foreground">RP INDUSTRIES</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">BMR Issuance System</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {mounted && firmAdminRoleTabs.length > 1 && (
              <div className="inline-flex items-center gap-0.5 rounded-md border bg-background p-0.5">
                {firmAdminRoleTabs.map((tabRole) => {
                  const meta = roleSwitcherMeta[tabRole];
                  const active = role === tabRole;
                  const Icon = meta.icon;
                  return (
                    <Link
                      key={tabRole}
                      to={meta.to}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </Link>
                  );
                })}
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-full border border-border/70 bg-background px-2 shadow-sm hover:bg-muted/70"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">
                    {initialsFromName(user?.name)}
                  </span>
                  <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-lg border border-border/70 p-1.5 shadow-lg"
              >
                <DropdownMenuLabel className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
                      {initialsFromName(user?.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold leading-tight text-foreground">
                        {user?.name || "User"}
                      </div>
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                        {roleLabel}
                      </div>
                    </div>
                  </div>
                  {user?.email && (
                    <div className="mt-1.5 truncate rounded-md bg-muted/60 px-2 py-1 text-[10px] font-normal text-muted-foreground">
                      {user.email}
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="rounded-md px-2 py-1.5 text-sm font-medium text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="border-t bg-muted/30" aria-label="Section">
          <div className="flex w-full gap-1 px-4 sm:px-6 lg:px-8">
            {nav.map((n) => {
              const active = isSubNavActive(loc.pathname, n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: true }}
                  className={cn(
                    "border-b-2 px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="w-full px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
