const { files } = require("../config");
const { getSupabase } = require("../db/supabase");
const { useCloudOperationalStore } = require("../db/storageMode");
const {
  templateToRow,
  templateFromRow,
  signatureToRow,
  signatureFromRow,
  requestToRow,
  requestFromRow,
  settingsToRow,
  settingsFromRow,
} = require("../db/operationalRowMap");
const { readCollection, writeCollection } = require("./jsonStore");

async function syncTable(table, items, { toRow, fromRow, orderBy = "uploaded_at" }) {
  const supabase = getSupabase();
  const { data: existing, error: readError } = await supabase
    .from(table)
    .select("id");

  if (readError) {
    const err = new Error(`Failed to sync ${table}: ${readError.message}`);
    err.status = 500;
    throw err;
  }

  const nextIds = new Set(items.map((item) => item.id));
  const toDelete = (existing ?? [])
    .map((row) => row.id)
    .filter((id) => !nextIds.has(id));

  if (toDelete.length) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .in("id", toDelete);
    if (deleteError) {
      const err = new Error(`Failed to delete from ${table}: ${deleteError.message}`);
      err.status = 500;
      throw err;
    }
  }

  if (!items.length) return;

  const { error: upsertError } = await supabase
    .from(table)
    .upsert(items.map(toRow), { onConflict: "id" });

  if (upsertError) {
    const err = new Error(`Failed to save ${table}: ${upsertError.message}`);
    err.status = 500;
    throw err;
  }
}

async function readTemplates() {
  if (!useCloudOperationalStore()) {
    return readCollection(files.templates, []);
  }
  const { data, error } = await getSupabase()
    .from("templates")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) {
    const err = new Error(`Failed to read templates: ${error.message}`);
    err.status = 500;
    throw err;
  }
  return (data ?? []).map(templateFromRow);
}

async function writeTemplates(items) {
  if (!useCloudOperationalStore()) {
    await writeCollection(files.templates, items);
    return;
  }
  await syncTable("templates", items, {
    toRow: templateToRow,
    fromRow: templateFromRow,
  });
}

async function readSignatures() {
  if (!useCloudOperationalStore()) {
    return readCollection(files.signatures, []);
  }
  const { data, error } = await getSupabase()
    .from("signatures")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    const err = new Error(`Failed to read signatures: ${error.message}`);
    err.status = 500;
    throw err;
  }
  return (data ?? []).map(signatureFromRow);
}

async function writeSignatures(items) {
  if (!useCloudOperationalStore()) {
    await writeCollection(files.signatures, items);
    return;
  }
  await syncTable("signatures", items, {
    toRow: signatureToRow,
    fromRow: signatureFromRow,
  });
}

async function readRequests() {
  if (!useCloudOperationalStore()) {
    return readCollection(files.requests, []);
  }
  const { data, error } = await getSupabase()
    .from("bmr_requests")
    .select("*")
    .order("requested_at", { ascending: false });
  if (error) {
    const err = new Error(`Failed to read requests: ${error.message}`);
    err.status = 500;
    throw err;
  }
  return (data ?? []).map(requestFromRow);
}

async function writeRequests(items) {
  if (!useCloudOperationalStore()) {
    await writeCollection(files.requests, items);
    return;
  }
  await syncTable("bmr_requests", items, {
    toRow: requestToRow,
    fromRow: requestFromRow,
  });
}

async function readSettingsRows() {
  if (!useCloudOperationalStore()) {
    return readCollection(files.settings, []);
  }
  const { data, error } = await getSupabase().from("firm_settings").select("*");
  if (error) {
    const err = new Error(`Failed to read settings: ${error.message}`);
    err.status = 500;
    throw err;
  }
  return (data ?? []).map(settingsFromRow);
}

async function writeSettingsRows(rows) {
  if (!useCloudOperationalStore()) {
    await writeCollection(files.settings, rows);
    return;
  }

  const supabase = getSupabase();
  const { data: existing, error: readError } = await supabase
    .from("firm_settings")
    .select("firm_id");

  if (readError) {
    const err = new Error(`Failed to sync settings: ${readError.message}`);
    err.status = 500;
    throw err;
  }

  const nextIds = new Set(rows.map((r) => r.firmId).filter(Boolean));
  const toDelete = (existing ?? [])
    .map((row) => row.firm_id)
    .filter((id) => !nextIds.has(id));

  if (toDelete.length) {
    const { error: deleteError } = await supabase
      .from("firm_settings")
      .delete()
      .in("firm_id", toDelete);
    if (deleteError) {
      const err = new Error(`Failed to delete settings: ${deleteError.message}`);
      err.status = 500;
      throw err;
    }
  }

  const valid = rows.filter((r) => r.firmId);
  if (!valid.length) return;

  const { error: upsertError } = await supabase
    .from("firm_settings")
    .upsert(valid.map(settingsToRow), { onConflict: "firm_id" });

  if (upsertError) {
    const err = new Error(`Failed to save settings: ${upsertError.message}`);
    err.status = 500;
    throw err;
  }
}

module.exports = {
  useCloudOperationalStore,
  readTemplates,
  writeTemplates,
  readSignatures,
  writeSignatures,
  readRequests,
  writeRequests,
  readSettingsRows,
  writeSettingsRows,
};
