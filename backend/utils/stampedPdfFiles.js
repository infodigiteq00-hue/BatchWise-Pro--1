const fs = require("fs/promises");
const path = require("path");
const { stampedPdfDir } = require("../config");
const { dataUrlToBuffer } = require("./templatePdfFiles");

function pdfFilePath(id) {
  return path.join(stampedPdfDir, `${id}.pdf`);
}

async function saveFromDataUrl(id, dataUrl) {
  const buf = dataUrlToBuffer(dataUrl);
  await fs.mkdir(stampedPdfDir, { recursive: true });
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
  pdfFilePath,
  saveFromDataUrl,
  exists,
  readBuffer,
  remove,
};
