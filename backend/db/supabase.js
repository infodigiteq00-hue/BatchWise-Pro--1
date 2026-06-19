const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseServiceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  ""
).trim();

let client = null;

function isSupabaseEnabled() {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

function getSupabase() {
  if (!isSupabaseEnabled()) {
    const error = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    error.status = 500;
    throw error;
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

module.exports = { isSupabaseEnabled, getSupabase };
