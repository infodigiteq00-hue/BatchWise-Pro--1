const fs = require("fs/promises");
const path = require("path");
const { templatesPdfDir } = require("../config");

function dataUrlToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    const error = new Error("Invalid PDF data URL");
    error.status = 400;
    throw error;
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    const error = new Error("Invalid PDF data URL format");
    error.status = 400;
    throw error;
  }
  return Buffer.from(match[2], "base64");
}

function pdfFilePath(id) {
  return path.join(templatesPdfDir, `${id}.pdf`);
}

async function saveFromDataUrl(id, dataUrl) {
  const buf = dataUrlToBuffer(dataUrl);
  await fs.mkdir(templatesPdfDir, { recursive: true });
  const target = pdfFilePath(id);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, buf);
  await fs.rename(tmp, target);
  return target;
}

async function exists(id) {
  try {
    await fs.access(pdfFilePath(id));
    return true;
  } catch {
    return false;
  }
}

async function readBuffer(id) {
  return fs.readFile(pdfFilePath(id));
}

async function remove(id) {
  try {
    await fs.unlink(pdfFilePath(id));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

module.exports = {
  dataUrlToBuffer,
  pdfFilePath,
  saveFromDataUrl,
  exists,
  readBuffer,
  remove,
};
