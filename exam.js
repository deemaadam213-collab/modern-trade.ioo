/* ECUMT 3-01 — exam engine */
(function () {
  "use strict";

  var EXAMS = window.ECUMT_EXAMS || {};
  var COMP_SIZE = 25;
  var LETTERS = ["أ", "ب", "ج", "د"];

  function getBest(id) {
    try {
      var all = JSON.parse(localStorage.getItem("ecumt-exam-best") || "{}");
      return all[id] || null;
    } catch (e) { return null; }
  }

  function saveBest(id, pct) {
    try {
      var all = JSON.parse(localStorage.getItem("ecumt-exam-best") || "{}");
      if (all[id] === undefined || pct > all[id]) all[id] = pct;
      localStorage.setItem("ecumt-exam-best", JSON.stringify(all));
    } catch (e) {}
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* normalise Arabic / English text for fill-in comparison */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^\u0600-\u06FFa-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ---------- list page: show best scores ---------- */
  document.querySelectorAll("[data-best]").forEach(function (node) {
    var b = getBest(node.getAttribute("data-best"));
    node.textContent = b === null ? "لم تُحل بعد" : "أفضل نتيجة: " + b + "%";
  });

  /* ---------- exam page ---------- */
  var root = document.getElementById("examRoot");
  if (!root) return;

  var params = new URLSearchParams(location.search);
  var id = params.get("e") || "1";
  var isComp = id === "all";

  var meta, questions;
  if (isComp) {
    var pool = [];
    Object.keys(EXAMS).forEach(function (k) {
      EXAMS[k].questions.forEach(function (q) { pool.push(q); });
    });
    questions = shuffle(pool).slice(0, COMP_SIZE);
    meta = { title: "الامتحان الشامل", sub: "أسئلة عشوائية من النواتج الخمسة (" + questions.length + " سؤال)" };
  } else if (EXAMS[id]) {
    meta = EXAMS[id];
    questions = EXAMS[id].questions.slice();
  } else {
    root.appendChild(el("p", "note", "الامتحان ده مش موجود. ارجع لصفحة الامتحانات واختار امتحان."));
    return;
  }

  document.title = meta.title + " | ECUMT 3-01";
  document.getElementById("examTitle").textContent = meta.title;
  document.getElementById("examSub").textContent = meta.sub;

  var state = []; // per question: {type, getValue(), card, correct}
  var form = el("form", "exam__form");
  form.noValidate = true;

  questions.forEach(function (q, i) {
    var card = el("section", "qcard");
    var head = el("div", "qcard__head");
    head.appendChild(el("span", "qcard__n", String(i + 1)));
    var kind = q.t === "mcq" ? "اختيار من متعدد" : q.t === "tf" ? "صح أو غلط" : "أكمل";
    head.appendChild(el("span", "qcard__kind", kind));
    card.appendChild(head);
    card.appendChild(el("p", "qcard__text", q.q));

    var getValue;
    var optsWrap = el("div", "qopts");
    var name = "q" + i;

    if (q.t === "fill") {
      var inp = el("input", "qfill");
      inp.type = "text";
      inp.autocomplete = "off";
      inp.setAttribute("aria-label", "الإجابة");
      inp.placeholder = "اكتب الإجابة هنا";
      optsWrap.appendChild(inp);
      getValue = function () { return inp.value; };
      state.push({ q: q, card: card, getValue: getValue, input: inp });
    } else {
      var items;
      if (q.t === "tf") {
        items = [{ label: "صح", v: true }, { label: "غلط", v: false }];
      } else {
        items = shuffle(q.o.map(function (text, idx) { return { label: text, v: idx }; }));
      }
      var radios = [];
      items.forEach(function (it, k) {
        var lab = el("label", "qopt");
        var r = document.createElement("input");
        r.type = "radio";
        r.name = name;
        radios.push({ node: r, v: it.v, lab: lab });
        lab.appendChild(r);
        if (q.t === "mcq") lab.appendChild(el("span", "qopt__key", LETTERS[k]));
        lab.appendChild(el("span", "qopt__text", it.label));
        optsWrap.appendChild(lab);
      });
      getValue = function () {
        for (var n = 0; n < radios.length; n++) if (radios[n].node.checked) return { v: radios[n].v };
        return null;
      };
      state.push({ q: q, card: card, getValue: getValue, radios: radios });
    }

    card.appendChild(optsWrap);
    form.appendChild(card);
  });

  var submit = el("button", "btn btn--primary exam__submit", "إنهاء وعرض النتيجة");
  submit.type = "submit";
  form.appendChild(submit);
  root.appendChild(form);

  var resultBox = document.getElementById("examResult");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var unanswered = 0;
    state.forEach(function (s) {
      var v = s.getValue();
      var empty = s.q.t === "fill" ? !String(v).trim() : v === null;
      if (empty) unanswered++;
    });
    if (unanswered > 0 && !window.confirm("لسه فيه " + unanswered + " سؤال من غير إجابة. تحب تنهي الامتحان كده؟")) return;

    var score = 0;
    var record = [];
    state.forEach(function (s) {
      var q = s.q, v = s.getValue(), ok = false, correctText = "", givenText = "";

      if (q.t === "mcq") {
        ok = v !== null && v.v === q.a;
        correctText = q.o[q.a];
        givenText = v === null ? "" : q.o[v.v];
      } else if (q.t === "tf") {
        ok = v !== null && v.v === q.a;
        correctText = q.a ? "صح" : "غلط";
        givenText = v === null ? "" : (v.v ? "صح" : "غلط");
      } else {
        var given = norm(v);
        ok = q.a.some(function (a) { return norm(a) === given && given !== ""; });
        correctText = q.a[0];
        givenText = String(v).trim();
      }

      record.push({ q: q.q, t: q.t, given: givenText, correct_text: correctText, ok: ok });
      if (ok) score++;
      s.card.classList.add(ok ? "is-right" : "is-wrong");

      if (s.radios) {
        s.radios.forEach(function (r) {
          r.node.disabled = true;
          var isCorrect = q.t === "mcq" ? r.v === q.a : r.v === q.a;
          if (isCorrect) r.lab.classList.add("is-correct");
          else if (r.node.checked) r.lab.classList.add("is-picked-wrong");
        });
      } else {
        s.input.disabled = true;
      }

      var fb = el("p", "qfb");
      fb.appendChild(el("strong", "", ok ? "إجابة صحيحة" : "إجابة غير صحيحة"));
      if (!ok) fb.appendChild(document.createTextNode(" — الإجابة الصحيحة: " + correctText));
      s.card.appendChild(fb);
    });

    var total = state.length;
    var pct = Math.round((score / total) * 100);
    saveBest(isComp ? "all" : id, pct);

    var msg = pct >= 90 ? "ممتاز! مستواك عالي جداً." :
              pct >= 70 ? "كويس جداً، راجع الأسئلة الغلط وهتبقى تمام." :
              pct >= 50 ? "مقبول، محتاج مراجعة للملخص وحاول تاني." :
                          "محتاج تذاكر الملخص تاني وتعيد الامتحان.";

    resultBox.textContent = "";
    resultBox.appendChild(el("p", "result__score", score + " / " + total));
    resultBox.appendChild(el("p", "result__pct", pct + "%"));
    resultBox.appendChild(el("p", "result__msg", msg));
    var saveMsg = el("p", "result__msg", "جاري حفظ النتيجة...");
    resultBox.appendChild(saveMsg);

    if (window.ECUMT && window.ECUMT.saveSubmission) {
      window.ECUMT.saveSubmission({
        exam_id: isComp ? "all" : id,
        total: total,
        correct: score,
        answers: record
      }).then(function () {
        saveMsg.textContent = "اتحفظت نتيجتك (" + score + " نقطة). المعلم ممكن يراجعها ويعدلها.";
      }, function () {
        saveMsg.textContent = "معرفناش نحفظ النتيجة، اتأكد إنك مسجل دخول وإن النت شغال.";
      });
    } else {
      saveMsg.textContent = "";
    }

    var actions = el("div", "result__actions");
    var again = el("a", "btn btn--primary", "إعادة الامتحان");
    again.href = location.pathname + location.search;
    again.addEventListener("click", function (ev) { ev.preventDefault(); location.reload(); });
    actions.appendChild(again);
    var back = el("a", "btn btn--ghost", "كل الامتحانات");
    back.href = "exams.html";
    actions.appendChild(back);
    if (!isComp) {
      var rev = el("a", "btn btn--ghost", "راجع الملخص");
      rev.href = "outcome-" + id + ".html";
      actions.appendChild(rev);
    }
    resultBox.appendChild(actions);

    resultBox.hidden = false;
    submit.hidden = true;
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
