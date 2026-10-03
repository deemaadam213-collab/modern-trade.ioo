/* ECUMT 3-01 — weekly leaderboard + my attempts */
(function () {
  "use strict";
  var E = window.ECUMT;
  var boardEl = document.getElementById("board");
  var meEl = document.getElementById("meCard");
  var tabs = document.querySelectorAll("[data-week]");
  var attemptsEl = document.getElementById("attempts");
  if (!E || !E.client) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function renderBoard(rows, weeksAgo) {
    boardEl.textContent = "";
    meEl.textContent = "";
    if (!rows.length) {
      boardEl.appendChild(el("p", "note", weeksAgo === 0
        ? "لسه محدش حل امتحان الأسبوع ده. كن أول واحد في القايمة!"
        : "مفيش نتايج في الأسبوع اللي فات."));
      return;
    }
    var mine = null;
    rows.forEach(function (r, i) {
      var row = el("li", "lb__row" + (i < 3 ? " lb__row--top" + (i + 1) : "") + (r.is_me ? " is-me" : ""));
      row.appendChild(el("span", "lb__rank", String(i + 1)));
      var who = el("span", "lb__name", r.display_name);
      if (r.is_me) who.appendChild(el("small", "lb__you", "أنت"));
      row.appendChild(who);
      row.appendChild(el("span", "lb__exams", r.exams + (r.exams === 1 ? " امتحان" : " امتحانات")));
      var pts = el("span", "lb__pts");
      pts.appendChild(el("b", "", String(r.points)));
      pts.appendChild(document.createTextNode(" نقطة"));
      row.appendChild(pts);
      boardEl.appendChild(row);
      if (r.is_me) mine = { rank: i + 1, points: r.points };
    });
    if (mine) {
      meEl.appendChild(el("p", "me__line", "ترتيبك: " + mine.rank + " — " + mine.points + " نقطة"));
    } else if (weeksAgo === 0) {
      meEl.appendChild(el("p", "me__line", "لسه معملتش امتحان الأسبوع ده. حل امتحان وهتظهر في القايمة."));
    }
  }

  function load(weeksAgo) {
    boardEl.textContent = "";
    boardEl.appendChild(el("p", "note", "جاري التحميل..."));
    E.client.rpc("weekly_leaderboard", { weeks_ago: weeksAgo }).then(function (r) {
      if (r.error) {
        boardEl.textContent = "";
        boardEl.appendChild(el("p", "note", "مقدرناش نحمل القايمة. اتأكد إنك مسجل دخول."));
        return;
      }
      renderBoard(r.data || [], weeksAgo);
    });
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.classList.remove("is-active"); x.setAttribute("aria-pressed", "false"); });
      t.classList.add("is-active");
      t.setAttribute("aria-pressed", "true");
      load(parseInt(t.getAttribute("data-week"), 10));
    });
  });

  function loadAttempts(uid) {
    E.client.from("submissions")
      .select("id, exam_id, total, correct, teacher_correct, reviewed, created_at")
      .eq("user_id", uid).order("created_at", { ascending: false }).limit(15)
      .then(function (r) {
        attemptsEl.textContent = "";
        if (r.error || !r.data || !r.data.length) {
          attemptsEl.appendChild(el("p", "note", "لسه معملتش أي محاولة."));
          return;
        }
        r.data.forEach(function (s) {
          var final = s.teacher_correct !== null ? s.teacher_correct : s.correct;
          var row = el("li", "att__row");
          row.appendChild(el("span", "att__name", E.examName(s.exam_id)));
          row.appendChild(el("span", "att__score", final + " / " + s.total));
          row.appendChild(el("span", "att__state" + (s.reviewed ? " is-reviewed" : ""), s.reviewed ? "راجعها المعلم" : "تصحيح تلقائي"));
          row.appendChild(el("span", "att__date", E.formatDate(s.created_at)));
          attemptsEl.appendChild(row);
        });
      });
  }

  E.ready.then(function (s) {
    if (!s) return;
    load(0);
    loadAttempts(s.user.id);
  });
})();
