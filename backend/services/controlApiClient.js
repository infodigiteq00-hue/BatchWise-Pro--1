const {
  appMode,
  controlApiUrl,
  controlSessionCacheMs,
} = require("../config");
const users = require("../models/users");

/** @type {Map<string, { user: object, accessBlocked: object | null, expiresAt: number }>} */
const sessionCache = new Map();

function isHybridMode() 
{
  return appMode === "hybrid" && !!controlApiUrl;
}

function cacheKey(token) 
{
  return token;
}

function getCachedSession(token) 
{
  const entry = sessionCache.get(cacheKey(token));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) 
  {
    sessionCache.delete(cacheKey(token));
    return null;
  }
  return entry;
}

function setCachedSession(token, user, accessBlocked) 
{
  sessionCache.set(cacheKey(token), {
    user,
    accessBlocked: accessBlocked ?? null,
    expiresAt: Date.now() + controlSessionCacheMs,
  });
}

function clearSessionCache(token) {
  if (token) sessionCache.delete(cacheKey(token));
  else sessionCache.clear();
}

async function controlFetch(path, { method = "GET", body, token } = {}) {
  if (!controlApiUrl) 
  {
    const error = new Error("CONTROL_API_URL is not configured");
    error.status = 500;
    throw error;
  }

  const base = controlApiUrl.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = { Accept: "application/json" };
  if (body !== undefined) 
  {
    headers["Content-Type"] = "application/json";
  }
  if (token) 
  {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new Error(
      "Cannot reach the Digiteq control server. Check your internet connection and try again.",
    );
    error.status = 503;
    error.code = "CONTROL_UNREACHABLE";
    throw error;
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || res.statusText };
  }

  return { ok: res.ok, status: res.status, data };
}

async function ensureLocalUserMirror(controlUser) {
  if (!controlUser?.id) return controlUser;

  const existing = await users.findById(controlUser.id);
  if (existing) {
    const synced = {
      ...existing,
      email: controlUser.email ?? existing.email,
      name: controlUser.name ?? existing.name,
      role: controlUser.role ?? existing.role,
      department: controlUser.department ?? existing.department,
      firmId: controlUser.firmId ?? existing.firmId,
      companyName: controlUser.companyName ?? existing.companyName,
      status: controlUser.status ?? existing.status,
      contactNumber: controlUser.contactNumber ?? existing.contactNumber,
    };
    const changed =
      synced.status !== existing.status ||
      synced.firmId !== existing.firmId ||
      synced.role !== existing.role ||
      synced.department !== existing.department ||
      synced.companyName !== existing.companyName;
    if (changed) {
      await users.saveUser(synced);
      return synced;
    }
    return existing;
  }

  await users.saveUser({
    ...controlUser,
    passwordHash: controlUser.passwordHash ?? null,
  });
  return users.findById(controlUser.id);
}

async function resolveControlSession(token, { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedSession(token);
    if (cached) return cached;
  }

  const result = await controlFetch("/auth/me", { token });
  if (!result.ok) {
    clearSessionCache(token);
    return null;
  }

  const { user: controlUser, accessBlocked } = result.data;
  const user = await ensureLocalUserMirror(controlUser);
  if (!user) return null;

  const session = { user, accessBlocked: accessBlocked ?? null };
  setCachedSession(token, user, session.accessBlocked);
  return session;
}

async function proxyAuthRequest(path, { method = "POST", body, token } = {}) {
  const result = await controlFetch(`/auth${path}`, { method, body, token });
  return result;
}

async function proxyTeamsRequest(path, { method = "GET", body, token } = {}) {
  return controlFetch(`/teams${path}`, { method, body, token });
}

module.exports = {
  isHybridMode,
  controlFetch,
  resolveControlSession,
  proxyAuthRequest,
  proxyTeamsRequest,
  ensureLocalUserMirror,
  clearSessionCache,
  getCachedSession,
};
