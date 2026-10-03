/* ECUMT 3-01 — shared UI: theme toggle + logout */
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

  document.querySelectorAll("[data-logout]").forEach(function (button) {
    button.addEventListener("click", function () {
      var go = function () { window.location.href = "login.html"; };
      if (window.ECUMT && window.ECUMT.signOut) window.ECUMT.signOut().then(go, go);
      else go();
    });
  });
})();
