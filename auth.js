/* ECUMT 3-01 — Supabase client, session, helpers */
(function () {
  "use strict";

  var cfg = window.ECUMT_CONFIG || {};
  var configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf("YOUR_") === -1 && cfg.SUPABASE_ANON_KEY.indexOf("YOUR_") === -1);

  var client = null;
  if (configured && window.supabase) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { storageKey: "ecumt-auth", persistSession: true, autoRefreshToken: true }
    });
  }

  var E = window.ECUMT = { client: client, configured: !!client };

  /* usernames can be Arabic, so they are encoded into a safe email address */
  E.toEmail = function (input) {
    var v = String(input || "").trim().toLowerCase();
    if (v.indexOf("@") !== -1) return v;
    var bytes = new TextEncoder().encode(v), hex = "";
    for (var i = 0; i < bytes.length; i++) hex += ("0" + bytes[i].toString(16)).slice(-2);
    return "u" + hex + "@students.ecumt.app";
  };

  E.examName = function (id) {
    var n = { "1": "الأول", "2": "الثاني", "3": "الثالث", "4": "الرابع", "5": "الخامس" };
    return id === "all" ? "الامتحان الشامل" : "امتحان الناتج " + (n[id] || id);
  };

  E.formatDate = function (iso) {
    try {
      return new Date(iso).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" });
    } catch (e) { return iso; }
  };

  E.banner = function (msg) {
    var b = document.createElement("p");
    b.className = "auth-message";
    b.style.cssText = "margin:0;border-radius:0;text-align:center;";
    b.textContent = msg;
    document.body.insertBefore(b, document.body.firstChild);
  };

  E.getProfile = function (uid) {
    return client.from("profiles").select("id, username, display_name, role").eq("id", uid).maybeSingle()
      .then(function (r) { return r.data || null; });
  };

  E.ready = (function () {
    if (!client) return Promise.resolve(null);
    return client.auth.getSession().then(function (r) {
      var session = r.data && r.data.session;
      if (!session) { try { localStorage.removeItem("ecumt-auth"); } catch (e) {} return null; }
      return E.getProfile(session.user.id).then(function (profile) {
        return { user: session.user, profile: profile };
      });
    }).catch(function () { return null; });
  })();

  E.signOut = function () {
    var done = function () { try { localStorage.removeItem("ecumt-auth"); } catch (e) {} };
    if (!client) { done(); return Promise.resolve(); }
    return client.auth.signOut().then(done, done);
  };

  E.saveSubmission = function (row) {
    if (!client) return Promise.reject(new Error("not configured"));
    return client.from("submissions").insert(row).then(function (r) {
      if (r.error) throw r.error;
    });
  };

  /* page guards */
  var mode = document.body && document.body.getAttribute("data-auth");
  if (mode) {
    if (!client) {
      E.banner("الموقع لسه مش متوصل بقاعدة البيانات. راجع ملف config.js.");
    } else {
      E.ready.then(function (s) {
        if (!s) { location.replace("login.html"); return; }
        if (mode === "teacher" && (!s.profile || s.profile.role !== "teacher")) { location.replace("index.html"); return; }
        if (s.profile && s.profile.role === "teacher") {
          var nav = document.querySelector(".nav");
          if (nav && !nav.querySelector('[href="admin.html"]')) {
            var a = document.createElement("a");
            a.className = "nav__link" + (mode === "teacher" ? " is-active" : "");
            a.href = "admin.html";
            a.textContent = "لوحة المعلم";
            nav.appendChild(a);
          }
        }
      });
    }
  }
})();
