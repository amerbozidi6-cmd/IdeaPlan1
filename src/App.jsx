import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  LayoutDashboard, CalendarDays, Kanban, Lightbulb, LayoutTemplate, BarChart3,
  Search, Plus, Moon, Sun, X, ChevronRight, ChevronLeft, Sparkles, MoreVertical,
  Clock, CheckCircle2, Circle, PenLine, Video, Film, Send, Tag as TagIcon,
  Filter, ArrowRight, Trash2, Menu, Camera, PlaySquare, Share2, Music2,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

/* ============================== DATA MODEL ============================== */

const STATUSES = [
  { key: "idea", label: "فكرة" },
  { key: "script", label: "سكريبت" },
  { key: "filming", label: "تصوير" },
  { key: "editing", label: "مونتاج" },
  { key: "ready", label: "جاهز للنشر" },
  { key: "published", label: "منشور" },
];
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]));

const TYPES = [
  "ريلز", "تيك توك", "يوتيوب", "كاروسيل", "ستوري",
  "تعليمي", "ترويجي", "قصة شخصية", "شهادة عميل", "خلف الكواليس",
];

const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: Camera },
  { key: "tiktok", label: "TikTok", icon: Music2 },
  { key: "youtube", label: "YouTube", icon: PlaySquare },
  { key: "facebook", label: "Facebook", icon: Share2 },
];
const PLATFORM_LABEL = Object.fromEntries(PLATFORMS.map((p) => [p.key, p.label]));

const TAGS = [
  "تعليم", "مبيعات", "سرد قصصي", "خبرة ومرجعية",
  "تفاعل", "علامة شخصية", "منتج", "مشكلة/حل",
];

const TEMPLATES = [
  { key: "problem-solution", title: "مشكلة ← حل", desc: "اعرض مشكلة يعرفها جمهورك جيدًا ثم قدّم الحل عبر منتجك أو خبرتك.", structure: ["اذكر المشكلة التي يعاني منها الجمهور", "بيّن سبب استمرار المشكلة رغم المحاولات", "قدّم الحل خطوة بخطوة", "ادعُهم لتجربة الحل"] },
  { key: "hook-value-cta", title: "هوك ← قيمة ← CTA", desc: "افتتاحية قوية خلال 3 ثوانٍ، ثم قيمة حقيقية، ثم دعوة واضحة للفعل.", structure: ["اكتب جملة افتتاحية توقف السكرول", "قدّم 2-3 نقاط قيمة عملية", "اختم بدعوة فعل واحدة وواضحة"] },
  { key: "myth-truth", title: "خرافة ← حقيقة", desc: "فنّد معتقدًا شائعًا خاطئًا في مجالك وقدّم الحقيقة بدليل.", structure: ["اذكر الخرافة الشائعة كما يقولها الناس", "اشرح لماذا هي خاطئة", "قدّم الحقيقة مدعومة بمثال"] },
  { key: "story-lesson", title: "قصة ← عبرة", desc: "قصة شخصية قصيرة تنتهي بدرس عملي يطبّقه المشاهد.", structure: ["ابدأ بموقف واقعي حدث معك", "اشرح التحدي الذي واجهته", "اختم بالدرس المستفاد"] },
  { key: "before-after", title: "قبل ← بعد", desc: "قارن بين حالة قبل استخدام فكرتك أو منتجك وحالة بعدها.", structure: ["صف الوضع قبل", "صف التحول أو الإجراء", "صف النتيجة بعد"] },
  { key: "3-mistakes", title: "3 أخطاء شائعة", desc: "اذكر ثلاثة أخطاء يقع فيها الجمهور وكيفية تجنبها.", structure: ["الخطأ الأول ولماذا يحدث", "الخطأ الثاني ولماذا يحدث", "الخطأ الثالث ولماذا يحدث", "البديل الصحيح لكل خطأ"] },
  { key: "5-tips", title: "5 نصائح سريعة", desc: "محتوى تعليمي مضغوط بخمس نقاط قابلة للتطبيق فورًا.", structure: ["النصيحة 1", "النصيحة 2", "النصيحة 3", "النصيحة 4", "النصيحة 5"] },
  { key: "case-study", title: "دراسة حالة", desc: "قصة نجاح مبنية على أرقام ونتائج حقيقية.", structure: ["التحدي الذي بدأنا منه", "الإجراء الذي اتخذناه", "النتيجة بالأرقام"] },
];

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------------------------------------------------------------
   طبقة الحفظ التلقائي — تعمل تلقائيًا مع أي بيئة تشغيل للموقع:
   1) داخل تطبيق سطح المكتب (Electron)   → حفظ في ملف على الجهاز
   2) داخل معاينة Claude.ai للـ Artifact → حفظ عبر window.storage (بيانات المحادثة)
   3) على أي متصفح عادي (بعد رفع الموقع) → حفظ في localStorage الخاص بالمتصفح
   لا حاجة لأي إعداد يدوي؛ يتم اكتشاف البيئة المناسبة تلقائيًا.
--------------------------------------------------------------------- */
const STORAGE_KEY = "content-planner-data";

function getStorageAdapter() {
  if (typeof window === "undefined") return null;

  if (window.contentPlannerAPI) {
    return {
      kind: "electron",
      badge: "بياناتك تُحفظ على جهازك أولًا بأول",
      load: () => window.contentPlannerAPI.loadData(),
      save: (data) => window.contentPlannerAPI.saveData(data),
      saveSync: (data) => window.contentPlannerAPI.saveDataSync(data),
    };
  }

  if (window.storage && typeof window.storage.get === "function") {
    return {
      kind: "artifact",
      badge: "بياناتك تُحفظ تلقائيًا في هذه المحادثة",
      load: async () => {
        try {
          const res = await window.storage.get(STORAGE_KEY, false);
          return res ? JSON.parse(res.value) : null;
        } catch (e) { return null; }
      },
      save: async (data) => {
        try { await window.storage.set(STORAGE_KEY, JSON.stringify(data), false); } catch (e) { /* تجاهل */ }
      },
      saveSync: (data) => {
        try { window.storage.set(STORAGE_KEY, JSON.stringify(data), false); } catch (e) { /* تجاهل */ }
      },
    };
  }

  try {
    if (window.localStorage) {
      window.localStorage.setItem("__cp_probe__", "1");
      window.localStorage.removeItem("__cp_probe__");
      return {
        kind: "browser",
        badge: "بياناتك تُحفظ تلقائيًا في متصفحك",
        load: async () => {
          try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
          } catch (e) { return null; }
        },
        save: async (data) => {
          try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* تجاهل */ }
        },
        saveSync: (data) => {
          try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* تجاهل */ }
        },
      };
    }
  } catch (e) {
    return null; // المتصفح يمنع التخزين المحلي (مثل بعض أوضاع التصفح الخاص)
  }
  return null;
}

