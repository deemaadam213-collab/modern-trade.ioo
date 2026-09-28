/* ECUMT 3-01 — shared UI: theme, language, quiz interactions */
import { hasSchoolAdminRole, loadStudentProgress, saveStudentProgress, signOutStudent } from "./supabase-client.js";

(async function () {
  "use strict";

  var I18N = {
    ar: {
      brand_title: "المفاهيم الأساسية لبيئة التجارة الحديثة",
      nav_outcomes: "النواتج",
      nav_quiz: "التقييم الذاتي",
      nav_login: "دخول",
      nav_signup: "حساب طالب",
      footer_made: 'صُنع بواسطة <span class="footer__name">آدم محمد</span>',
      footer_super: "تحت إشراف ميس نسمة، ميس يارا وميس نرمين",
      hero_chip: "وحدة دراسية — الصف الأول / فني تجارة حديثة",
      hero_title: "المفاهيم الأساسية لبيئة التجارة الحديثة",
      hero_sub: "نواتج التعلم من الجدارة ECUMT 3-01 — اقرأ كل ناتج ومتطلبات الدليل والإثبات الخاصة به، ثم اختبر نفسك في صفحة التقييم الذاتي.",
      hero_cta1: "استعرض النواتج",
      hero_cta2: "حل التقييمات الذاتية",
      out_kicker: "نواتج التعلم",
      out_title: "نواتج التعلم في الوحدة",
      out_lede: "لكل ناتج: العنوان الرئيسي ثم «متطلبات الدليل والإثبات» التي توضح ما يُتوقع منك معرفته وتطبيقه.",
      req_title: "متطلبات الدليل والإثبات",
      req_title2: "متطلبات الدليل والإثبات",
      req_title3: "متطلبات الدليل والإثبات",
      o1_title: "يتعرف على تقسيمات قطاع التجارة الحديثة",
      o1_r1: "يتعرَّف على مختلف القطاعات الفرعية ضمن صناعة البيع بالتجارة الحديثة وفقًا لمفهوم الهياكل التنظيمية في المؤسسات.",
      o1_r2: "يُطابق القطاعات الفرعية بما يناسب منظومة العمل في قطاع التجارة الحديثة.",
      o1_r3: "يتعرف على الأقسام الوظيفية التشغيلية المختلفة في متجر البيع بالتجارة الحديثة جنبًا إلى جنب مع الغرض الرئيسي من كل منها.",
      o1_r4: "يتعرَّف على الإدارات الداعمة ووظائفها طبقًا لمفهوم الهياكل التنظيمية في المؤسسات والقواعد الأساسية بالعمل بالمتجر.",
      o1_r5: "يتعرَّف على أصحاب المصلحة بالمؤسسة وفقًا لآليات التعامل بهذه الصناعة.",
      o2_title: "يحدد طبيعة السوق المستهدف للمتجر",
      o2_r1: "يصف أنواع العملاء وفقًا لأساسيات التعريف بالعميل وعادات الشراء.",
      o2_r2: "يتعرف على أنماط التسوق الاستهلاكية بالتجارة الحديثة وفقًا لتحليل أنماط التسوق وخصائص المتسوِّقين.",
      o2_r3: "يتعرف على السوق المستهدف للمتجر وفقًا لشريحة سوق المؤسسة.",
      o2_r4: "يلمّ بالسوق المستهدف وفقًا لاستراتيجية التسويق الخاصة بالمؤسسة.",
      o3_title: "ينفذ عملية متابعة تدفُّق المخزون والمبيعات من خلال عمليات التجارة الحديثة",
      o3_r1: "يستعلم عن تدفق المخزون من خلال البرامج المتخصصة.",
      o3_r2: "يتعرف على تأثير الوظيفة على الآخرين في المؤسسة من حيث الأنظمة الأساسية والأنظمة الفرعية.",
      quiz_chip: "6 تقييمات ذاتية — من كتيّب التقويمات 2026",
      quiz_title: "التقييمات الذاتية",
      quiz_sub: "اكتب إجابتك في مكان الحل أسفل كل سؤال، وحفظك تلقائي في المتصفح. أسئلة صح وخطأ تعطيك نتيجة فورية.",
      meter_open: "الأسئلة المفتوحة المُجابة",
      print_btn: "طباعة إجاباتي",
      g1_title: "التقييم الذاتي الأول",
      g2_title: "التقييم الذاتي الثاني",
      g3_title: "التقييم الذاتي الثالث",
      g4_title: "التقييم الذاتي الرابع",
      g5_title: "التقييم الذاتي الخامس",
      g6_title: "التقييم الذاتي السادس",
      g_open: "أسئلة مفتوحة",
      g_tf: "ضع علامة صح أو خطأ",
      q1: "1) ما معنى التجارة الحديثة؟",
      q2: "2) اذكر تقسيمات الشركات التجارية؟",
      q3: "3) اذكر أنواع تجارة التجزئة وفقًا لطبيعة المتجر؟",
      q4: "1) وضّح أهمية تشكيل الهيكل الوظيفي؟",
      q5: "2) من هم أصحاب المصلحة في تجارة التجزئة؟ اذكر ثلاثة منهم؟",
      q6: "1) من هم العملاء الأوفياء؟",
      q7: "2) ما أثر الاهتمام بالعملاء الأوفياء والتواصل معهم والاستماع إلى ملاحظاتهم؟",
      q8: "3) قارن بين شرائح العملاء؟",
      q9: "4) كيف يمكن التعامل مع العميل الثرثار والعميل المتشكك؟",
      q10: "1) اكتب ما تعرفه عن عناصر البيع السبعة 7Ps؟",
      q11: "2) اذكر تأثير عناصر البيع الأربعة على التسويق للمنظومة؟",
      q12: "3) اذكر تأثير الموظف في زيادة البيع وخفض قيمة المشتريات؟",
      s5q1: "1) هيئة سلامة الغذاء هي الجهة المسؤولة عن تحصيل الضرائب الواجب سدادها.",
      s5q2: "2) لا يحتاج متجر بيع التجزئة إلى الحصول على التراخيص أو التسجيل القانوني.",
      s5q3: "3) تهدف قوانين حماية المستهلك إلى حماية حقوق المستهلكين وتضمن المنافسة التجارية العادلة.",
      s5q4: "4) تهدف تعليمات سلامة الغذاء إلى حماية المستهلك من الإصابة بالأمراض المنقولة بواسطة الغذاء أو الإصابة بالتسمم الغذائي.",
      s6q1: "1) تُعتبر العناصر المؤثرة في الربحية: المبيعات والمشتريات والهالك.",
      s6q2: "2) يتم حساب متوسط المخزون عن طريق جمع قيم المخزون لكل شهر ثم قسمتها على عدد تلك الشهور.",
      s6q3: "3) التكاليف المتغيرة هي تكلفة العمالة أو المواد أو النفقات العامة التي تتغير وفقًا للتغير في حجم وحدات الإنتاج.",
      s6q4: "4) يُعرَّف الانكماش بأنه مقدار الزيادة في المنتجات المجردة.",
      s6q5: "5) صافي الربح = المبيعات − المشتريات فقط.",
      btn_true: "صح",
      btn_false: "خطأ",
      ph_answer: "اكتب إجابتك هنا...",
      fb_ok: "إجابة صحيحة، أحسنت!",
      fb_bad_true: "إجابة خاطئة — الإجابة الصحيحة: صح.",
      fb_bad_false: "إجابة خاطئة — الإجابة الصحيحة: خطأ.",
      score_label: "نتيجتك في هذا التقييم:",
      print_h1: "إجاباتي — التقييمات الذاتية ECUMT 3-01",
      print_open: "الأسئلة المفتوحة",
      print_tf: "أسئلة صح وخطأ",
      print_empty: "(لم تُكتب إجابة بعد)",
      print_your: "إجابتك:",
      print_result: "نتيجتك:"
    },
    en: {
      brand_title: "Basic Concepts of the Modern Commerce Environment",
      nav_outcomes: "Outcomes",
      nav_quiz: "Self-assessment",
      nav_login: "Student login",
      nav_signup: "Student account",
      footer_made: 'Made by <span class="footer__name">Adam Mohamed</span>',
      footer_super: "Under the supervision of Ms. Nesma, Ms. Yara & Ms. Nermin",
      hero_chip: "Study unit — Grade 1 / Modern Commerce Technician",
      hero_title: "Basic Concepts of the Modern Commerce Environment",
      hero_sub: "The learning outcomes of unit ECUMT 3-01 — read each outcome with its evidence requirements, then test yourself on the self-assessment page.",
      hero_cta1: "Browse the outcomes",
      hero_cta2: "Solve the self-assessments",
      out_kicker: "Learning outcomes",
      out_title: "The unit's learning outcomes",
      out_lede: "Each outcome shows its main title followed by the evidence requirements — what you are expected to know and apply.",
      req_title: "Evidence requirements",
      req_title2: "Evidence requirements",
      req_title3: "Evidence requirements",
      o1_title: "Recognizes the divisions of the modern commerce sector",
      o1_r1: "Identifies the different sub-sectors within the modern commerce retail industry according to the concept of organizational structures in institutions.",
      o1_r2: "Matches sub-sectors to the work system of the modern commerce sector.",
      o1_r3: "Recognizes the different operational departments of a modern commerce store together with the main purpose of each.",
      o1_r4: "Recognizes supporting departments and their functions according to organizational structures and basic in-store work rules.",
      o1_r5: "Recognizes the stakeholders of the institution according to the dealing mechanisms of this industry.",
      o2_title: "Determines the nature of the store's target market",
      o2_r1: "Describes customer types according to the basics of identifying customers and their buying habits.",
      o2_r2: "Recognizes consumer shopping patterns in modern commerce through analyzing shopping patterns and shopper characteristics.",
      o2_r3: "Recognizes the store's target market according to the organization's market segment.",
      o2_r4: "Reviews the target market according to the organization's marketing strategy.",
      o3_title: "Tracks the flow of inventory and sales through modern commerce operations",
      o3_r1: "Queries inventory flow through specialized software.",
      o3_r2: "Recognizes the effect of each function on others in the organization in terms of core systems and subsystems.",
      quiz_chip: "6 self-assessments — from the 2026 assessment booklet",
      quiz_title: "Self-Assessments",
      quiz_sub: "Write your answer in the answer space under each question; your work is saved automatically in the browser. True/False questions give instant feedback.",
      meter_open: "Open questions answered",
      print_btn: "Print my answers",
      g1_title: "Self-Assessment 1",
      g2_title: "Self-Assessment 2",
      g3_title: "Self-Assessment 3",
      g4_title: "Self-Assessment 4",
      g5_title: "Self-Assessment 5",
      g6_title: "Self-Assessment 6",
      g_open: "Open questions",
      g_tf: "True or False",
      q1: "1) What is the meaning of modern commerce?",
      q2: "2) State the classifications of commercial companies.",
      q3: "3) State the types of retail trade according to the nature of the store.",
      q4: "1) Explain the importance of forming the functional structure.",
      q5: "2) Who are the stakeholders in retail trade? Mention three of them.",
      q6: "1) Who are the loyal customers?",
      q7: "2) What is the effect of caring for loyal customers, communicating with them, and listening to their feedback?",
      q8: "3) Compare between customer segments.",
      q9: "4) How can you deal with the talkative customer and the skeptical customer?",
      q10: "1) Write what you know about the seven selling elements (7Ps).",
      q11: "2) State the effect of the four selling elements on marketing the system.",
      q12: "3) State the effect of the employee on increasing sales and reducing the value of purchases.",
      s5q1: "1) The Food Safety Authority is the body responsible for collecting due taxes.",
      s5q2: "2) A retail store does not need to obtain licenses or legal registration.",
      s5q3: "3) Consumer protection laws aim to protect consumers' rights and ensure fair commercial competition.",
      s5q4: "4) Food safety instructions aim to protect consumers from foodborne diseases and food poisoning.",
      s6q1: "1) The elements affecting profitability are: sales, purchases, and spoilage.",
      s6q2: "2) Average inventory is calculated by adding the inventory values of each month then dividing by the number of those months.",
      s6q3: "3) Variable costs are the cost of labor, materials, or overheads that change according to the change in production unit volume.",
      s6q4: "4) Shrinkage is defined as the amount of increase in inventoried products.",
      s6q5: "5) Net profit = Sales − Purchases only.",
      btn_true: "True",
      btn_false: "False",
      ph_answer: "Write your answer here...",
      fb_ok: "Correct answer, well done!",
      fb_bad_true: "Wrong answer — the correct answer is: True.",
      fb_bad_false: "Wrong answer — the correct answer is: False.",
      score_label: "Your score in this assessment:",
      print_h1: "My Answers — ECUMT 3-01 Self-Assessments",
      print_open: "Open questions",
      print_tf: "True/False questions",
      print_empty: "(no answer written yet)",
      print_your: "Your answer:",
      print_result: "Your result:"
    }
  };

  var root = document.documentElement;
  var lang = root.getAttribute("lang") === "en" ? "en" : "ar";

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.ar[key] || key;
  }

  function applyLang() {
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var val = t(key);
      if (key === "footer_made") el.innerHTML = val;
      else el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    var langBtn = document.getElementById("langBtn");
    if (langBtn) langBtn.textContent = lang === "ar" ? "EN" : "عربي";
    try { localStorage.setItem("ecumt-lang", lang); } catch (e) {}
    updateMeter();
    refreshTfTexts();
  }

  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("ecumt-theme", next); } catch (e) {}
    });
  }

  var langBtn = document.getElementById("langBtn");
  if (langBtn) {
    langBtn.addEventListener("click", function () {
      lang = lang === "ar" ? "en" : "ar";
      applyLang();
    });
  }

  /* ---------- open-question persistence ---------- */
  var studentState = await loadStudentProgress();
  var student = studentState.user;
  var studentSuffix = student ? ":" + student.id : "";
  var STORE_KEY = "ecumt-answers" + studentSuffix;
  var TF_KEY = "ecumt-tf" + studentSuffix;
  var store = {};
  try { store = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { store = {}; }
  store = Object.assign({}, store, studentState.answers || {});

  if (student) {
    var studentName = student.user_metadata?.full_name || student.email?.split("@")[0] || "طالب";
    document.querySelectorAll("[data-student-name]").forEach(function (el) { el.textContent = studentName; });
    document.querySelectorAll("[data-account-nav], [data-logout]").forEach(function (el) { el.hidden = false; });
    document.querySelectorAll("[data-guest-nav]").forEach(function (el) { el.hidden = true; });
    if (await hasSchoolAdminRole(student.id)) {
      document.querySelectorAll("[data-admin-nav]").forEach(function (el) { el.hidden = false; });
    }
  }

  function persistProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
    try { localStorage.setItem(TF_KEY, JSON.stringify(tfStore)); } catch (e) {}
    if (!student) return;
    window.clearTimeout(persistProgress.timer);
    persistProgress.timer = window.setTimeout(function () {
      saveStudentProgress(store, tfStore).then(function (result) {
        if (result.error) console.warn("تعذرت مزامنة تقدم الطالب مع Supabase:", result.error.message || result.error);
      });
    }, 700);
  }

  document.querySelectorAll("[data-logout]").forEach(function (button) {
    button.addEventListener("click", async function () {
      button.disabled = true;
      await signOutStudent();
      window.location.href = "index.html";
    });
  });

  var inputs = Array.prototype.slice.call(document.querySelectorAll("[data-store]"));
  var meterFill = document.getElementById("openFill");
  var openCount = document.getElementById("openCount");

  function updateMeter() {
    if (!meterFill || !openCount) return;
    var total = inputs.length;
    var done = inputs.filter(function (el) { return el.value.trim().length > 0; }).length;
    openCount.textContent = done + "/" + total;
    meterFill.style.width = total ? (done / total * 100) + "%" : "0%";
  }

  inputs.forEach(function (el) {
    var id = el.getAttribute("data-store");
    if (store[id]) el.value = store[id];
    el.addEventListener("input", function () {
      if (el.value.trim().length > 0) store[id] = el.value;
      else delete store[id];
      persistProgress();
      updateMeter();
    });
  });

  /* ---------- true / false ---------- */
  var tfStore = {};
  try { tfStore = JSON.parse(localStorage.getItem(TF_KEY) || "{}"); } catch (e) { tfStore = {}; }
  tfStore = Object.assign({}, tfStore, studentState.tfAnswers || {});

  function tfStatus(block) {
    var correct = block.getAttribute("data-answer") === "true";
    return { correct: correct, expected: correct ? "true" : "false" };
  }

  function scoreGroups() {
    [5, 6].forEach(function (g) {
      var scoreEl = document.querySelector('[data-score-for="' + g + '"]');
      if (!scoreEl) return;
      var blocks = Array.prototype.slice.call(
        document.querySelectorAll('.group:nth-of-type(' + g + ') .tf')
      );
      var done = 0, ok = 0;
      blocks.forEach(function (b) {
        var id = b.getAttribute("data-tf");
        if (tfStore[id]) {
          done++;
          if (tfStore[id] === b.getAttribute("data-answer")) ok++;
        }
      });
      scoreEl.textContent = done === 0 ? "" : t("score_label") + " " + ok + "/" + blocks.length;
    });
  }

  function refreshTfTexts() {
    document.querySelectorAll(".tf").forEach(function (block) {
      var id = block.getAttribute("data-tf");
      var fb = block.querySelector(".tf__fb");
      var picked = tfStore[id];
      if (!picked) {
        if (fb) { fb.textContent = ""; fb.className = "tf__fb"; }
        return;
      }
      var correct = block.getAttribute("data-answer") === "true";
      var okPick = picked === block.getAttribute("data-answer");
      if (fb) {
        fb.textContent = okPick ? t("fb_ok") : (correct ? t("fb_bad_true") : t("fb_bad_false"));
        fb.className = "tf__fb " + (okPick ? "ok" : "bad");
      }
    });
    scoreGroups();
  }

  document.querySelectorAll(".tf").forEach(function (block) {
    var id = block.getAttribute("data-tf");
    block.querySelectorAll(".tf__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var picked = btn.getAttribute("data-val");
        tfStore[id] = picked;
        persistProgress();
        block.classList.add("is-done");
        var okPick = picked === block.getAttribute("data-answer");
        block.querySelectorAll(".tf__btn").forEach(function (b) {
          b.classList.remove("is-picked-ok", "is-picked-bad");
          if (b === btn) b.classList.add(okPick ? "is-picked-ok" : "is-picked-bad");
        });
        refreshTfTexts();
      });
    });
    if (tfStore[id]) {
      block.classList.add("is-done");
      var okPick2 = tfStore[id] === block.getAttribute("data-answer");
      block.querySelectorAll(".tf__btn").forEach(function (b) {
        if (b.getAttribute("data-val") === tfStore[id]) {
          b.classList.add(okPick2 ? "is-picked-ok" : "is-picked-bad");
        }
      });
    }
  });
  refreshTfTexts();

  /* ---------- print ---------- */
  var printBtn = document.getElementById("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      var area = document.getElementById("printArea");
      var html = "<h1>" + t("print_h1") + "</h1>";
      html += "<h2>" + t("print_open") + "</h2>";
      inputs.forEach(function (el) {
        var id = el.getAttribute("data-store");
        var qEl = document.querySelector('.q[data-q="' + id + '"] .q__text');
        var qText = qEl ? qEl.textContent : id;
        var ans = el.value.trim() || t("print_empty");
        html += "<h3>" + esc(qText) + "</h3>";
        html += "<p><strong>" + t("print_your") + "</strong></p>";
        html += '<div class="ans">' + esc(ans) + "</div>";
      });
      html += "<h2>" + t("print_tf") + "</h2>";
      document.querySelectorAll(".tf").forEach(function (block) {
        var id = block.getAttribute("data-tf");
        var qEl = block.querySelector(".tf__text");
        var qText = qEl ? qEl.textContent : id;
        var picked = tfStore[id];
        var correct = block.getAttribute("data-answer") === "true";
        var result = "";
        if (!picked) result = t("print_empty");
        else {
          var okPick = picked === block.getAttribute("data-answer");
          result = (picked === "true" ? t("btn_true") : t("btn_false")) +
            " — " + (okPick ? t("fb_ok") : (correct ? t("fb_bad_true") : t("fb_bad_false")));
        }
        html += "<h3>" + esc(qText) + "</h3>";
        html += "<p><strong>" + t("print_result") + "</strong> " + esc(result) + "</p>";
      });
      area.innerHTML = html;
      window.print();
    });
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  updateMeter();
  applyLang();
})();
