# ربط حسابات الطلاب بـ Supabase

1. أنشئ حسابًا في [Supabase](https://supabase.com/dashboard/sign-up)، ثم أنشئ مشروعًا جديدًا.
2. من إعدادات المشروع، انسخ **Project URL** و**Publishable key** إلى `supabase-config.js`.
3. من **Authentication → URL Configuration**، اضبط **Site URL** على `https://domzz777.github.io/modern.io/`، وأضف الرابطين التاليين إلى **Redirect URLs**:
   - `https://domzz777.github.io/modern.io/login.html`
   - `https://domzz777.github.io/modern.io/reset-password.html`
4. افتح **SQL Editor → New query** في Supabase، والصق محتويات `student-progress.sql` ثم اضغط **Run** مرة واحدة. هذا ينشئ حفظ التقدم وصلاحيات قراءة الأدمن. كل طالب يعدّل تقدمه فقط، والأدمن المعتمد يقرأ تقدم الطلاب.
5. التسجيل بالبريد مفعّل افتراضيًا. سيحتاج الطالب إلى تأكيد بريده الإلكتروني إذا بقي تأكيد البريد مفعّلًا.
6. لإنشاء أدمن المدرسة: أنشئ حسابًا عاديًا ببريد الأدمن، أكّد البريد وسجّل الدخول مرة واحدة. بعد ذلك، في **SQL Editor** شغّل جملة منح صلاحية الأدمن الموجودة في آخر `student-progress.sql` بعد وضع البريد مكان `ADMIN_EMAIL_HERE`. رابط **إدارة المدرسة** سيظهر لهذا الحساب فقط.

المفتاح المسموح به في الواجهة هو **Publishable key** فقط. لا تضع `service_role` أو أي secret key في ملفات الموقع. خدمة البريد الافتراضية مخصصة للتجربة ومحدودة بعناوين فريق المشروع ورسالتين في الساعة؛ لتسجيل الطلاب ببريدهم، أعد SMTP خاصًا من إعدادات Authentication.

يُحفظ اسم الطالب مع إجاباته وتقدمه في جدول `student_progress`. صلاحيات الأدمن لا تُمنح من نموذج التسجيل، وبيانات `school_admins` غير قابلة للتعديل من الموقع. لا تضع مفتاح Supabase السري في أي ملف من ملفات الموقع.
