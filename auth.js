import { supabase } from "./supabase-client.js";

const form = document.querySelector("[data-auth-form]");
const updateForm = document.querySelector("[data-password-update]");
const message = document.querySelector("[data-auth-message]");
const submitButton = form?.querySelector('button[type="submit"]') || updateForm?.querySelector('button[type="submit"]');
const resetButton = document.querySelector("[data-password-reset]");

const messages = {
  "Invalid login credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "User already registered": "هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول.",
  "Password should be at least 6 characters": "كلمة المرور يجب ألا تقل عن 6 أحرف.",
  "Email not confirmed": "أكد بريدك الإلكتروني من الرسالة التي وصلتك، ثم سجّل الدخول.",
  "Failed to fetch": "تعذّر الاتصال بالخدمة. تحقّق من الإنترنت وإعدادات المشروع."
};

function showMessage(text, type = "error") {
  if (!message) return;
  message.textContent = text;
  message.dataset.type = type;
  message.hidden = false;
}

if (!supabase) {
  showMessage("التسجيل يحتاج ربط الموقع بمشروع Supabase. راجع SUPABASE-SETUP.md ثم ضع رابط المشروع والمفتاح العام في supabase-config.js.");
  if (submitButton) submitButton.disabled = true;
  if (resetButton) resetButton.disabled = true;
} else {
  const client = supabase;

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    message.hidden = true;
    submitButton.disabled = true;
    try {
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      if (form.dataset.mode === "signup") {
        const name = form.elements.name.value.trim();
        if (!name) throw new Error("اكتب اسمك الكامل.");
        if (password !== form.elements.confirmPassword.value) {
          throw new Error("كلمتا المرور غير متطابقتين.");
        }
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: new URL("login.html", window.location.href).href
          }
        });
        if (error) throw error;
        if (!data.session) {
          showMessage("تم إنشاء الحساب. افتح رسالة التأكيد في بريدك، ثم ارجع وسجّل الدخول.", "success");
          return;
        }
        showMessage("تم إنشاء حسابك. جاري فتح الموقع…", "success");
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showMessage("تم تسجيل الدخول. جاري فتح الموقع…", "success");
      }
      window.setTimeout(() => { window.location.href = "index.html"; }, 800);
    } catch (error) {
      showMessage(messages[error.message] || error.message || "لم نتمكن من إتمام العملية.");
    } finally {
      submitButton.disabled = false;
    }
  });

  resetButton?.addEventListener("click", async () => {
    const email = form.elements.email.value.trim();
    if (!email) {
      showMessage("اكتب بريدك الإلكتروني أولًا لإرسال رابط إعادة تعيين كلمة المرور.");
      form.elements.email.focus();
      return;
    }
    try {
      const redirectTo = new URL("reset-password.html", window.location.href).href;
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      showMessage("أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.", "success");
    } catch (error) {
      showMessage(messages[error.message] || "تعذّر إرسال رابط إعادة التعيين.");
    }
  });

  updateForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!updateForm.reportValidity()) return;
    submitButton.disabled = true;
    try {
      const password = updateForm.elements.password.value;
      if (password !== updateForm.elements.confirmPassword.value) {
        throw new Error("كلمتا المرور غير متطابقتين.");
      }
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      showMessage("تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.", "success");
      window.setTimeout(() => { window.location.href = "login.html"; }, 1000);
    } catch (error) {
      showMessage(messages[error.message] || error.message || "تعذّر تغيير كلمة المرور.");
    } finally {
      submitButton.disabled = false;
    }
  });
}
