import { hasSchoolAdminRole, loadStudentProgress, supabase } from "./supabase-client.js";

const status = document.querySelector("[data-admin-status]");
const content = document.querySelector("[data-admin-content]");
const denied = document.querySelector("[data-admin-denied]");
const questionList = document.querySelector("[data-question-list]");
const questionTemplate = document.querySelector("[data-question-template]");
const examList = document.querySelector("[data-exam-list]");
const monitorSelect = document.querySelector("[data-monitor-exam]");
const attemptRows = document.querySelector("[data-attempt-rows]");
const attemptEmpty = document.querySelector("[data-attempt-empty]");
const attemptDetail = document.querySelector("[data-attempt-detail]");
let allExams = [];
let selectedExamId = "";
let realtimeChannel = null;

const say = (message, type = "") => {
  status.textContent = message;
  status.dataset.type = type;
};
const stamp = (value) => value ? new Date(value).toLocaleString("ar-EG") : "—";
const cell = (value) => { const node = document.createElement("td"); node.textContent = value; return node; };

function setQuestionType(fieldset) {
  const type = fieldset.querySelector("[data-question-type]").value;
  const optionsWrap = fieldset.querySelector("[data-question-options-wrap]");
  const answerWrap = fieldset.querySelector("[data-question-answer-wrap]");
  const optionsInput = fieldset.querySelector("[data-question-options]");
  const answerInput = fieldset.querySelector("[data-question-answer]");
  const objective = type === "multiple_choice" || type === "true_false";
  optionsWrap.hidden = !objective;
  answerWrap.hidden = !objective;
  optionsInput.required = type === "multiple_choice";
  answerInput.required = objective;
  optionsInput.readOnly = type === "true_false";
  if (type === "true_false") {
    optionsInput.value = "صح\nخطأ";
    answerInput.placeholder = "اكتب صح أو خطأ";
  } else if (type === "multiple_choice") {
    if (optionsInput.value === "صح\nخطأ") optionsInput.value = "";
    answerInput.placeholder = "اكتب نص الاختيار الصحيح";
  } else {
    optionsInput.value = "";
    answerInput.value = "";
  }
}

function addQuestion() {
  const fragment = questionTemplate.content.cloneNode(true);
  const fieldset = fragment.querySelector(".admin-question");
  fieldset.querySelector("[data-question-type]").addEventListener("change", () => setQuestionType(fieldset));
  fieldset.querySelector("[data-remove-question]").addEventListener("click", () => {
    if (questionList.children.length > 1) fieldset.remove();
    else say("لازم تضيف سؤالًا واحدًا على الأقل.", "error");
  });
  questionList.append(fragment);
}

function collectQuestions() {
  return Array.from(questionList.querySelectorAll(".admin-question")).map((fieldset) => {
    const type = fieldset.querySelector("[data-question-type]").value;
    const optionsText = fieldset.querySelector("[data-question-options]").value;
    const options = type === "multiple_choice"
      ? optionsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      : type === "true_false" ? ["صح", "خطأ"] : [];
    let correctAnswer = fieldset.querySelector("[data-question-answer]").value.trim();
    if (type === "true_false") {
      const normalized = correctAnswer.toLowerCase();
      correctAnswer = ["صح", "true"].includes(normalized) ? "true" : ["خطأ", "خطا", "false"].includes(normalized) ? "false" : "";
    }
    if (type === "multiple_choice" && !options.includes(correctAnswer)) {
      throw new Error("اكتب الإجابة الصحيحة بنفس نص أحد الاختيارات.");
    }
    if (type === "multiple_choice" && options.length < 2) throw new Error("سؤال الاختيار من متعدد يحتاج اختيارين على الأقل.");
    if ((type === "multiple_choice" || type === "true_false") && !correctAnswer) throw new Error("حدد الإجابة الصحيحة لكل سؤال موضوعي.");
    return {
      text: fieldset.querySelector("[data-question-text]").value.trim(),
      type,
      points: Number(fieldset.querySelector("[data-question-points]").value),
      options,
      correct_answer: correctAnswer
    };
  });
}

