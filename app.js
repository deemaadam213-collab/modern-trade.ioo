/* ECUMT 3-01 — shared UI: theme toggle */
(function () {
  "use strict";

  var root = document.documentElement;

  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("ecumt-theme", next); } catch (e) {}
    });
  }
})();
