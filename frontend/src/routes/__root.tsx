import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import {
  BRAND_DESCRIPTION,
  BRAND_FULL_TITLE,
  BRAND_NAME,
} from "@/lib/brand";
import {
  assertRouteAccess,
  isFirmDashboardPath,
  isSuperAdminPath,
} from "@/lib/roleAccess";
import { ensureAuthenticated, isRoleNotAssignedError, tryGetSession } from "@/lib/auth";
import { isAuthRequiredError } from "@/lib/authRequired";
import { hydrateStoreFromApi } from "@/lib/actions";
import { getAuthToken } from "@/lib/api/client";
import {
  getCachedDashboard,
  getHomePathFromDashboard,
  isCompanyAccessBlocked,
} from "@/lib/authSession";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/production/newrequest"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const PUBLIC_PATHS = ["/login", "/signup", "/awaiting-role", "/company-paused"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    const ssr = typeof window === "undefined";
    const { pathname } = location;

    if (!ssr && (pathname === "/login" || pathname === "/signup")) {
      if (getAuthToken()) {
        try {
          const session = await tryGetSession();
          if (session) {
            throw redirect({
              to: getHomePathFromDashboard(session.dashboard),
            });
          }
        } catch (error) {
          if (isRoleNotAssignedError(error)) {
            throw redirect({ to: "/awaiting-role" });
          }
        }
      }
      return;
    }

    if (!ssr && pathname === "/awaiting-role") return;
    if (!ssr && pathname === "/company-paused") {
      if (!getAuthToken()) {
        throw redirect({ to: "/login" });
      }
      try {
        await ensureAuthenticated();
      } catch (error) {
        if (isAuthRequiredError(error)) {
          throw redirect({ to: "/login" });
        }
        throw error;
      }
      if (!isCompanyAccessBlocked()) {
        const dashboard = getCachedDashboard();
        throw redirect({
          to: dashboard ? getHomePathFromDashboard(dashboard) : "/login",
        });
      }
      return;
    }

    if (!ssr) {
      try {
        await ensureAuthenticated();
        const dashboard = getCachedDashboard();
        const role = dashboard?.role;

        if (isCompanyAccessBlocked() && pathname !== "/company-paused") {
          throw redirect({ to: "/company-paused" });
        }

        if (role === "super_admin") {
          if (isFirmDashboardPath(pathname)) {
            throw redirect({ to: "/super-admin" });
          }
          if (!isSuperAdminPath(pathname) && !isPublicPath(pathname)) {
            throw redirect({ to: "/super-admin" });
          }
        } else if (isSuperAdminPath(pathname)) {
          throw redirect({
            to: dashboard ? getHomePathFromDashboard(dashboard) : "/login",
          });
        }

        if (
          !isSuperAdminPath(pathname) &&
          pathname !== "/company-paused" &&
          !isPublicPath(pathname)
        ) {
          await hydrateStoreFromApi();
        }
      } catch (error) {
        if (isRoleNotAssignedError(error)) {
          throw redirect({ to: "/awaiting-role" });
        }
        if (isAuthRequiredError(error) || isPublicPath(pathname)) {
          if (!isPublicPath(pathname)) {
            throw redirect({
              to: "/login",
              search: { redirect: pathname },
            });
          }
          return;
        }
        throw error;
      }
    }

    const redirectTo = assertRouteAccess(pathname, { ssr });
    if (!ssr && redirectTo) {
      throw redirect({ to: redirectTo });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: BRAND_FULL_TITLE },
      { name: "description", content: BRAND_DESCRIPTION },
      { name: "author", content: BRAND_NAME },
      { property: "og:title", content: BRAND_FULL_TITLE },
      { property: "og:description", content: BRAND_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: BRAND_FULL_TITLE },
      { name: "twitter:description", content: BRAND_DESCRIPTION },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
