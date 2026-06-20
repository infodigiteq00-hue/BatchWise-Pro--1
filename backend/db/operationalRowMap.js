function templateToRow(item) {
  return {
    id: item.id,
    firm_id: item.firmId,
    product_name: item.productName,
    valid_until: item.validUntil ?? null,
    uploaded_at: item.uploadedAt || new Date().toISOString(),
  };
}

function templateFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    firmId: row.firm_id,
    productName: row.product_name,
    validUntil: row.valid_until ?? undefined,
    uploadedAt: row.uploaded_at,
  };
}

function signatureToRow(item) {
  return {
    id: item.id,
    firm_id: item.firmId,
    name: item.name,
    image_data_url: item.imageDataUrl,
  };
}

function signatureFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    firmId: row.firm_id,
    name: row.name,
    imageDataUrl: row.image_data_url,
  };
}

function requestToRow(item) {
  return {
    id: item.id,
    firm_id: item.firmId,
    product_name: item.productName,
    department: item.department ?? null,
    batch_number: item.batchNumber,
    batch_size: item.batchSize ?? null,
    remarks: item.remarks ?? null,
    requested_by: item.requestedBy ?? null,
    requested_at: item.requestedAt || new Date().toISOString(),
    status: item.status,
    approval: item.approval ?? null,
    rejection: item.rejection ?? null,
  };
}

function requestFromRow(row) {
  if (!row) return null;
  const item = {
    id: row.id,
    firmId: row.firm_id,
    productName: row.product_name,
    department: row.department ?? undefined,
    batchNumber: row.batch_number,
    batchSize: row.batch_size ?? undefined,
    remarks: row.remarks ?? undefined,
    requestedBy: row.requested_by ?? undefined,
    requestedAt: row.requested_at,
    status: row.status,
  };
  if (row.approval) item.approval = row.approval;
  if (row.rejection) item.rejection = row.rejection;
  return item;
}

function settingsToRow(row) {
  return {
    firm_id: row.firmId,
    production_user: row.productionUser ?? "Production User",
    qa_user: row.qaUser ?? "QA User",
  };
}

function settingsFromRow(row) {
  if (!row) return null;
  return {
    firmId: row.firm_id,
    productionUser: row.production_user,
    qaUser: row.qa_user,
  };
}

module.exports = {
  templateToRow,
  templateFromRow,
  signatureToRow,
  signatureFromRow,
  requestToRow,
  requestFromRow,
  settingsToRow,
  settingsFromRow,
};
