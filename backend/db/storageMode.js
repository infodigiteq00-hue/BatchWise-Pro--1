const { appMode } = require("../config");
const { isSupabaseEnabled } = require("./supabase");

/** Browser/online control server: users, firms, BMR data in Supabase. */
function useCloudOperationalStore() {
  return isSupabaseEnabled() && appMode === "full";
}

/** Alias — control plane uses the same rule as operational store. */
function useCloudControlStore() {
  return useCloudOperationalStore();
}

module.exports = {
  useCloudOperationalStore,
  useCloudControlStore,
};