async function loadExams() {
  const { data, error } = await supabase.from("school_exams")
    .select("id,title,description,duration_minutes,is_published,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  allExams = data || [];
  renderExams();
}

function renderExams() {
  examList.replaceChildren();
  monitorSelect.replaceChildren(new Option("اختر امتحانًا", ""));
  allExams.forEach((exam) => {
    const card = document.createElement("article");
    card.className = "admin-exam-card";
    const title = document.createElement("strong");
    title.textContent = exam.title;
    const meta = document.createElement("span");
    meta.textContent = `${exam.is_published ? "منشور" : "مسودة"} · ${exam.duration_minutes ? `${exam.duration_minutes} دقيقة` : "بلا مؤقت"} · ${stamp(exam.created_at)}`;
    const monitorButton = document.createElement("button");
    monitorButton.className = "btn btn--ghost";
    monitorButton.type = "button";
    monitorButton.textContent = "متابعة الطلاب";
    monitorButton.addEventListener("click", () => {
      document.querySelector('[data-admin-tab="monitor"]').click();
      monitorSelect.value = exam.id;
      monitorSelect.dispatchEvent(new Event("change"));
    });
    card.append(title, meta, monitorButton);
    examList.append(card);
    monitorSelect.add(new Option(`${exam.title}${exam.is_published ? "" : " (مسودة)"}`, exam.id));
  });
  if (!allExams.length) examList.textContent = "لم تنشئ امتحانات بعد.";
  if (selectedExamId && allExams.some((exam) => exam.id === selectedExamId)) monitorSelect.value = selectedExamId;
}

async function refreshAttempts() {
  if (!selectedExamId) {
    attemptRows.replaceChildren();
    attemptDetail.hidden = true;
    attemptEmpty.hidden = false;
    return;
  }
  const [{ data: attempts, error }, { data: questions, error: qError }] = await Promise.all([
    supabase.from("school_exam_attempts").select("id,student_id,student_name,status,answers,started_at,submitted_at,updated_at")
      .eq("exam_id", selectedExamId).order("updated_at", { ascending: false }),
    supabase.from("school_exam_questions").select("id,question_text,question_type,points,order_index")
      .eq("exam_id", selectedExamId).order("order_index")
  ]);
  if (error || qError) {
    say("تعذر تحميل محاولات الامتحان. شغّل ملف exam-system.sql في Supabase.", "error");
    return;
  }
  const rows = attempts || [];
  const ids = rows.map((row) => row.id);
  let grades = [];
  if (ids.length) {
    const result = await supabase.from("school_exam_grades").select("attempt_id,score,feedback,graded_at").in("attempt_id", ids);
    if (result.error) { say("تعذر تحميل الدرجات المحفوظة.", "error"); return; }
    grades = result.data || [];
  }
  const gradeByAttempt = new Map(grades.map((grade) => [grade.attempt_id, grade]));
  const totalQuestions = (questions || []).length;
  attemptRows.replaceChildren();
  rows.forEach((attempt) => {
    const answered = (questions || []).filter((question) => String(attempt.answers?.[question.id] ?? "").trim()).length;
    const grade = gradeByAttempt.get(attempt.id);
    const tr = document.createElement("tr");
    tr.append(cell(attempt.student_name || "طالب"), cell(attempt.status === "submitted" ? "سلّم الامتحان" : "يمتحن الآن"),
      cell(`${answered} / ${totalQuestions}`), cell(stamp(attempt.started_at)), cell(stamp(attempt.updated_at)),
      cell(grade ? `${grade.score} درجة` : "لم تُرصد"));
    const action = document.createElement("td");
    const view = document.createElement("button");
    view.type = "button"; view.className = "btn btn--ghost"; view.textContent = "الإجابات / الدرجة";
    view.addEventListener("click", () => renderAttemptDetail(attempt, questions || [], grade));
    action.append(view); tr.append(action); attemptRows.append(tr);
  });
  attemptEmpty.hidden = rows.length !== 0;
  say(`متابعة ${allExams.find((item) => item.id === selectedExamId)?.title || "الامتحان"}: ${rows.length} طالب بدأوا الامتحان.`, "success");
}

function renderAttemptDetail(attempt, questions, grade) {
  attemptDetail.replaceChildren();
  attemptDetail.hidden = false;
  const heading = document.createElement("h3"); heading.textContent = `إجابات ${attempt.student_name || "الطالب"}`;
  attemptDetail.append(heading);
  const list = document.createElement("ol"); list.className = "admin-answer-list";
  let maximum = 0;
  questions.forEach((question) => {
    maximum += Number(question.points || 0);
    const item = document.createElement("li");
    const prompt = document.createElement("strong"); prompt.textContent = `${question.question_text} (${question.points} درجة)`;
    const answer = document.createElement("p"); answer.textContent = String(attempt.answers?.[question.id] || "لم يُجب");
    item.append(prompt, answer); list.append(item);
  });
  attemptDetail.append(list);
  const form = document.createElement("form"); form.className = "admin-grade-form";
  form.innerHTML = '<label class="auth-field">الدرجة النهائية<input name="score" type="number" min="0" step="0.25" required /></label><label class="auth-field">ملاحظة للطالب<textarea name="feedback" rows="2" maxlength="2000"></textarea></label><button class="btn btn--primary" type="submit">حفظ الدرجة</button>';
  form.elements.score.max = String(maximum);
  form.elements.score.value = grade ? String(grade.score) : "";
  form.elements.feedback.value = grade?.feedback || "";
  const maxNote = document.createElement("p"); maxNote.className = "admin-max-grade"; maxNote.textContent = `الدرجة النهائية من ${maximum}`;
  form.prepend(maxNote);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]"); button.disabled = true;
    const { error } = await supabase.rpc("school_exam_save_grade", {
      p_attempt: attempt.id, p_score: Number(form.elements.score.value), p_feedback: form.elements.feedback.value.trim()
    });
    button.disabled = false;
    if (error) { say("تعذر حفظ الدرجة. تأكد أنها لا تتجاوز الدرجة النهائية.", "error"); return; }
    say(`تم حفظ درجة ${attempt.student_name || "الطالب"}.`, "success");
    await refreshAttempts();
    const updated = await supabase.from("school_exam_grades").select("attempt_id,score,feedback,graded_at").eq("attempt_id", attempt.id).maybeSingle();
    renderAttemptDetail(attempt, questions, updated.data || null);
  });
  attemptDetail.append(form);
}

