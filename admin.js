/* ECUMT 3-01 — teacher dashboard */
(function () {
  "use strict";
  var E = window.ECUMT;
  if (!E || !E.client) return;

  var listView = document.getElementById("listView");
  var reviewView = document.getElementById("reviewView");
  var statsEl = document.getElementById("stats");
  var tbody = document.getElementById("rows");
  var emptyEl = document.getElementById("emptyMsg");
  var fExam = document.getElementById("fExam");
  var fStatus = document.getElementById("fStatus");
  var fSearch = document.getElementById("fSearch");

  var all = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function finalScore(s) { return s.teacher_correct !== null ? s.teacher_correct : s.correct; }
  function nameOf(s) { return (s.profiles && s.profiles.display_name) || "—"; }

  function renderStats() {
    var students = {};
    var pending = 0;
    all.forEach(function (s) { students[s.user_id] = 1; if (!s.reviewed) pending++; });
    statsEl.textContent = "";
    [["عدد المحاولات", all.length], ["طلاب حلوا امتحانات", Object.keys(students).length], ["لسه محتاجة مراجعة", pending]]
      .forEach(function (p) {
        var c = el("div", "stat");
        c.appendChild(el("b", "stat__n", String(p[1])));
        c.appendChild(el("span", "stat__l", p[0]));
        statsEl.appendChild(c);
      });
  }

  function renderRows() {
    var q = fSearch.value.trim().toLowerCase();
    var rows = all.filter(function (s) {
      if (fExam.value && s.exam_id !== fExam.value) return false;
      if (fStatus.value === "pending" && s.reviewed) return false;
      if (fStatus.value === "reviewed" && !s.reviewed) return false;
      if (q && nameOf(s).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    tbody.textContent = "";
    emptyEl.hidden = rows.length > 0;
    rows.forEach(function (s) {
      var tr = document.createElement("tr");
      tr.appendChild(el("td", "", nameOf(s)));
      tr.appendChild(el("td", "", E.examName(s.exam_id)));
      tr.appendChild(el("td", "", s.correct + " / " + s.total));
      var fin = el("td", "", s.teacher_correct !== null ? s.teacher_correct + " / " + s.total : "—");
      tr.appendChild(fin);
      tr.appendChild(el("td", "", E.formatDate(s.created_at)));
      var st = el("td");
      st.appendChild(el("span", "pill" + (s.reviewed ? " pill--ok" : ""), s.reviewed ? "تمت المراجعة" : "بانتظار المراجعة"));
      tr.appendChild(st);
      var act = el("td");
      var b = el("button", "btn btn--ghost btn--sm", "مراجعة");
      b.type = "button";
      b.addEventListener("click", function () { openReview(s); });
      act.appendChild(b);
      tr.appendChild(act);
      tbody.appendChild(tr);
    });
  }

  function load() {
    E.client.from("submissions")
      .select("id, user_id, exam_id, total, correct, answers, reviewed, teacher_correct, teacher_marks, teacher_note, created_at, profiles(display_name, username)")
      .order("created_at", { ascending: false }).limit(500)
      .then(function (r) {
        if (r.error) {
          emptyEl.hidden = false;
          emptyEl.textContent = "مقدرناش نحمل البيانات. اتأكد إنك داخل بحساب المعلم.";
          return;
        }
        all = r.data || [];
        renderStats();
        renderRows();
      });
  }

  function openReview(s) {
    listView.hidden = true;
    reviewView.hidden = false;
    reviewView.textContent = "";
    window.scrollTo({ top: 0 });

    var answers = Array.isArray(s.answers) ? s.answers : [];
    var marks = answers.map(function (a, i) {
      return Array.isArray(s.teacher_marks) && typeof s.teacher_marks[i] === "boolean" ? s.teacher_marks[i] : !!a.ok;
    });

    var top = el("div", "review__top");
    var back = el("button", "btn btn--ghost", "رجوع للقايمة");
    back.type = "button";
    back.addEventListener("click", function () { reviewView.hidden = true; listView.hidden = false; });
    top.appendChild(back);
    reviewView.appendChild(top);

    var head = el("div", "block");
    head.appendChild(el("h2", "block__title", nameOf(s) + " — " + E.examName(s.exam_id)));
    head.appendChild(el("p", "", "اتحل بتاريخ " + E.formatDate(s.created_at) + ". التصحيح التلقائي: " + s.correct + " من " + s.total + "."));
    var scoreLine = el("p", "review__score");
    head.appendChild(scoreLine);
    reviewView.appendChild(head);

    function updateScore() {
      var n = marks.filter(Boolean).length;
      scoreLine.textContent = "الدرجة بعد مراجعتك: " + n + " / " + answers.length;
      return n;
    }

    answers.forEach(function (a, i) {
      var card = el("section", "qcard");
      var h = el("div", "qcard__head");
      h.appendChild(el("span", "qcard__n", String(i + 1)));
      h.appendChild(el("span", "qcard__kind", a.t === "mcq" ? "اختيار من متعدد" : a.t === "tf" ? "صح أو غلط" : "أكمل"));
      card.appendChild(h);
      card.appendChild(el("p", "qcard__text", a.q));
      card.appendChild(el("p", "ans__given", "إجابة الطالب: " + (a.given || "(بدون إجابة)")));
      card.appendChild(el("p", "ans__correct", "الإجابة النموذجية: " + a.correct_text));
      card.appendChild(el("p", "ans__auto", "التصحيح التلقائي: " + (a.ok ? "صحيحة" : "غير صحيحة")));

      var lab = el("label", "qopt ans__mark");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = marks[i];
      cb.addEventListener("change", function () {
        marks[i] = cb.checked;
        card.classList.toggle("is-right", cb.checked);
        card.classList.toggle("is-wrong", !cb.checked);
        updateScore();
      });
      lab.appendChild(cb);
      lab.appendChild(el("span", "qopt__text", "احسبها إجابة صحيحة"));
      card.appendChild(lab);
      card.classList.add(marks[i] ? "is-right" : "is-wrong");
      reviewView.appendChild(card);
    });

    var noteBox = el("div", "block");
    noteBox.appendChild(el("label", "auth-field", "ملاحظة للطالب (اختياري)"));
    var note = document.createElement("textarea");
    note.className = "qfill";
    note.rows = 3;
    note.value = s.teacher_note || "";
    noteBox.lastChild.appendChild(note);
    var status = el("p", "review__status");
    var save = el("button", "btn btn--primary", "حفظ المراجعة");
    save.type = "button";
    save.addEventListener("click", function () {
      var n = updateScore();
      save.disabled = true;
      status.textContent = "جاري الحفظ...";
      E.client.from("submissions").update({
        teacher_marks: marks,
        teacher_correct: n,
        teacher_note: note.value.trim() || null,
        reviewed: true,
        reviewed_at: new Date().toISOString()
      }).eq("id", s.id).then(function (r) {
        save.disabled = false;
        if (r.error) { status.textContent = "حصل خطأ في الحفظ، جرب تاني."; return; }
        s.teacher_marks = marks; s.teacher_correct = n; s.teacher_note = note.value.trim() || null; s.reviewed = true;
        status.textContent = "اتحفظت المراجعة. الطالب هيشوف الدرجة النهائية، والمتصدرين بتتحدث.";
        renderStats();
        renderRows();
      });
    });
    noteBox.appendChild(save);
    noteBox.appendChild(status);
    reviewView.appendChild(noteBox);
    updateScore();
  }

  [fExam, fStatus].forEach(function (n) { n.addEventListener("change", renderRows); });
  fSearch.addEventListener("input", renderRows);

  E.ready.then(function (s) {
    if (!s || !s.profile || s.profile.role !== "teacher") return;
    load();
  });
})();
