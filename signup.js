(function () {
  "use strict";
  var E = window.ECUMT;
  var form = document.getElementById("signupForm");
  var error = document.getElementById("signupError");
  var btn = form.querySelector("button[type=submit]");

  function fail(msg, el) {
    error.textContent = msg;
    error.hidden = false;
    btn.disabled = false;
    if (el) el.focus();
  }

  if (!E.client) fail("الموقع لسه مش متوصل بقاعدة البيانات. راجع ملف config.js.");
  else E.ready.then(function (s) { if (s) location.replace("index.html"); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    error.hidden = true;
    if (!E.client) return fail("الموقع لسه مش متوصل بقاعدة البيانات.");

    var userEl = document.getElementById("signupUser");
    var passEl = document.getElementById("signupPass");
    var pass2El = document.getElementById("signupPass2");
    var u = userEl.value.trim();
    var p = passEl.value;

    if (u.length < 2) return fail("اكتب اسم مستخدم من حرفين على الأقل.", userEl);
    if (u.indexOf("@") !== -1) return fail("اسم المستخدم مينفعش يحتوي على @.", userEl);
    if (p.length < 6) return fail("الباسورد لازم يكون 6 حروف على الأقل.", passEl);
    if (p !== pass2El.value) return fail("الباسوردين مش متطابقين، راجعهم.", pass2El);

    btn.disabled = true;
    E.client.auth.signUp({ email: E.toEmail(u), password: p }).then(function (r) {
      if (r.error) {
        // DEBUG: اطبع تفاصيل الخطأ الحقيقي في الـ Console عشان نشوف السبب الفعلي
        console.error("SUPABASE SIGNUP ERROR:", r.error.status, r.error.message, r.error);

        if (/registered|exists/i.test(r.error.message)) return fail("اليوزرنيم ده موجود قبل كده، اختار غيره.", userEl);
        // مؤقتًا: اعرض رسالة Supabase الحقيقية بدل الرسالة العامة، عشان نعرف السبب بالظبط
        return fail("معرفناش نعمل الحساب: " + r.error.message, userEl);
      }
      if (!r.data.session) return fail("الحساب اتعمل بس محتاج تأكيد. المعلم لازم يقفل Confirm email من إعدادات Supabase.");
      return E.client.from("profiles").insert({ id: r.data.user.id, username: u.toLowerCase(), display_name: u })
        .then(function (pr) {
          if (pr.error) {
            console.error("SUPABASE PROFILE INSERT ERROR:", pr.error.code, pr.error.message, pr.error);
            return E.client.auth.signOut().then(function () {
              fail(pr.error.code === "23505" ? "اليوزرنيم ده موجود قبل كده، اختار غيره." : "معرفناش نكمل إنشاء الحساب: " + pr.error.message, userEl);
            });
          }
          location.href = "index.html";
        });
    }, function (err) {
      console.error("SUPABASE NETWORK ERROR:", err);
      fail("حصلت مشكلة في الاتصال، جرب تاني.");
    });
  });
})();