const initialItems = [
  { id: uid(), title: "3 أخطاء تقتل تفاعل الريلز عندك", hook: "لو ريلزاتك ما توصل، غالبًا وقعت في أحد هالأخطاء", idea: "نشرح 3 أخطاء شائعة تقلل نسبة الوصول وكيفية تجنبها.", script: "افتتاحية: سؤال مباشر للمشاهد...\nنقطة 1: بطء الهوك\nنقطة 2: جودة الصوت\nنقطة 3: عدم وجود CTA واضح\nخاتمة: لخّص وادعُ للمتابعة", cta: "احفظ الفيديو وجرّب التعديل على أول فيديو قادم", platform: "instagram", type: "تعليمي", status: "published", date: "2026-09-02", tags: ["تعليم", "خبرة ومرجعية"], notes: "أداء ممتاز، نسبة مشاهدة كاملة عالية." },
  { id: uid(), title: "يوم كامل خلف كواليس التصوير", hook: "جربت أصور 5 فيديوهات في يوم واحد... هذا اللي صار", idea: "محتوى ترفيهي يعرض يوم تصوير حقيقي مع تحديات الإنتاج.", script: "", cta: "شاركنا يومك في التعليقات", platform: "tiktok", type: "خلف الكواليس", status: "editing", date: "2026-09-05", tags: ["علامة شخصية"], notes: "" },
  { id: uid(), title: "خرافة: لازم كاميرا غالية عشان تبدأ", hook: "توقف عن الحجة هذي عشانك ما تبدأ بالمحتوى", idea: "نفنّد خرافة أن جودة المعدات هي العائق الحقيقي.", script: "خرافة: بدون كاميرا احترافية ما تصير مبدع محتوى\nحقيقة: أغلب أشهر الفيديوهات صُوّرت بالموبايل\nمثال: ...", cta: "ابدأ اليوم بأي جهاز عندك", platform: "youtube", type: "تعليمي", status: "ready", date: "2026-09-08", tags: ["تعليم", "مشكلة/حل"], notes: "" },
  { id: uid(), title: "قصة أول مشروع فشل قبل ما ينجح", hook: "خسرت 4000 دولار قبل ما أفهم هالدرس", idea: "قصة شخصية عن فشل أول مشروع تجاري والدرس المستفاد.", script: "البداية: كيف بدأ المشروع\nالتحدي: القرار الخاطئ\nالنتيجة: الخسارة\nالدرس: ...", cta: "شارك أكبر درس تعلمته من فشل سابق", platform: "instagram", type: "قصة شخصية", status: "filming", date: "2026-09-10", tags: ["سرد قصصي", "علامة شخصية"], notes: "يحتاج مكان تصوير هادئ" },
  { id: uid(), title: "قبل وبعد: تنظيم جدول المحتوى", hook: "من الفوضى إلى خطة شهر كامل في 10 دقائق", idea: "عرض تحويل جدول محتوى فوضوي إلى خطة منظمة باستخدام قالب واضح.", script: "", cta: "حمّل القالب من البايو", platform: "instagram", type: "كاروسيل", status: "script", date: "2026-09-12", tags: ["تعليم", "منتج"], notes: "" },
  { id: uid(), title: "شهادة عميل: نتائج بعد شهر واحد", hook: "هذا اللي صار لعميلنا بعد شهر من التنفيذ", idea: "عرض شهادة عميل حقيقية مع أرقام قبل وبعد.", script: "مقدمة عن العميل\nالتحدي\nالحل المقدَّم\nالنتيجة بالأرقام", cta: "احجز استشارتك المجانية", platform: "facebook", type: "شهادة عميل", status: "idea", date: "2026-09-14", tags: ["مبيعات", "خبرة ومرجعية"], notes: "" },
  { id: uid(), title: "5 نصائح لكتابة هوك يوقف السكرول", hook: "أول 3 ثواني تحدد مصير الفيديو كامل", idea: "نصائح عملية وسريعة لكتابة هوك قوي.", script: "نصيحة 1: ابدأ بسؤال\nنصيحة 2: استخدم رقم\nنصيحة 3: تناقض\nنصيحة 4: نتيجة مباشرة\nنصيحة 5: صوت أو حركة قوية", cta: "جرّب واحدة منهم بفيديوك القادم", platform: "tiktok", type: "تعليمي", status: "published", date: "2026-09-01", tags: ["تعليم"], notes: "" },
  { id: uid(), title: "دراسة حالة: كيف ضاعفنا المتابعين", hook: "من 2 آلاف إلى 40 ألف متابع في 90 يوم", idea: "تفاصيل استراتيجية النمو المستخدمة مع أرقام حقيقية.", script: "", cta: "احفظ الفيديو ورجعله وقت التخطيط", platform: "youtube", type: "تعليمي", status: "idea", date: "2026-09-17", tags: ["خبرة ومرجعية", "مبيعات"], notes: "" },
  { id: uid(), title: "خلف الكواليس: تجهيز مساحة التصوير", hook: "هذا ركني للتصوير بأقل من 300 ريال", idea: "جولة سريعة على إعداد ركن تصوير بسيط واقتصادي.", script: "", cta: "شاركنا ركن التصوير عندك", platform: "instagram", type: "خلف الكواليس", status: "ready", date: "2026-09-19", tags: ["علامة شخصية"], notes: "" },
  { id: uid(), title: "مشكلة: المحتوى يوصل بس ما يبيع", idea: "نشرح الفجوة بين الوصول والمبيعات وكيف نسدّها بمحتوى ترويجي متوازن.", hook: "وصولك عالي ومبيعاتك صفر؟ فيه سبب واحد", script: "المشكلة: تفاعل بدون تحويل\nالسبب: غياب مسار واضح للعميل\nالحل: 3 خطوات لتوازن المحتوى", cta: "خطط لأسبوعك القادم على هذا الأساس", platform: "facebook", type: "ترويجي", status: "editing", date: "2026-09-21", tags: ["مبيعات", "مشكلة/حل"], notes: "" },
  { id: uid(), title: "ستوري تفاعلي: سؤال وجواب سريع", hook: "اسألوني أي شي عن بداية المحتوى", idea: "جلسة أسئلة وأجوبة سريعة عبر الستوري لتعزيز التفاعل.", script: "", cta: "اضغط على الملصق وشاركنا سؤالك", platform: "instagram", type: "ستوري", status: "idea", date: "2026-09-23", tags: ["تفاعل"], notes: "" },
  { id: uid(), title: "كاروسيل: خطة محتوى شهر كامل بخطوة واحدة", hook: "خطّط لشهرك كامل بجلسة عمل واحدة", idea: "شرائح توضح طريقة تجميع أفكار الشهر دفعة واحدة.", script: "", cta: "احفظ الكاروسيل كمرجع شهري", platform: "instagram", type: "كاروسيل", status: "script", date: "2026-09-25", tags: ["تعليم", "منتج"], notes: "" },
  { id: uid(), title: "ترويجي: عرض خاص لعملاء هذا الشهر", hook: "آخر 5 مقاعد بسعر الإطلاق", idea: "محتوى ترويجي مباشر لعرض محدود مع مهلة زمنية واضحة.", script: "", cta: "احجز مقعدك من الرابط في البايو", platform: "tiktok", type: "ترويجي", status: "idea", date: "2026-09-27", tags: ["مبيعات"], notes: "" },
  { id: uid(), title: "قصة: أول فيديو انتشر بالصدفة", hook: "ما توقعت هالفيديو يوصل نص مليون مشاهدة", idea: "قصة شخصية عن أول فيديو حقق انتشارًا واسعًا وما تعلمته منه.", script: "", cta: "شاركنا أول فيديو انتشر لك", platform: "youtube", type: "قصة شخصية", status: "idea", date: "2026-09-29", tags: ["سرد قصصي", "علامة شخصية"], notes: "" },
  // Idea Bank — بدون تاريخ منشور بعد
  { id: uid(), title: "خرافة: النشر اليومي إجباري للنجاح", hook: "", idea: "نفنّد فكرة أن النشر اليومي شرط أساسي للنمو، وأن الجودة والاتساق أهم.", script: "", cta: "", platform: "instagram", type: "تعليمي", status: "idea", date: null, tags: ["تعليم"], notes: "يحتاج بحث عن أمثلة حسابات ناجحة بنشر أقل" },
  { id: uid(), title: "3 أخطاء في السكريبت تفقد المشاهد", hook: "", idea: "أخطاء شائعة عند كتابة السكريبت تخلي المشاهد يطلع بدري.", script: "", cta: "", platform: "tiktok", type: "تعليمي", status: "idea", date: null, tags: ["تعليم"], notes: "" },
  { id: uid(), title: "قبل وبعد: تصميم البروفايل", hook: "", idea: "تحويل بروفايل غير منظم إلى واجهة احترافية تجذب المتابع الجديد.", script: "", cta: "", platform: "instagram", type: "كاروسيل", status: "idea", date: null, tags: ["علامة شخصية"], notes: "" },
  { id: uid(), title: "دراسة حالة عميل ثانٍ", hook: "", idea: "قصة عميل آخر حقق نتيجة مختلفة — يحتاج تفاصيل أرقام منه.", script: "", cta: "", platform: "youtube", type: "شهادة عميل", status: "idea", date: null, tags: ["مبيعات"], notes: "بانتظار موافقة العميل على النشر" },
  { id: uid(), title: "خلف الكواليس: يوم تسجيل بودكاست", hook: "", idea: "لقطات من يوم تسجيل حلقة بودكاست مع فريق العمل.", script: "", cta: "", platform: "instagram", type: "خلف الكواليس", status: "idea", date: null, tags: ["علامة شخصية"], notes: "" },
  { id: uid(), title: "5 أدوات تسهّل تخطيط المحتوى", hook: "", idea: "أدوات مجانية ومدفوعة تساعد في تنظيم فكرة المحتوى وجدولته.", script: "", cta: "", platform: "youtube", type: "تعليمي", status: "idea", date: null, tags: ["تعليم", "منتج"], notes: "" },
];

