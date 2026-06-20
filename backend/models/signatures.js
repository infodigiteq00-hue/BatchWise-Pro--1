const { createId } = require("./jsonStore");
const operationalStore = require("./operationalStore");

async function getAll(firmId) {
  const items = await operationalStore.readSignatures();
  if (!firmId) return items;
  return items.filter((s) => s.firmId === firmId);
}

async function create(payload, firmId) {
  const items = await operationalStore.readSignatures();
  const entry = {
    id: createId(),
    firmId,
    name: payload.name,
    imageDataUrl: payload.imageDataUrl,
  };
  items.unshift(entry);
  await operationalStore.writeSignatures(items);
  return entry;
}

async function remove(id, firmId) {
  const items = await operationalStore.readSignatures();
  const target = items.find((s) => s.id === id);
  if (!target || (firmId && target.firmId !== firmId)) return false;
  const next = items.filter((s) => s.id !== id);
  await operationalStore.writeSignatures(next);
  return true;
}

module.exports = { getAll, create, remove };
