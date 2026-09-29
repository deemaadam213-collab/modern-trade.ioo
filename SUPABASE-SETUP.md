# ربط حسابات الطلاب بـ Supabase

1. أنشئ حسابًا في [Supabase](https://supabase.com/dashboard/sign-up)، ثم أنشئ مشروعًا جديدًا.
2. من إعدادات المشروع، انسخ **Project URL** و**Publishable key** إلى `supabase-config.js`.
3. من **Authentication → URL Configuration**، اضبط **Site URL** على `https://deemaadam213-collab.github.io/modern-trade.ioo/`، وأضف الروابط التالية إلى **Redirect URLs**:
   - `https://deemaadam213-collab.github.io/modern-trade.ioo/quiz.html`
   - `https://deemaadam213-collab.github.io/modern-trade.ioo/login.html`
   - `https://deemaadam213-collab.github.io/modern-trade.ioo/reset-password.html`
4. افتح **SQL Editor → New query** في Supabase، والصق محتويات `student-progress.sql` ثم اضغط **Run** مرة واحدة. هذا ينشئ حفظ التقدم وصلاحيات الأدمن. بعده افتح استعلامًا جديدًا وشغّل `exam-system.sql` لإنشاء الامتحانات، المحاولات، ومتابعة الطلاب والدرجات.
5. التسجيل بالبريد مفعّل افتراضيًا. سيحتاج الطالب إلى تأكيد بريده الإلكتروني إذا بقي تأكيد البريد مفعّلًا.
6. صفحة الإدارة على `/admin.html`. لإنشاء أدمن المدرسة: أنشئ حسابًا عاديًا ببريد الأدمن، أكّد البريد وسجّل الدخول مرة واحدة. بعد ذلك، في **SQL Editor** شغّل جملة منح صلاحية الأدمن الموجودة في آخر `student-progress.sql` بعد وضع البريد مكان `ADMIN_EMAIL_HERE`. صلاحية إدارة الامتحانات ورؤية أسماء الطلاب ومحاولاتهم ورصد الدرجات تُمنح لهذا الحساب فقط. الإجابات الصحيحة محفوظة في جدول منفصل ولا يقرأها الطلاب.

المفتاح المسموح به في الواجهة هو **Publishable key** فقط. لا تضع `service_role` أو أي secret key في ملفات الموقع. خدمة البريد الافتراضية مخصصة للتجربة ومحدودة بعناوين فريق المشروع ورسالتين في الساعة؛ لتسجيل الطلاب ببريدهم، أعد SMTP خاصًا من إعدادات Authentication.

يُحفظ اسم الطالب مع إجاباته وتقدمه في جدول `student_progress`. صلاحيات الأدمن لا تُمنح من نموذج التسجيل، وبيانات `school_admins` غير قابلة للتعديل من الموقع. لا تضع مفتاح Supabase السري في أي ملف من ملفات الموقع.
