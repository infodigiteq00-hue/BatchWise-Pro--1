const { files } = require("../config");
const { readCollection, writeCollection } = require("./jsonStore");

const defaults = {
  productionUser: "Production User",
  qaUser: "QA User",
};

function normalizeRows(stored) {
  if (Array.isArray(stored)) return stored;
  if (!stored || typeof stored !== "object") return [];

  // Backward compatibility: old single-tenant shape
  if ("productionUser" in stored || "qaUser" in stored) {
    return [
      {
        firmId: null,
        productionUser: stored.productionUser ?? defaults.productionUser,
        qaUser: stored.qaUser ?? defaults.qaUser,
      },
    ];
  }
  return [];
}

async function getAll() {
  const stored = await readCollection(files.settings, []);
  return normalizeRows(stored);
}

async function get(firmId) {
  const rows = await getAll();
  const row = rows.find((s) => s.firmId === firmId);
  return { firmId, ...defaults, ...row };
}

async function update(firmId, patch) {
  const rows = await getAll();
  const index = rows.findIndex((s) => s.firmId === firmId);
  if (index === -1) {
    rows.push({
      firmId,
      productionUser: patch.productionUser ?? defaults.productionUser,
      qaUser: patch.qaUser ?? defaults.qaUser,
    });
  } else {
    rows[index] = {
      ...rows[index],
      productionUser: patch.productionUser ?? rows[index].productionUser,
      qaUser: patch.qaUser ?? rows[index].qaUser,
    };
  }
  await writeCollection(files.settings, rows);
  return get(firmId);
}

module.exports = { get, update };
