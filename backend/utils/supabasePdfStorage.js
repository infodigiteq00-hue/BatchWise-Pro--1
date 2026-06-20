const { getSupabase } = require("../db/supabase");
const { dataUrlToBuffer } = require("./templatePdfFiles");

const TEMPLATE_BUCKET = "template-pdfs";
const STAMPED_BUCKET = "stamped-pdfs";

function objectPath(id) {
  return `${id}.pdf`;
}

async function uploadPdf(bucket, id, dataUrl) {
  const buf = dataUrlToBuffer(dataUrl);
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath(id), buf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) {
    const err = new Error(`Failed to upload PDF: ${error.message}`);
    err.status = 500;
    throw err;
  }
}

async function downloadPdf(bucket, id) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(objectPath(id));
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function removePdf(bucket, id) {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(bucket)
    .remove([objectPath(id)]);
  if (error && !/not found/i.test(error.message)) {
    const err = new Error(`Failed to remove PDF: ${error.message}`);
    err.status = 500;
    throw err;
  }
}

async function pdfExists(bucket, id) {
  const buf = await downloadPdf(bucket, id);
  return buf !== null && buf.length > 0;
}

module.exports = {
  saveTemplateFromDataUrl: (id, dataUrl) =>
    uploadPdf(TEMPLATE_BUCKET, id, dataUrl),
  readTemplateBuffer: (id) => downloadPdf(TEMPLATE_BUCKET, id),
  templateExists: (id) => pdfExists(TEMPLATE_BUCKET, id),
  removeTemplate: (id) => removePdf(TEMPLATE_BUCKET, id),
  saveStampedFromDataUrl: (id, dataUrl) =>
    uploadPdf(STAMPED_BUCKET, id, dataUrl),
  readStampedBuffer: (id) => downloadPdf(STAMPED_BUCKET, id),
  stampedExists: (id) => pdfExists(STAMPED_BUCKET, id),
  removeStamped: (id) => removePdf(STAMPED_BUCKET, id),
};
