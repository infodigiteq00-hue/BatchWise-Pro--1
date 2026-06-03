import { apiFetch } from "./client";
import type { BMRTemplate, BMRRequest, Signature } from "@/lib/store";

export interface ApiState {
  firmId?: string;
  productionUser?: string;
  qaUser?: string;
  templates?: BMRTemplate[];
  signatures?: Signature[];
  requests?: BMRRequest[];
}

export interface AccessBlocked {
  reason: string;
  message: string;
  firmId?: string;
  companyName?: string;
}

export interface AuthResponse {
  token: string;
  user: Record<string, unknown>;
  dashboard: Record<string, unknown>;
  accessBlocked?: AccessBlocked;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  department: "production" | "qaqc";
  companyName?: string;
  status?: string;
  createdAt?: string;
}

export function login(body: { email: string; password: string }) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function signup(body: { name: string; email: string; password: string }) {
  return apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getMe() {
  return apiFetch<{
    user: Record<string, unknown>;
    dashboard: Record<string, unknown>;
    accessBlocked?: AccessBlocked;
  }>("/auth/me");
}

export function getState() {
  return apiFetch<ApiState>("/state");
}

export function getTemplates() {
  return apiFetch<BMRTemplate[]>("/templates");
}

export function createTemplate(body: {
  productName: string;
  pdfDataUrl: string;
  validUntil?: string;
  uploadedAt?: string;
}) {
  return apiFetch<BMRTemplate>("/templates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteTemplate(id: string) {
  return apiFetch<void>(`/templates/${id}`, { method: "DELETE" });
}

export function getSignatures() {
  return apiFetch<Signature[]>("/signatures");
}

export function createSignature(body: { name: string; imageDataUrl: string }) {
  return apiFetch<Signature>("/signatures", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteSignature(id: string) {
  return apiFetch<void>(`/signatures/${id}`, { method: "DELETE" });
}

export function getRequests(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<BMRRequest[]>(`/requests${q}`);
}

export function createRequest(body: {
  productName: string;
  department: string;
  batchNumber: string;
  batchSize: string;
  remarks?: string;
  requestedBy: string;
}) {
  return apiFetch<BMRRequest>("/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function approveRequest(
  id: string,
  body: {
    approvedBy: string;
    approvedAt: string;
    expectedSubmission?: string;
    remarks?: string;
    signatureId?: string;
    stampedPdfDataUrl: string;
  },
) {
  return apiFetch<BMRRequest>(`/requests/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function rejectRequest(
  id: string,
  body: { rejectedBy: string; rejectedAt: string; reason?: string },
) {
  return apiFetch<BMRRequest>(`/requests/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateStampedPdf(id: string, stampedPdfDataUrl: string) {
  return apiFetch<BMRRequest>(`/requests/${id}/stamped-pdf`, {
    method: "PATCH",
    body: JSON.stringify({ stampedPdfDataUrl }),
  });
}

export function patchSettings(body: {
  productionUser?: string;
  qaUser?: string;
}) {
  return apiFetch<{ productionUser: string; qaUser: string }>("/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function getTeams() {
  return apiFetch<TeamMember[]>("/teams");
}

export function createTeamMember(body: {
  name: string;
  email: string;
  contactNumber?: string;
  department: "production" | "qaqc";
}) {
  return apiFetch<TeamMember>("/teams", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteTeamMember(id: string) {
  return apiFetch<void>(`/teams/${id}`, { method: "DELETE" });
}

export interface CompanyRecord {
  id: string;
  companyName: string;
  status: "active" | "inactive" | "paused";
  createdAt: string;
  memberCount?: number;
  teamMemberCount?: number;
  firmAdminCount?: number;
  firmAdmins?: Array<{
    id: string;
    name: string;
    email: string;
    contactNumber?: string;
    status: string;
  }>;
}

export interface FirmAdminRecord {
  id: string;
  name: string;
  email: string;
  contactNumber?: string;
  companyName?: string;
  status: string;
  role: string;
  firmId?: string | null;
  memberCount?: number;
}

export interface SuperAdminDashboard {
  totals: {
    companies: number;
    firmAdmins: number;
    pendingFirmAdmins: number;
    teamMembers: number;
  };
  companies: CompanyRecord[];
  firmAdmins: FirmAdminRecord[];
}

export function getSuperAdminDashboard() {
  return apiFetch<SuperAdminDashboard>("/super-admin/dashboard");
}

export function getSuperAdminCompanies() {
  return apiFetch<CompanyRecord[]>("/super-admin/companies");
}

export function createSuperAdminCompany(body: {
  companyName: string;
  status?: string;
}) {
  return apiFetch<CompanyRecord>("/super-admin/companies", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSuperAdminCompany(
  id: string,
  body: { companyName?: string; status?: string },
) {
  return apiFetch<CompanyRecord>(`/super-admin/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function setSuperAdminCompanyStatus(
  id: string,
  status: "active" | "inactive" | "paused",
) {
  return apiFetch<CompanyRecord>(`/super-admin/companies/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteSuperAdminCompany(id: string) {
  return apiFetch<void>(`/super-admin/companies/${id}`, { method: "DELETE" });
}

export function getSuperAdminFirmAdmins() {
  return apiFetch<FirmAdminRecord[]>("/super-admin/firm-admins");
}

export function createSuperAdminFirmAdmin(body: {
  companyName: string;
  email: string;
  contactNumber: string;
  name?: string;
}) {
  return apiFetch<FirmAdminRecord>("/super-admin/firm-admins", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSuperAdminFirmAdmin(
  id: string,
  body: {
    name?: string;
    email?: string;
    contactNumber?: string;
    companyName?: string;
    status?: string;
  },
) {
  return apiFetch<FirmAdminRecord>(`/super-admin/firm-admins/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function setSuperAdminFirmAdminStatus(
  id: string,
  status: string,
) {
  return apiFetch<FirmAdminRecord>(`/super-admin/firm-admins/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteSuperAdminFirmAdmin(id: string) {
  return apiFetch<void>(`/super-admin/firm-admins/${id}`, { method: "DELETE" });
}
