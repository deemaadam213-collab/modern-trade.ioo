import { loadStudentProgress } from "./supabase-client.js";

const state = await loadStudentProgress();
if (!state.user) {
  window.location.replace("login.html");
} else {
  const user = state.user;
  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "طالب";
  document.querySelectorAll("[data-student-name], [data-profile-name]").forEach((el) => { el.textContent = name; });
  document.querySelector("[data-profile-email]").textContent = user.email || "";

  const answers = state.answers || {};
  const tf = state.tfAnswers || {};
  const answerValues = Object.values(answers);
  const doneOpen = answerValues.filter((answer) => String(answer).trim()).length;
  const keys = ["s5q1", "s5q2", "s5q3", "s5q4", "s6q1", "s6q2", "s6q3", "s6q4", "s6q5"];
  const correctAnswers = { s5q1: "false", s5q2: "false", s5q3: "true", s5q4: "true", s6q1: "true", s6q2: "true", s6q3: "true", s6q4: "false", s6q5: "false" };
  const doneTf = keys.filter((key) => tf[key] === "true" || tf[key] === "false").length;
  const scoreFor = (groupKeys) => groupKeys.filter((key) => tf[key] === correctAnswers[key]).length;
  const scoreFive = scoreFor(keys.slice(0, 4));
  const scoreSix = scoreFor(keys.slice(4));

  document.querySelector("[data-stat-open]").textContent = doneOpen;
  document.querySelector("[data-stat-tf]").textContent = doneTf;
  document.querySelector("[data-stat-correct]").textContent = scoreFive + scoreSix;
  document.querySelector("[data-group-five]").textContent = `${scoreFive} / 4`;
  document.querySelector("[data-group-six]").textContent = `${scoreSix} / 5`;

  const syncStatus = document.querySelector("[data-sync-status]");
  if (state.error) {
    syncStatus.textContent = "التقدم ظاهر هنا، لكن المزامنة تحتاج تجهيز قاعدة بيانات التقدم من ملف student-progress.sql في مستودع الموقع.";
    syncStatus.dataset.type = "error";
  } else {
    syncStatus.textContent = "تقدمك متزامن مع حسابك.";
    syncStatus.dataset.type = "success";
  }
}
