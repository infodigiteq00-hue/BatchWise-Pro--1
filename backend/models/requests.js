const { createId } = require("./jsonStore");
const operationalStore = require("./operationalStore");
const pdfStorage = require("../utils/pdfStorage");

function toPublicRequest(item) {
  if (!item) return null;
  const next = { ...item };
  if (next.approval) {
    const { stampedPdfDataUrl: _removed, ...approvalRest } = next.approval;
    next.approval = {
      ...approvalRest,
      stampedPdfUrl: `/requests/${item.id}/stamped-pdf`,
    };
  }
  return next;
}

function mapPublic(items) {
  return items.map(toPublicRequest);
}

async function saveStampedPdfFromDataUrl(id, dataUrl) {
  if (!dataUrl) return;
  await pdfStorage.saveStampedPdf(id, dataUrl);
}

async function getAll(firmId, status) {
  let items = await operationalStore.readRequests();
  if (firmId) items = items.filter((r) => r.firmId === firmId);
  if (status) items = items.filter((r) => r.status === status);
  return mapPublic(items);
}

async function getById(id, firmId) {
  const items = await operationalStore.readRequests();
  const item = items.find((r) => r.id === id) ?? null;
  if (!item) return null;
  if (firmId && item.firmId !== firmId) return null;
  return item;
}

async function getByIdPublic(id, firmId) {
  const item = await getById(id, firmId);
  return item ? toPublicRequest(item) : null;
}

async function create(payload, firmId) {
  const items = await operationalStore.readRequests();
  const entry = {
    id: createId(),
    firmId,
    productName: payload.productName,
    department: payload.department,
    batchNumber: payload.batchNumber,
    batchSize: payload.batchSize,
    remarks: payload.remarks,
    requestedBy: payload.requestedBy,
    requestedAt: payload.requestedAt || new Date().toISOString(),
    status: "pending",
  };
  items.unshift(entry);
  await operationalStore.writeRequests(items);
  return entry;
}

async function update(id, patch, firmId) {
  const items = await operationalStore.readRequests();
  const index = items.findIndex((r) => r.id === id);
  if (index === -1) return null;
  if (firmId && items[index].firmId !== firmId) return null;
  items[index] = { ...items[index], ...patch };
  await operationalStore.writeRequests(items);
  return items[index];
}

async function approve(id, approval, firmId) {
  const existing = await getById(id, firmId);
  if (!existing) return null;
  if (existing.status !== "pending") {
    const error = new Error("Only pending requests can be approved");
    error.status = 409;
    throw error;
  }

  if (approval.stampedPdfDataUrl) {
    await saveStampedPdfFromDataUrl(id, approval.stampedPdfDataUrl);
  }

  const { stampedPdfDataUrl: _pdf, ...approvalMeta } = approval;

  return update(
    id,
    {
      status: "approved",
      approval: {
        ...approvalMeta,
        approvedAt: approval.approvedAt || new Date().toISOString(),
      },
      rejection: undefined,
    },
    firmId,
  ).then((row) => (row ? toPublicRequest(row) : null));
}

async function reject(id, rejection, firmId) {
  const existing = await getById(id, firmId);
  if (!existing) return null;
  if (existing.status !== "pending") {
    const error = new Error("Only pending requests can be rejected");
    error.status = 409;
    throw error;
  }
  return update(
    id,
    {
      status: "rejected",
      rejection: {
        rejectedBy: rejection.rejectedBy,
        rejectedAt: rejection.rejectedAt || new Date().toISOString(),
        reason: rejection.reason,
      },
      approval: undefined,
    },
    firmId,
  );
}

async function updateStampedPdf(id, stampedPdfDataUrl, firmId) {
  const existing = await getById(id, firmId);
  if (!existing?.approval) {
    const error = new Error("Request has no approval to update");
    error.status = 400;
    throw error;
  }
  await saveStampedPdfFromDataUrl(id, stampedPdfDataUrl);
  return update(
    id,
    {
      approval: { ...existing.approval, stampedPdfDataUrl: undefined },
    },
    firmId,
  ).then((row) => (row ? toPublicRequest(row) : null));
}

async function migrateStampedPdfsToFiles() {
  if (operationalStore.useCloudOperationalStore()) return;

  const items = await operationalStore.readRequests();
  let changed = false;

  for (const item of items) {
    const dataUrl = item.approval?.stampedPdfDataUrl;
    if (!dataUrl) continue;
    if (!(await pdfStorage.stampedPdfExists(item.id))) {
      await pdfStorage.saveStampedPdf(item.id, dataUrl);
    }
    delete item.approval.stampedPdfDataUrl;
    changed = true;
  }

  if (changed) {
    await operationalStore.writeRequests(items);
  }
}

module.exports = {
  toPublicRequest,
  getAll,
  getById,
  getByIdPublic,
  create,
  update,
  approve,
  reject,
  updateStampedPdf,
  migrateStampedPdfsToFiles,
  stampedPdfExists: pdfStorage.stampedPdfExists,
  readStampedPdfBuffer: pdfStorage.readStampedPdfBuffer,
};