async function selectExam() {
  selectedExamId = monitorSelect.value;
  attemptDetail.hidden = true;
  if (realtimeChannel) await supabase.removeChannel(realtimeChannel);
  if (selectedExamId) {
    realtimeChannel = supabase.channel(`school-exam-${selectedExamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "school_exam_attempts", filter: `exam_id=eq.${selectedExamId}` }, () => refreshAttempts())
      .subscribe();
  }
  await refreshAttempts();
}

document.querySelectorAll("[data-admin-tab]").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    const active = button === tab; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => { panel.hidden = panel.dataset.adminPanel !== tab.dataset.adminTab; });
}));
document.querySelector("[data-add-question]").addEventListener("click", addQuestion);
document.querySelector("[data-monitor-refresh]").addEventListener("click", refreshAttempts);
monitorSelect.addEventListener("change", selectExam);
document.querySelector("[data-exam-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = form.querySelector("button[type=submit]"); button.disabled = true;
  try {
    const questions = collectQuestions();
    const publishNow = form.elements.published.checked;
    const { data, error } = await supabase.rpc("school_exam_create", {
      p_title: form.elements.title.value.trim(), p_description: form.elements.description.value.trim(),
      p_duration: Number(form.elements.duration.value), p_publish: publishNow, p_questions: questions
    });
    if (error) throw error;
    form.reset(); questionList.replaceChildren(); addQuestion();
    await loadExams();
    say(publishNow ? "تم إنشاء الامتحان ونشره." : "تم حفظ الامتحان كمسودة.", "success");
    if (data) { monitorSelect.value = data; await selectExam(); }
  } catch (error) {
    say(error.message?.includes("school_exam_create") ? "قاعدة بيانات الامتحانات تحتاج تشغيل exam-system.sql في Supabase." : error.message || "تعذر حفظ الامتحان.", "error");
  } finally { button.disabled = false; }
});

document.querySelector("[data-logout]")?.addEventListener("click", async (event) => {
  event.currentTarget.disabled = true;
  if (supabase) await supabase.auth.signOut();
  window.location.replace("index.html");
});

addQuestion();
const { user } = await loadStudentProgress();
if (!user) {
  window.location.replace("login.html");
} else if (!(await hasSchoolAdminRole(user.id))) {
  say("الصلاحية غير مفعلة لهذا الحساب.", "error"); denied.hidden = false;
} else {
  document.querySelector("[data-student-name]").textContent = user.user_metadata?.full_name || user.email?.split("@")[0] || "المدرسة";
  content.hidden = false;
  try { await loadExams(); }
  catch (error) { say("تعذر تحميل البيانات. تأكد من إعداد قاعدة البيانات ومنح صلاحية الأدمن.", "error"); }
  window.setInterval(() => { if (selectedExamId && !document.hidden) refreshAttempts(); }, 10000);
}
