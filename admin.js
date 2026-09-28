import { hasSchoolAdminRole, loadAllStudentProgress, loadStudentProgress } from "./supabase-client.js";

const status = document.querySelector("[data-admin-status]");
const content = document.querySelector("[data-admin-content]");
const denied = document.querySelector("[data-admin-denied]");
const tbody = document.querySelector("[data-student-rows]");
const empty = document.querySelector("[data-admin-empty]");
const correctAnswers = { s5q1: "false", s5q2: "false", s5q3: "true", s5q4: "true", s6q1: "true", s6q2: "true", s6q3: "true", s6q4: "false", s6q5: "false" };
const tfKeys = Object.keys(correctAnswers);

function countOpen(answers = {}) {
  return Object.values(answers).filter((answer) => String(answer).trim()).length;
}

function countDone(tf = {}) {
  return tfKeys.filter((key) => tf[key] === "true" || tf[key] === "false").length;
}

function countCorrect(tf = {}) {
  return tfKeys.filter((key) => tf[key] === correctAnswers[key]).length;
}

function cell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

function renderRows(rows) {
  tbody.replaceChildren();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const date = row.updated_at ? new Date(row.updated_at).toLocaleString("ar-EG") : "—";
    tr.append(
      cell(row.student_name || "طالب"),
      cell(String(row.user_id || "").slice(0, 8)),
      cell(`${countOpen(row.answers)} / 12`),
      cell(`${countDone(row.tf_answers)} / 9`),
      cell(`${countCorrect(row.tf_answers)} / 9`),
      cell(date)
    );
    tbody.append(tr);
  });
  empty.hidden = rows.length !== 0;
}

async function refreshRows() {
  status.textContent = "بحدّث قائمة الطلاب...";
  const { rows, error } = await loadAllStudentProgress();
  if (error) {
    status.textContent = "تعذر تحميل التقدم. تأكد من تشغيل student-progress.sql في Supabase.";
    status.dataset.type = "error";
    return;
  }
  renderRows(rows);
  status.textContent = `تم تحميل ${rows.length} طالب.`;
  status.dataset.type = "success";
}

const { user } = await loadStudentProgress();
if (!user) {
  window.location.replace("login.html");
} else if (!(await hasSchoolAdminRole(user.id))) {
  status.textContent = "الصلاحية غير مفعلة لهذا الحساب.";
  status.dataset.type = "error";
  denied.hidden = false;
} else {
  document.querySelector("[data-student-name]").textContent = user.user_metadata?.full_name || user.email?.split("@")[0] || "المدرسة";
  content.hidden = false;
  document.querySelector("[data-admin-refresh]").addEventListener("click", refreshRows);
  await refreshRows();
}
