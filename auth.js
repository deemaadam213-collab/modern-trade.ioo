/* ECUMT 3-01 — local-only mode. No accounts, network, or database. */
(function () {
  "use strict";

  var STORAGE_KEY = "ecumt-local-submissions-v1";
  var uid = "this-device";
  var profile = { id: uid, uid: uid, username: "طالب", display_name: "طالب على هذا الجهاز", role: "student" };
  var E = window.ECUMT = { configured: true, app: null, auth: null, db: null };

  E.ready = Promise.resolve({ user: { uid: uid }, profile: profile });
  E.normalizeUsername = function (value) { return String(value || "").trim(); };
  E.validUsername = function () { return false; };
  E.examName = function (id) {
    var n = { "1": "الأول", "2": "الثاني", "3": "الثالث", "4": "الرابع", "5": "الخامس" };
    return id === "all" ? "الامتحان الشامل" : "امتحان الناتج " + (n[id] || id);
  };
  E.formatDate = function (value) {
    try { return new Date(value).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" }); }
    catch (e) { return String(value || ""); }
  };
  E.banner = function (message) {
    var box = document.createElement("p");
    box.className = "auth-message";
    box.style.cssText = "margin:12px auto;text-align:center;max-width:760px";
    box.textContent = message;
    document.body.insertBefore(box, document.body.firstChild);
  };
  E.getProfile = function () { return Promise.resolve(profile); };
  E.signOut = function () { return Promise.resolve(); };

  function readRows() {
    try {
      var rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch (e) { return []; }
  }

  E.saveSubmission = function (row) {
    var rows = readRows();
    var saved = {
      id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      user_id: uid,
      display_name: profile.display_name,
      exam_id: String(row.exam_id),
      total: Number(row.total) || 0,
      correct: Number(row.correct) || 0,
      answers: Array.isArray(row.answers) ? row.answers : [],
      reviewed: false,
      teacher_correct: null,
      teacher_marks: null,
      teacher_note: null,
      reviewed_at: null,
      created_at: new Date().toISOString()
    };
    rows.push(saved);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(-300)));
      return Promise.resolve(saved);
    } catch (e) { return Promise.reject(new Error("local-storage-unavailable")); }
  };

  E.getUserSubmissions = function () {
    return Promise.resolve(readRows().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); }).slice(0, 15));
  };

  E.weeklyLeaderboard = function (weeksAgo) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - (Math.max(0, Number(weeksAgo) || 0) * 7));
    var end = new Date(start.getTime() + 7 * 86400000);
    var best = {};
    readRows().forEach(function (row) {
      var date = new Date(row.created_at);
      if (date < start || date >= end) return;
      var points = row.teacher_correct !== null ? Number(row.teacher_correct) : Number(row.correct);
      var key = row.exam_id;
      if (!best[key] || points > best[key]) best[key] = points;
    });
    var exams = Object.keys(best);
    if (!exams.length) return Promise.resolve([]);
    var total = exams.reduce(function (sum, key) { return sum + best[key]; }, 0);
    return Promise.resolve([{ display_name: profile.display_name, points: total, exams: exams.length, is_me: true }]);
  };

  E.listSubmissionsForTeacher = function () { return Promise.resolve([]); };
  E.updateSubmission = function () { return Promise.reject(new Error("teacher-review-unavailable-without-database")); };

})();
