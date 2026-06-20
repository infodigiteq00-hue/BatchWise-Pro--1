const { createId } = require("./jsonStore");
const operationalStore = require("./operationalStore");
const pdfStorage = require("../utils/pdfStorage");

function toPublicTemplate(item) {
  if (!item) return null;
  const { pdfDataUrl: _pdfDataUrl, ...rest } = item;
  return {
    ...rest,
    pdfUrl: `/templates/${item.id}/pdf`,
  };
}

async function getAll(firmId) {
  const items = await operationalStore.readTemplates();
  const filtered = firmId ? items.filter((t) => t.firmId === firmId) : items;
  return filtered.map(toPublicTemplate);
}

async function getById(id, firmId) {
  const items = await operationalStore.readTemplates();
  const item = items.find((t) => t.id === id) ?? null;
  if (!item) return null;
  if (firmId && item.firmId !== firmId) return null;
  return item;
}

async function getByIdPublic(id, firmId) {
  const item = await getById(id, firmId);
  return item ? toPublicTemplate(item) : null;
}

async function create(payload, firmId) {
  const { productName, pdfDataUrl } = payload;
  if (!productName || !pdfDataUrl) {
    const error = new Error("productName and pdfDataUrl are required");
    error.status = 400;
    throw error;
  }

  const id = createId();
  await pdfStorage.saveTemplatePdf(id, pdfDataUrl);

  const items = await operationalStore.readTemplates();
  const entry = {
    id,
    firmId,
    productName,
    validUntil: payload.validUntil,
    uploadedAt: payload.uploadedAt || new Date().toISOString(),
  };
  items.unshift(entry);
  await operationalStore.writeTemplates(items);
  return toPublicTemplate(entry);
}

async function remove(id, firmId) {
  const items = await operationalStore.readTemplates();
  const target = items.find((t) => t.id === id);
  if (!target || (firmId && target.firmId !== firmId)) return false;
  const next = items.filter((t) => t.id !== id);
  await operationalStore.writeTemplates(next);
  await pdfStorage.removeTemplatePdf(id);
  return true;
}

async function migrateDataUrlsToFiles() {
  if (operationalStore.useCloudOperationalStore()) return;

  const items = await operationalStore.readTemplates();
  let changed = false;

  for (const item of items) {
    if (!item.pdfDataUrl) continue;
    if (!(await pdfStorage.templatePdfExists(item.id))) {
      await pdfStorage.saveTemplatePdf(item.id, item.pdfDataUrl);
    }
    delete item.pdfDataUrl;
    changed = true;
  }

  if (changed) {
    await operationalStore.writeTemplates(items);
  }
}

module.exports = {
  toPublicTemplate,
  getAll,
  getById,
  getByIdPublic,
  create,
  remove,
  migrateDataUrlsToFiles,
  pdfExists: pdfStorage.templatePdfExists,
  readPdfBuffer: pdfStorage.readTemplatePdfBuffer,
};
