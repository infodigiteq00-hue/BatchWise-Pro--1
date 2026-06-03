import * as api from "@/lib/api";
import { setState, getState, type BMRRequest } from "@/lib/store";

export async function hydrateStoreFromApi() {
  try {
    const data = await api.getState();
    setState({
      productionUser: data.productionUser ?? getState().productionUser,
      qaUser: data.qaUser ?? getState().qaUser,
    });
    if (data.templates) setState({ templates: data.templates });
    if (data.signatures) setState({ signatures: data.signatures });
    if (data.requests) setState({ requests: data.requests });
  } catch {
    /* /state may be partial for some roles — fall through to dedicated loaders */
  }
  await Promise.all([
    ensureTemplatesLoaded(),
    ensureSignaturesLoaded(),
    ensureRequestsLoaded(),
  ]);
}

export async function submitBmrRequest(payload: {
  productName: string;
  department: string;
  batchNumber: string;
  batchSize: string;
  remarks?: string;
  requestedBy: string;
}) {
  const created = await api.createRequest(payload);
  setState((s) => ({ requests: [created, ...s.requests] }));
  return created;
}

export async function approveBmrRequest(
  id: string,
  approval: NonNullable<BMRRequest["approval"]>,
) {
  const updated = await api.approveRequest(id, {
    approvedBy: approval.approvedBy,
    approvedAt: approval.approvedAt,
    expectedSubmission: approval.expectedSubmission,
    remarks: approval.remarks,
    signatureId: approval.signatureId,
    stampedPdfDataUrl: approval.stampedPdfDataUrl!,
  });
  setState((s) => ({
    requests: s.requests.map((r) => (r.id === id ? updated : r)),
  }));
  return updated;
}

export async function rejectBmrRequest(
  id: string,
  rejection: NonNullable<BMRRequest["rejection"]>,
) {
  const updated = await api.rejectRequest(id, rejection);
  setState((s) => ({
    requests: s.requests.map((r) => (r.id === id ? updated : r)),
  }));
  return updated;
}

export async function updateRequestStampedPdf(id: string, stampedPdfDataUrl: string) {
  const updated = await api.updateStampedPdf(id, stampedPdfDataUrl);
  setState((s) => ({
    requests: s.requests.map((r) => (r.id === id ? updated : r)),
  }));
  return updated;
}

export async function uploadTemplate(entry: {
  productName: string;
  pdfDataUrl: string;
  validUntil?: string;
  uploadedAt?: string;
}) {
  await api.createTemplate(entry);
  await reloadTemplatesFromApi();
  return getState().templates[0] ?? null;
}

export async function removeTemplate(id: string) {
  await api.deleteTemplate(id);
  await reloadTemplatesFromApi();
}

export async function addSignature(entry: { name: string; imageDataUrl: string }) {
  await api.createSignature(entry);
  await reloadSignaturesFromApi();
  return getState().signatures[0] ?? null;
}

export async function removeSignature(id: string) {
  await api.deleteSignature(id);
  await reloadSignaturesFromApi();
}

export async function saveQaUser(qaUser: string) {
  const updated = await api.patchSettings({ qaUser });
  setState({ qaUser: updated.qaUser });
}

export async function saveProductionUser(productionUser: string) {
  const updated = await api.patchSettings({ productionUser });
  setState({ productionUser: updated.productionUser });
}

/** Always load persisted templates from backend JSON (firm-scoped). */
export async function reloadTemplatesFromApi() {
  const templates = await api.getTemplates();
  setState({ templates });
  return templates;
}

export async function reloadSignaturesFromApi() {
  const signatures = await api.getSignatures();
  setState({ signatures });
  return signatures;
}

export async function reloadRequestsFromApi() {
  const requests = await api.getRequests();
  setState({ requests });
  return requests;
}

export async function ensureTemplatesLoaded() {
  try {
    await reloadTemplatesFromApi();
  } catch {
    /* role may not allow — ignore */
  }
}

export async function ensureSignaturesLoaded() {
  try {
    await reloadSignaturesFromApi();
  } catch {
    /* ignore */
  }
}

export async function ensureRequestsLoaded() {
  try {
    await reloadRequestsFromApi();
  } catch {
    /* ignore */
  }
}
