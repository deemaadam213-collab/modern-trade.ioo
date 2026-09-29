import { supabase } from "./supabase-client.js";

const status = document.querySelector("[data-exams-status]");
const list = document.querySelector("[data-exam-list]");

function cardText(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

if (!supabase) {
  status.textContent = "خدمة الحسابات غير مضبوطة. تواصل مع المعلم.";
} else {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    status.textContent = "سجّل الدخول أولًا لعرض الامتحانات.";
    const link = cardText("a", "تسجيل الدخول", "btn btn--primary");
    link.href = "login.html";
    list.append(link);
  } else {
    const [{ data: exams, error }, { data: attempts }] = await Promise.all([
      supabase.from("school_exams").select("id,title,description,duration_minutes,created_at")
        .eq("is_published", true).order("created_at", { ascending: false }),
      supabase.from("school_exam_attempts").select("exam_id,status,submitted_at")
        .eq("student_id", auth.user.id)
    ]);
    if (error) {
      status.textContent = "تعذر تحميل الامتحانات. تأكد من تشغيل exam-system.sql في Supabase.";
      status.dataset.type = "error";
    } else {
      const byExam = new Map((attempts || []).map((attempt) => [attempt.exam_id, attempt]));
      status.textContent = `${(exams || []).length} امتحان منشور`;
      if (!exams?.length) list.append(cardText("p", "لا توجد امتحانات منشورة حاليًا.", "admin-empty"));
      exams?.forEach((exam) => {
        const attempt = byExam.get(exam.id);
        const card = document.createElement("article"); card.className = "exam-card";
        card.append(cardText("h2", exam.title));
        if (exam.description) card.append(cardText("p", exam.description));
        card.append(cardText("p", exam.duration_minutes ? `المدة: ${exam.duration_minutes} دقيقة` : "لا يوجد مؤقت", "exam-card__meta"));
        const actions = document.createElement("div"); actions.className = "exam-card__actions";
        if (attempt?.status === "submitted") {
          actions.append(cardText("span", `تم تسليم الامتحان ${attempt.submitted_at ? "في " + new Date(attempt.submitted_at).toLocaleString("ar-EG") : ""}`, "profile-sync"));
        } else {
          const link = cardText("a", attempt ? "متابعة الامتحان" : "بدء الامتحان", "btn btn--primary");
          link.href = `take-exam.html?exam=${encodeURIComponent(exam.id)}`;
          actions.append(link);
        }
        card.append(actions); list.append(card);
      });
    }
  }
}
