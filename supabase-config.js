// Use the project URL and publishable key from Supabase project settings.
// Never place a secret/service_role key in browser code.
export const supabaseUrl = "https://zyixedrggoxmcieeicne.supabase.co";
export const supabasePublishableKey = "sb_publishable_UCt2ciH4d1zbw6StS5PyFA_-KILUGM2";
export const isSupabaseConfigured =
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("PASTE_") &&
  !supabasePublishableKey.includes("PASTE_");
