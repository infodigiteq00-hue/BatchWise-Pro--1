const { files } = require("../config");
const { readCollection, writeCollection, createId } = require("./jsonStore");

async function getAll(firmId) {
  const items = await readCollection(files.signatures, []);
  if (!firmId) return items;
  return items.filter((s) => s.firmId === firmId);
}

async function create(payload, firmId) {
  const items = await readCollection(files.signatures, []);
  const entry = {
    id: createId(),
    firmId,
    name: payload.name,
    imageDataUrl: payload.imageDataUrl,
  };
  items.unshift(entry);
  await writeCollection(files.signatures, items);
  return entry;
}

async function remove(id, firmId) {
  const items = await readCollection(files.signatures, []);
  const target = items.find((s) => s.id === id);
  if (!target || (firmId && target.firmId !== firmId)) return false;
  const next = items.filter((s) => s.id !== id);
  await writeCollection(files.signatures, next);
  return true;
}

module.exports = { getAll, create, remove };
