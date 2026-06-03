import { useSyncExternalStore } from "react";

export type Role = "production" | "qaqc" | "admin";

export interface BMRTemplate {
  id: string;
  productName: string;
  /** Legacy inline PDF; new uploads use pdfUrl + server file storage. */
  pdfDataUrl?: string;
  pdfUrl?: string;
  validUntil?: string;
  uploadedAt: string;
}

export interface Signature {
  id: string;
  name: string;
  imageDataUrl: string;
}

export type RequestStatus = "pending" | "approved" | "rejected";

export interface BMRRequest {
  id: string;
  productName: string;
  department: string;
  batchNumber: string;
  batchSize: string;
  remarks?: string;
  requestedBy: string;
  requestedAt: string;
  status: RequestStatus;
  approval?: {
    approvedBy: string;
    approvedAt: string;
    expectedSubmission?: string;
    remarks?: string;
    signatureId?: string;
    /** Legacy inline PDF; approved BMRs use stampedPdfUrl + server file. */
    stampedPdfDataUrl?: string;
    stampedPdfUrl?: string;
  };
  rejection?: {
    rejectedBy: string;
    rejectedAt: string;
    reason?: string;
  };
}

interface AppState {
  role: Role;
  productionUser: string;
  qaUser: string;
  templates: BMRTemplate[];
  signatures: Signature[];
  requests: BMRRequest[];
}

const defaultState: AppState = {
  role: "production",
  productionUser: "Production User",
  qaUser: "QA User",
  templates: [],
  signatures: [],
  requests: [],
};

let state: AppState = { ...defaultState };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  notify();
}

export function getState() {
  return state;
}

function subscribeStore(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function subscribe(l: () => void) {
  return subscribeStore(l);
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribeStore,
    () => selector(state),
    () => selector(defaultState),
  );
}
