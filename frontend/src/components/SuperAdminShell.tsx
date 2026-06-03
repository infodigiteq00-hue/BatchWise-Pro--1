import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clearAuthSession, getCachedUser } from "@/lib/authSession";
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
import { ChevronDown, FlaskConical, LogOut } from "lucide-react";

const nav = [{ to: "/super-admin", label: "Dashboard" }];

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

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? getCachedUser() : null;

  const signOut = async () => {
    clearAuthSession();
    await navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/super-admin" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide text-foreground">
                RP INDUSTRIES
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Super Admin
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {mounted && (
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
                          Super Admin
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
            )}
          </div>
        </div>
        <nav className="border-t bg-muted/30" aria-label="Super admin">
          <div className="flex w-full gap-1 px-4 sm:px-6 lg:px-8">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "border-b-2 px-3 py-2.5 text-sm font-medium transition",
                  loc.pathname === n.to || loc.pathname.startsWith(n.to + "/")
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="w-full px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
