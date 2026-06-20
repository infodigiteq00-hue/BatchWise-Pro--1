const { useCloudOperationalStore } = require("../db/storageMode");
const localTemplatePdfs = require("./templatePdfFiles");
const localStampedPdfs = require("./stampedPdfFiles");
const cloudPdfs = require("./supabasePdfStorage");

async function saveTemplatePdf(id, dataUrl) {
  if (useCloudOperationalStore()) {
    return cloudPdfs.saveTemplateFromDataUrl(id, dataUrl);
  }
  return localTemplatePdfs.saveFromDataUrl(id, dataUrl);
}

async function readTemplatePdfBuffer(id) {
  if (useCloudOperationalStore()) {
    const buf = await cloudPdfs.readTemplateBuffer(id);
    if (!buf) {
      const error = new Error("Template PDF not found");
      error.status = 404;
      throw error;
    }
    return buf;
  }
  return localTemplatePdfs.readBuffer(id);
}

async function templatePdfExists(id) {
  if (useCloudOperationalStore()) {
    return cloudPdfs.templateExists(id);
  }
  return localTemplatePdfs.exists(id);
}

async function removeTemplatePdf(id) {
  if (useCloudOperationalStore()) {
    return cloudPdfs.removeTemplate(id);
  }
  return localTemplatePdfs.remove(id);
}

async function saveStampedPdf(id, dataUrl) {
  if (useCloudOperationalStore()) {
    return cloudPdfs.saveStampedFromDataUrl(id, dataUrl);
  }
  return localStampedPdfs.saveFromDataUrl(id, dataUrl);
}

async function readStampedPdfBuffer(id) {
  if (useCloudOperationalStore()) {
    const buf = await cloudPdfs.readStampedBuffer(id);
    if (!buf) {
      const error = new Error("Stamped PDF not found");
      error.status = 404;
      throw error;
    }
    return buf;
  }
  return localStampedPdfs.readBuffer(id);
}

async function stampedPdfExists(id) {
  if (useCloudOperationalStore()) {
    return cloudPdfs.stampedExists(id);
  }
  return localStampedPdfs.exists(id);
}

module.exports = {
  saveTemplatePdf,
  readTemplatePdfBuffer,
  templatePdfExists,
  removeTemplatePdf,
  saveStampedPdf,
  readStampedPdfBuffer,
  stampedPdfExists,
};
