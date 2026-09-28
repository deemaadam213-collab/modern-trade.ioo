import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./supabase-config.js";

export const supabase = isSupabaseConfigured && window.supabase?.createClient
  ? window.supabase.createClient(supabaseUrl, supabasePublishableKey)
  : null;

let currentUser = null;

export async function loadStudentProgress() {
  if (!supabase) return { user: null, answers: {}, tfAnswers: {}, error: "not-configured" };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { user: null, answers: {}, tfAnswers: {}, error: userError };
  currentUser = userData.user;

  const { data, error } = await supabase
    .from("student_progress")
    .select("answers, tf_answers, student_name")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (!error && !data) {
    const { error: createError } = await supabase.from("student_progress").insert({
      user_id: currentUser.id,
      student_name: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "طالب"
    });
    return { user: currentUser, answers: {}, tfAnswers: {}, error: createError };
  }

  return {
    user: currentUser,
    answers: data?.answers || {},
    tfAnswers: data?.tf_answers || {},
    error
  };
}

export async function hasSchoolAdminRole(userId) {
  if (!supabase || !userId) return false;
  const { data, error } = await supabase.from("school_admins")
    .select("user_id").eq("user_id", userId).maybeSingle();
  return !error && Boolean(data);
}

export async function loadAllStudentProgress() {
  if (!supabase) return { rows: [], error: new Error("Supabase is not configured") };
  const { data, error } = await supabase.from("student_progress")
    .select("user_id, student_name, answers, tf_answers, updated_at")
    .order("updated_at", { ascending: false });
  return { rows: data || [], error };
}

export async function saveStudentProgress(answers, tfAnswers) {
  if (!supabase || !currentUser) return { saved: false, error: "not-signed-in" };
  const { error } = await supabase.from("student_progress").upsert({
    user_id: currentUser.id,
    student_name: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "طالب",
    answers,
    tf_answers: tfAnswers,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  return { saved: !error, error };
}

export async function signOutStudent() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
