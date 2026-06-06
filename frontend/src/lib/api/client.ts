export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3001/api";

const TOKEN_KEY = "bp_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: { error?: string } | T = {};
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string } | T;
    } catch {
      data = { error: text } as { error?: string };
    }
  }

  if (!res.ok) {
    const payload = data as {
      error?: string;
      code?: string;
      accessBlocked?: {
        reason: string;
        message: string;
        firmId?: string;
        companyName?: string;
      };
    };
    const message = payload.error || res.statusText || "Request failed";

    if (res.status === 403 && typeof window !== "undefined" && payload.accessBlocked) {
      const path = window.location.pathname;
      const isAuthPage =
        path.startsWith("/login") ||
        path.startsWith("/signup") ||
        path.startsWith("/forgot-password") ||
        path.startsWith("/reset-password");
      if (!isAuthPage && path !== "/company-paused") {
        const { getCachedDashboard, getCachedUser, setCachedSessionFromMe } =
          await import("@/lib/authSession");
        const dashboard = getCachedDashboard();
        const user = getCachedUser();
        setCachedSessionFromMe({
          user: (user ?? {}) as Record<string, unknown>,
          dashboard: {
            role: dashboard?.role ?? user?.role ?? "team_member",
            department: dashboard?.department ?? user?.department,
            firmId: dashboard?.firmId,
            tabs: [],
            defaultTab: null,
            homePath: "/company-paused",
          },
          accessBlocked: payload.accessBlocked,
        });
        window.location.replace("/company-paused");
      }
    }

    if (res.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      const isAuthPage =
        path.startsWith("/login") ||
        path.startsWith("/signup") ||
        path.startsWith("/forgot-password") ||
        path.startsWith("/reset-password");
      if (!isAuthPage) {
        const { clearAuthSession } = await import("@/lib/authSession");
        clearAuthSession();
        const redirect = encodeURIComponent(path + window.location.search);
        window.location.replace(`/login?expired=1&redirect=${redirect}`);
      }
    }

    throw new ApiError(message, res.status, payload.code);
  }

  return data as T;
}

/** Opens in a new tab with auth via query token (no blob URL). */
export function getTemplatePdfPreviewUrl(templateId: string): string {
  const token = getAuthToken();
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_BASE}/templates/${templateId}/pdf${q}`;
}

export function getStampedPdfPreviewUrl(requestId: string): string {
  const token = getAuthToken();
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_BASE}/requests/${requestId}/stamped-pdf${q}`;
}

export function getStampedPdfDownloadUrl(requestId: string): string {
  const token = getAuthToken();
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  params.set("download", "1");
  return `${API_BASE}/requests/${requestId}/stamped-pdf?${params.toString()}`;
}

export async function fetchTemplatePdfDataUrl(templateId: string): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new ApiError("Authentication required", 401);

  const url = `${API_BASE}/templates/${templateId}/pdf?token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    let message = res.statusText;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      if (text) message = text;
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read template PDF"));
    reader.readAsDataURL(blob);
  });
}