/* ============================== HELPERS ============================== */

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const WEEKDAYS_AR = ["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

function pad(n) { return String(n).padStart(2, "0"); }
function toISO(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

function buildMonthGrid(year, monthIdx) {
  const firstDay = new Date(year, monthIdx, 1);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ============================== SMALL UI PIECES ============================== */

function Chip({ children, tone = "neutral", size = "sm", active = false, onClick }) {
  const toneClass = {
    neutral: "chip-neutral",
    amber: "chip-amber",
    teal: "chip-teal",
    rose: "chip-rose",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${toneClass} ${size === "xs" ? "chip-xs" : ""} ${active ? "chip-active" : ""}`}
    >
      {children}
    </button>
  );
}

function StatusDot({ status }) {
  const toneMap = {
    idea: "dot-muted", script: "dot-amber", filming: "dot-rose",
    editing: "dot-rose", ready: "dot-teal", published: "dot-teal-solid",
  };
  return <span className={`status-dot ${toneMap[status] || "dot-muted"}`} />;
}

function PlatformIcon({ platform, size = 14 }) {
  const p = PLATFORMS.find((x) => x.key === platform);
  const Icon = p ? p.icon : Camera;
  return <Icon size={size} strokeWidth={2} />;
}

function ProgressBar({ value }) {
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ============================== SIDEBAR / TOPBAR ============================== */

const NAV_ITEMS = [
  { key: "dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { key: "calendar", label: "التقويم", icon: CalendarDays },
  { key: "pipeline", label: "خط الإنتاج", icon: Kanban },
  { key: "ideabank", label: "بنك الأفكار", icon: Lightbulb },
  { key: "templates", label: "القوالب", icon: LayoutTemplate },
  { key: "analytics", label: "التحليلات", icon: BarChart3 },
];

function Sidebar({ view, setView, mobileOpen, setMobileOpen, autosaveLabel }) {
  return (
    <>
      {mobileOpen && (
        <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">م</div>
          <div>
            <div className="brand-title">محتوى</div>
            <div className="brand-sub">مساحة عمل تجريبية</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setView(item.key); setMobileOpen(false); }}
                className={`nav-item ${isActive ? "nav-item-active" : ""}`}
              >
                <Icon size={17} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          {autosaveLabel && (
            <div className="mini-card" style={{ marginBottom: 10 }}>
              <CheckCircle2 size={15} />
              <div>
                <div className="mini-card-title">حفظ تلقائي مفعّل</div>
                <div className="mini-card-sub">{autosaveLabel}</div>
              </div>
            </div>
          )}
          <div className="mini-card">
            <Sparkles size={15} />
            <div>
              <div className="mini-card-title">توليد أفكار بالذكاء الاصطناعي</div>
              <div className="mini-card-sub">قريبًا</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function TopBar({ search, setSearch, theme, toggleTheme, onQuickAdd, setMobileOpen, title, subtitle }) {
  return (
    <header className="topbar">
      <div className="topbar-right">
        <button className="icon-btn only-mobile" onClick={() => setMobileOpen(true)} aria-label="القائمة">
          <Menu size={18} />
        </button>
        <div>
          <h1 className="topbar-title">{title}</h1>
          {subtitle && <p className="topbar-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="topbar-left">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن فكرة، هوك، أو وسم..."
            className="search-input"
          />
        </div>
        <button className="icon-btn" onClick={toggleTheme} aria-label="تبديل الوضع الليلي">
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button className="btn-primary" onClick={() => onQuickAdd(null)}>
          <Plus size={16} />
          <span>محتوى جديد</span>
        </button>
      </div>
    </header>
  );
}

/* ============================== DASHBOARD ============================== */

function StatCard({ label, value, hint, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-number stat-${tone}`}>{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

function DashboardView({ items, openDetail, onQuickAdd }) {
  const scheduled = items.filter((i) => i.date);
  const total = scheduled.length;
  const published = scheduled.filter((i) => i.status === "published").length;
  const inProgress = scheduled.filter((i) => ["script", "filming", "editing"].includes(i.status)).length;
  const notStarted = scheduled.filter((i) => i.status === "idea").length;
  const ready = scheduled.filter((i) => i.status === "ready").length;
  const completion = total ? Math.round((published / total) * 100) : 0;

  const upcoming = [...scheduled]
    .filter((i) => i.status !== "published")
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="view-pad">
      <div className="stat-grid">
        <StatCard label="إجمالي الأفكار هذا الشهر" value={total} tone="ink" />
        <StatCard label="منشور" value={published} tone="teal" />
        <StatCard label="قيد التنفيذ" value={inProgress} tone="amber" />
        <StatCard label="لم يبدأ" value={notStarted} tone="rose" />
        <StatCard label="جاهز للنشر" value={ready} tone="teal" />
      </div>

      <div className="panel completion-panel">
        <div className="completion-head">
          <div>
            <div className="panel-title">نسبة إنجاز خطة سبتمبر</div>
            <div className="panel-sub">{published} من أصل {total} فكرة تم نشرها</div>
          </div>
          <div className="completion-number">{completion}%</div>
        </div>
        <ProgressBar value={completion} />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-title">القادم على التقويم</div>
          <div className="upcoming-list">
            {upcoming.map((item) => (
              <button key={item.id} className="upcoming-row" onClick={() => openDetail(item)}>
                <StatusDot status={item.status} />
                <div className="upcoming-main">
                  <div className="upcoming-title">{item.title}</div>
                  <div className="upcoming-meta">
                    <PlatformIcon platform={item.platform} size={13} />
                    <span>{item.type}</span>
                    <span className="dot-sep">·</span>
                    <span>{item.date}</span>
                  </div>
                </div>
                <span className="pill-status">{STATUS_LABEL[item.status]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">إضافة سريعة</div>
          <p className="panel-sub" style={{ marginBottom: 14 }}>
            حوّل فكرة عابرة إلى خطة منظمة في أقل من دقيقة.
          </p>
          <button className="btn-primary btn-block" onClick={() => onQuickAdd(null)}>
            <Plus size={16} />
            <span>إضافة محتوى جديد</span>
          </button>
          <div className="quick-templates">
            {TEMPLATES.slice(0, 4).map((t) => (
              <div key={t.key} className="quick-template-row">
                <span>{t.title}</span>
                <ArrowRight size={13} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== CALENDAR ============================== */

function CalendarView({ items, openDetail, onQuickAdd, moveToDate, year, monthIdx }) {
  const cells = useMemo(() => buildMonthGrid(year, monthIdx), [year, monthIdx]);
  const itemsByDate = useMemo(() => {
    const map = {};
    items.forEach((i) => {
      if (!i.date) return;
      map[i.date] = map[i.date] || [];
      map[i.date].push(i);
    });
    return map;
  }, [items]);

  const [dragOverDate, setDragOverDate] = useState(null);

  return (
    <div className="view-pad">
      <div className="panel calendar-panel">
        <div className="calendar-head">
          <div className="calendar-month">{MONTHS_AR[monthIdx]} {year}</div>
          <div className="calendar-legend">
            {STATUSES.map((s) => (
              <span key={s.key} className="legend-item">
                <StatusDot status={s.key} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="calendar-grid calendar-weekdays">
          {WEEKDAYS_AR.map((w) => (
            <div key={w} className="weekday-label">{w}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((day, idx) => {
            const iso = day ? toISO(year, monthIdx, day) : null;
            const dayItems = iso ? (itemsByDate[iso] || []) : [];
            const isDragOver = iso && dragOverDate === iso;
            return (
              <div
                key={idx}
                className={`calendar-cell ${!day ? "calendar-cell-empty" : ""} ${isDragOver ? "calendar-cell-dragover" : ""}`}
                onDragOver={(e) => { if (iso) { e.preventDefault(); setDragOverDate(iso); } }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id && iso) moveToDate(id, iso);
                  setDragOverDate(null);
                }}
              >
                {day && (
                  <>
                    <div className="calendar-cell-head">
                      <span className="calendar-day-num">{day}</span>
                      <button className="calendar-add-btn" onClick={() => onQuickAdd(iso)} aria-label="إضافة">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="calendar-cell-items">
                      {dayItems.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                          className="calendar-item"
                          onClick={() => openDetail(item)}
                        >
                          <StatusDot status={item.status} />
                          <span className="calendar-item-title">{item.title}</span>
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <div className="calendar-item-more">+{dayItems.length - 3} أخرى</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================== PIPELINE (KANBAN) ============================== */

function PipelineCard({ item, openDetail }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
      className="kanban-card"
      onClick={() => openDetail(item)}
    >
      <div className="kanban-card-top">
        <PlatformIcon platform={item.platform} size={13} />
        <span className="kanban-card-type">{item.type}</span>
      </div>
      <div className="kanban-card-title">{item.title}</div>
      {item.date && <div className="kanban-card-date"><Clock size={11} /> {item.date}</div>}
      {item.tags?.length > 0 && (
        <div className="kanban-card-tags">
          {item.tags.slice(0, 2).map((t) => <span key={t} className="mini-tag">{t}</span>)}
        </div>
      )}
    </div>
  );
}

function PipelineView({ items, openDetail, moveToStatus }) {
  const [dragOverCol, setDragOverCol] = useState(null);
  return (
    <div className="view-pad">
      <div className="kanban-board">
        {STATUSES.map((status) => {
          const colItems = items.filter((i) => i.status === status.key);
          return (
            <div
              key={status.key}
              className={`kanban-column ${dragOverCol === status.key ? "kanban-column-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(status.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) moveToStatus(id, status.key);
                setDragOverCol(null);
              }}
            >
              <div className="kanban-column-head">
                <span className="kanban-column-title"><StatusDot status={status.key} /> {status.label}</span>
                <span className="kanban-count">{colItems.length}</span>
              </div>
              <div className="kanban-column-body">
                {colItems.map((item) => (
                  <PipelineCard key={item.id} item={item} openDetail={openDetail} />
                ))}
                {colItems.length === 0 && <div className="kanban-empty">لا يوجد محتوى هنا</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== IDEA BANK ============================== */

function IdeaBankView({ items, openDetail, moveToDate, onQuickAdd }) {
  const bank = items.filter((i) => !i.date);
  const today = "2026-09-10";
  return (
    <div className="view-pad">
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-title">بنك الأفكار</div>
        <p className="panel-sub">
          أفكار جاهزة لكنها بدون موعد نشر بعد. اسحب أي فكرة إلى التقويم، أو استخدم الجدولة السريعة أدناه.
        </p>
      </div>
      <div className="idea-grid">
        {bank.map((item) => (
          <div key={item.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)} className="idea-card">
            <div className="idea-card-top">
              <PlatformIcon platform={item.platform} size={13} />
              <span className="kanban-card-type">{item.type}</span>
            </div>
            <button className="idea-card-title" onClick={() => openDetail(item)}>{item.title}</button>
            <p className="idea-card-desc">{item.idea}</p>
            <div className="idea-card-tags">
              {item.tags.map((t) => <span key={t} className="mini-tag">{t}</span>)}
            </div>
            <div className="idea-card-actions">
              <button className="btn-ghost-sm" onClick={() => moveToDate(item.id, today)}>
                <CalendarDays size={13} /> جدولة اليوم
              </button>
            </div>
          </div>
        ))}
        {bank.length === 0 && (
          <div className="empty-state">
            <Lightbulb size={22} />
            <p>لا توجد أفكار بدون موعد حاليًا</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== TEMPLATES ============================== */

function TemplatesView({ onUseTemplate }) {
  return (
    <div className="view-pad">
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-title">قوالب المحتوى</div>
        <p className="panel-sub">اختر هيكلًا جاهزًا لتسريع الكتابة، وسيتم إنشاء فكرة جديدة بالبنية المناسبة.</p>
      </div>
      <div className="template-grid">
        {TEMPLATES.map((t) => (
          <div key={t.key} className="template-card">
            <div className="template-card-title">{t.title}</div>
            <p className="template-card-desc">{t.desc}</p>
            <ol className="template-structure">
              {t.structure.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <button className="btn-secondary btn-block" onClick={() => onUseTemplate(t)}>
              استخدم هذا القالب
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================== ANALYTICS ============================== */

const CHART_COLORS = ["#E8A33D", "#2F6F62", "#C4506D", "#8A8D97", "#5B7FDE", "#1B2130"];

function AnalyticsView({ items }) {
  const scheduled = items.filter((i) => i.date);
  const byStatus = STATUSES.map((s) => ({ name: s.label, value: scheduled.filter((i) => i.status === s.key).length }));
  const byType = Object.entries(
    scheduled.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const byPlatform = PLATFORMS.map((p) => ({ name: p.label, value: scheduled.filter((i) => i.platform === p.key).length }));
  const published = scheduled.filter((i) => i.status === "published").length;
  const adherence = scheduled.length ? Math.round((published / scheduled.length) * 100) : 0;

  const monthsComparison = [
    { name: "يوليو", منشور: 18, مخطط: 24 },
    { name: "أغسطس", منشور: 22, مخطط: 26 },
    { name: "سبتمبر", منشور: published, مخطط: scheduled.length },
  ];

  return (
    <div className="view-pad">
      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <StatCard label="محتوى منشور هذا الشهر" value={published} tone="teal" />
        <StatCard label="نسبة الالتزام بالخطة" value={`${adherence}%`} tone="amber" />
        <StatCard label="أكثر نوع مستخدم" value={byType[0]?.name || "—"} tone="ink" />
        <StatCard label="منصات نشطة" value={PLATFORMS.length} tone="rose" />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-title">الأفكار حسب الحالة</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                  {byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">المحتوى حسب المنصة</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPlatform}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2F6F62" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-title">أكثر أنواع المحتوى استخدامًا</div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byType} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
              <Tooltip />
              <Bar dataKey="value" fill="#E8A33D" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-title">مقارنة بين الأشهر</div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthsComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="مخطط" stroke="#8A8D97" strokeWidth={2} />
              <Line type="monotone" dataKey="منشور" stroke="#2F6F62" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ============================== DETAIL MODAL ============================== */

function FieldLabel({ children }) {
  return <label className="field-label">{children}</label>;
}

function DetailModal({ item, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(item);
  if (!item) return null;
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <input
            className="modal-title-input"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="modal-row">
            <div>
              <FieldLabel>المنصة</FieldLabel>
              <select className="input" value={draft.platform} onChange={(e) => set({ platform: e.target.value })}>
                {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>نوع المحتوى</FieldLabel>
              <select className="input" value={draft.type} onChange={(e) => set({ type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>الحالة</FieldLabel>
              <select className="input" value={draft.status} onChange={(e) => set({ status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>تاريخ النشر</FieldLabel>
              <input type="date" className="input" value={draft.date || ""} onChange={(e) => set({ date: e.target.value || null })} />
            </div>
          </div>

          <div>
            <FieldLabel>Hook — أول 3 ثوانٍ من الفيديو</FieldLabel>
            <textarea className="input textarea-sm" value={draft.hook} onChange={(e) => set({ hook: e.target.value })} placeholder="اكتب هنا أول 3 ثواني من الفيديو" />
          </div>

          <div>
            <FieldLabel>فكرة المحتوى</FieldLabel>
            <textarea className="input textarea-sm" value={draft.idea} onChange={(e) => set({ idea: e.target.value })} placeholder="اشرح الفكرة بالتفصيل..." />
          </div>

          <div>
            <FieldLabel>Script</FieldLabel>
            <textarea className="input textarea-lg" value={draft.script} onChange={(e) => set({ script: e.target.value })} placeholder="اكتب السكريبت الكامل هنا..." />
          </div>

          <div>
            <FieldLabel>CTA</FieldLabel>
            <input className="input" value={draft.cta} onChange={(e) => set({ cta: e.target.value })} placeholder="ما الإجراء الذي تريد من المشاهد القيام به؟" />
          </div>

          <div>
            <FieldLabel>الوسوم (Tags)</FieldLabel>
            <div className="tag-picker">
              {TAGS.map((t) => {
                const active = draft.tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`chip chip-neutral chip-xs ${active ? "chip-active" : ""}`}
                    onClick={() => set({ tags: active ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] })}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel>ملاحظات</FieldLabel>
            <textarea className="input textarea-sm" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="أي ملاحظات إضافية..." />
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-danger-ghost" onClick={() => onDelete(item.id)}>
            <Trash2 size={15} /> حذف
          </button>
          <div className="modal-foot-actions">
            <button className="btn-secondary" onClick={onClose}>إلغاء</button>
            <button className="btn-primary" onClick={() => onSave(draft)}>حفظ التغييرات</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== QUICK ADD MODAL ============================== */

function QuickAddModal({ prefillDate, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(prefillDate || "");
  const [type, setType] = useState(TYPES[0]);
  const [status, setStatus] = useState("idea");

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-title">محتوى جديد</div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <FieldLabel>العنوان</FieldLabel>
            <input autoFocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان فكرة المحتوى" />
          </div>
          <div className="modal-row">
            <div>
              <FieldLabel>تاريخ النشر (اختياري)</FieldLabel>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <FieldLabel>نوع المحتوى</FieldLabel>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>الحالة</FieldLabel>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <p className="hint-text">يمكنك إضافة الـ Hook والسكريبت والتفاصيل الأخرى لاحقًا من صفحة التفاصيل.</p>
        </div>
        <div className="modal-foot">
          <div />
          <div className="modal-foot-actions">
            <button className="btn-secondary" onClick={onClose}>إلغاء</button>
            <button
              className="btn-primary"
              disabled={!title.trim()}
              onClick={() => { if (title.trim()) onCreate({ title: title.trim(), date: date || null, type, status }); }}
            >
              إضافة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== SEARCH / FILTERS BAR ============================== */

function FilterBar({ filters, setFilters, search }) {
  const clear = () => setFilters({ status: "", platform: "", type: "", tag: "" });
  const hasFilters = filters.status || filters.platform || filters.type || filters.tag;
  return (
    <div className="filter-bar">
      <Filter size={14} className="filter-icon" />
      <select className="filter-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
        <option value="">كل الحالات</option>
        {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      <select className="filter-select" value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value })}>
        <option value="">كل المنصات</option>
        {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <select className="filter-select" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
        <option value="">كل الأنواع</option>
        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select className="filter-select" value={filters.tag} onChange={(e) => setFilters({ ...filters, tag: e.target.value })}>
        <option value="">كل الوسوم</option>
        {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {hasFilters && <button className="btn-ghost-sm" onClick={clear}>مسح الفلاتر</button>}
    </div>
  );
}

/* ============================== LANDING PAGE ============================== */

function LandingPage({ onEnter }) {
  return (
    <div className="landing">
      <div className="landing-nav">
        <div className="brand-mark">م</div>
        <span className="landing-brand-name">محتوى</span>
        <button className="btn-primary" onClick={onEnter}>افتح لوحة العمل</button>
      </div>

      <section className="landing-hero">
        <div className="hero-eyebrow-free" />
        <h1 className="landing-headline">نظّم محتواك. خطّط لشهرك. وانشر باستمرار.</h1>
        <p className="landing-sub">
          منصة واحدة تساعدك على تحويل أفكارك المبعثرة إلى خطة محتوى واضحة ومنظمة، من أول هوك إلى آخر منشور.
        </p>
        <div className="landing-cta-row">
          <button className="btn-primary btn-lg" onClick={onEnter}>ابدأ تنظيم محتواك</button>
          <span className="landing-cta-hint">بدون بطاقة ائتمانية — بيانات تجريبية جاهزة</span>
        </div>

        <div className="landing-preview">
          <div className="landing-preview-col">
            <div className="landing-preview-stat">
              <div className="stat-number stat-teal">30</div>
              <div className="stat-label">فكرة هذا الشهر</div>
            </div>
            <div className="landing-preview-stat">
              <div className="stat-number stat-amber">75%</div>
              <div className="stat-label">نسبة الإنجاز</div>
            </div>
          </div>
          <div className="landing-preview-board">
            {STATUSES.slice(0, 4).map((s) => (
              <div key={s.key} className="landing-preview-col-card">
                <div className="landing-preview-col-head"><StatusDot status={s.key} /> {s.label}</div>
                <div className="landing-preview-card-block" />
                <div className="landing-preview-card-block" style={{ opacity: 0.6 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2 className="landing-section-title">كيف يعمل؟</h2>
        <div className="landing-steps">
          {[
            ["اجمع أفكارك", "أضف كل فكرة تخطر ببالك في بنك الأفكار، بدون التزام بموعد."],
            ["رتّب خطة الشهر", "وزّع الأفكار على تقويم شهري بالسحب والإفلات."],
            ["تابع الإنتاج", "انقل كل فكرة عبر مراحل الإنتاج حتى تُنشر."],
          ].map(([t, d], i) => (
            <div key={i} className="landing-step">
              <div className="landing-step-num">{i + 1}</div>
              <div className="landing-step-title">{t}</div>
              <p className="landing-step-desc">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <h2 className="landing-section-title">كل ما تحتاجه في مكان واحد</h2>
        <div className="feature-grid">
          {[
            [CalendarDays, "تقويم المحتوى", "شهر كامل أمامك، مع إمكانية سحب أي فكرة لتغيير تاريخ نشرها."],
            [Lightbulb, "بنك الأفكار", "مكان لتجميع كل فكرة قبل ما تقرر متى تنشرها."],
            [Kanban, "خط الإنتاج", "من الفكرة إلى النشر عبر ست مراحل واضحة."],
            [BarChart3, "التحليلات", "تابع التزامك بالخطة وأداء كل نوع محتوى."],
            [LayoutTemplate, "قوالب جاهزة", "هياكل محتوى مجرّبة توفر عليك وقت التفكير."],
            [Sparkles, "توليد أفكار بالذكاء الاصطناعي", "ميزة قادمة لتوليد أفكار محتوى مخصصة لمجالك."],
          ].map(([Icon, t, d], i) => (
            <div key={i} className="feature-card">
              <Icon size={20} strokeWidth={1.8} />
              <div className="feature-card-title">{t}</div>
              <p className="feature-card-desc">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <h2 className="landing-section-title">جاهز تخطط لشهرك القادم؟</h2>
        <button className="btn-primary btn-lg" onClick={onEnter}>ابدأ تنظيم محتواك</button>
      </section>
    </div>
  );
}

/* ============================== APP ROOT ============================== */

const VIEW_META = {
  dashboard: { title: "الرئيسية", subtitle: "نظرة سريعة على خطة سبتمبر" },
  calendar: { title: "التقويم", subtitle: "اسحب أي فكرة لتغيير تاريخ نشرها" },
  pipeline: { title: "خط الإنتاج", subtitle: "تابع كل فكرة من البداية حتى النشر" },
  ideabank: { title: "بنك الأفكار", subtitle: "أفكار جاهزة بانتظار موعد نشر" },
  templates: { title: "القوالب", subtitle: "هياكل جاهزة لتسريع الكتابة" },
  analytics: { title: "التحليلات", subtitle: "أداء خطة المحتوى هذا الشهر" },
};

export default function ContentPlannerApp() {
  const [entered, setEntered] = useState(false);
  const [theme, setTheme] = useState("light");
  const [view, setView] = useState("dashboard");
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", platform: "", type: "", tag: "" });
  const [selectedItem, setSelectedItem] = useState(null);
  const [quickAdd, setQuickAdd] = useState(null); // { date } | null when closed; use false-ish check
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ---- الحفظ التلقائي ---- */
  const storage = useMemo(() => getStorageAdapter(), []);
  const [hydrated, setHydrated] = useState(!storage);
  const saveTimer = useRef(null);

  // تحميل البيانات المحفوظة عند فتح الموقع (مرة واحدة فقط)
  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    Promise.resolve(storage.load())
      .then((saved) => {
        if (cancelled) return;
        if (saved && Array.isArray(saved.items)) {
          setItems(saved.items);
          if (saved.theme === "light" || saved.theme === "dark") setTheme(saved.theme);
          if (saved.entered) setEntered(true);
        }
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // حفظ تلقائي (مع تأخير بسيط) في كل مرة تتغير فيها البيانات
  useEffect(() => {
    if (!storage || !hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      storage.save({ items, theme, entered });
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [storage, hydrated, items, theme, entered]);

  // حفظ فوري عند إغلاق الصفحة أو مغادرتها
  useEffect(() => {
    if (!storage) return;
    const handleUnload = () => { storage.saveSync({ items, theme, entered }); };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [storage, items, theme, entered]);

  const year = 2026, monthIdx = 8; // September 2026

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (filters.status && i.status !== filters.status) return false;
      if (filters.platform && i.platform !== filters.platform) return false;
      if (filters.type && i.type !== filters.type) return false;
      if (filters.tag && !i.tags.includes(filters.tag)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${i.title} ${i.hook} ${i.idea} ${i.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filters, search]);

  const openDetail = useCallback((item) => setSelectedItem(item), []);
  const closeDetail = useCallback(() => setSelectedItem(null), []);

  const saveItem = useCallback((draft) => {
    setItems((prev) => prev.map((i) => (i.id === draft.id ? draft : i)));
    setSelectedItem(null);
  }, []);

  const deleteItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedItem(null);
  }, []);

  const moveToStatus = useCallback((id, status) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }, []);

  const moveToDate = useCallback((id, date) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, date } : i)));
  }, []);

  const openQuickAdd = useCallback((date) => {
    setQuickAdd({ date });
    setQuickAddOpen(true);
  }, []);

  const createFromQuickAdd = useCallback((data) => {
    const newItem = {
      id: uid(), title: data.title, hook: "", idea: "", script: "", cta: "",
      platform: "instagram", type: data.type, status: data.status,
      date: data.date, tags: [], notes: "",
    };
    setItems((prev) => [newItem, ...prev]);
    setQuickAddOpen(false);
    setSelectedItem(newItem);
  }, []);

  const useTemplate = useCallback((tpl) => {
    const newItem = {
      id: uid(), title: tpl.title, hook: "", idea: tpl.desc,
      script: tpl.structure.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      cta: "", platform: "instagram", type: TYPES[0], status: "idea",
      date: null, tags: [], notes: "",
    };
    setItems((prev) => [newItem, ...prev]);
    setSelectedItem(newItem);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  if (storage && !hydrated) {
    return (
      <div className={`app-root theme-${theme}`} dir="rtl">
        <style>{CSS}</style>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 20 }}>م</div>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>جارٍ تحميل بياناتك المحفوظة...</p>
        </div>
      </div>
    );
  }

  if (!entered) {
    return (
      <div className={`app-root theme-${theme}`} dir="rtl">
        <style>{CSS}</style>
        <LandingPage onEnter={() => setEntered(true)} />
      </div>
    );
  }

  const meta = VIEW_META[view];

  return (
    <div className={`app-root theme-${theme}`} dir="rtl">
      <style>{CSS}</style>
      <div className="app-shell">
        <Sidebar view={view} setView={setView} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} autosaveLabel={storage?.badge} />
        <div className="app-main">
          <TopBar
            search={search} setSearch={setSearch}
            theme={theme} toggleTheme={toggleTheme}
            onQuickAdd={openQuickAdd}
            setMobileOpen={setMobileOpen}
            title={meta.title} subtitle={meta.subtitle}
          />
          {["dashboard", "analytics", "templates"].indexOf(view) === -1 && (
            <div className="filter-bar-wrap">
              <FilterBar filters={filters} setFilters={setFilters} search={search} />
            </div>
          )}

          {view === "dashboard" && <DashboardView items={items} openDetail={openDetail} onQuickAdd={openQuickAdd} />}
          {view === "calendar" && (
            <CalendarView items={filteredItems} openDetail={openDetail} onQuickAdd={openQuickAdd} moveToDate={moveToDate} year={year} monthIdx={monthIdx} />
          )}
          {view === "pipeline" && <PipelineView items={filteredItems} openDetail={openDetail} moveToStatus={moveToStatus} />}
          {view === "ideabank" && <IdeaBankView items={filteredItems} openDetail={openDetail} moveToDate={moveToDate} onQuickAdd={openQuickAdd} />}
          {view === "templates" && <TemplatesView onUseTemplate={useTemplate} />}
          {view === "analytics" && <AnalyticsView items={items} />}
        </div>
      </div>

      {selectedItem && (
        <DetailModal item={selectedItem} onClose={closeDetail} onSave={saveItem} onDelete={deleteItem} />
      )}
      {quickAddOpen && (
        <QuickAddModal prefillDate={quickAdd?.date} onClose={() => setQuickAddOpen(false)} onCreate={createFromQuickAdd} />
      )}
    </div>
  );
}

/* ============================== CSS ============================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');

.app-root {
  font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
  --radius-card: 14px;
  --radius-chip: 999px;
}
.theme-light {
  --bg-app: #FAF8F4;
  --bg-surface: #FFFFFF;
  --bg-surface-2: #F2EEE3;
  --border: #E6E0D1;
  --text-primary: #1B2130;
  --text-secondary: #5B5E68;
  --text-muted: #8B8E98;
  --accent-amber: #E8A33D;
  --accent-amber-ink: #6B4712;
  --accent-teal: #2F6F62;
  --accent-teal-ink: #E9F3F0;
  --accent-rose: #C4506D;
  --accent-rose-ink: #FBEDF0;
  --shadow-modal: 0 24px 60px rgba(27,33,48,0.18);
  --sidebar-bg: #1B2130;
  --sidebar-text: #C7CAD4;
  --sidebar-active: #262E42;
}
.theme-dark {
  --bg-app: #14171F;
  --bg-surface: #1B2130;
  --bg-surface-2: #212838;
  --border: #2C3346;
  --text-primary: #F4F1EA;
  --text-secondary: #B7BAC4;
  --text-muted: #7C808C;
  --accent-amber: #F2B45A;
  --accent-amber-ink: #2A1D08;
  --accent-teal: #4C9A87;
  --accent-teal-ink: #0E211D;
  --accent-rose: #DD7E97;
  --accent-rose-ink: #2A1319;
  --shadow-modal: 0 24px 60px rgba(0,0,0,0.45);
  --sidebar-bg: #0F1219;
  --sidebar-text: #9CA0AC;
  --sidebar-active: #1B2130;
}

.app-root, .app-root * { box-sizing: border-box; }
.app-root { background: var(--bg-app); color: var(--text-primary); min-height: 100vh; }

/* ---------- Shell ---------- */
.app-shell { display: flex; min-height: 100vh; }
.app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

/* ---------- Sidebar ---------- */
.sidebar {
  width: 236px; flex-shrink: 0; background: var(--sidebar-bg); color: var(--sidebar-text);
  display: flex; flex-direction: column; padding: 20px 14px; gap: 22px;
}
.sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 0 6px; }
.brand-mark {
  width: 34px; height: 34px; border-radius: 10px; background: var(--accent-amber);
  color: var(--accent-amber-ink); display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px; flex-shrink: 0;
}
.brand-title { font-weight: 600; font-size: 14.5px; color: #F4F1EA; }
.brand-sub { font-size: 11.5px; color: #7C808C; }
.sidebar-nav { display: flex; flex-direction: column; gap: 3px; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px;
  background: transparent; border: none; color: var(--sidebar-text); font-size: 13.5px;
  cursor: pointer; text-align: right; font-family: inherit;
}
.nav-item:hover { background: rgba(255,255,255,0.06); }
.nav-item-active { background: var(--sidebar-active); color: #fff; font-weight: 600; }
.sidebar-footer { margin-top: auto; }
.mini-card {
  display: flex; align-items: flex-start; gap: 9px; padding: 12px; border-radius: 12px;
  background: rgba(232,163,61,0.12); color: #E8C899; border: 1px solid rgba(232,163,61,0.25);
}
.mini-card-title { font-size: 12px; font-weight: 600; color: #F1DDB3; line-height: 1.5; }
.mini-card-sub { font-size: 11px; color: #B79860; margin-top: 2px; }
.sidebar-scrim { display: none; }

/* ---------- Topbar ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 16px 26px; border-bottom: 1px solid var(--border); flex-wrap: wrap;
  background: var(--bg-app); position: sticky; top: 0; z-index: 10;
}
.topbar-right { display: flex; align-items: center; gap: 10px; }
.topbar-title { font-size: 19px; font-weight: 700; margin: 0; }
.topbar-sub { font-size: 12.5px; color: var(--text-secondary); margin: 2px 0 0; }
.topbar-left { display: flex; align-items: center; gap: 10px; }
.search-box { position: relative; }
.search-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-input {
  width: 240px; padding: 8px 34px 8px 12px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--bg-surface); color: var(--text-primary); font-size: 13px; font-family: inherit;
}
.search-input:focus { outline: 2px solid var(--accent-amber); outline-offset: 1px; }
.icon-btn {
  width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--bg-surface); color: var(--text-secondary); display: flex; align-items: center;
  justify-content: center; cursor: pointer;
}
.icon-btn:hover { background: var(--bg-surface-2); }
.only-mobile { display: none; }

/* ---------- Buttons ---------- */
.btn-primary {
  display: inline-flex; align-items: center; gap: 7px; background: var(--accent-amber);
  color: var(--accent-amber-ink); border: none; padding: 9px 16px; border-radius: 10px;
  font-weight: 600; font-size: 13.5px; cursor: pointer; font-family: inherit;
}
.btn-primary:hover { filter: brightness(0.96); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  display: inline-flex; align-items: center; gap: 7px; background: var(--bg-surface-2);
  color: var(--text-primary); border: 1px solid var(--border); padding: 9px 16px; border-radius: 10px;
  font-weight: 600; font-size: 13.5px; cursor: pointer; font-family: inherit;
}
.btn-ghost-sm {
  display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--border);
  color: var(--text-secondary); padding: 6px 10px; border-radius: 8px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-danger-ghost {
  display: inline-flex; align-items: center; gap: 6px; background: transparent; border: none;
  color: var(--accent-rose); font-size: 13px; cursor: pointer; font-family: inherit; padding: 8px 4px;
}
.btn-lg { padding: 13px 26px; font-size: 15px; border-radius: 12px; }
.btn-block { width: 100%; justify-content: center; }

/* ---------- Views / panels ---------- */
.view-pad { padding: 22px 26px 60px; }
.panel { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-card); padding: 18px 20px; }
.panel-title { font-size: 14.5px; font-weight: 700; }
.panel-sub { font-size: 12.5px; color: var(--text-secondary); margin-top: 3px; }
.two-col { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; margin-top: 18px; }

/* ---------- Stat cards ---------- */
.stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 18px; }
.stat-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-card); padding: 16px; }
.stat-number { font-size: 28px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.stat-ink { color: var(--text-primary); }
.stat-teal { color: var(--accent-teal); }
.stat-amber { color: var(--accent-amber); }
.stat-rose { color: var(--accent-rose); }
.stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 8px; }
.stat-hint { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

.completion-panel { margin-bottom: 0; }
.completion-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.completion-number { font-size: 22px; font-weight: 700; color: var(--accent-teal); }
.progress-track { height: 9px; border-radius: 999px; background: var(--bg-surface-2); overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent-amber), var(--accent-teal)); border-radius: 999px; }

/* ---------- upcoming list ---------- */
.upcoming-list { display: flex; flex-direction: column; gap: 2px; margin-top: 10px; }
.upcoming-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 10px;
  background: transparent; border: none; cursor: pointer; text-align: right; font-family: inherit; width: 100%;
}
.upcoming-row:hover { background: var(--bg-surface-2); }
.upcoming-main { flex: 1; min-width: 0; }
.upcoming-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upcoming-meta { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.dot-sep { opacity: 0.6; }
.pill-status { font-size: 10.5px; padding: 3px 9px; border-radius: 999px; background: var(--bg-surface-2); color: var(--text-secondary); flex-shrink: 0; }

.quick-templates { margin-top: 14px; display: flex; flex-direction: column; gap: 2px; }
.quick-template-row { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; padding: 8px 4px; color: var(--text-secondary); border-top: 1px solid var(--border); }
.quick-template-row:first-child { border-top: none; }

/* ---------- status dot ---------- */
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.dot-muted { background: var(--text-muted); }
.dot-amber { background: var(--accent-amber); }
.dot-rose { background: var(--accent-rose); }
.dot-teal { background: var(--accent-teal); opacity: 0.6; }
.dot-teal-solid { background: var(--accent-teal); }

/* ---------- filter bar ---------- */
.filter-bar-wrap { padding: 14px 26px 0; }
.filter-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-icon { color: var(--text-muted); }
.filter-select {
  border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-secondary);
  border-radius: 8px; padding: 6px 10px; font-size: 12.5px; font-family: inherit;
}

/* ---------- calendar ---------- */
.calendar-panel { padding: 16px; }
.calendar-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; }
.calendar-month { font-size: 16px; font-weight: 700; }
.calendar-legend { display: flex; gap: 12px; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text-muted); }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.calendar-weekdays { margin-bottom: 6px; }
.weekday-label { text-align: center; font-size: 11.5px; color: var(--text-muted); font-weight: 600; padding: 4px 0; }
.calendar-cell {
  min-height: 96px; border: 1px solid var(--border); border-radius: 10px; padding: 6px;
  background: var(--bg-surface); display: flex; flex-direction: column; gap: 4px;
}
.calendar-cell-empty { background: transparent; border-color: transparent; }
.calendar-cell-dragover { border-color: var(--accent-amber); background: var(--bg-surface-2); }
.calendar-cell-head { display: flex; align-items: center; justify-content: space-between; }
.calendar-day-num { font-size: 11.5px; color: var(--text-secondary); font-weight: 600; }
.calendar-add-btn {
  width: 18px; height: 18px; border-radius: 5px; border: 1px solid var(--border); background: transparent;
  color: var(--text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.calendar-add-btn:hover { background: var(--bg-surface-2); color: var(--text-primary); }
.calendar-cell-items { display: flex; flex-direction: column; gap: 3px; }
.calendar-item {
  display: flex; align-items: center; gap: 5px; background: var(--bg-surface-2); border-radius: 6px;
  padding: 3px 6px; cursor: grab; font-size: 10.5px;
}
.calendar-item-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.calendar-item-more { font-size: 10px; color: var(--text-muted); padding: 0 4px; }

/* ---------- kanban ---------- */
.kanban-board { display: grid; grid-template-columns: repeat(6, minmax(200px, 1fr)); gap: 12px; overflow-x: auto; padding-bottom: 8px; }
.kanban-column { background: var(--bg-surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 10px; min-height: 200px; }
.kanban-column-over { outline: 2px dashed var(--accent-amber); outline-offset: -2px; }
.kanban-column-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 2px 4px; }
.kanban-column-title { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; }
.kanban-count { font-size: 11px; color: var(--text-muted); background: var(--bg-surface); border-radius: 999px; padding: 1px 8px; }
.kanban-column-body { display: flex; flex-direction: column; gap: 8px; }
.kanban-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px; cursor: grab; }
.kanban-card:hover { border-color: var(--accent-amber); }
.kanban-card-top { display: flex; align-items: center; gap: 6px; color: var(--text-muted); margin-bottom: 5px; }
.kanban-card-type { font-size: 10.5px; }
.kanban-card-title { font-size: 12.5px; font-weight: 600; line-height: 1.4; }
.kanban-card-date { display: flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--text-muted); margin-top: 6px; }
.kanban-card-tags { display: flex; gap: 4px; margin-top: 7px; flex-wrap: wrap; }
.kanban-empty { font-size: 11.5px; color: var(--text-muted); text-align: center; padding: 18px 6px; }
.mini-tag { font-size: 10px; background: var(--bg-surface-2); color: var(--text-secondary); padding: 2px 7px; border-radius: 999px; }

/* ---------- idea bank ---------- */
.idea-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.idea-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-card); padding: 14px; cursor: grab; display: flex; flex-direction: column; gap: 8px; }
.idea-card-top { display: flex; align-items: center; gap: 6px; color: var(--text-muted); }
.idea-card-title { text-align: right; background: none; border: none; font-family: inherit; font-size: 13.5px; font-weight: 700; color: var(--text-primary); cursor: pointer; padding: 0; }
.idea-card-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.idea-card-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.idea-card-actions { margin-top: 4px; }
.empty-state { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 8px; }

/* ---------- templates ---------- */
.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
.template-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-card); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.template-card-title { font-size: 14px; font-weight: 700; }
.template-card-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.template-structure { font-size: 11.5px; color: var(--text-muted); padding-right: 18px; display: flex; flex-direction: column; gap: 3px; margin: 0; }

/* ---------- modals ---------- */
.modal-scrim { position: fixed; inset: 0; background: rgba(15,17,24,0.55); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
.modal { background: var(--bg-surface); border-radius: 18px; box-shadow: var(--shadow-modal); width: 100%; display: flex; flex-direction: column; max-height: 88vh; }
.modal-sm { max-width: 460px; }
.modal-lg { max-width: 680px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border); }
.modal-head-title { font-size: 15px; font-weight: 700; }
.modal-title-input { flex: 1; font-size: 17px; font-weight: 700; border: none; background: transparent; color: var(--text-primary); font-family: inherit; padding: 4px 0; }
.modal-title-input:focus { outline: none; }
.modal-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.modal-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.modal-foot { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid var(--border); }
.modal-foot-actions { display: flex; gap: 8px; }

.field-label { font-size: 11.5px; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 5px; }
.input {
  width: 100%; border: 1px solid var(--border); background: var(--bg-app); color: var(--text-primary);
  border-radius: 9px; padding: 8px 10px; font-size: 13px; font-family: inherit;
}
.input:focus { outline: 2px solid var(--accent-amber); outline-offset: 1px; }
.textarea-sm { min-height: 64px; resize: vertical; }
.textarea-lg { min-height: 130px; resize: vertical; }
.hint-text { font-size: 11.5px; color: var(--text-muted); }
.tag-picker { display: flex; gap: 6px; flex-wrap: wrap; }

/* ---------- chips ---------- */
.chip {
  border-radius: var(--radius-chip); border: 1px solid var(--border); background: var(--bg-surface-2);
  color: var(--text-secondary); padding: 6px 13px; font-size: 12px; cursor: pointer; font-family: inherit;
}
.chip-xs { padding: 4px 10px; font-size: 11px; }
.chip-active { background: var(--accent-amber); border-color: var(--accent-amber); color: var(--accent-amber-ink); font-weight: 600; }

/* ---------- landing ---------- */
.landing { max-width: 1120px; margin: 0 auto; padding: 0 26px 80px; }
.landing-nav { display: flex; align-items: center; gap: 10px; padding: 22px 0; }
.landing-brand-name { font-weight: 700; font-size: 15px; flex: 1; }
.landing-hero { padding: 60px 0 40px; text-align: center; }
.landing-headline { font-size: 42px; font-weight: 700; line-height: 1.25; max-width: 780px; margin: 0 auto 18px; }
.landing-sub { font-size: 16px; color: var(--text-secondary); max-width: 560px; margin: 0 auto 28px; line-height: 1.8; }
.landing-cta-row { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.landing-cta-hint { font-size: 12px; color: var(--text-muted); }
.landing-preview { margin-top: 56px; display: grid; grid-template-columns: 1fr 2fr; gap: 16px; text-align: right; }
.landing-preview-col { display: flex; flex-direction: column; gap: 12px; }
.landing-preview-stat { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
.landing-preview-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.landing-preview-col-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 10px; }
.landing-preview-col-head { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; margin-bottom: 8px; }
.landing-preview-card-block { height: 30px; border-radius: 7px; background: var(--bg-surface-2); margin-bottom: 6px; }

.landing-section { padding: 56px 0; }
.landing-section-alt { background: var(--bg-surface-2); border-radius: 24px; padding: 56px 30px; }
.landing-section-title { font-size: 25px; font-weight: 700; text-align: center; margin-bottom: 34px; }
.landing-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.landing-step { text-align: center; }
.landing-step-num {
  width: 34px; height: 34px; border-radius: 10px; background: var(--accent-amber); color: var(--accent-amber-ink);
  display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto 12px;
}
.landing-step-title { font-weight: 700; font-size: 14.5px; margin-bottom: 6px; }
.landing-step-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.7; max-width: 260px; margin: 0 auto; }
.feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.feature-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
.feature-card-title { font-weight: 700; font-size: 14px; margin: 10px 0 6px; }
.feature-card-desc { font-size: 12.5px; color: var(--text-secondary); line-height: 1.7; }
.landing-final-cta { text-align: center; padding: 60px 0 20px; }
.landing-final-cta .landing-section-title { margin-bottom: 22px; }
.hero-eyebrow-free { display: none; }

/* ---------- responsive ---------- */
@media (max-width: 980px) {
  .two-col { grid-template-columns: 1fr; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .kanban-board { grid-template-columns: repeat(3, minmax(220px, 1fr)); }
  .landing-preview { grid-template-columns: 1fr; }
  .landing-preview-board { grid-template-columns: repeat(2, 1fr); }
  .landing-steps, .feature-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .sidebar { position: fixed; inset: 0 auto 0 0; z-index: 40; transform: translateX(100%); transition: transform 0.2s ease; }
  .theme-light .sidebar, .theme-dark .sidebar { }
  .sidebar-open { transform: translateX(0); }
  .sidebar-scrim { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 39; }
  .only-mobile { display: flex; }
  .search-input { width: 150px; }
  .topbar { padding: 14px 16px; }
  .view-pad { padding: 16px 16px 50px; }
  .filter-bar-wrap { padding: 12px 16px 0; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .kanban-board { grid-template-columns: repeat(2, minmax(200px, 1fr)); }
  .modal-row { grid-template-columns: 1fr 1fr; }
  .landing-headline { font-size: 30px; }
  .landing-steps, .feature-grid { grid-template-columns: 1fr; }
}
`;
