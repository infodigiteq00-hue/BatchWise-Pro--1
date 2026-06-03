const fs = require("fs/promises");
const path = require("path");

async function readCollection(filePath, defaultValue = []) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed ?? defaultValue;
  } catch (err) {
    if (err.code === "ENOENT") {
      await writeCollection(filePath, defaultValue);
      return defaultValue;
    }
    if (err instanceof SyntaxError) {
      const error = new Error(`Invalid JSON in ${path.basename(filePath)}`);
      error.status = 500;
      throw error;
    }
    throw err;
  }
}

async function writeCollection(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

function createId() {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  );
}

module.exports = { readCollection, writeCollection, createId };
