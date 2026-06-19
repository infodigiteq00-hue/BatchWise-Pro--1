const { files } = require("../config");
const { isSupabaseEnabled, getSupabase } = require("../db/supabase");
const {
  firmToRow,
  firmFromRow,
  userToRow,
  userFromRow,
} = require("../db/rowMap");
const { readCollection, writeCollection } = require("./jsonStore");

async function readFirms() {
  if (!isSupabaseEnabled()) {
    const firms = await readCollection(files.firms, []);
    return firms.map((f) => ({ status: "active", ...f }));
  }

  const { data, error } = await getSupabase()
    .from("firms")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    const err = new Error(`Failed to read firms: ${error.message}`);
    err.status = 500;
    throw err;
  }
  return (data ?? []).map(firmFromRow);
}

async function writeFirms(firms) {
  if (!isSupabaseEnabled()) {
    await writeCollection(files.firms, firms);
    return;
  }

  const supabase = getSupabase();
  const { data: existing, error: readError } = await supabase
    .from("firms")
    .select("id");

  if (readError) {
    const err = new Error(`Failed to sync firms: ${readError.message}`);
    err.status = 500;
    throw err;
  }

  const nextIds = new Set(firms.map((f) => f.id));
  const toDelete = (existing ?? [])
    .map((row) => row.id)
    .filter((id) => !nextIds.has(id));

  if (toDelete.length) {
    const { error: deleteError } = await supabase
      .from("firms")
      .delete()
      .in("id", toDelete);
    if (deleteError) {
      const err = new Error(`Failed to delete firms: ${deleteError.message}`);
      err.status = 500;
      throw err;
    }
  }

  if (!firms.length) return;

  const { error: upsertError } = await supabase
    .from("firms")
    .upsert(firms.map(firmToRow), { onConflict: "id" });

  if (upsertError) {
    const err = new Error(`Failed to save firms: ${upsertError.message}`);
    err.status = 500;
    throw err;
  }
}

async function readUsers() {
  if (!isSupabaseEnabled()) {
    return readCollection(files.users, []);
  }

  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    const err = new Error(`Failed to read users: ${error.message}`);
    err.status = 500;
    throw err;
  }
  return (data ?? []).map(userFromRow);
}

async function writeUsers(users) {
  if (!isSupabaseEnabled()) {
    await writeCollection(files.users, users);
    return;
  }

  const supabase = getSupabase();
  const { data: existing, error: readError } = await supabase
    .from("users")
    .select("id");

  if (readError) {
    const err = new Error(`Failed to sync users: ${readError.message}`);
    err.status = 500;
    throw err;
  }

  const nextIds = new Set(users.map((u) => u.id));
  const toDelete = (existing ?? [])
    .map((row) => row.id)
    .filter((id) => !nextIds.has(id));

  if (toDelete.length) {
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .in("id", toDelete);
    if (deleteError) {
      const err = new Error(`Failed to delete users: ${deleteError.message}`);
      err.status = 500;
      throw err;
    }
  }

  if (!users.length) return;

  const { error: upsertError } = await supabase
    .from("users")
    .upsert(users.map(userToRow), { onConflict: "id" });

  if (upsertError) {
    const err = new Error(`Failed to save users: ${upsertError.message}`);
    err.status = 500;
    throw err;
  }
}

module.exports = {
  isSupabaseEnabled,
  readFirms,
  writeFirms,
  readUsers,
  writeUsers,
};
