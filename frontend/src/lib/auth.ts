import * as api from "@/lib/api";
import { getAuthToken } from "@/lib/api/client";
import { AuthRequiredError } from "@/lib/authRequired";
import { clearAuthSession, setCachedSessionFromMe } from "@/lib/authSession";
import {
  isRoleNotAssignedError,
  RoleNotAssignedError,
} from "@/lib/roleNotAssigned";

function throwIfRoleNotAssigned(error: unknown): never {
  if (isRoleNotAssignedError(error)) {
    clearAuthSession();
    throw new RoleNotAssignedError();
  }
  throw error;
}

export async function ensureAuthenticated(): Promise<void> {
  if (typeof window === "undefined") return;

  const existing = getAuthToken();
  if (!existing) {
    throw new AuthRequiredError();
  }

  try {
    const session = await api.getMe();
    setCachedSessionFromMe(session);
  } catch (error) {
    clearAuthSession();
    throwIfRoleNotAssigned(error);
    throw new AuthRequiredError();
  }
}

export async function tryGetSession() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const session = await api.getMe();
    setCachedSessionFromMe(session);
    return session;
  } catch (error) {
    clearAuthSession();
    if (isRoleNotAssignedError(error)) throw error;
    return null;
  }
}

export { isRoleNotAssignedError, RoleNotAssignedError } from "@/lib/roleNotAssigned";
