import { supabase } from "./supabase-client.js";

const status = document.querySelector("[data-exam-status]");
const head = document.querySelector("[data-exam-head]");
const form = document.querySelector("[data-exam-form]");
const questionContainer = document.querySelector("[data-exam-questions]");
const examId = new URLSearchParams(location.search).get("exam");
let attempt = null;
let answers = {};
let saveTimer = 0;
let isFinished = false;

function textNode(tag, text, className) {
  const node = document.createElement(tag); node.textContent = text;
  if (className) node.className = className;
  return node;
}
function setStatus(message, type = "") { status.textContent = message; status.dataset.type = type; }

async function saveAnswers() {
  if (!attempt || isFinished) return;
  const { data, error } = await supabase.rpc("school_exam_save_attempt", {
    p_attempt: attempt.id, p_answers: answers, p_submit: false
  });
  if (error) setStatus("تعذر حفظ الإجابة؛ تحقق من الاتصال ثم حاول مرة أخرى.", "error");
  else if (data === "submitted") {
    isFinished = true;
    form.hidden = true;
    setStatus("انتهى الوقت وتم تسليم الامتحان.", "success");
  } else setStatus("إجاباتك محفوظة تلقائيًا.", "success");
}
function scheduleSave() {
  clearTimeout(saveTimer);
  setStatus("جارٍ حفظ إجابتك...");
  saveTimer = window.setTimeout(saveAnswers, 650);
}
function recordAnswer(questionId, value) {
  answers[questionId] = value;
  scheduleSave();
}

function renderQuestion(question, index) {
  const field = document.createElement("fieldset"); field.className = "exam-question";
  const title = document.createElement("legend"); title.textContent = `${index + 1}. ${question.question_text} (${question.points} درجة)`;
  field.append(title);
  if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
    const options = document.createElement("div"); options.className = "exam-options";
    (question.options || []).forEach((option, optionIndex) => {
      const label = document.createElement("label");
      const input = document.createElement("input"); input.type = "radio"; input.name = question.id;
      input.value = question.question_type === "true_false" ? (optionIndex === 0 ? "true" : "false") : option;
      input.checked = answers[question.id] === input.value;
      input.addEventListener("change", () => recordAnswer(question.id, input.value));
      label.append(input, document.createTextNode(option)); options.append(label);
    });
    field.append(options);
  } else {
    const input = question.question_type === "essay" ? document.createElement("textarea") : document.createElement("input");
    input.name = question.id;
    if (input.tagName === "INPUT") { input.type = "text"; input.maxLength = 1000; }
    else { input.rows = 5; input.maxLength = 4000; }
    input.value = answers[question.id] || "";
    input.addEventListener("input", () => recordAnswer(question.id, input.value));
    field.append(input);
  }
  return field;
}

async function finishExam(auto = false) {
  if (isFinished || !attempt) return;
  isFinished = true; clearTimeout(saveTimer);
  const { error } = await supabase.rpc("school_exam_save_attempt", {
    p_attempt: attempt.id, p_answers: answers, p_submit: true
  });
  if (error) {
    isFinished = false;
    setStatus("لم يتم تسليم الامتحان. أعد المحاولة عندما يعود الاتصال.", "error");
    return;
  }
  form.hidden = true;
  setStatus(auto ? "انتهى الوقت وتم تسليم الامتحان." : "تم تسليم الامتحان بنجاح. الدرجة تظهر بعد مراجعة المعلم.", "success");
}

if (!supabase || !examId) {
  setStatus("رابط الامتحان غير صحيح أو قاعدة البيانات غير مضبوطة.", "error");
} else {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    setStatus("سجّل الدخول أولًا لبدء الامتحان.");
    window.setTimeout(() => { location.href = "login.html"; }, 900);
  } else {
    const { data: exam, error: examError } = await supabase.from("school_exams")
      .select("id,title,description,duration_minutes,is_published").eq("id", examId).eq("is_published", true).maybeSingle();
    if (examError || !exam) setStatus("الامتحان غير متاح أو لم يعد منشورًا.", "error");
    else {
      const [{ data: questions, error: questionError }, { data: oldAttempt, error: attemptError }] = await Promise.all([
        supabase.from("school_exam_questions").select("id,question_text,question_type,options,points,order_index").eq("exam_id", exam.id).order("order_index"),
        supabase.from("school_exam_attempts").select("id,answers,status,started_at,submitted_at").eq("exam_id", exam.id).eq("student_id", auth.user.id).maybeSingle()
      ]);
      if (questionError || attemptError || !questions?.length) setStatus("تعذر فتح الامتحان. تأكد من إعداد قاعدة البيانات.", "error");
      else {
        attempt = oldAttempt;
        if (!attempt) {
          const { data: created, error: createError } = await supabase.from("school_exam_attempts").insert({
            exam_id: exam.id, student_id: auth.user.id,
            student_name: auth.user.user_metadata?.full_name || auth.user.email?.split("@")[0] || "طالب"
          }).select("id,answers,status,started_at,submitted_at").single();
          if (createError) setStatus("تعذر بدء المحاولة. ربما سبق أن بدأت هذا الامتحان.", "error");
          else attempt = created;
        }
        if (attempt) {
          answers = attempt.answers || {};
          document.querySelector("[data-exam-title]").textContent = exam.title;
          document.querySelector("[data-exam-description]").textContent = exam.description || "أجب عن الأسئلة ثم سلّم الامتحان.";
          head.hidden = false;
          if (attempt.status === "submitted") {
            setStatus("سبق أن سلّمت هذا الامتحان. الدرجة تظهر بعد مراجعة المعلم.", "success");
          } else {
            questions.forEach((question, index) => questionContainer.append(renderQuestion(question, index)));
            form.hidden = false;
            form.addEventListener("submit", async (event) => { event.preventDefault(); await finishExam(false); });
            setStatus("إجاباتك محفوظة تلقائيًا أثناء الحل.");
            if (exam.duration_minutes > 0) {
              const endAt = new Date(attempt.started_at).getTime() + exam.duration_minutes * 60000;
              const timerLabel = document.querySelector("[data-exam-timer]");
              const tick = () => {
                const remaining = Math.max(0, endAt - Date.now());
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                timerLabel.textContent = `الوقت المتبقي: ${minutes}:${String(seconds).padStart(2,"0")}`;
                if (remaining === 0) finishExam(true);
              };
              tick(); window.setInterval(tick, 1000);
            } else document.querySelector("[data-exam-timer]").textContent = "الوقت مفتوح";
          }
        }
      }
    }
  }
}
