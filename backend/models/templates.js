const path = require("path");
const { files } = require("../config");
const { readCollection, writeCollection, createId } = require("./jsonStore");
const templatePdfFiles = require("../utils/templatePdfFiles");

function toPublicTemplate(item) {
  if (!item) return null;
  const { pdfDataUrl: _pdfDataUrl, ...rest } = item;
  return {
    ...rest,
    pdfUrl: `/templates/${item.id}/pdf`,
  };
}

async function getAll(firmId) {
  const items = await readCollection(files.templates, []);
  const filtered = firmId ? items.filter((t) => t.firmId === firmId) : items;
  return filtered.map(toPublicTemplate);
}

async function getById(id, firmId) {
  const items = await readCollection(files.templates, []);
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
  await templatePdfFiles.saveFromDataUrl(id, pdfDataUrl);

  const items = await readCollection(files.templates, []);
  const entry = {
    id,
    firmId,
    productName,
    validUntil: payload.validUntil,
    uploadedAt: payload.uploadedAt || new Date().toISOString(),
  };
  items.unshift(entry);
  await writeCollection(files.templates, items);
  return toPublicTemplate(entry);
}

async function remove(id, firmId) {
  const items = await readCollection(files.templates, []);
  const target = items.find((t) => t.id === id);
  if (!target || (firmId && target.firmId !== firmId)) return false;
  const next = items.filter((t) => t.id !== id);
  await writeCollection(files.templates, next);
  await templatePdfFiles.remove(id);
  return true;
}

async function migrateDataUrlsToFiles() {
  const items = await readCollection(files.templates, []);
  let changed = false;

  for (const item of items) {
    if (!item.pdfDataUrl) continue;
    if (!(await templatePdfFiles.exists(item.id))) {
      await templatePdfFiles.saveFromDataUrl(item.id, item.pdfDataUrl);
    }
    delete item.pdfDataUrl;
    changed = true;
  }

  if (changed) {
    await writeCollection(files.templates, items);
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
  getPdfPath: templatePdfFiles.pdfFilePath,
  pdfExists: templatePdfFiles.exists,
  readPdfBuffer: templatePdfFiles.readBuffer,
};
