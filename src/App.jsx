import { useState, useEffect, useRef } from "react";
import {
  NotebookPen,
  BookOpen,
  Mic,
  Square,
  Paperclip,
  Star,
  ChevronLeft,
  Sparkles,
  Check,
  Clock,
  RotateCcw,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Undo2,
  Home,
  CalendarDays,
  LogOut,
  Settings,
  Pencil,
  Trash2,
  Flame,
  ListTodo,
  BarChart3,
  Zap,
  Download,
  Upload,
  ShieldCheck,
} from "lucide-react";

const GLOBAL_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
@keyframes planCardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes popIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes berryFloat { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-4px) rotate(2deg); } }
@keyframes softPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
@keyframes ribbonSway { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
.pretty-card { position: relative; box-shadow: 0 8px 24px -18px rgba(112,73,70,.45); }
.pretty-card::after { content:''; }
.gingham { background-image:none; }
button { -webkit-tap-highlight-color: transparent; }
button:active { transform: scale(.98); }
* { box-sizing: border-box; }
button, input, select { font-family: inherit; }
::-webkit-scrollbar { width: 0; height: 0; }

/* Pencil-doodle icon treatment: preserves every button/action while making
   the existing SVG icon set feel hand-drawn instead of like phone emoji. */
svg.lucide { stroke:#9A7772; stroke-width:1.55; filter:drop-shadow(.25px .35px 0 rgba(168,144,120,.20)); }

`;

const LIGHT_COLORS = {
  page: "#FBECEF",
  paper: "#FFF7F8",
  card: "#FFFBFC",
  ruleLine: "#EED9DE",
  ink: "#574443",
  muted: "#A18480",
  yellow: "#F4D58D",
  coral: "#E8A7B2",
  mint: "#A9C7B2",
  strawberry: "#D98795",
  leaf: "#8EAF8F",
};
const DARK_COLORS = {
  page: "#221720",
  paper: "#2C1E29",
  card: "#3A2733",
  ruleLine: "#4A3540",
  ink: "#FDEDF1",
  muted: "#C79FB0",
  yellow: "#FFD166",
  coral: "#FF8080",
  mint: "#3BD6C6",
};

const RANK_LABELS = ["1순위", "2순위", "3순위"];
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
function pickMealDay(meals, t) {
  const days = meals?.days || {};
  if (days[t]) return { key: t, m: days[t], isToday: true };
  const k = Object.keys(days).filter((d) => d > t).sort()[0];
  return k ? { key: k, m: days[k], isToday: false } : null;
}
function mealDayLabel(md) {
  if (!md) return "오늘 봉룡학사";
  return md.isToday ? "오늘 봉룡학사" : `${WEEKDAY_LABELS[new Date(md.key).getDay()]}요일 봉룡학사 미리보기`;
}
const DAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"];
const DOW_TO_DAY = { 0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토" };

const SUPABASE_URL = "https://vmwypncwbxgcyyvtprag.supabase.co";
const SUPABASE_KEY = "sb_publishable_Lv_yeQVMU-XuEW5Fu7_2IQ_EzJZ3Z2T";
const SB_REFRESH_KEY = "sb-refresh-token-v1";
const DARK_MODE_KEY = "dark-mode-v1";
const NOTIF_DATE_KEY = "last-notif-date-v1";
const MILESTONES = [7, 30, 100, 365];
const LOCAL_EXTRAS_PREFIX = "today-gap-extras-v1:";

function loadLocalExtras(userId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_EXTRAS_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return { planHistory: parsed.planHistory || [], gapHistory: parsed.gapHistory || [] };
  } catch (e) {
    return { planHistory: [], gapHistory: [] };
  }
}

function saveLocalExtras(userId, data) {
  try {
    localStorage.setItem(`${LOCAL_EXTRAS_PREFIX}${userId}`, JSON.stringify({
      planHistory: data.planHistory || [],
      gapHistory: data.gapHistory || [],
    }));
  } catch (e) {}
}

function supabasePayload(data) {
  const { planHistory, gapHistory, ...cloudData } = data;
  return cloudData;
}

const CHORE_PRESETS = [
  { name: "빨래 개기", estMin: 15 },
  { name: "설거지", estMin: 10 },
  { name: "청소기 돌리기", estMin: 20 },
  { name: "분리수거", estMin: 10 },
  { name: "침구 정리", estMin: 10 },
];

const CLASS_TYPES = ["수업", "알바", "동아리", "기타"];

/* ===== 책장 ===== */
const DIARY_SRC = "diary/index.html";
const SCAN_SRC = "scan/index.html";
/* 공지 데이터 주소 — GitHub에 크롤러 올린 뒤 아래 USER/REPO만 바꾸면 돼 */
const JOBS_URL = "https://raw.githubusercontent.com/happyeonse05/skku-jobs/main/data/jobs.json";
const JOBS_HIDE_KEY = "teum-jobs-hide-v1";
const MEALS_URL = JOBS_URL.replace("jobs.json", "meals.json");
const SHELF_PREFIX = "teum-shelf-v1:";
const BOOK_COLORS = ["#E8A7B2", "#F4D58D", "#A9C7B2", "#B9C6E8", "#D4BBE8", "#E8C4A7"];
const UNDERSTAND = [
  { key: "ok", label: "이해함", color: "#8EAF8F" },
  { key: "review", label: "복습 필요", color: "#F4D58D" },
  { key: "no", label: "모르겠음", color: "#E8A7B2" },
];
const SHELF_LIMIT_FILES = 30;
const SHELF_LIMIT_MB = 300;
const PLAN_API_URL = import.meta.env.VITE_PLAN_API_URL || "/api/plan";
const SUMMARY_API_URL = import.meta.env.VITE_SUMMARY_API_URL || PLAN_API_URL;
const VISION_API_URL = import.meta.env.VITE_VISION_API_URL || "/api/vision";
const DELETE_ACCOUNT_API_URL = import.meta.env.VITE_DELETE_ACCOUNT_API_URL || "/api/delete-account";

function loadShelf(userId) {
  try {
    const raw = localStorage.getItem(`${SHELF_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveShelf(userId, shelf) {
  try { localStorage.setItem(`${SHELF_PREFIX}${userId}`, JSON.stringify(shelf)); return true; }
  catch (e) { return false; }
}
function shelfUsage(shelf) {
  let files = 0, bytes = 0;
  Object.values(shelf || {}).forEach((book) => {
    (book.entries || []).forEach((en) => {
      (en.files || []).forEach((f) => { files += 1; bytes += f.size || 0; });
    });
  });
  return { files, mb: bytes / 1048576 };
}
function fmtSize(b) {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${Math.round(b / 1024)}KB`;
  return `${(b / 1048576).toFixed(1)}MB`;
}
async function extractPdfPages(file, fromPage, toPage) {
  const pdfjs = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const start = Math.max(1, Number(fromPage) || 1);
  const end = Math.min(pdf.numPages, Math.max(start, Number(toPage) || start));
  const pages = [];
  for (let n = start; n <= end; n += 1) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    pages.push(`[${n}페이지]\n` + content.items.map((i) => i.str).join(" "));
  }
  return { text: pages.join("\n\n"), pageCount: pdf.numPages, start, end };
}
function dataUrlToFile(record) {
  if (!record?.url || !record.url.includes(",")) return null;
  const [meta, encoded] = record.url.split(",", 2);
  const mime = record.type || meta.match(/^data:([^;]+)/)?.[1] || "application/pdf";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], record.name || "자료.pdf", { type: mime });
}
const SUMMARY_MODES = {
  "핵심 요약": "핵심 개념을 소제목과 불릿으로 간결하게 정리하고, 마지막에 꼭 기억할 내용 3개를 적어줘.",
  "시험 대비": "시험에 나올 정의·원리·공식·함정을 중심으로 정리하고 예상 확인문제 3개를 만들어줘.",
  "쉽게 설명": "처음 배우는 대학생도 이해하게 쉬운 말과 짧은 예시로 설명해줘.",
  "공식·용어": "중요한 공식과 용어만 골라 뜻·기호·사용 조건을 읽기 쉽게 정리해줘.",
  "강의계획서": "교수명, 강의실, 평가 비율, 출석 기준, 교재, 시험·과제·발표 일정, 주차별 진도를 추출해 정리해줘. 원문에 없으면 '기재 없음'이라고 써.",
  "대본 3종 정리": "이 자료는 녹음 수업 대본이야. 너무 축약하지 말고, 교수님의 설명 흐름·예시·비교·반복 강조·질문과 답변을 최대한 보존해 다음 세 부분을 모두 만들어줘. 1) 원문 보존형 정리: 말버릇과 중복만 덜어내고 거의 그대로 정리 2) 짧은 핵심 요약: 시험 직전에 보는 핵심만 간결하게 정리 3) 가독성 좋은 필기본: 소제목·개념·예시·교수님 강조·시험 포인트를 구조화. 원문에 없는 사실은 만들지 마.",
};

function subjectsFromClasses(classes) {
  const seen = [];
  (classes || []).forEach((c) => {
    if (c.type && c.type !== "수업") return;
    const nm = (c.name || "").trim();
    if (nm && !seen.includes(nm)) seen.push(nm);
  });
  return seen;
}


function LeafMark({ size = 56 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{display:"block",margin:"0 auto 10px"}}>
      <circle cx="50" cy="50" r="43" fill="#fff" stroke="#1E4F91" strokeWidth="3"/>
      <path d="M50 13 C32 15 20 26 18 42 C16 57 28 66 43 69 C55 72 62 76 60 82 C58 88 45 88 35 83 C28 80 23 75 20 70" fill="none" stroke="#1E4F91" strokeWidth="7" strokeLinecap="round"/>
      <path d="M50 22 C39 22 29 27 24 35 C20 41 21 47 25 52 C30 58 38 61 48 63 C59 65 69 68 74 75" fill="none" stroke="#8CC63F" strokeWidth="8" strokeLinecap="round"/>
      <path d="M50 22 C66 23 77 31 81 43 C85 56 77 66 67 70 C62 72 58 74 57 79" fill="none" stroke="#F4A62A" strokeWidth="5" strokeLinecap="round"/>
      <path d="M50 20 L50 14" stroke="#1E4F91" strokeWidth="2.5" strokeLinecap="round"/>
      <text x="50" y="94" textAnchor="middle" fontSize="8" fontWeight="700" fill="#1E4F91">1398</text>
    </svg>
  );
}
function StrawberryDoodle({ size = 42, style = {} }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={style} aria-hidden="true">
      <path d="M18 20c5-6 23-6 28 0 5 7-1 28-14 36C19 48 13 27 18 20Z" fill="#E8AAB5" stroke="#A89078" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M23 18c1-6 5-10 9-11-1 5 0 8 1 10 4-5 9-6 13-4-3 4-7 6-12 7-5 0-8 0-11-2Z" fill="#B8C8AD" stroke="#A89078" strokeWidth="1.7" strokeLinejoin="round"/>
      <g fill="#FBE8B7">
        <ellipse cx="25" cy="29" rx="1.5" ry="2"/><ellipse cx="37" cy="27" rx="1.5" ry="2"/>
        <ellipse cx="31" cy="37" rx="1.5" ry="2"/><ellipse cx="22" cy="39" rx="1.5" ry="2"/><ellipse cx="39" cy="40" rx="1.5" ry="2"/>
      </g>
    </svg>
  );
}

function TinyFlower({ style = {} }) {
  return <svg viewBox="0 0 28 28" width="18" height="18" style={{position:'absolute',...style}} aria-hidden="true">
    <g fill="none" stroke="#A89078" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 13c-7-8-12-1-6 3-5 5 2 10 6 3 4 7 11 2 6-3 6-4 1-11-6-3Z" fill="#F5D9DF"/>
      <circle cx="14" cy="16" r="2.2" fill="#F3D9A8"/>
    </g>
  </svg>;
}

function WashiTape({ children, style = {} }) {
  return <span style={{ display:'inline-block', padding:'5px 13px', background:'#F6E2D1', color:'#765B57', transform:'rotate(-1.5deg)', fontWeight:800, fontSize:15, boxShadow:'0 2px 0 rgba(118,91,87,.08)', ...style }}>{children}</span>;
}

function RibbonDoodle({ size = 44, style = {} }) {
  return (
    <svg viewBox="0 0 80 52" width={size} style={style} aria-hidden="true">
      <path d="M40 26C29 8 11 9 10 19c-1 9 14 12 30 7Z" fill="#F3C7C5" stroke="#A89078" strokeWidth="2"/>
      <path d="M40 26C51 8 69 9 70 19c1 9-14 12-30 7Z" fill="#F3C7C5" stroke="#A89078" strokeWidth="2"/>
      <path d="M35 29 24 48l16-8 7 9 1-21Z" fill="#F7D8D4" stroke="#A89078" strokeWidth="2" strokeLinejoin="round"/>
      <ellipse cx="40" cy="26" rx="8" ry="7" fill="#F8DDD8" stroke="#A89078" strokeWidth="2"/>
    </svg>
  );
}

function BerrySprig({ style = {} }) {
  return <div aria-hidden="true" style={{display:'flex',alignItems:'center',gap:2,...style}}><svg viewBox="0 0 24 24" width="15" height="15" style={{marginLeft:-3}} aria-hidden="true"><path d="M3 17c6-1 9-5 12-12M10 10c-4-1-6 1-7 4 3 1 6 0 7-4Zm3-3c1-4 4-5 7-4 0 3-2 6-7 4Z" fill="none" stroke="#91AF91" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></div>;
}

function signInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&apikey=${SUPABASE_KEY}&redirect_to=${encodeURIComponent(redirectTo)}`;
}
async function supabaseRefresh(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error("세션이 만료됐어요.");
  return json;
}
async function fetchSupabaseUser(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error("사용자 정보를 가져오지 못했어요.");
  return json;
}
async function fetchUserRow(accessToken, userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error("데이터를 불러오지 못했어요.");
  return json[0] || null;
}
async function upsertUserRow(accessToken, userId, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({ user_id: userId, ...payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error("저장하지 못했어요.");
  return json[0];
}

function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayKey() {
  return toKey(new Date());
}
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toKey(d);
}
function todayLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_LABELS[d.getDay()]})`;
}
function todayDayName() {
  return DOW_TO_DAY[new Date().getDay()];
}
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minToTime(m) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}
function classesForWeekday(classes, dayName) {
  return classes.filter((c) => (!c.dayMode || c.dayMode === "weekday") && c.day === dayName);
}
function computeGapsForDay(classes, dayName, dateKey, dayStart = "09:00", dayEnd = "22:00", minGap = 20) {
  const dayClasses = classes
    .filter((c) => {
      if (c.dayMode === "daily") return true;
      if (c.dayMode === "date") return c.date === dateKey;
      if (c.dayMode === "none") return false;
      return c.day === dayName;
    })
    .sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
  const gaps = [];
  let cursor = timeToMin(dayStart);
  const end = timeToMin(dayEnd);
  for (const c of dayClasses) {
    const s = timeToMin(c.start);
    const e = timeToMin(c.end);
    if (s > cursor && s - cursor >= minGap) gaps.push({ start: minToTime(cursor), end: minToTime(s) });
    cursor = Math.max(cursor, e);
  }
  if (end - cursor >= minGap) gaps.push({ start: minToTime(cursor), end: minToTime(end) });
  return gaps;
}
function classMinutesForDay(classes, dayName) {
  const list = classes.filter((c) => c.dayMode === "daily" || ((!c.dayMode || c.dayMode === "weekday") && c.day === dayName));
  return list.reduce((sum, c) => sum + (timeToMin(c.end) - timeToMin(c.start)), 0);
}
function classConflicts(classes, candidate) {
  if (candidate.dayMode === "none") return [];
  const sameScope = (c) => {
    if (c.dayMode === "none") return false;
    if (candidate.dayMode === "daily" || c.dayMode === "daily") return true;
    if (candidate.dayMode === "date") return c.dayMode === "date" && c.date === candidate.date;
    if (c.dayMode === "date") return false;
    return c.day === candidate.day;
  };
  const start = timeToMin(candidate.start), end = timeToMin(candidate.end);
  return classes.filter((c) => sameScope(c) && start < timeToMin(c.end) && end > timeToMin(c.start));
}
function nextUpcomingClass(classes) {
  const now = new Date();
  for (let offset = 0; offset < 8; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const dateKey = toKey(date);
    const dayName = DOW_TO_DAY[date.getDay()];
    const currentMin = offset === 0 ? now.getHours() * 60 + now.getMinutes() : -1;
    const matches = (classes || []).filter((c) => {
      if (c.type && c.type !== "수업") return false;
      if (!c.start || !c.end) return false;
      if (c.dayMode === "none") return false;
      if (c.dayMode === "daily") return true;
      if (c.dayMode === "date") return c.date === dateKey;
      return c.day === dayName;
    }).filter((c) => offset > 0 || timeToMin(c.end) > currentMin)
      .sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
    if (matches.length) return { classItem: matches[0], dateKey, dayName, offset };
  }
  return null;
}
function daysUntil(dueStr) {
  const [y, m, d] = dueStr.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - startOfToday) / 86400000);
}
function ddayLabel(diff) {
  if (diff === 0) return "D-DAY";
  if (diff > 0) return `D-${diff}`;
  return `D+${-diff}`;
}
function ddayColor(diff, colors) {
  if (diff <= 0) return colors.coral;
  if (diff <= 2) return colors.coral;
  if (diff <= 5) return colors.yellow;
  return colors.muted;
}
function bumpStreak(streak) {
  const today = todayKey();
  const s = streak || { count: 0, lastDate: null };
  if (s.lastDate === today) return s;
  if (s.lastDate === yesterdayKey()) return { count: s.count + 1, lastDate: today };
  return { count: 1, lastDate: today };
}

function defaultUserData() {
  return {
    classes: [],
    tasks: [],
    completed: {},
    postponed: {},
    plan: null,
    streak: { count: 0, lastDate: null },
    totalCompleted: 0,
    choreHistory: {},
    completionLog: {},
    celebratedMilestones: [],
    splits: {},
    prepByClass: {},
    planHistory: [],
    gapHistory: [],
  };
}

function StatusIcons({ colors }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="17" height="11" viewBox="0 0 18 12" fill="none">
        <rect x="0" y="8" width="3" height="4" rx="0.5" fill={colors.ink} />
        <rect x="5" y="5" width="3" height="7" rx="0.5" fill={colors.ink} />
        <rect x="10" y="2" width="3" height="10" rx="0.5" fill={colors.ink} />
        <rect x="15" y="0" width="3" height="12" rx="0.5" fill={colors.ink} opacity="0.35" />
      </svg>
      <svg width="15" height="11" viewBox="0 0 16 12" fill="none">
        <path d="M1 4C5 0 11 0 15 4" stroke={colors.ink} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M3.5 7C6 4.5 10 4.5 12.5 7" stroke={colors.ink} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="8" cy="10" r="1.2" fill={colors.ink} />
      </svg>
      <svg width="22" height="11" viewBox="0 0 24 12" fill="none">
        <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke={colors.ink} strokeWidth="1" />
        <rect x="21.5" y="4" width="2" height="4" rx="1" fill={colors.ink} />
        <rect x="2" y="2" width="17" height="8" rx="1.2" fill={colors.ink} />
      </svg>
    </div>
  );
}

export default function TodayGapPlanner() {
  const [auth, setAuth] = useState(undefined);
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem(DARK_MODE_KEY) === "1"; } catch (e) { return false; }
  });
  const [notifPermission, setNotifPermission] = useState(() => {
    try { return typeof Notification !== "undefined" ? Notification.permission : "default"; } catch (e) { return "default"; }
  });
  const [celebrateMilestone, setCelebrateMilestone] = useState(null);

  const COLORS = darkMode ? DARK_COLORS : LIGHT_COLORS;
  const RANK_COLORS = [COLORS.yellow, COLORS.coral, COLORS.mint];
  const TYPE_COLOR = { 수업: COLORS.mint, 알바: COLORS.coral, 동아리: COLORS.yellow, 기타: COLORS.muted };

  function toggleDarkMode() {
    setDarkMode((v) => {
      const next = !v;
      try { localStorage.setItem(DARK_MODE_KEY, next ? "1" : "0"); } catch (e) {}
      return next;
    });
  }
  function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((perm) => setNotifPermission(perm));
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveWarning, setSaveWarning] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [onboardDismissed, setOnboardDismissed] = useState(() => { try { return localStorage.getItem("damda-onboard-v1") === "1"; } catch { return true; } });
  function dismissOnboard() { try { localStorage.setItem("damda-onboard-v1", "1"); } catch {} setOnboardDismissed(true); }
  const [statsRange, setStatsRange] = useState(7);
  const [energyLevel, setEnergyLevel] = useState("보통");
  const [newTask, setNewTask] = useState({ name: "", due: "", start: todayKey(), estMin: "", noDue: false, estUnknown: false });
  const [newClass, setNewClass] = useState({ name: "", day: todayDayName(), date: todayKey(), start: "", end: "", type: "수업", dayMode: "weekday" });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", due: "", start: "", estMin: "", noDue: false, estUnknown: false });
  const [meals, setMeals] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [jobsErr, setJobsErr] = useState(false);
  const [jobsSort, setJobsSort] = useState("마감순");
  const [jobsHide, setJobsHide] = useState(() => {
    try { return JSON.parse(localStorage.getItem(JOBS_HIDE_KEY) || "[]"); } catch (e) { return []; }
  });
  const [shelf, setShelf] = useState({});
  const [scanOpen, setScanOpen] = useState(false);
  const [ttLoading, setTtLoading] = useState(false);
  const [ttError, setTtError] = useState("");
  const [ttFound, setTtFound] = useState(null);   // OCR 결과 확인 목록
  const ttInputRef = useRef(null);
  const [openBook, setOpenBook] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState(null);
  const [pdfFrom, setPdfFrom] = useState("1");
  const [pdfTo, setPdfTo] = useState("5");
  const [sumMode, setSumMode] = useState("핵심 요약");
  const [sumLoading, setSumLoading] = useState(false);
  const [sumError, setSumError] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [prepDraft, setPrepDraft] = useState("");
  const [prepEditing, setPrepEditing] = useState(false);
  const [recording, setRecording] = useState(null);
  const [trBusyId, setTrBusyId] = useState(null);
  const recRef = useRef(null);
  const fileInputRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    const upcoming = nextUpcomingClass(data?.classes || []);
    setPrepDraft(upcoming ? data?.prepByClass?.[upcoming.classItem.name] || "" : "");
    setPrepEditing(false);
  }, [data?.classes, data?.prepByClass]);

  useEffect(() => {
    if (!data || meals) return;
    fetch(`${MEALS_URL}?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m) => setMeals(m))
      .catch(() => setMeals({ days: {} }));
  }, [data]);

  useEffect(() => {
    if (!data || jobs || jobsErr) return;
    fetch(`${JOBS_URL}?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setJobs(j))
      .catch(() => setJobsErr(true));
  }, [data]);

  useEffect(() => {
    if (activeTab !== "jobs" || jobs) return;
    fetch(`${JOBS_URL}?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setJobs(j))
      .catch(() => setJobsErr(true));
  }, [activeTab]);

  function hideJob(id) {
    setJobsHide((prev) => {
      const next = [...prev, id].slice(-200);
      try { localStorage.setItem(JOBS_HIDE_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }
  function jobToTask(j) {
    updateData((prev) => ({ ...prev, tasks: [...prev.tasks, {
      id: `t${Date.now()}`, name: j.title.slice(0, 40), due: j.due || "",
      start: todayKey(), estMin: 20, done: false,
    }] }));
    alert("할 일에 담았어요");
  }

  async function readTimetableImage(file) {
    if (!file) return;
    setTtError(""); setTtLoading(true); setTtFound(null);
    try {
      const dataUrl = await new Promise((res, rej) => {
        const img = new Image();
        const fr = new FileReader();
        fr.onload = () => { img.src = fr.result; };
        fr.onerror = rej;
        img.onload = () => {
          const max = 1500;
          const sc = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = rej;
        fr.readAsDataURL(file);
      });
      const b64 = dataUrl.split(",")[1];
      const prompt = `이 이미지는 대학 시간표야. 수업만 JSON 배열로 뽑아줘.
형식: [{"name":"과목명","day":"월","start":"09:00","end":"10:15","room":"강의실"}]
규칙:
- day는 월 화 수 목 금 토 일 중 한 글자
- 한 과목이 여러 요일이면 요일마다 따로 한 줄
- 시간은 24시간 HH:MM
- 교시만 있으면 1교시 09:00~09:50, 이후 매 교시 60분 간격으로 환산
- 강의실 없으면 room은 빈 문자열
- JSON 배열만 출력. 설명·코드블록 금지.`;
      const r = await fetch(VISION_API_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, mediaType: "image/jpeg", prompt }),
      });
      const rd = await r.json();
      if (!r.ok) throw new Error(rd.error || "시간표를 읽지 못했어요.");
      const text = (rd.content || []).map((b) => b.text || "").join("");
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) throw new Error("시간표 표를 찾지 못했어요. 표가 잘 보이게 다시 찍어 주세요.");
      const arr = JSON.parse(m[0]).filter(
        (x) => x && x.name && /^[월화수목금토일]$/.test(x.day) && /^\d{1,2}:\d{2}$/.test(x.start) && /^\d{1,2}:\d{2}$/.test(x.end)
      );
      if (!arr.length) throw new Error("읽어낸 수업이 없어요.");
      setTtFound(arr.map((x, i) => ({ ...x, _id: i, use: true })));
    } catch (e) {
      setTtError(e?.message || "시간표를 읽지 못했어요.");
    } finally {
      setTtLoading(false);
    }
  }
  function saveTimetable() {
    const picked = (ttFound || []).filter((x) => x.use);
    if (!picked.length) return;
    updateData((prev) => ({
      ...prev,
      classes: [
        ...prev.classes,
        ...picked.map((x, i) => ({
          id: `c${Date.now()}${i}`,
          name: x.room ? `${x.name} (${x.room})` : x.name,
          day: x.day, start: x.start, end: x.end,
          type: "수업", dayMode: "weekday",
        })),
      ],
    }));
    setTtFound(null);
  }

  /* ===== 과제 자동 분할 ===== */
  function splitTaskIntoGaps(task) {
    const total = Number(task.estMin) || 60;
    const chunkMax = 50, chunkMin = 20;
    const out = [];
    let left = total;
    const start = new Date();
    const due = task.due ? new Date(task.due) : null;
    for (let i = 0; i < 14 && left >= chunkMin; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (due && d > due) break;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const gaps = computeGapsForDay(data.classes, WEEKDAY_LABELS[d.getDay()], key);
      for (const g of gaps) {
        if (left < chunkMin) break;
        const avail = timeToMin(g.end) - timeToMin(g.start);
        if (avail < chunkMin) continue;
        const use = Math.min(chunkMax, avail - 5, left);
        if (use < chunkMin) continue;
        out.push({ date: key, day: WEEKDAY_LABELS[d.getDay()], start: g.start, end: minToTime(timeToMin(g.start) + use), min: use });
        left -= use;
      }
    }
    return { slots: out, left };
  }
  function applySplit(task) {
    const { slots, left } = splitTaskIntoGaps(task);
    if (!slots.length) { alert("마감까지 남은 공강이 없어요. 시간표를 먼저 등록해 보세요."); return; }
    updateData((prev) => ({
      ...prev,
      splits: { ...(prev.splits || {}), [task.id]: { slots, left, at: Date.now() } },
    }));
  }
  function clearSplit(taskId) {
    updateData((prev) => {
      const sp = { ...(prev.splits || {}) };
      delete sp[taskId];
      return { ...prev, splits: sp };
    });
  }

  function updateShelf(fn) {
    setShelf((prev) => {
      const next = fn(prev);
      if (auth?.userId) saveShelf(auth.userId, next);
      return next;
    });
  }
  function getBook(name) {
    return shelf[name] || { entries: [], color: null };
  }
  function addEntry(subject, patch) {
    updateShelf((prev) => {
      const book = prev[subject] || { entries: [] };
      const entry = {
        id: `e${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
        date: todayKey(), memo: "", understand: null, star: false, files: [], source: null, ...patch,
      };
      return { ...prev, [subject]: { ...book, entries: [entry, ...(book.entries || [])] } };
    });
  }
  function patchEntry(subject, id, patch) {
    updateShelf((prev) => {
      const book = prev[subject]; if (!book) return prev;
      return { ...prev, [subject]: { ...book,
        entries: book.entries.map((en) => (en.id === id ? { ...en, ...patch } : en)) } };
    });
  }
  function removeEntry(subject, id) {
    updateShelf((prev) => {
      const book = prev[subject]; if (!book) return prev;
      return { ...prev, [subject]: { ...book, entries: book.entries.filter((en) => en.id !== id) } };
    });
  }
  async function pickPdf(f) {
    setSumError(""); setPdfFile(f); setPdfPages(null);
    if (!f) return;
    try {
      const info = await extractPdfPages(f, 1, 1);
      setPdfPages(info.pageCount);
      setPdfTo(String(Math.min(info.pageCount, 5)));
    } catch (e) { setSumError("PDF를 읽지 못했어요."); }
  }
  async function summarizePdf(subject) {
    const a = Number(pdfFrom), b = Number(pdfTo);
    if (!pdfFile) { setSumError("PDF를 먼저 골라 주세요."); return; }
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a) { setSumError("페이지 범위를 확인해 주세요."); return; }
    if (b - a + 1 > 30) { setSumError("한 번에 30페이지까지만 정리할 수 있어요."); return; }
    setSumLoading(true); setSumError("");
    try {
      const ex = await extractPdfPages(pdfFile, a, b);
      if (ex.text.replace(/\[\d+페이지\]/g, "").trim().length < 30)
        throw new Error("스캔 PDF는 글자를 읽을 수 없어요. 텍스트가 선택되는 PDF를 올려 주세요.");
      const prompt = `너는 대학 수업자료 정리 도우미야. ${SUMMARY_MODES[sumMode]}\n\n과목: ${subject}\n파일: ${pdfFile.name}\n범위: ${ex.start}~${ex.end}페이지\n\n원문:\n${ex.text.slice(0, 80000)}\n\n한국어로만 답하고 원문에 없는 사실은 만들지 마.`;
      const url = SUMMARY_API_URL;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const rd = await res.json();
      if (!res.ok) throw new Error(rd.error || "정리를 만들지 못했어요.");
      const text = typeof rd.text === "string" ? rd.text
        : typeof rd.content === "string" ? rd.content
        : (rd.content || []).map((b2) => b2.text || "").join("\n");
      if (!text.trim()) throw new Error("결과가 비어 있어요.");
      addEntry(subject, {
        memo: `[${sumMode} · ${pdfFile.name} ${ex.start}~${ex.end}p]\n` + text.trim(),
        understand: "review",
        source: { kind: "PDF", name: pdfFile.name, pages: `${ex.start}~${ex.end}p`, mode: sumMode },
      });
      setPdfFile(null); setPdfPages(null);
    } catch (e) {
      setSumError(e?.message || "정리하지 못했어요.");
    } finally { setSumLoading(false); }
  }
  async function analyzeProfessorStyle(subject) {
    const book = getBook(subject);
    const allFiles = (book.entries || []).flatMap((entry) => entry.files || []);
    const pdfs = allFiles.filter((file) => file.type === "application/pdf" || /\.pdf$/i.test(file.name || ""));
    const transcripts = allFiles.filter((file) => file.type === "transcript" && file.text);
    if (!pdfs.length && !transcripts.length) {
      setAnalysisError("먼저 회차의 ‘자료 추가’로 강의계획서·PPT·대본·족보 PDF를 넣거나 수업을 녹음해 주세요.");
      return;
    }
    setAnalysisLoading(true); setAnalysisError("");
    try {
      const parts = [];
      for (const record of pdfs.slice(0, 8)) {
        const file = dataUrlToFile(record);
        if (!file) continue;
        const first = await extractPdfPages(file, 1, 1);
        const end = Math.min(first.pageCount, 20);
        const extracted = end > 1 ? await extractPdfPages(file, 1, end) : first;
        parts.push(`[자료: ${record.name} · 1~${extracted.end}페이지]\n${extracted.text}`);
      }
      for (const t of transcripts.slice(0, 4)) {
        parts.push(`[자료: ${t.name} · 녹음 대본]\n${(t.text || "").slice(0, 20000)}`);
      }
      const sourceText = parts.join("\n\n====================\n\n").slice(0, 90000);
      if (sourceText.replace(/\[자료:[^\n]+\]/g, "").trim().length < 50)
        throw new Error("분석할 PDF 글자를 읽지 못했어요. 텍스트가 선택되는 PDF를 넣어 주세요.");
      const prompt = `너는 대학 교수의 수업자료와 기출을 분석하는 시험 대비 도우미야.
아래 자료들을 서로 비교해서 이 과목의 교수님 출제 성향을 분석하고 예상문제를 만들어줘.

반드시 다음 순서로 답해:
1. 출제 스타일 한눈에 보기: 개념형·계산형·암기형·서술형 비중을 자료 근거와 함께 추정
2. 교수님이 반복·강조한 내용
3. 자료별 중요도와 시험 가능성이 높은 단원
4. 자주 나올 문제 형식과 풀이에서 요구되는 것
5. 예상문제 10개: 문제·정답·간단한 해설·출제 근거를 포함
6. 불확실한 추정: 자료만으로 확정할 수 없는 내용은 명확히 표시

강의계획서는 시험 범위와 일정 확인에, PPT는 수업에서 다룬 개념 확인에, 녹음 대본은 교수님이 실제로 강조한 말 확인에, 족보·기출은 실제 출제 형식 확인에 우선 사용해.
원문에 없는 사실이나 교수님의 사적인 성격은 추측하지 말고, 자료에서 확인되는 수업·출제 성향만 분석해.
한국어로만 답해.

과목: ${subject}

자료 원문:
${sourceText}`;
      const url = SUMMARY_API_URL;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const rd = await res.json();
      if (!res.ok) throw new Error(rd.error || "출제 스타일을 분석하지 못했어요.");
      const text = typeof rd.text === "string" ? rd.text
        : typeof rd.content === "string" ? rd.content
        : (rd.content || []).map((b2) => b2.text || "").join("\n");
      if (!text.trim()) throw new Error("분석 결과가 비어 있어요.");
      addEntry(subject, {
        memo: `[교수님 출제 스타일 분석 · ${pdfs.length + transcripts.length}개 자료]\n` + text.trim(),
        understand: "review",
        source: { kind: "AI 분석", name: [...pdfs.slice(0, 8), ...transcripts.slice(0, 4)].map((f) => f.name).join(", "), mode: "강의계획서·PPT·대본·족보 비교" },
      });
    } catch (e) {
      setAnalysisError(e?.message || "출제 스타일을 분석하지 못했어요.");
    } finally { setAnalysisLoading(false); }
  }
  async function summarizeTranscript(subject, record) {
    if (!record?.text) return;
    setTrBusyId(record.id); setSumError("");
    try {
      const prompt = `너는 대학 수업자료 정리 도우미야. ${SUMMARY_MODES["대본 3종 정리"]}\n\n과목: ${subject}\n자료: ${record.name}\n\n원문:\n${record.text.slice(0, 80000)}\n\n한국어로만 답하고 원문에 없는 사실은 만들지 마.`;
      const res = await fetch(SUMMARY_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const rd = await res.json();
      if (!res.ok) throw new Error(rd.error || "필기본을 만들지 못했어요.");
      const text = typeof rd.text === "string" ? rd.text
        : typeof rd.content === "string" ? rd.content
        : (rd.content || []).map((b2) => b2.text || "").join("\n");
      if (!text.trim()) throw new Error("결과가 비어 있어요.");
      addEntry(subject, {
        memo: `[대본 3종 정리 · ${record.name}]\n` + text.trim(),
        understand: "review",
        source: { kind: "녹음 대본", name: record.name, mode: "대본 3종 정리" },
      });
    } catch (e) {
      setSumError(e?.message || "필기본을 만들지 못했어요.");
    } finally { setTrBusyId(null); }
  }

  async function attachFiles(subject, entryId, fileList) {
    const usage = shelfUsage(shelf);
    const files = Array.from(fileList || []);
    for (const f of files) {
      if (usage.files >= SHELF_LIMIT_FILES) { alert(`자료는 ${SHELF_LIMIT_FILES}개까지 보관할 수 있어요`); break; }
      if (usage.mb + f.size / 1048576 > SHELF_LIMIT_MB) { alert(`보관 용량(${SHELF_LIMIT_MB}MB)을 넘었어요`); break; }
      const dataUrl = await new Promise((res) => {
        const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(f);
      });
      if (!dataUrl) continue;
      usage.files += 1; usage.mb += f.size / 1048576;
      const rec = { id: `f${Date.now()}${Math.random().toString(36).slice(2, 5)}`, name: f.name, size: f.size, type: f.type, url: dataUrl };
      updateShelf((prev) => {
        const book = prev[subject]; if (!book) return prev;
        return { ...prev, [subject]: { ...book,
          entries: book.entries.map((en) => (en.id === entryId ? { ...en, files: [...(en.files || []), rec] } : en)) } };
      });
    }
  }
  async function toggleRecord(subject, entryId) {
    if (recording && recording.entryId === entryId) {
      try { recRef.current && recRef.current.stop(); } catch (e) {}
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      // 라이브 텍스트 변환 — 지원 브라우저(크롬 최적)에서 녹음과 동시에 대본을 만들어요
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const finals = [];
      let rc = null;
      if (SR) {
        try {
          rc = new SR();
          rc.lang = "ko-KR"; rc.continuous = true; rc.interimResults = false;
          rc.onresult = (ev) => { for (let i = ev.resultIndex; i < ev.results.length; i++) { if (ev.results[i].isFinal) finals.push(ev.results[i][0].transcript.trim()); } };
          rc.onend = () => { if (recRef.current === mr) { try { rc.start(); } catch {} } };
          rc.start();
        } catch { rc = null; }
      }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (rc) { try { rc.onend = null; rc.stop(); } catch {} }
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        const url = await new Promise((res) => {
          const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob);
        });
        const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
        const stamp = Date.now();
        const rec = { id: `r${stamp}`, name: `녹음 ${mins}분`, size: blob.size, type: "audio", url };
        const spoken = finals.join(" ").replace(/\s+/g, " ").trim();
        const tr = spoken.length >= 20 ? { id: `t${stamp}`, name: `녹음 대본 ${mins}분`, size: spoken.length, type: "transcript", text: spoken } : null;
        updateShelf((prev) => {
          const book = prev[subject]; if (!book) return prev;
          return { ...prev, [subject]: { ...book,
            entries: book.entries.map((en) => (en.id === entryId ? { ...en, files: [...(en.files || []), rec, ...(tr ? [tr] : [])] } : en)) } };
        });
        setRecording(null); recRef.current = null;
      };
      const startedAt = Date.now();
      recRef.current = mr; mr.start();
      setRecording({ entryId, subject, startedAt });
    } catch (e) {
      alert("마이크를 쓸 수 없어요. 브라우저 권한을 확인해 주세요.");
    }
  }
  const importInputRef = useRef(null);

  async function loadOrInitRow(authObj) {
    setDataLoading(true);
    setError(null);
    try {
      const row = await fetchUserRow(authObj.accessToken, authObj.userId);
      if (row) {
        setData({
          classes: row.classes || [],
          tasks: row.tasks || [],
          completed: row.completed || {},
          postponed: row.postponed || {},
          plan: row.plan || null,
          streak: row.streak || { count: 0, lastDate: null },
          totalCompleted: row.totalCompleted || 0,
          choreHistory: row.choreHistory || {},
          completionLog: row.completionLog || {},
          celebratedMilestones: row.celebratedMilestones || [],
          splits: row.splits || {},
          prepByClass: row.prepByClass || {},
          ...loadLocalExtras(authObj.userId),
        });
        setShelf(loadShelf(authObj.userId));
      } else {
        const d = defaultUserData();
        await upsertUserRow(authObj.accessToken, authObj.userId, supabasePayload(d));
        setData({ ...d, ...loadLocalExtras(authObj.userId) });
        setShelf(loadShelf(authObj.userId));
      }
    } catch (e) {
      setError(e?.message || "데이터를 불러오지 못했어요.");
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        if (window.location.hash && window.location.hash.includes("access_token")) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            try {
              const user = await fetchSupabaseUser(accessToken);
              const newAuth = { accessToken, refreshToken, userId: user.id, username: (user.email || "").split("@")[0] };
              window.history.replaceState(null, "", window.location.pathname);
              setAuth(newAuth);
              try { localStorage.setItem(SB_REFRESH_KEY, refreshToken); } catch (e) {}
              await loadOrInitRow(newAuth);
              return;
            } catch (e) {}
          }
        }
        const stored = localStorage.getItem(SB_REFRESH_KEY);
        if (stored) {
          try {
            const refreshed = await supabaseRefresh(stored);
            const newAuth = {
              accessToken: refreshed.access_token,
              refreshToken: refreshed.refresh_token,
              userId: refreshed.user.id,
              username: (refreshed.user.email || "").split("@")[0],
            };
            setAuth(newAuth);
            try { localStorage.setItem(SB_REFRESH_KEY, refreshed.refresh_token); } catch (e) {}
            await loadOrInitRow(newAuth);
            return;
          } catch (e) {}
        }
      } catch (e) {}
      setAuth(null);
    })();
  }, []);

  useEffect(() => {
    if (!data || notifPermission !== "granted") return;
    try {
      const key = todayKey();
      const lastNotified = localStorage.getItem(NOTIF_DATE_KEY);
      if (lastNotified === key) return;
      const urgent = data.tasks.filter((t) => t.due && !data.completed[t.id] && daysUntil(t.due) <= 1 && daysUntil(t.due) >= 0);
      if (urgent.length > 0) {
        const names = urgent.map((t) => t.name).join(", ");
        new Notification("담다", { body: `마감 임박: ${names}` });
        localStorage.setItem(NOTIF_DATE_KEY, key);
      }
    } catch (e) {}
  }, [data, notifPermission]);

  function updateData(updater) {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next);
      return next;
    });
  }
  function persist(next) {
    // 빠르게 여러 번 수정해도 이전 저장 응답이 최신 데이터를 덮지 않도록 순서대로 저장합니다.
    saveLocalExtras(auth.userId, next);
    const snapshot = supabasePayload(next);
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => upsertUserRow(auth.accessToken, auth.userId, snapshot))
      .then(() => setSaveWarning(false))
      .catch(() => setSaveWarning(true));
    return saveQueueRef.current;
  }

  async function logout() {
    setAuth(null);
    setData(null);
    try { localStorage.removeItem(SB_REFRESH_KEY); } catch (e) {}
  }

  if (auth === undefined) {
    return (
      <div style={{ background: COLORS.page, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans KR', sans-serif", color: COLORS.muted }}>
        <style>{GLOBAL_STYLE}</style>
        로그인 확인 중...
      </div>
    );
  }
  if (auth && dataLoading) {
    return (
      <div style={{ background: COLORS.page, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans KR', sans-serif", color: COLORS.muted }}>
        <style>{GLOBAL_STYLE}</style>
        데이터를 불러오는 중...
      </div>
    );
  }
  if (auth && !dataLoading && !data) {
    return (
      <div style={{ background: COLORS.page, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans KR', sans-serif", color: COLORS.muted, padding: 24, textAlign: "center" }}>
        <style>{GLOBAL_STYLE}</style>
        <div className="mb-3" style={{ color: "#B3261E" }}>{error || "데이터를 불러오지 못했어요."}</div>
        <button
          onClick={() => loadOrInitRow(auth)}
          className="px-4 py-2 rounded-full text-sm text-white"
          style={{ background: COLORS.ink }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  const today = todayKey();
  const activeTasks = data
    ? data.tasks.filter((t) => {
        if (t.due && data.completed[t.id]) return false;
        if (data.postponed[t.id] === today) return false;
        if (t.start && t.start > today) return false;
        return true;
      })
    : [];
  const todayGaps = data ? computeGapsForDay(data.classes, todayDayName(), today) : [];
  const nextClassInfo = data ? nextUpcomingClass(data.classes) : null;
  const nextClassPrep = nextClassInfo ? (data.prepByClass?.[nextClassInfo.classItem.name] || "") : "";
  const tomorrowDateObj = new Date();
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowDayName = DOW_TO_DAY[tomorrowDateObj.getDay()];
  const tomorrowDateKey = toKey(tomorrowDateObj);
  const tomorrowGaps = data ? computeGapsForDay(data.classes, tomorrowDayName, tomorrowDateKey) : [];

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = toKey(d);
    const load = activeTasks.filter((t) => t.due === key).reduce((sum, t) => sum + (t.estMin || 0), 0);
    return { key, label: WEEKDAY_LABELS[d.getDay()], load, isToday: i === 0 };
  });
  const maxLoad = Math.max(...weekDays.map((w) => w.load), 60);
  function loadColor(load) {
    if (load === 0) return COLORS.ruleLine;
    if (load <= 60) return COLORS.mint;
    if (load <= 150) return COLORS.yellow;
    return COLORS.coral;
  }


  async function generatePlan() {
    setLoading(true);
    setError(null);
    try {
      const dueTasks = activeTasks.filter((t) => t.due);
      const choreTasks = activeTasks.filter((t) => !t.due);
      const estText = (t) => (t.estMin ? `${t.estMin}분` : "모름, 적당히 추정해줘");
      let taskList = dueTasks.map((t) => `- ${t.name} (마감: ${t.due}, 예상 소요시간: ${estText(t)})`).join("\n");
      if (choreTasks.length > 0) {
        taskList += (taskList ? "\n" : "") + "생활 루틴 (마감 없음, 짧은 틈에 넣기 좋음):\n" + choreTasks.map((t) => `- ${t.name} (예상 소요시간: ${estText(t)})`).join("\n");
      }
      const slotList = todayGaps.map((s) => `- ${s.start}~${s.end}`).join("\n");

      const prompt = `너는 대학생을 위한 시간관리 AI야. 아래 과제/할일 목록과 오늘의 공강(시간표 기반으로 계산된 빈 시간) 목록을 보고, 오늘 처리하면 가장 좋은 항목을 최대 3개까지 우선순위대로 골라줘. 마감이 있는 과제를 우선하되, 짧은 공강에는 생활 루틴을 배치해도 좋아.

목록:
${taskList || "(없음)"}

오늘의 공강:
${slotList || "(없음)"}

오늘 날짜: ${todayLabel()}

다음 JSON 형식으로만 답해. 다른 설명, 마크다운, 코드블록 없이 순수 JSON만 출력해:
{
  "top3": [
    {
      "task": "항목 이름 (위 목록에 있는 이름 그대로)",
      "slot": "13:00~14:00",
      "durationMin": 20,
      "reason": "지금 해야 하는 이유, 15자~30자 한 줄",
      "ifSkipped": "오늘 안 하면 어떻게 되는지, 20자 내외 한 줄"
    }
  ],
  "weekImpact": "오늘 이 계획대로 하면 이번 주가 어떻게 편해지는지 한 줄, 30자 내외"
}

원칙: durationMin은 해당 공강 길이를 넘지 않게 잡아. 시작 부담을 줄이도록 작은 단위로 제안하고, 말투는 다정하고 담백하게.`;

      const planApiUrl = PLAN_API_URL;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      let response;
      try {
        response = await fetch(planApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
      } finally { clearTimeout(timeoutId); }
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "계획을 만들지 못했어요.");
      const text = (resData.content || []).map((b) => b.text || "").join("\n");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (!parsed || !Array.isArray(parsed.top3) || parsed.top3.some((x) => !x || typeof x.task !== "string")) throw new Error("AI 응답 형식이 올바르지 않아요.");
      parsed.top3 = parsed.top3.slice(0, 3);
      updateData((prev) => ({ ...prev, plan: parsed, planHistory: [{ ...parsed, createdAt: new Date().toISOString() }, ...(prev.planHistory || [])].slice(0, 20) }));
    } catch (e) {
      // GitHub Pages에는 서버 함수가 없을 수 있으므로, API 실패 시에도
      // 마감일/공강을 기준으로 기기 안에서 바로 계획을 만들어 기능이 멈추지 않게 합니다.
      const candidates = [...activeTasks].sort((a, b) => {
        const ad = a.due ? daysUntil(a.due) : 999;
        const bd = b.due ? daysUntil(b.due) : 999;
        return ad - bd || (a.estMin || 30) - (b.estMin || 30);
      }).slice(0, 3);
      const fallback = {
        top3: candidates.map((t, i) => {
          const slot = todayGaps[i % Math.max(todayGaps.length, 1)];
          const slotMin = slot ? timeToMin(slot.end) - timeToMin(slot.start) : 30;
          return {
            task: t.name,
            slot: slot ? `${slot.start}~${slot.end}` : "가능한 시간",
            durationMin: Math.min(t.estMin || 30, slotMin),
            reason: t.due ? `${ddayLabel(daysUntil(t.due))} 일정이라 먼저 조금씩 해두기` : "짧은 틈에 끝내기 좋은 생활 루틴",
            ifSkipped: t.due ? "마감 직전 부담이 커질 수 있어요" : "다음 빈 시간으로 미뤄도 괜찮아요",
          };
        }),
        weekImpact: "공강과 마감 순서를 기준으로 오늘 할 일을 정리했어요",
      };
      updateData((prev) => ({ ...prev, plan: fallback, planHistory: [{ ...fallback, createdAt: new Date().toISOString(), localFallback: true }, ...(prev.planHistory || [])].slice(0, 20) }));
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  function markComplete(taskName) {
    const t = data.tasks.find((x) => x.name === taskName);
    if (!t) return;
    const newStreak = bumpStreak(data.streak);
    const alreadyCelebrated = (data.celebratedMilestones || []).includes(newStreak.count);
    const hitMilestone = MILESTONES.includes(newStreak.count) && !alreadyCelebrated;
    if (hitMilestone) setCelebrateMilestone(newStreak.count);
    updateData((prev) => {
      const completionLog = { ...(prev.completionLog || {}) };
      completionLog[today] = (completionLog[today] || 0) + 1;
      const celebratedMilestones = hitMilestone ? [...(prev.celebratedMilestones || []), newStreak.count] : (prev.celebratedMilestones || []);
      if (!t.due) {
        const history = { ...(prev.choreHistory || {}) };
        const arr = history[t.id] ? [...history[t.id]] : [];
        arr.push(today);
        history[t.id] = arr;
        return { ...prev, choreHistory: history, streak: newStreak, totalCompleted: (prev.totalCompleted || 0) + 1, completionLog, celebratedMilestones };
      }
      return {
        ...prev,
        completed: { ...prev.completed, [t.id]: today },
        streak: newStreak,
        totalCompleted: (prev.totalCompleted || 0) + 1,
        completionLog,
        celebratedMilestones,
      };
    });
  }
  function undoComplete(taskId) {
    updateData((prev) => {
      const next = { ...prev.completed };
      const completedDate = next[taskId];
      delete next[taskId];
      const completionLog = { ...(prev.completionLog || {}) };
      if (completedDate && completionLog[completedDate]) completionLog[completedDate] = Math.max(0, completionLog[completedDate] - 1);
      return { ...prev, completed: next, completionLog, totalCompleted: Math.max(0, (prev.totalCompleted || 0) - 1) };
    });
  }
  function undoLastChoreLog(taskId) {
    updateData((prev) => {
      const history = { ...(prev.choreHistory || {}) };
      const completionLog = { ...(prev.completionLog || {}) };
      const lastDate = history[taskId]?.[history[taskId].length - 1];
      if (history[taskId] && history[taskId].length > 0) history[taskId] = history[taskId].slice(0, -1);
      if (lastDate && completionLog[lastDate]) completionLog[lastDate] = Math.max(0, completionLog[lastDate] - 1);
      return { ...prev, choreHistory: history, completionLog, totalCompleted: Math.max(0, (prev.totalCompleted || 0) - 1) };
    });
  }
  function markPostpone(taskName) {
    const t = data.tasks.find((x) => x.name === taskName);
    if (!t) return;
    updateData((prev) => ({ ...prev, postponed: { ...prev.postponed, [t.id]: todayKey() } }));
  }
  function undoPostpone(taskId) {
    updateData((prev) => {
      const next = { ...prev.postponed };
      delete next[taskId];
      return { ...prev, postponed: next };
    });
  }
  function deleteTask(taskId) {
    if (!window.confirm("이 할 일을 삭제할까요?")) return;
    updateData((prev) => {
      const completed = { ...prev.completed };
      const postponed = { ...prev.postponed };
      delete completed[taskId];
      delete postponed[taskId];
      return { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId), completed, postponed };
    });
    setEditingTaskId(null);
  }
  function startEditTask(t) {
    setEditingTaskId(t.id);
    setEditForm({ name: t.name, due: t.due || "", start: t.start || t.due || todayKey(), estMin: t.estMin ? String(t.estMin) : "", noDue: !t.due, estUnknown: !t.estMin });
  }
  function saveEditTask() {
    if (!editForm.name.trim()) return;
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === editingTaskId
          ? { ...t, name: editForm.name.trim(), due: editForm.noDue ? null : editForm.due, start: editForm.noDue ? null : (editForm.start || editForm.due), estMin: editForm.estUnknown ? null : (Number(editForm.estMin) || 30) }
          : t
      ),
    }));
    setEditingTaskId(null);
  }
  function addTask() {
    if (!newTask.name.trim()) return;
    if (!newTask.noDue && !newTask.due) return;
    const t = {
      id: `t${Date.now()}`,
      name: newTask.name.trim(),
      due: newTask.noDue ? null : newTask.due,
      start: newTask.noDue ? null : (newTask.start || todayKey()),
      estMin: newTask.estUnknown ? null : (Number(newTask.estMin) || 30),
    };
    updateData((prev) => ({ ...prev, tasks: [...prev.tasks, t] }));
    setNewTask({ name: "", due: "", start: todayKey(), estMin: "", noDue: false, estUnknown: false });
    setShowAddTask(false);
  }
  function quickAddChore(preset) {
    const t = { id: `t${Date.now()}`, name: preset.name, due: null, estMin: preset.estMin };
    updateData((prev) => ({ ...prev, tasks: [...prev.tasks, t] }));
  }
  function addClass() {
    if (!newClass.name.trim() || !newClass.start || !newClass.end) return;
    if (timeToMin(newClass.end) <= timeToMin(newClass.start)) { setError("종료 시간은 시작 시간보다 늦어야 해요."); return; }
    if (newClass.dayMode === "weekday" && !newClass.day) return;
    if (newClass.dayMode === "date" && !newClass.date) return;
    const c = {
      id: `c${Date.now()}`,
      name: newClass.name.trim(),
      start: newClass.start,
      end: newClass.end,
      type: newClass.type,
      dayMode: newClass.dayMode,
      day: newClass.dayMode === "weekday" ? newClass.day : null,
      date: newClass.dayMode === "date" ? newClass.date : null,
    };
    const conflicts = classConflicts(data.classes, c);
    if (conflicts.length && !window.confirm(`${conflicts.map(x => x.name).join(", ")} 일정과 시간이 겹쳐요. 그래도 추가할까요?`)) return;
    updateData((prev) => ({ ...prev, classes: [...prev.classes, c] }));
    setNewClass({ name: "", day: todayDayName(), date: todayKey(), start: "", end: "", type: "수업", dayMode: "weekday" });
    setShowAddClass(false);
  }
  function removeClass(id) {
    updateData((prev) => ({ ...prev, classes: prev.classes.filter((c) => c.id !== id) }));
  }
  function logGapUse(slot, note) {
    const entered = note || window.prompt("이 공강에 뭘 했는지 짧게 적어주세요.", "공강 활용");
    if (!entered?.trim()) return;
    const item = { id: `g${Date.now()}`, date: todayKey(), slot: `${slot.start}~${slot.end}`, note: entered.trim() };
    updateData((prev) => ({ ...prev, gapHistory: [item, ...(prev.gapHistory || [])].slice(0, 100) }));
  }

  function removeGapLog(id) {
    updateData((prev) => ({ ...prev, gapHistory: (prev.gapHistory || []).filter((g) => g.id !== id) }));
  }

  function restorePlan(historyPlan) {
    const { createdAt, localFallback, ...planOnly } = historyPlan;
    updateData((prev) => ({ ...prev, plan: planOnly }));
    setActiveTab("home");
  }

  function gapMinutes(slot) {
    return Math.max(0, timeToMin(slot.end) - timeToMin(slot.start));
  }

  function taskFitScore(task, gapMin) {
    const est = task.estMin || 30;
    if (est > gapMin) return -999;
    const urgency = task.due ? Math.max(0, 8 - Math.max(0, daysUntil(task.due))) * 12 : 8;
    const fit = Math.max(0, 35 - Math.abs(gapMin - est) * 0.35);
    const energyBonus = energyLevel === "낮음" ? (est <= 25 ? 25 : -8) : energyLevel === "높음" ? (est >= 30 ? 15 : 5) : 10;
    return urgency + fit + energyBonus;
  }

  function bestTaskForGap(slot) {
    const mins = gapMinutes(slot);
    const candidates = activeTasks
      .filter((t) => !data.completed[t.id] && data.postponed[t.id] !== today)
      .map((t) => ({ task: t, score: taskFitScore(t, mins) }))
      .filter((x) => x.score > -900)
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.task || null;
  }

  function downloadBackup() {
    try {
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), version: 2, data, shelf }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `damda-backup-${todayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setError("백업 파일을 만들지 못했어요."); }
  }

  async function restoreBackupFile(file) {
    if (!file) return;
    try {
      if (file.size > 420 * 1024 * 1024) throw new Error("too_large");
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed?.version && Number(parsed.version) > 1) throw new Error("newer_version");
      const incoming = parsed?.data || parsed;
      if (!incoming || !Array.isArray(incoming.tasks) || !Array.isArray(incoming.classes)) throw new Error("invalid");
      if (!window.confirm("이 백업으로 현재 플래너 데이터를 교체할까요? 현재 데이터는 덮어써져요.")) return;
      const safe = {
        ...defaultUserData(),
        ...incoming,
        tasks: Array.isArray(incoming.tasks) ? incoming.tasks : [],
        classes: Array.isArray(incoming.classes) ? incoming.classes : [],
        completed: incoming.completed && typeof incoming.completed === "object" ? incoming.completed : {},
        postponed: incoming.postponed && typeof incoming.postponed === "object" ? incoming.postponed : {},
        choreHistory: incoming.choreHistory && typeof incoming.choreHistory === "object" ? incoming.choreHistory : {},
        completionLog: incoming.completionLog && typeof incoming.completionLog === "object" ? incoming.completionLog : {},
        planHistory: Array.isArray(incoming.planHistory) ? incoming.planHistory.slice(0, 20) : [],
        gapHistory: Array.isArray(incoming.gapHistory) ? incoming.gapHistory.slice(0, 100) : [],
        prepByClass: incoming.prepByClass && typeof incoming.prepByClass === "object" ? incoming.prepByClass : {},
      };
      updateData(() => safe);
      if (incoming.shelf && typeof incoming.shelf === "object") {
        setShelf(incoming.shelf);
        if (auth?.userId) saveShelf(auth.userId, incoming.shelf);
      }
      setError(null);
    } catch (e) {
      setError("백업 파일 형식이 올바르지 않아요.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function clearMyCloudData() {
    if (!window.confirm("내 플래너 데이터를 모두 삭제할까요? 이 작업은 되돌릴 수 없어요.")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${encodeURIComponent(auth.userId)}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${auth.accessToken}` },
      });
      if (!res.ok) throw new Error();
      localStorage.removeItem(`${LOCAL_EXTRAS_PREFIX}${auth.userId}`);
      localStorage.removeItem(`${SHELF_PREFIX}${auth.userId}`);
      setData(defaultUserData());
      setShelf({});
      setSaveWarning(false);
    } catch (e) { setError("데이터 삭제에 실패했어요. 잠시 후 다시 시도해 주세요."); }
  }

  async function deleteAccount() {
    if (!window.confirm("계정과 플래너 데이터를 모두 삭제할까요? 되돌릴 수 없어요.")) return;
    if (!window.confirm("정말 탈퇴할까요? 책장 파일도 이 기기에서 삭제돼요.")) return;
    try {
      const res = await fetch(DELETE_ACCOUNT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: auth.userId, accessToken: auth.accessToken }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "회원탈퇴 API가 연결되지 않았어요.");
      localStorage.removeItem(`${LOCAL_EXTRAS_PREFIX}${auth.userId}`);
      localStorage.removeItem(`${SHELF_PREFIX}${auth.userId}`);
      localStorage.removeItem(SB_REFRESH_KEY);
      setShelf({});
      setData(null);
      setAuth(null);
    } catch (e) {
      setError(e?.message || "회원탈퇴에 실패했어요. Vercel API 설정을 확인해 주세요.");
    }
  }

  function resetAll() {
    if (!window.confirm("과제, 시간표, 기록을 모두 초기화할까요? 이 작업은 되돌릴 수 없어요.")) return;
    updateData(() => defaultUserData());
  }

  const inputStyle = { borderColor: COLORS.ruleLine, background: COLORS.paper };
  const plan = data ? data.plan : null;
  const top3Done = plan?.top3
    ? plan.top3.filter((item) => {
        const t = data.tasks.find((x) => x.name === item.task);
        return t && data.completed[t.id];
      }).length
    : 0;
  const top3Total = plan?.top3 ? plan.top3.length : 0;
  const todayName = todayDayName();
  const streakCount = data?.streak?.count || 0;

  return (
    <div style={{ background: `linear-gradient(rgba(255,255,255,.26) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.26) 1px, transparent 1px), radial-gradient(circle at 18% 8%, #FFF9F5 0 90px, transparent 91px), radial-gradient(circle at 85% 28%, #F2D8D5 0 75px, transparent 76px), ${COLORS.page}`, backgroundSize: "22px 22px, 22px 22px, auto, auto, auto", minHeight: "100vh", padding: "24px 12px", position: "relative", overflow: "hidden" }}>
      
      <TinyFlower style={{ left: "max(28px, calc(50% - 245px))", top: 155 }} />
      <TinyFlower style={{ right: "max(24px, calc(50% - 250px))", top: 105, fontSize: 22, opacity: .65 }} />
      
      
      <style>{GLOBAL_STYLE}</style>
      <div style={{ width: 410, maxWidth: "100%", margin: "0 auto", background: "rgba(255,253,252,.76)", border: "1px solid rgba(143,111,105,.16)", borderRadius: 38, padding: 8, boxShadow: "0 26px 70px -28px rgba(102,71,68,.42)", backdropFilter: "blur(12px)" }}>
        <div className="gingham" style={{ backgroundColor: COLORS.paper, borderRadius: 31, overflow: "hidden", position: "relative", minHeight: 760, display: "flex", flexDirection: "column", fontFamily: "'Gowun Dodum', 'IBM Plex Sans KR', sans-serif", color: COLORS.ink, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.75)" }}>
          <div style={{ height: 12 }} />

          {!auth ? (
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center" style={{ animation: "fadeIn 0.4s ease both" }}>
              <div className="mb-2" style={{ animation: "softPulse 3s ease-in-out infinite", position:"relative" }}></div>
              <LeafMark /><div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: COLORS.ink }} className="mb-1">담다</div>
              <div className="text-sm mb-5" style={{ color: COLORS.muted }}>수업 자료도 마감도 하루도 담아요</div>

              <button
                onClick={signInWithGoogle}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium w-full mb-3 transition-transform active:scale-95"
                style={{ background: "#fff", border: `1px solid ${COLORS.ruleLine}`, color: COLORS.ink }}
              >
                <svg width="16" height="16" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.9-5.4l-6.4-5.4C29.4 34.9 26.8 36 24 36c-5.3 0-9.8-3.4-11.4-8.1l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.4 5.4C39.9 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
                </svg>
                Google로 계속하기
              </button>
              <div className="text-xs mt-4 leading-relaxed" style={{ color: COLORS.muted }}>
                구글 계정으로 안전하게 로그인돼요.<br/>
                시간표·할 일은 계정에, 책장 파일은 이 기기에 저장돼요.
              </div>
            </div>
          ) : (
          <div className="px-4 pb-3 flex-1 overflow-y-auto">
          {data && (data.classes || []).length === 0 && !onboardDismissed && (
            <div style={{position:"fixed",inset:0,zIndex:70,background:"rgba(61,48,44,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div className="w-full rounded-3xl p-5" style={{maxWidth:340,background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`,boxShadow:"0 20px 50px rgba(0,0,0,.18)"}}>
                <div className="text-lg font-bold mb-1">담다에 온 걸 환영해요 🌷</div>
                <div className="text-xs mb-4" style={{color:COLORS.muted}}>딱 하나만 하면 준비 끝! 시간표를 등록하면 공강을 자동으로 찾아드려요.</div>
                <div className="rounded-2xl p-3 mb-2" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}>
                  <div className="text-xs font-bold mb-0.5">1 · 시간표 등록</div>
                  <div className="text-[11px]" style={{color:COLORS.muted}}>킹고포털 시간표 캡처를 올리면 자동으로 읽어요</div>
                </div>
                <div className="rounded-2xl p-3 mb-2" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}>
                  <div className="text-xs font-bold mb-0.5">2 · 과제 담기</div>
                  <div className="text-[11px]" style={{color:COLORS.muted}}>마감 있는 과제를 넣으면 마감함이 챙겨드려요</div>
                </div>
                <div className="rounded-2xl p-3 mb-4" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}>
                  <div className="text-xs font-bold mb-0.5">3 · 틈 자동 매칭</div>
                  <div className="text-[11px]" style={{color:COLORS.muted}}>공강 길이·마감·에너지에 맞는 할 일을 골라드려요</div>
                </div>
                <button onClick={() => { dismissOnboard(); setActiveTab("calendar"); }} className="w-full text-sm py-2.5 rounded-full mb-1.5" style={{background:COLORS.ink,color:"#fff"}}>시간표 등록하러 가기</button>
                <button onClick={dismissOnboard} className="w-full text-xs py-2 rounded-full" style={{background:"transparent",color:COLORS.muted}}>나중에 할게요</button>
              </div>
            </div>
          )}

          {activeTab === "home" && (
            <>
            {(() => {
              const t = todayKey();
              const md = pickMealDay(meals, t);
              const m = md?.m;
              const dday = (d) => Math.round((new Date(d) - new Date(t)) / 86400000);
              const soon = (jobs?.items || []).filter((j) => !jobsHide.includes(j.id) && j.due && dday(j.due) >= 0 && dday(j.due) <= 7);
              return (
                <>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 rounded-2xl p-3" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`}}>
                      <div className="text-[10px] mb-1" style={{color:COLORS.muted}}>{mealDayLabel(md)}</div>
                      {m ? (
                        <div className="text-[11px] leading-snug">
                          {m.lunch?.length ? <><b>점심</b> {m.lunch.slice(0,3).join(" · ")}<br/></> : null}
                          {m.dinner?.length ? <><b>저녁</b> {m.dinner.slice(0,3).join(" · ")}</> : null}
                          {!m.lunch?.length && !m.dinner?.length && <span style={{color:COLORS.muted}}>메뉴 없음</span>}
                        </div>
                      ) : (
                        <div className="text-[11px]" style={{color:COLORS.muted}}>식단 정보가 아직 없어요</div>
                      )}
                    </div>
                    <button onClick={() => setActiveTab("jobs")} className="flex-1 rounded-2xl p-3 text-left"
                      style={{background:soon.length?COLORS.strawberry:COLORS.paper,color:soon.length?"#fff":COLORS.ink,border:`1px solid ${COLORS.ruleLine}`}}>
                      <div className="text-[10px] mb-1" style={{opacity:.8}}>마감함</div>
                      {soon.length ? (
                        <>
                          <div className="text-[13px] font-bold">이번 주 마감 {soon.length}건</div>
                          <div className="text-[10px] mt-0.5 truncate" style={{opacity:.9}}>{soon[0].title}</div>
                        </>
                      ) : (
                        <div className="text-[11px]" style={{color:COLORS.muted}}>급한 마감은 없어요</div>
                      )}
                    </button>
                  </div>
                  <div className="flex gap-1.5 mb-3">
                    <button onClick={() => setActiveTab("stats")} className="text-[11px] px-3 py-1.5 rounded-full flex-1"
                      style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,color:COLORS.muted}}>기록</button>
                    <button onClick={() => setActiveTab("jobs")} className="text-[11px] px-3 py-1.5 rounded-full flex-1"
                      style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,color:COLORS.muted}}>마감함</button>
                    <button onClick={() => setActiveTab("settings")} className="text-[11px] px-3 py-1.5 rounded-full flex-1"
                      style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,color:COLORS.muted}}>설정</button>
                  </div>
                </>
              );
            })()}
            {celebrateMilestone && (
              <div
                className="flex items-center justify-between rounded-2xl p-3.5 mb-3"
                style={{ background: COLORS.coral, color: "#fff", animation: "popIn 0.4s ease both" }}
              >
                <span className="text-sm font-semibold">🎉 {celebrateMilestone}일 연속 달성! 대단해요</span>
                <button onClick={() => setCelebrateMilestone(null)} style={{ color: "#fff" }}><X size={16} /></button>
              </div>
            )}
            <div className="flex items-center justify-between mt-2 mb-3" style={{background:"rgba(255,249,245,.82)", marginLeft:-4, marginRight:-4, padding:"10px 10px 8px", borderRadius:18, border:`1px dashed ${COLORS.ruleLine}`}}>
              <div>
                <div className="flex items-center gap-2"><div style={{ fontSize:20,fontWeight:800,letterSpacing:"-0.02em" }}>담다</div></div>
                <div className="text-xs" style={{ color: COLORS.muted }}>
                  {todayLabel()} · {auth.username}님 · 과제 {data.tasks.length}개
                </div>
              </div>
              {streakCount > 0 && (
                <div className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}`, color: COLORS.coral }}>
                  <Flame size={13} /> {streakCount}일 연속
                </div>
              )}
            </div>

            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-3.5 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold">다음 수업 준비</div>
                  {nextClassInfo ? (
                    <div className="text-[10px] mt-0.5" style={{color:COLORS.muted}}>
                      {nextClassInfo.offset === 0 ? "오늘" : `${nextClassInfo.offset}일 뒤`} · {nextClassInfo.classItem.name} · {nextClassInfo.classItem.start}~{nextClassInfo.classItem.end}
                    </div>
                  ) : (
                    <div className="text-[10px] mt-0.5" style={{color:COLORS.muted}}>시간표에 다음 수업을 등록해 주세요</div>
                  )}
                </div>
                {nextClassInfo && <button onClick={() => setPrepEditing((v) => !v)} className="text-[10px] px-2.5 py-1 rounded-full" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,color:COLORS.muted}}>{prepEditing ? "닫기" : "수정"}</button>}
              </div>
              {nextClassInfo && (
                prepEditing ? (
                  <>
                    <textarea value={prepDraft} onChange={(e) => setPrepDraft(e.target.value)} rows={2} placeholder="예: PPT 3장 읽기 · 계산기 · 질문 1개 준비" className="w-full text-xs rounded-xl px-2.5 py-2 mb-2" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,resize:"none",color:COLORS.ink}} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px]" style={{color:COLORS.muted}}>이 과목의 다음 수업 준비에 저장돼요</span>
                      <button onClick={() => { updateData((prev) => ({ ...prev, prepByClass: { ...(prev.prepByClass || {}), [nextClassInfo.classItem.name]: prepDraft.trim() } })); setPrepEditing(false); }} className="text-[10px] px-3 py-1.5 rounded-full" style={{background:COLORS.ink,color:"#fff"}}>저장</button>
                    </div>
                  </>
                ) : (
                  <div className="text-xs leading-relaxed" style={{color:nextClassPrep ? COLORS.ink : COLORS.muted}}>{nextClassPrep || "다음 수업에서 할 일·준비물을 적어두세요."}</div>
                )
              )}
            </div>

            {(plan?.weekImpact || top3Total > 0) && (
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-4 mb-3 shadow-sm">
              {plan?.weekImpact && <h1 style={{ fontWeight:800, lineHeight: 1.35 }} className="text-2xl font-bold">
                {plan.weekImpact}
              </h1>}
              {top3Total > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1" style={{ color: COLORS.muted }}>
                    <span>오늘 진행률</span>
                    <span>{top3Done}/{top3Total} 완료 · 누적 {data.totalCompleted || 0}개</span>
                  </div>
                  <div style={{ background: COLORS.ruleLine, height: 6, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${top3Total ? (top3Done / top3Total) * 100 : 0}%`, background: COLORS.mint, height: "100%", transition: "width 0.4s ease" }} />
                  </div>
                </div>
              )}
            </div>
            )}


            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-3.5 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">이번 주 마감 부담</span>
                <span className="text-xs" style={{ color: COLORS.muted }}>많을수록 몰려있어요</span>
              </div>
              <div className="flex items-end justify-between gap-1.5" style={{ height: 56 }}>
                {weekDays.map((w) => (
                  <div key={w.key} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                    <div style={{ width: "100%", height: `${Math.max(10, (w.load / maxLoad) * 100)}%`, background: loadColor(w.load), borderRadius: 4, transition: "height 0.4s ease" }} />
                    <span className="text-xs" style={{ color: w.isToday ? COLORS.ink : COLORS.muted, fontWeight: w.isToday ? 700 : 400 }}>{w.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-3.5 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">오늘({todayName}) 공강 · 시간표 기준</span>
                <button onClick={() => setShowTomorrow((v) => !v)} className="text-xs flex items-center gap-0.5" style={{ color: COLORS.muted }}>
                  내일 미리보기 {showTomorrow ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {todayGaps.map((s, idx) => (
                  <span key={idx} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: COLORS.paper, border: `1px solid ${COLORS.ruleLine}`, fontFamily: "'IBM Plex Mono', monospace" }}>
                    <Clock size={11} style={{ color: COLORS.muted }} /> {s.start}~{s.end}
                    <button onClick={() => logGapUse(s)} title="이 공강 활용 기록" style={{ marginLeft: 3, color: COLORS.strawberry, fontWeight: 700 }}>+</button>
                  </span>
                ))}
                {todayGaps.length === 0 && <span className="text-xs" style={{ color: COLORS.muted }}>오늘은 수업이 꽉 차 있어요</span>}
              </div>
              {showTomorrow && (
                <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${COLORS.ruleLine}` }}>
                  <div className="text-xs mb-1.5" style={{ color: COLORS.muted }}>내일({tomorrowDayName}) 공강</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tomorrowGaps.map((s, idx) => (
                      <span key={idx} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: COLORS.paper, border: `1px solid ${COLORS.ruleLine}`, fontFamily: "'IBM Plex Mono', monospace" }}>
                        <Clock size={11} style={{ color: COLORS.muted }} /> {s.start}~{s.end}
                      </span>
                    ))}
                    {tomorrowGaps.length === 0 && <span className="text-xs" style={{ color: COLORS.muted }}>내일은 수업이 꽉 차 있어요</span>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: "linear-gradient(135deg, #FFF8F8, #FFFDF8)", border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-3.5 mb-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div><div className="text-xs font-semibold flex items-center gap-1"><Zap size={13}/> 틈 자동 매칭</div><div className="text-xs mt-0.5" style={{color:COLORS.muted}}>남는 시간 길이 + 마감 + 지금 에너지에 맞춰 바로 할 일을 골라요.</div></div>
              </div>
              <div className="flex gap-1 mb-3">
                {["낮음","보통","높음"].map((v)=><button key={v} onClick={()=>setEnergyLevel(v)} className="text-xs px-2.5 py-1 rounded-full" style={{background:energyLevel===v?COLORS.strawberry:COLORS.paper,color:energyLevel===v?'#fff':COLORS.muted,border:`1px solid ${COLORS.ruleLine}`}}>에너지 {v}</button>)}
              </div>
              <div className="flex flex-col gap-2">
                {todayGaps.slice(0,4).map((slot,idx)=>{ const match=bestTaskForGap(slot); const mins=gapMinutes(slot); return <div key={idx} className="rounded-xl p-2.5" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}><div className="flex items-center justify-between gap-2"><div><div className="text-xs" style={{color:COLORS.muted}}>{slot.start}~{slot.end} · {mins}분 틈</div><div className="text-sm font-semibold mt-0.5">{match ? match.name : "이 틈에 맞는 할 일이 아직 없어요"}</div>{match && <div className="text-xs mt-0.5" style={{color:COLORS.muted}}>{match.due ? `${ddayLabel(daysUntil(match.due))} · ` : '생활 루틴 · '}{match.estMin ? `${match.estMin}분 예상` : '30분 정도로 시작'}</div>}</div>{match && <button onClick={()=>{ setData((prev)=>({...prev,plan:{top3:[{task:match.name,slot:`${slot.start}~${slot.end}`,durationMin:Math.min(match.estMin||30,mins),reason:'지금 생긴 틈에 가장 잘 맞아요',ifSkipped:match.due?'마감 부담이 뒤로 밀려요':'다음 틈으로 미뤄져요'}],weekImpact:'작은 틈 하나를 바로 내 시간으로 바꿨어요'}})); setActiveTab('home'); }} className="text-xs px-2.5 py-1 rounded-full" style={{background:COLORS.ink,color:'#fff',whiteSpace:'nowrap'}}>이걸로 시작</button>}</div></div>})}
                {todayGaps.length===0 && <div className="text-xs" style={{color:COLORS.muted}}>오늘은 매칭할 공강이 없어요. 시간표를 추가하면 자동으로 찾아드려요.</div>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              <button onClick={() => setShowAddTask((v) => !v)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-transform active:scale-95" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }}>
                <Plus size={13} /> 과제/할일
              </button>
              <button onClick={generatePlan} disabled={loading || activeTasks.length === 0} className="flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-medium ml-auto disabled:opacity-50 transition-transform active:scale-95" style={{ background: COLORS.ink, color: "#fff" }}>
                <Sparkles size={13} /> {loading ? "생각 중..." : "오늘 계획 만들기"}
              </button>
            </div>

            {showAddTask && (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card gingham rounded-2xl p-4 mb-3">
                <div className="flex items-center justify-between mb-2"><span className="text-xs" style={{color:COLORS.muted}}>새 할 일 적기 ♡</span></div>
                <div className="text-xs mb-1.5" style={{ color: COLORS.muted }}>빠른 추가 · 생활 할일</div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {CHORE_PRESETS.map((p) => (
                    <button key={p.name} onClick={() => quickAddChore(p)} className="text-xs px-2.5 py-1 rounded-full transition-transform active:scale-95" style={{ background: COLORS.paper, border: `1px solid ${COLORS.ruleLine}` }}>+ {p.name}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex flex-col">
                    <label className="text-xs mb-1" style={{ color: COLORS.muted }}>이름</label>
                    <input value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} className="border rounded px-2 py-1.5 text-sm" style={inputStyle} placeholder="예: 통계 과제" />
                  </div>
                  {!newTask.noDue && (
                    <div className="flex flex-col">
                      <label className="text-xs mb-1" style={{ color: COLORS.muted }}>시작일</label>
                      <input type="date" value={newTask.start} onChange={(e) => setNewTask({ ...newTask, start: e.target.value })} className="border rounded px-2 py-1.5 text-sm" style={inputStyle} />
                    </div>
                  )}
                  {!newTask.noDue && (
                    <div className="flex flex-col">
                      <label className="text-xs mb-1" style={{ color: COLORS.muted }}>마감일</label>
                      <input type="date" value={newTask.due} onChange={(e) => setNewTask({ ...newTask, due: e.target.value })} className="border rounded px-2 py-1.5 text-sm" style={inputStyle} />
                    </div>
                  )}
                  {!newTask.estUnknown && (
                    <div className="flex flex-col">
                      <label className="text-xs mb-1" style={{ color: COLORS.muted }}>예상 분</label>
                      <input type="number" value={newTask.estMin} onChange={(e) => setNewTask({ ...newTask, estMin: e.target.value })} className="border rounded px-2 py-1.5 text-sm w-20" style={inputStyle} placeholder="60" />
                    </div>
                  )}
                  <button onClick={addTask} className="px-3 py-1.5 rounded text-sm text-white" style={{ background: COLORS.strawberry, borderRadius: 999, boxShadow:"0 5px 12px -8px rgba(217,104,114,.8)" }}>딸기 바구니에 담기</button>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.muted }}>
                    <input type="checkbox" checked={newTask.noDue} onChange={(e) => setNewTask({ ...newTask, noDue: e.target.checked })} /> 마감일 없음 (생활 루틴)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.muted }}>
                    <input type="checkbox" checked={newTask.estUnknown} onChange={(e) => setNewTask({ ...newTask, estUnknown: e.target.checked })} /> 예상시간 모름
                  </label>
                </div>
              </div>
            )}

            {error && <div className="flex items-center gap-2 text-sm rounded-lg p-3 mb-3" style={{ background: "#FFE8E8", color: "#B3261E" }}><AlertCircle size={16} /> {error}</div>}

            {loading && (
              <div className="flex flex-col gap-2 mb-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }}>
                    <div style={{ width: 48, height: 16, background: COLORS.ruleLine, borderRadius: 8 }} />
                    <div style={{ width: "70%", height: 14, background: COLORS.ruleLine, borderRadius: 6, marginTop: 10 }} />
                    <div style={{ width: "50%", height: 12, background: COLORS.ruleLine, borderRadius: 6, marginTop: 8 }} />
                  </div>
                ))}
              </div>
            )}

            {!loading && plan && plan.top3 && plan.top3.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: COLORS.muted }}>오늘의 우선순위</div>
                <div className="flex flex-col gap-2">
                  {plan.top3.map((item, i) => {
                    const t = data.tasks.find((x) => x.name === item.task);
                    const isChore = t && !t.due;
                    const isDone = t && t.due && data.completed[t.id];
                    const isPostponed = t && data.postponed[t.id] === today;
                    const choreLog = isChore ? (data.choreHistory?.[t.id] || []) : [];
                    return (
                      <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}`, borderLeft: `6px solid ${RANK_COLORS[i] || COLORS.mint}`, animation: "planCardIn 0.4s ease both", animationDelay: `${i * 90}ms` }} className="rounded-xl p-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: RANK_COLORS[i] || COLORS.mint, color: COLORS.ink }}>{RANK_LABELS[i] || `${i + 1}순위`}</span>
                        <div className="font-semibold text-base mt-1.5">{item.task}</div>
                        <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: COLORS.muted, fontFamily: "'IBM Plex Mono', monospace" }}>
                          <Clock size={12} /> {item.slot} · {item.durationMin}분
                        </div>
                        <div style={{ fontWeight:800, color: COLORS.ink }} className="text-lg mt-2">"{item.reason}"</div>
                        {item.ifSkipped && <div className="text-xs mt-1" style={{ color: COLORS.muted }}>오늘 안 하면 → {item.ifSkipped}</div>}
                        {isChore && choreLog.length > 0 && (
                          <div className="text-xs mt-1" style={{ color: COLORS.muted }}>최근 {choreLog[choreLog.length - 1]} · 총 {choreLog.length}회 기록</div>
                        )}
                        {isDone ? (
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs font-medium" style={{ color: COLORS.mint, animation: "popIn 0.3s ease both" }}>완료했어요 🎉</span>
                            <button onClick={() => undoComplete(t.id)} className="text-xs" style={{ color: COLORS.muted }}>되돌리기</button>
                          </div>
                        ) : isPostponed ? (
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs" style={{ color: COLORS.muted, animation: "popIn 0.3s ease both" }}>내일 다시 추천해줄게요</span>
                            <button onClick={() => undoPostpone(t.id)} className="text-xs" style={{ color: COLORS.muted }}>되돌리기</button>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => markComplete(item.task)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-transform active:scale-95"
                              style={{ background: COLORS.mint, color: "#fff" }}
                            >
                              <Check size={12} /> {isChore ? "기록하기" : "완료"}
                            </button>
                            <button
                              onClick={() => markPostpone(item.task)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-transform active:scale-95"
                              style={{ background: COLORS.paper, border: `1px solid ${COLORS.ruleLine}`, color: COLORS.muted }}
                            >
                              <Undo2 size={12} /> 못 하겠어요
                            </button>
                            {isChore && choreLog.length > 0 && (
                              <button onClick={() => undoLastChoreLog(t.id)} className="text-xs ml-auto" style={{ color: COLORS.muted }}>기록 취소</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && plan && (!plan.top3 || plan.top3.length === 0) && (
              <div className="text-sm rounded-xl p-4 mb-4 text-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}`, color: COLORS.muted }}>
                오늘은 공강에 맞는 할 일이 없어요. 과제나 시간표를 확인해 보세요.
              </div>
            )}

            {data.tasks.length > 0 && (
              <div className="mb-3">
                <button onClick={() => setShowAll((v) => !v)} className="flex items-center gap-1 text-xs" style={{ color: COLORS.muted }}>
                  {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 등록된 항목 전체 {data.tasks.length}개 {showAll ? "접기" : "보기"}
                </button>
                {showAll && (
                  <div className="mt-2">
                    <div className="flex gap-1.5 mb-2">
                      <input
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        placeholder="과제 검색"
                        className="border rounded-full px-3 py-1.5 text-xs flex-1"
                        style={{ borderColor: COLORS.ruleLine, background: COLORS.paper }}
                      />
                      <button
                        onClick={() => setHideCompleted((v) => !v)}
                        className="text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap"
                        style={{ background: hideCompleted ? COLORS.ink : COLORS.card, color: hideCompleted ? "#fff" : COLORS.muted, border: `1px solid ${COLORS.ruleLine}` }}
                      >
                        완료 숨기기
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                    {data.tasks
                      .filter((t) => t.name.toLowerCase().includes(taskSearch.trim().toLowerCase()))
                      .filter((t) => !(hideCompleted && t.due && data.completed[t.id]))
                      .map((t) =>
                      editingTaskId === t.id ? (
                        <div key={t.id} className="rounded-lg p-2.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.ink}` }}>
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="border rounded px-2 py-1 text-sm w-full mb-1.5" style={inputStyle} />
                          <div className="flex flex-wrap gap-1.5 items-end">
                            {!editForm.noDue && (
                              <input type="date" value={editForm.start} onChange={(e) => setEditForm({ ...editForm, start: e.target.value })} className="border rounded px-2 py-1 text-xs" style={inputStyle} title="시작일" />
                            )}
                            {!editForm.noDue && (
                              <input type="date" value={editForm.due} onChange={(e) => setEditForm({ ...editForm, due: e.target.value })} className="border rounded px-2 py-1 text-xs" style={inputStyle} title="마감일" />
                            )}
                            {!editForm.estUnknown && (
                              <input type="number" value={editForm.estMin} onChange={(e) => setEditForm({ ...editForm, estMin: e.target.value })} className="border rounded px-2 py-1 text-xs w-16" style={inputStyle} />
                            )}
                            <label className="flex items-center gap-1 text-xs" style={{ color: COLORS.muted }}>
                              <input type="checkbox" checked={editForm.noDue} onChange={(e) => setEditForm({ ...editForm, noDue: e.target.checked })} /> 마감없음
                            </label>
                            <label className="flex items-center gap-1 text-xs" style={{ color: COLORS.muted }}>
                              <input type="checkbox" checked={editForm.estUnknown} onChange={(e) => setEditForm({ ...editForm, estUnknown: e.target.checked })} /> 시간모름
                            </label>
                          </div>
                          <div className="flex gap-1.5 mt-2">
                            <button onClick={saveEditTask} className="text-xs px-2.5 py-1 rounded-full text-white" style={{ background: COLORS.ink }}>저장</button>
                            <button onClick={() => setEditingTaskId(null)} className="text-xs px-2.5 py-1 rounded-full" style={{ background: COLORS.paper, border: `1px solid ${COLORS.ruleLine}` }}>취소</button>
                            <button onClick={() => deleteTask(t.id)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ml-auto" style={{ color: "#B3261E" }}><Trash2 size={12} /> 삭제</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-sm rounded-lg px-3 py-2"
                          style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}`, opacity: t.due && data.completed[t.id] ? 0.5 : 1 }}
                        >
                          <span style={{ textDecoration: t.due && data.completed[t.id] ? "line-through" : "none" }}>{t.name}</span>
                          <div className="flex items-center gap-2">
                            <span style={{ color: COLORS.muted, fontFamily: "'IBM Plex Mono', monospace" }} className="text-xs">
                              {t.due ? (
                                <>
                                  <span style={{ color: ddayColor(daysUntil(t.due), COLORS), fontWeight: 600 }}>{ddayLabel(daysUntil(t.due))} </span>
                                  {t.due} · {t.estMin ? `${t.estMin}분` : "시간 모름"}
                                </>
                              ) : (
                                <>
                                  {data.choreHistory?.[t.id]?.length
                                    ? `최근 ${data.choreHistory[t.id][data.choreHistory[t.id].length - 1]} · 총 ${data.choreHistory[t.id].length}회`
                                    : "아직 기록 없음"}
                                </>
                              )}
                            </span>
                            {!t.due && (
                              <button onClick={() => markComplete(t.name)} className="text-xs px-2 py-0.5 rounded-full" style={{ background: COLORS.mint, color: "#fff" }}>+ 기록</button>
                            )}
                            {!t.due && data.choreHistory?.[t.id]?.length > 0 && (
                              <button onClick={() => undoLastChoreLog(t.id)} style={{ color: COLORS.muted }}><Undo2 size={13} /></button>
                            )}
                            <button onClick={() => startEditTask(t)} style={{ color: COLORS.muted }}><Pencil size={13} /></button>
                            <button onClick={() => deleteTask(t.id)} style={{ color: COLORS.muted }}><Trash2 size={13} /></button>
                          </div>
                        </div>
                      )
                    )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {data.tasks.length === 0 && (
              <div className="text-sm rounded-xl p-4 mb-3 text-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}`, color: COLORS.muted }}>
                아직 등록된 과제/할일이 없어요. 위 "+ 과제/할일" 버튼으로 추가해보세요.
              </div>
            )}
            </>
          )}

          {activeTab === "tasks" && (
            <div style={{ animation: "fadeIn 0.3s ease both" }}>
              <div className="mt-2 mb-3 flex items-end justify-between">
                <div><div style={{ fontSize:21,fontWeight:800,letterSpacing:"-0.02em" }}>과제 · 할 일</div><div className="text-xs" style={{color:COLORS.muted}}>등록한 일을 한곳에서 관리해요</div></div>
                <button onClick={() => { setActiveTab("home"); setShowAddTask(true); }} className="text-xs px-3 py-1.5 rounded-full" style={{background:COLORS.strawberry,color:'#fff'}}><Plus size={12} style={{display:'inline'}}/> 추가</button>
              </div>
              <div className="pretty-card rounded-2xl p-3 mb-3" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`}}>
                <input value={taskSearch} onChange={(e)=>setTaskSearch(e.target.value)} placeholder="과제/할 일 검색" className="border rounded-xl px-3 py-2 text-sm w-full" style={inputStyle}/>
                <label className="flex items-center gap-2 text-xs mt-2" style={{color:COLORS.muted}}><input type="checkbox" checked={hideCompleted} onChange={(e)=>setHideCompleted(e.target.checked)}/> 완료한 과제 숨기기</label>
              </div>
              <div className="flex flex-col gap-2">
                {data.tasks.filter(t => t.name.toLowerCase().includes(taskSearch.toLowerCase())).filter(t => !(hideCompleted && data.completed[t.id])).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).map(t => {
                  const done=!!data.completed[t.id]; const chore=!t.due; const notStarted = t.start && t.start > todayKey();
                  return <div key={t.id} className="pretty-card rounded-2xl p-3.5" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`,opacity:done?.62:1}}>
                    {editingTaskId===t.id ? <div className="flex flex-col gap-2">
                      <input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} className="border rounded px-2 py-1.5 text-sm" style={inputStyle}/>
                      {!editForm.noDue && <div className="flex gap-2"><input type="date" value={editForm.start} onChange={e=>setEditForm({...editForm,start:e.target.value})} className="border rounded px-2 py-1 text-xs" style={inputStyle}/><input type="date" value={editForm.due} onChange={e=>setEditForm({...editForm,due:e.target.value})} className="border rounded px-2 py-1 text-xs" style={inputStyle}/></div>}
                      <div className="flex gap-2"><button onClick={saveEditTask} className="text-xs px-3 py-1 rounded-full" style={{background:COLORS.ink,color:'#fff'}}>저장</button><button onClick={()=>setEditingTaskId(null)} className="text-xs">취소</button></div>
                    </div> : <>
                      <div className="flex justify-between gap-2"><div><div className="font-semibold text-sm" style={{textDecoration:done?'line-through':'none'}}>{t.name}{notStarted && <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-1.5" style={{background:COLORS.paper,color:COLORS.muted,border:`1px solid ${COLORS.ruleLine}`}}>{t.start} 시작</span>}</div><div className="text-xs mt-1" style={{color:COLORS.muted}}>{chore ? `생활 루틴 · ${(data.choreHistory?.[t.id]||[]).length}회 기록` : `${t.start||t.due} → ${t.due} · ${ddayLabel(daysUntil(t.due))}`} {t.estMin ? `· ${t.estMin}분` : ''}</div></div><div className="flex gap-1"><button onClick={()=>startEditTask(t)} style={{color:COLORS.muted}}><Pencil size={14}/></button><button onClick={()=>deleteTask(t.id)} style={{color:COLORS.coral}}><Trash2 size={14}/></button></div></div>
                      <div className="flex gap-2 mt-3 flex-wrap">{done ? <button onClick={()=>undoComplete(t.id)} className="text-xs px-3 py-1 rounded-full" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`}}>완료 취소</button> : <button onClick={()=>markComplete(t.name)} className="text-xs px-3 py-1 rounded-full" style={{background:COLORS.mint,color:'#fff'}}><Check size={12} style={{display:'inline'}}/> {chore?'기록':'완료'}</button>}
                      {!chore && !done && <button onClick={()=>applySplit(t)} className="text-xs px-3 py-1 rounded-full" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`}}>공강에 나누기</button>}
                      {data.splits?.[t.id] && <button onClick={()=>clearSplit(t.id)} className="text-xs px-2 py-1 rounded-full" style={{color:COLORS.muted}}>계획 지우기</button>}</div>

                      {data.splits?.[t.id] && (
                        <div className="mt-2 rounded-xl p-2.5" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}>
                          <div className="text-[11px] font-bold mb-1.5">
                            공강에 나눈 계획 · {data.splits[t.id].slots.length}번
                            {data.splits[t.id].left >= 20 && <span style={{color:COLORS.strawberry}}> (남은 {data.splits[t.id].left}분은 자리 없음)</span>}
                          </div>
                          {data.splits[t.id].slots.map((sl,i)=>(
                            <div key={i} className="flex items-center gap-2 text-[11px] mb-0.5">
                              <span style={{width:52,color:COLORS.muted}}>{sl.date.slice(5).replace('-','/')} {sl.day}</span>
                              <span className="flex-1">{sl.start}~{sl.end}</span>
                              <span style={{color:COLORS.muted}}>{sl.min}분</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>}
                  </div>
                })}
                {data.tasks.length===0 && <div className="text-sm text-center p-6" style={{color:COLORS.muted}}>아직 등록된 할 일이 없어요.</div>}
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div style={{ animation: "fadeIn 0.3s ease both" }}>
              <div className="mt-2 mb-3"><div style={{fontSize:21,fontWeight:800,letterSpacing:"-0.02em"}}>기록 · 성취</div><div className="text-xs" style={{color:COLORS.muted}}>내가 만든 작은 틈들이 쌓인 기록이에요</div></div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[['연속',`${streakCount}일`],['누적 완료',`${data.totalCompleted||0}개`],['등록 할 일',`${data.tasks.length}개`]].map(([a,b])=><div key={a} className="pretty-card rounded-2xl p-3 text-center" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`}}><div className="text-xs" style={{color:COLORS.muted}}>{a}</div><div className="font-bold mt-1">{b}</div></div>)}
              </div>
              <div className="pretty-card rounded-2xl p-3.5 mb-3" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`}}>
                <div className="flex justify-between mb-2"><span className="text-xs font-semibold">완료 기록</span><div className="flex gap-1">{[7,30].map(r=><button key={r} onClick={()=>setStatsRange(r)} className="text-xs px-2 py-0.5 rounded-full" style={{background:statsRange===r?COLORS.ink:COLORS.paper,color:statsRange===r?'#fff':COLORS.muted}}>{r}일</button>)}</div></div>
                {(()=>{const days=Array.from({length:statsRange}).map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(statsRange-1-i));const key=toKey(d);return {key,count:data.completionLog?.[key]||0}});const mx=Math.max(...days.map(d=>d.count),1);return <div className="flex items-end gap-0.5" style={{height:90}}>{days.map(d=><div key={d.key} style={{flex:1,height:`${Math.max(5,d.count/mx*100)}%`,background:d.count?COLORS.strawberry:COLORS.ruleLine,borderRadius:3}} title={`${d.key}: ${d.count}개`}/>)}</div>})()}
              </div>
              <div className="pretty-card rounded-2xl p-3.5" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`}}>
                <div className="text-xs font-semibold mb-2">최근 AI 계획</div>
                {(data.planHistory||[]).slice(0,8).map((p,i)=><div key={i} className="py-2" style={{borderBottom:i<Math.min(7,(data.planHistory||[]).length-1)?`1px dashed ${COLORS.ruleLine}`:'none'}}><div className="flex items-center justify-between gap-2"><div><div className="text-xs" style={{color:COLORS.muted}}>{p.createdAt?new Date(p.createdAt).toLocaleString('ko-KR'):''}</div><div className="text-sm mt-0.5">{p.weekImpact||'오늘의 계획'} · {p.top3?.length||0}개</div></div><button onClick={()=>restorePlan(p)} className="text-xs px-2 py-1 rounded-full" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`}}>다시 보기</button></div></div>)}
                {(data.planHistory||[]).length===0 && <div className="text-xs" style={{color:COLORS.muted}}>아직 저장된 AI 계획이 없어요.</div>}
              </div>
              <div className="pretty-card rounded-2xl p-3.5 mb-3" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`}}>
                <div className="text-xs font-semibold mb-2">공강 활용 기록</div>
                {(data.gapHistory||[]).slice(0,10).map(g=><div key={g.id} className="flex items-center justify-between py-1.5" style={{borderBottom:`1px dashed ${COLORS.ruleLine}`}}><div><div className="text-sm">{g.slot} · {g.note}</div><div className="text-xs" style={{color:COLORS.muted}}>{g.date}</div></div><button onClick={()=>removeGapLog(g.id)} style={{color:COLORS.muted}}><X size={13}/></button></div>)}
                {(data.gapHistory||[]).length===0 && <div className="text-xs" style={{color:COLORS.muted}}>홈의 공강 시간 옆 +를 눌러 활용 기록을 남길 수 있어요.</div>}
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <>
            <div className="rounded-2xl p-3 mb-3" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-bold">시간표 사진으로 한 번에 등록</div>
                <button onClick={() => ttInputRef.current?.click()} disabled={ttLoading}
                  className="text-[11px] px-3 py-1.5 rounded-full" style={{background:COLORS.mint,color:"#fff",opacity:ttLoading?.6:1}}>
                  {ttLoading ? "읽는 중…" : "사진 올리기"}
                </button>
              </div>
              <div className="text-[10px]" style={{color:COLORS.muted}}>킹고포털 시간표를 캡처해서 올리면 과목·요일·시간을 읽어요</div>
              {ttError && <div className="text-[10px] mt-1.5" style={{color:COLORS.strawberry}}>{ttError}</div>}
              <input ref={ttInputRef} type="file" accept="image/*" hidden
                onChange={(e) => { readTimetableImage(e.target.files?.[0]); e.target.value=""; }}/>

              {ttFound && (
                <div className="mt-2">
                  <div className="text-[11px] font-bold mb-1.5">이렇게 읽었어요 · 맞는 것만 남기고 등록</div>
                  {ttFound.map((x) => (
                    <button key={x._id} onClick={() => setTtFound((prev) => prev.map((y) => y._id === x._id ? { ...y, use: !y.use } : y))}
                      className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 mb-1 text-left"
                      style={{background:x.use?COLORS.card:"transparent",border:`1px solid ${x.use?COLORS.mint:COLORS.ruleLine}`,opacity:x.use?1:.45}}>
                      <span className="text-[11px] font-bold" style={{width:16}}>{x.day}</span>
                      <span className="text-[11px] flex-1 truncate">{x.name}{x.room?` · ${x.room}`:""}</span>
                      <span className="text-[10px]" style={{color:COLORS.muted}}>{x.start}~{x.end}</span>
                    </button>
                  ))}
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={saveTimetable} className="flex-1 text-[11px] py-2 rounded-full" style={{background:COLORS.ink,color:"#fff"}}>
                      {ttFound.filter((x)=>x.use).length}개 등록하기
                    </button>
                    <button onClick={() => setTtFound(null)} className="text-[11px] px-3 py-2 rounded-full"
                      style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,color:COLORS.muted}}>취소</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ animation: "fadeIn 0.3s ease both" }}>
              <div className="mt-2 mb-3">
                <div className="flex items-center gap-2"><div style={{ fontSize:20,fontWeight:800,letterSpacing:"-0.02em" }}>시간표</div><span style={{fontSize:15,color:COLORS.strawberry}}>♡</span></div>
                <div className="text-xs" style={{ color: COLORS.muted }}>요일별 일정을 등록하면 공강이 자동으로 계산돼요</div>
              </div>

              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-3.5 mb-3">
                <div className="text-xs font-semibold mb-2">진행 중인 일정 · 오늘부터 마감까지</div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const key = toKey(d);
                    const inRange = data.tasks.some((t) => t.due && key <= t.due && key >= (t.start || t.due));
                    const isToday = i === 0;
                    return (
                      <div
                        key={key}
                        className="flex flex-col items-center justify-center rounded-lg flex-shrink-0"
                        style={{
                          minWidth: 34,
                          height: 44,
                          background: inRange ? COLORS.coral : COLORS.paper,
                          color: inRange ? "#fff" : COLORS.muted,
                          border: isToday ? `2px solid ${COLORS.ink}` : `1px solid ${COLORS.ruleLine}`,
                        }}
                      >
                        <span className="text-xs font-semibold">{d.getDate()}</span>
                        <span style={{ fontSize: 10 }}>{WEEKDAY_LABELS[d.getDay()]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pretty-card rounded-2xl p-3 mb-3 overflow-x-auto" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }}>
                <div className="text-xs font-semibold mb-2">주간 시간표 한눈에 보기</div>
                <div style={{minWidth:520,display:'grid',gridTemplateColumns:'42px repeat(7,1fr)',gap:3}}>
                  <div />{DAY_ORDER.map(day=><div key={day} className="text-xs text-center font-semibold" style={{color:day===todayName?COLORS.strawberry:COLORS.muted}}>{day}</div>)}
                  {Array.from({length:14}).map((_,ri)=>{const hour=9+ri;return [<div key={`h${hour}`} className="text-xs" style={{color:COLORS.muted,height:34}}>{hour}</div>,...DAY_ORDER.map(day=>{const items=data.classes.filter(c=>(c.dayMode==='daily'||((!c.dayMode||c.dayMode==='weekday')&&c.day===day))&&timeToMin(c.start)<(hour+1)*60&&timeToMin(c.end)>hour*60);return <div key={`${day}${hour}`} style={{height:34,background:items.length?COLORS.paper:'transparent',border:`1px solid ${COLORS.ruleLine}`,borderRadius:6,padding:2,overflow:'hidden'}}>{items.slice(0,2).map(c=><div key={c.id} style={{fontSize:9,lineHeight:1.15,color:COLORS.ink,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.name}</div>)}</div>})]})}
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-3">
                {DAY_ORDER.map((day) => {
                  const dayClasses = classesForWeekday(data.classes, day).sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
                  const totalMin = classMinutesForDay(data.classes, day);
                  return (
                    <div key={day} style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs w-7 h-7 flex items-center justify-center font-semibold" style={{ color: day === todayName ? "#fff" : COLORS.muted, background: day === todayName ? COLORS.strawberry : COLORS.paper, borderRadius: "50%", border:`1px solid ${day === todayName ? COLORS.strawberry : COLORS.ruleLine}` }}>{day}</span>
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-1">
                            {dayClasses.length === 0 && <span className="text-xs py-1" style={{ color: COLORS.muted }}>-</span>}
                            {dayClasses.map((c) => (
                              <span key={c.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: COLORS.paper, border: `1px solid ${COLORS.ruleLine}` }}>
                                <span style={{ width: 6, height: 6, borderRadius: 3, background: TYPE_COLOR[c.type] || TYPE_COLOR["기타"], display: "inline-block" }} />
                                {c.name} {c.start}-{c.end}
                                <button onClick={() => removeClass(c.id)} style={{ color: COLORS.muted }}><X size={10} /></button>
                              </span>
                            ))}
                          </div>
                          {totalMin > 0 && <div className="text-xs mt-1" style={{ color: COLORS.muted }}>총 {Math.round(totalMin / 60 * 10) / 10}시간</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {data.classes.some((c) => c.dayMode === "daily") && (
                <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="rounded-xl p-3 mb-3">
                  <div className="text-xs font-semibold mb-1.5">매일 반복</div>
                  <div className="flex flex-wrap gap-1">
                    {data.classes.filter((c) => c.dayMode === "daily").map((c) => (
                      <span key={c.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: COLORS.paper, border: `1px solid ${COLORS.ruleLine}` }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: TYPE_COLOR[c.type] || TYPE_COLOR["기타"], display: "inline-block" }} />
                        {c.name} {c.start}-{c.end}
                        <button onClick={() => removeClass(c.id)} style={{ color: COLORS.muted }}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.classes.some((c) => c.dayMode === "date") && (
                <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="rounded-xl p-3 mb-3">
                  <div className="text-xs font-semibold mb-1.5">특정 날짜</div>
                  <div className="flex flex-col gap-1">
                    {data.classes.filter((c) => c.dayMode === "date").sort((a, b) => (a.date < b.date ? -1 : 1)).map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <span style={{ width: 6, height: 6, borderRadius: 3, background: TYPE_COLOR[c.type] || TYPE_COLOR["기타"], display: "inline-block" }} />
                          {c.name} {c.start}-{c.end}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span style={{ color: COLORS.muted, fontFamily: "'IBM Plex Mono', monospace" }}>{c.date}</span>
                          <button onClick={() => removeClass(c.id)} style={{ color: COLORS.muted }}><X size={11} /></button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.classes.some((c) => c.dayMode === "none") && (
                <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="rounded-xl p-3 mb-3">
                  <div className="text-xs font-semibold mb-1.5">미정 (공강 계산에는 포함 안 됨)</div>
                  <div className="flex flex-wrap gap-1">
                    {data.classes.filter((c) => c.dayMode === "none").map((c) => (
                      <span key={c.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: COLORS.paper, border: `1px solid ${COLORS.ruleLine}` }}>
                        {c.name} {c.start}-{c.end}
                        <button onClick={() => removeClass(c.id)} style={{ color: COLORS.muted }}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setShowAddClass((v) => !v)} className="flex items-center gap-1 text-xs mb-2 px-3 py-1.5 rounded-full transition-transform active:scale-95" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }}>
                <Plus size={12} /> 일정 추가
              </button>
              {showAddClass && (
                <div className="rounded-xl p-3 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }}>
                  <input value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} className="border rounded px-2 py-1.5 text-sm w-full mb-2" style={{ borderColor: COLORS.ruleLine, background: COLORS.paper }} placeholder="이름 (예: 통계학개론, 카페 알바)" />
                  <div className="flex flex-wrap gap-1 mb-2">
                    {CLASS_TYPES.map((type) => (
                      <button key={type} onClick={() => setNewClass({ ...newClass, type })} className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: newClass.type === type ? COLORS.ink : COLORS.paper, color: newClass.type === type ? "#fff" : COLORS.ink, border: `1px solid ${COLORS.ruleLine}` }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: TYPE_COLOR[type], display: "inline-block" }} />
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs mb-1" style={{ color: COLORS.muted }}>반복 방식</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {[
                      { key: "weekday", label: "요일 반복" },
                      { key: "daily", label: "매일 반복" },
                      { key: "date", label: "특정 날짜" },
                      { key: "none", label: "선택 안 함" },
                    ].map((m) => (
                      <button key={m.key} onClick={() => setNewClass({ ...newClass, dayMode: m.key })} className="text-xs px-2.5 py-1 rounded-full" style={{ background: newClass.dayMode === m.key ? COLORS.ink : COLORS.paper, color: newClass.dayMode === m.key ? "#fff" : COLORS.ink, border: `1px solid ${COLORS.ruleLine}` }}>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {newClass.dayMode === "weekday" && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {DAY_ORDER.map((day) => (
                        <button key={day} onClick={() => setNewClass({ ...newClass, day })} className="text-xs px-2.5 py-1 rounded-full" style={{ background: newClass.day === day ? COLORS.ink : COLORS.paper, color: newClass.day === day ? "#fff" : COLORS.ink, border: `1px solid ${COLORS.ruleLine}` }}>
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                  {newClass.dayMode === "date" && (
                    <div className="mb-2">
                      <input type="date" value={newClass.date} onChange={(e) => setNewClass({ ...newClass, date: e.target.value })} className="border rounded px-2 py-1.5 text-sm" style={{ borderColor: COLORS.ruleLine, background: COLORS.paper }} />
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
                    <div className="flex flex-col">
                      <label className="text-xs mb-1" style={{ color: COLORS.muted }}>시작</label>
                      <input type="time" value={newClass.start} onChange={(e) => setNewClass({ ...newClass, start: e.target.value })} className="border rounded px-2 py-1.5 text-sm" style={{ borderColor: COLORS.ruleLine, background: COLORS.paper }} />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs mb-1" style={{ color: COLORS.muted }}>종료</label>
                      <input type="time" value={newClass.end} onChange={(e) => setNewClass({ ...newClass, end: e.target.value })} className="border rounded px-2 py-1.5 text-sm" style={{ borderColor: COLORS.ruleLine, background: COLORS.paper }} />
                    </div>
                    <button onClick={addClass} className="px-3 py-1.5 rounded text-sm text-white" style={{ background: COLORS.ink }}>추가</button>
                  </div>
                </div>
              )}
            </div>
          )}

            </>
          )}

          {activeTab === "settings" && (
            <div style={{ animation: "fadeIn 0.3s ease both" }}>
              <div className="mt-2 mb-4">
                <div style={{ fontSize:19,fontWeight:800,letterSpacing:"-0.02em" }}>설정</div>
                <div className="text-xs" style={{ color: COLORS.muted }}>{auth.username}님으로 로그인됨</div>
              </div>
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}`, color: COLORS.muted }} className="rounded-xl p-3 mb-3 text-xs">
                누적 완료 {data.totalCompleted || 0}개 · 연속 {streakCount}일
              </div>

              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-3.5 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">완료 통계</span>
                  <div className="flex gap-1">
                    {[7, 30].map((r) => (
                      <button key={r} onClick={() => setStatsRange(r)} className="text-xs px-2 py-0.5 rounded-full" style={{ background: statsRange === r ? COLORS.ink : COLORS.paper, color: statsRange === r ? "#fff" : COLORS.muted, border: `1px solid ${COLORS.ruleLine}` }}>
                        {r}일
                      </button>
                    ))}
                  </div>
                </div>
                {(() => {
                  const days = Array.from({ length: statsRange }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (statsRange - 1 - i));
                    const key = toKey(d);
                    return { key, count: (data.completionLog && data.completionLog[key]) || 0, isToday: key === today };
                  });
                  const maxCount = Math.max(...days.map((d) => d.count), 1);
                  return (
                    <div className="flex items-end gap-0.5" style={{ height: 56 }}>
                      {days.map((d) => (
                        <div key={d.key} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                          <div style={{ width: "100%", height: `${Math.max(4, (d.count / maxCount) * 100)}%`, background: d.count > 0 ? COLORS.mint : COLORS.ruleLine, borderRadius: 3, transition: "height 0.3s ease" }} title={`${d.key}: ${d.count}개`} />
                          {statsRange <= 7 && <span className="text-xs" style={{ color: d.isToday ? COLORS.ink : COLORS.muted, fontWeight: d.isToday ? 700 : 400 }}>{WEEKDAY_LABELS[new Date(d.key).getDay()]}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-3.5 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">다크모드</span>
                  <button onClick={toggleDarkMode} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: darkMode ? COLORS.ink : COLORS.paper, color: darkMode ? "#fff" : COLORS.muted, border: `1px solid ${COLORS.ruleLine}` }}>
                    {darkMode ? "켜짐" : "꺼짐"}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">마감 임박 브라우저 알림</span>
                  {notifPermission === "granted" ? (
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: COLORS.mint, color: "#fff" }}>켜짐</span>
                  ) : (
                    <button onClick={requestNotifPermission} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: COLORS.paper, color: COLORS.muted, border: `1px solid ${COLORS.ruleLine}` }}>
                      {notifPermission === "denied" ? "브라우저 설정에서 허용 필요" : "켜기"}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}` }} className="pretty-card rounded-2xl p-3.5 mb-3">
                <div className="text-xs font-semibold flex items-center gap-1 mb-2"><ShieldCheck size={13}/> 내 데이터</div>
                <div className="text-xs mb-2" style={{color:COLORS.muted}}>시간표·할 일·준비물 메모는 계정에 저장되고, 책장 PDF·녹음은 이 브라우저에 저장돼요.</div>
                <div className="text-[10px] mb-3" style={{color:COLORS.muted}}>JSON 백업에는 책장 자료도 포함돼요. 자료가 많으면 파일이 커질 수 있어요.</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={downloadBackup} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`}}><Download size={12}/> JSON 백업</button>
                  <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`}}><Upload size={12}/> 백업 복원</button>
                  <input ref={importInputRef} type="file" accept="application/json,.json" onChange={(e)=>restoreBackupFile(e.target.files?.[0])} style={{display:'none'}} />
                  <button onClick={clearMyCloudData} className="text-xs px-3 py-1.5 rounded-full" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,color:'#B3261E'}}>내 플래너 데이터 삭제</button>
                </div>
                <div className="mt-3 pt-3" style={{borderTop:`1px dashed ${COLORS.ruleLine}`}}>
                  <div className="text-[10px] mb-2" style={{color:COLORS.muted}}>GitHub Pages에서 AI를 쓰려면 Vercel API 주소를 빌드 환경에 연결해야 해요.</div>
                  <button onClick={deleteAccount} className="text-xs px-3 py-1.5 rounded-full" style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,color:'#B3261E'}}>회원탈퇴</button>
                </div>
              </div>

              <button onClick={resetAll} className="flex items-center gap-2 text-sm w-full px-4 py-3 rounded-xl mb-2 transition-transform active:scale-95" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}`, color: COLORS.ink }}>
                <RotateCcw size={16} /> 모든 데이터 초기화
              </button>
              <button onClick={logout} className="flex items-center gap-2 text-sm w-full px-4 py-3 rounded-xl transition-transform active:scale-95" style={{ background: COLORS.card, border: `1px solid ${COLORS.ruleLine}`, color: "#B3261E" }}>
                <LogOut size={16} /> 로그아웃
              </button>
            </div>
          )}
          </div>
          )}

          {activeTab === "jobs" && (
            <div className="px-4 pt-4 pb-6">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-base font-semibold">마감함</div>
                  <div className="text-xs mt-0.5" style={{color:COLORS.muted}}>성대 채용·모집 공지 모아보기</div>
                  <div className="flex gap-1.5 mt-2">
                    {["마감순","등록순"].map((s)=>(
                      <button key={s} onClick={()=>setJobsSort(s)} className="text-[11px] px-3 py-1 rounded-full"
                        style={{background:jobsSort===s?COLORS.ink:COLORS.paper,color:jobsSort===s?"#fff":COLORS.muted,border:`1px solid ${COLORS.ruleLine}`}}>{s}</button>
                    ))}
                  </div>
                </div>
                {jobs?.updated && <div className="text-[10px]" style={{color:COLORS.muted}}>{jobs.updated.slice(5,10)} 기준</div>}
              </div>

              {jobsErr && (
                <div className="rounded-2xl p-5 text-center" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}>
                  <div className="text-sm font-semibold mb-1">공지를 가져오지 못했어요</div>
                  <div className="text-xs" style={{color:COLORS.muted}}>크롤러 저장소를 아직 안 만들었거나<br/>주소가 달라요</div>
                </div>
              )}

              {!jobs && !jobsErr && <div className="text-xs text-center py-8" style={{color:COLORS.muted}}>불러오는 중…</div>}

              {meals?.days && (() => {
                const t = todayKey();
                const md = pickMealDay(meals, t);
                if (!md) return null;
                const m = md.m;
                const Row = ({ label, arr }) => (arr && arr.length) ? (
                  <div className="mb-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full mr-1.5" style={{background:COLORS.paper,color:COLORS.muted}}>{label}</span>
                    <span className="text-[11px]">{arr.join(" · ")}</span>
                  </div>
                ) : null;
                return (
                  <div className="rounded-2xl p-3 mb-4" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`}}>
                    <div className="text-xs font-bold mb-2">{mealDayLabel(md)}</div>
                    <Row label="조식" arr={m.breakfast}/>
                    <Row label="중식" arr={m.lunch}/>
                    <Row label="석식" arr={m.dinner}/>
                  </div>
                );
              })()}

              {jobs && (() => {
                const today = todayKey();
                const list = (jobs.items || []).filter((j) => !jobsHide.includes(j.id))
                  .filter((j) => !j.posted || (new Date(today) - new Date(j.posted)) / 86400000 <= 14);
                const dday = (d) => Math.round((new Date(d) - new Date(today)) / 86400000);
                const soon = list.filter((j) => j.due && dday(j.due) >= 0 && dday(j.due) <= 7);
                const later = list.filter((j) => j.due && dday(j.due) > 7);
                const nodue = list.filter((j) => !j.due);
                const past = list.filter((j) => j.due && dday(j.due) < 0);

                const Card = ({ j }) => {
                  const d = j.due ? dday(j.due) : null;
                  const urgent = d !== null && d <= 3;
                  return (
                    <div className="rounded-2xl p-3 mb-2" style={{background:COLORS.card,border:`1px solid ${urgent?COLORS.strawberry:COLORS.ruleLine}`}}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <a href={j.url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold leading-snug" style={{color:COLORS.ink}}>{j.title}</a>
                          <div className="text-[10px] mt-1" style={{color:COLORS.muted}}>
                            {j.writer && <>{j.writer} · </>}{j.posted}
                            {j.dueText && <> · {j.dueText}</>}
                          </div>
                        </div>
                        {j.due && (
                          <div className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
                            style={{background:urgent?COLORS.strawberry:COLORS.paper,color:urgent?"#fff":COLORS.muted}}>
                            {d === 0 ? "오늘 마감" : d > 0 ? `D-${d}` : `D+${-d}`}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={() => jobToTask(j)} className="text-[11px] px-2.5 py-1 rounded-full flex-1"
                          style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`}}>할 일에 담기</button>
                        <button onClick={() => hideJob(j.id)} className="text-[11px] px-2.5 py-1 rounded-full"
                          style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,color:COLORS.muted}}>관심 없음</button>
                      </div>
                    </div>
                  );
                };

                if (!list.length) return <div className="text-xs text-center py-8" style={{color:COLORS.muted}}>지금은 볼 공지가 없어요</div>;

                if (jobsSort === "등록순") {
                  const byPosted = [...list].sort((a, b) => (b.posted || "").localeCompare(a.posted || ""));
                  return <>{byPosted.map((j) => <Card key={j.id} j={j}/>)}</>;
                }

                return (
                  <>
                    {soon.length > 0 && <>
                      <div className="text-xs font-bold mb-1.5" style={{color:COLORS.strawberry}}>이번 주 마감 {soon.length}건</div>
                      {soon.map((j) => <Card key={j.id} j={j}/>)}
                    </>}
                    {later.length > 0 && <>
                      <div className="text-xs font-bold mt-4 mb-1.5">여유 있는 마감 {later.length}건</div>
                      {later.map((j) => <Card key={j.id} j={j}/>)}
                    </>}
                    {nodue.length > 0 && <>
                      <div className="text-xs font-bold mt-4 mb-1.5" style={{color:COLORS.muted}}>상시 모집 {nodue.length}건</div>
                      {nodue.map((j) => <Card key={j.id} j={j}/>)}
                    </>}
                    {past.length > 0 && <div className="text-[10px] mt-4 text-center" style={{color:COLORS.muted}}>지난 공지 {past.length}건은 숨겼어요</div>}
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === "shelf" && (
            <div className="px-4 pt-4 pb-6">
              {!openBook && (
                <>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="text-base font-semibold">책장</div>
                      <div className="text-xs mt-0.5" style={{color:COLORS.muted}}>시간표 과목이 책으로 꽂혀요</div>
                    </div>
                    <div className="text-right">
                      <button onClick={() => setScanOpen(true)} className="text-[11px] px-2.5 py-1 rounded-full mb-1"
                        style={{background:COLORS.mint,color:"#fff"}}>교재 스캔</button>
                      <div className="text-[10px]" style={{color:COLORS.muted}}>
                        {(() => { const u = shelfUsage(shelf); return `자료 ${u.files}/${SHELF_LIMIT_FILES} · ${u.mb.toFixed(1)}/${SHELF_LIMIT_MB}MB`; })()}
                      </div>
                    </div>
                  </div>

                  {subjectsFromClasses(data.classes).length === 0 ? (
                    <div className="rounded-2xl p-6 text-center" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}>
                      <BookOpen size={28} style={{margin:"0 auto 8px",color:COLORS.muted}}/>
                      <div className="text-sm font-semibold mb-1">아직 책이 없어요</div>
                      <div className="text-xs mb-3" style={{color:COLORS.muted}}>시간표에 수업을 넣으면 과목마다 책이 한 권씩 생겨요</div>
                      <button onClick={() => setActiveTab("calendar")} className="text-xs px-3 py-1.5 rounded-full" style={{background:COLORS.ink,color:"#fff"}}>시간표 등록하러 가기</button>
                    </div>
                  ) : (
                    <>
                    <div className="text-[10px] mb-2 rounded-xl px-2.5 py-2" style={{background:COLORS.paper,color:COLORS.muted,border:`1px dashed ${COLORS.ruleLine}`}}>📖 책을 열면 녹음(자동 대본) · 자료 · AI 요약 · 교수님 출제 분석을 쓸 수 있어요</div>
                    <div className="grid grid-cols-3 gap-3">
                      {subjectsFromClasses(data.classes).map((name, i) => {
                        const book = getBook(name);
                        const cnt = (book.entries || []).length;
                        const need = (book.entries || []).filter((e) => e.understand === "review" || e.understand === "no").length;
                        const col = BOOK_COLORS[i % BOOK_COLORS.length];
                        return (
                          <button key={name} onClick={() => setOpenBook(name)}
                            className="relative rounded-lg text-left p-2.5"
                            style={{aspectRatio:"3/4",background:col,boxShadow:"0 4px 10px rgba(119,84,80,.18)",overflow:"hidden"}}>
                            <div style={{position:"absolute",left:0,top:0,bottom:0,width:9,background:"rgba(0,0,0,.14)"}}/>
                            <div className="flex flex-col h-full justify-between" style={{paddingLeft:8}}>
                              <div className="text-[11px] font-bold leading-tight" style={{color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,.18)"}}>{name}</div>
                              <div>
                                <div className="text-[9px]" style={{color:"rgba(255,255,255,.9)"}}>{cnt}회차</div>
                                {need > 0 && <div className="text-[9px] font-bold" style={{color:"#fff"}}>복습 {need}</div>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    </>
                  )}
                </>
              )}

              {openBook && (() => {
                const book = getBook(openBook);
                const entries = book.entries || [];
                return (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <button onClick={() => setOpenBook(null)} className="p-1.5 rounded-full" style={{background:COLORS.paper}}><ChevronLeft size={16}/></button>
                      <div className="flex-1">
                        <div className="text-base font-semibold">{openBook}</div>
                        <div className="text-xs" style={{color:COLORS.muted}}>{entries.length}회차 기록</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => analyzeProfessorStyle(openBook)} disabled={analysisLoading} className="text-[10px] px-2.5 py-1.5 rounded-full" style={{background:COLORS.ink,color:"#fff",opacity:analysisLoading?.6:1}}>{analysisLoading ? "분석 중…" : "교수님 분석"}</button>
                        <button onClick={() => addEntry(openBook, {})} className="text-xs px-3 py-1.5 rounded-full" style={{background:COLORS.strawberry,color:"#fff"}}><Plus size={12} style={{display:"inline"}}/> 오늘 수업</button>
                      </div>
                    </div>

                    <div className="rounded-2xl p-3 mb-3" style={{background:COLORS.card,border:`1px dashed ${COLORS.ruleLine}`}}>
                      <div className="text-xs font-bold mb-1">교수님 출제 스타일 · 예상문제</div>
                      <div className="text-[10px] leading-relaxed" style={{color:COLORS.muted}}>각 회차의 ‘자료 추가’에 강의계획서·PPT·녹음 대본·족보 PDF를 넣고 분석 버튼을 눌러보세요. 자료를 비교해 출제 성향과 예상문제를 회차로 저장해요.</div>
                      <div className="text-[10px] mt-1.5" style={{color:COLORS.muted}}>AI 결과는 업로드한 자료를 바탕으로 한 참고용 분석이며 실제 출제를 보장하지 않아요.</div>
                      {analysisError && <div className="text-[10px] mt-1.5" style={{color:COLORS.strawberry}}>{analysisError}</div>}
                    </div>

                    <div className="rounded-2xl p-3 mb-3" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}>
                      <div className="text-xs font-bold mb-1">PDF·녹음 대본에서 필요한 페이지만 정리</div>
                      <div className="text-[10px] mb-2" style={{color:COLORS.muted}}>크롬에서 녹음하면 대본이 자동으로 만들어져요. 대본 옆 ‘필기본 만들기’를 누르면 보존형·핵심 요약·필기본을 한 번에 정리해요. AI 결과는 참고용이에요.</div>
                      <label className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-xs cursor-pointer mb-2"
                        style={{background:COLORS.card,border:`1px dashed ${COLORS.muted}`}}>
                        {pdfFile ? `${pdfFile.name.slice(0,22)}${pdfPages?` · ${pdfPages}p`:""}` : "PDF 선택"}
                        <input type="file" accept="application/pdf" hidden onChange={(e)=>pickPdf(e.target.files?.[0]||null)}/>
                      </label>
                      {pdfFile && (
                        <>
                          <div className="flex items-center gap-1.5 mb-2">
                            <input value={pdfFrom} onChange={(e)=>setPdfFrom(e.target.value)} inputMode="numeric"
                              className="w-14 text-center text-xs rounded-lg px-1 py-1.5" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`}}/>
                            <span className="text-xs" style={{color:COLORS.muted}}>~</span>
                            <input value={pdfTo} onChange={(e)=>setPdfTo(e.target.value)} inputMode="numeric"
                              className="w-14 text-center text-xs rounded-lg px-1 py-1.5" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`}}/>
                            <span className="text-[10px]" style={{color:COLORS.muted}}>페이지{pdfPages?` (총 ${pdfPages})`:""}</span>
                          </div>
                          <div className="flex gap-1 flex-wrap mb-2">
                            {Object.keys(SUMMARY_MODES).map((m2)=>(
                              <button key={m2} onClick={()=>setSumMode(m2)} className="text-[10px] px-2 py-1 rounded-full"
                                style={{background:sumMode===m2?COLORS.ink:COLORS.card,color:sumMode===m2?"#fff":COLORS.muted,border:`1px solid ${COLORS.ruleLine}`}}>{m2}</button>
                            ))}
                          </div>
                          <button onClick={()=>summarizePdf(openBook)} disabled={sumLoading}
                            className="w-full text-xs py-2 rounded-full" style={{background:COLORS.strawberry,color:"#fff",opacity:sumLoading?.6:1}}>
                            {sumLoading ? "정리하는 중…" : "이 페이지만 정리하기"}
                          </button>
                        </>
                      )}
                      {sumError && <div className="text-[10px] mt-1.5" style={{color:COLORS.strawberry}}>{sumError}</div>}
                    </div>

                    {entries.length === 0 && (
                      <div className="rounded-2xl p-6 text-center" style={{background:COLORS.paper,border:`1px dashed ${COLORS.ruleLine}`}}>
                        <div className="text-sm font-semibold mb-1">첫 수업을 기록해 볼까요?</div>
                        <div className="text-xs" style={{color:COLORS.muted}}>녹음 · 자료 · 수업 노트를 회차별로 모아둬요</div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {entries.map((en) => {
                        const isRec = recording && recording.entryId === en.id;
                        return (
                          <div key={en.id} className="rounded-2xl p-3" style={{background:COLORS.card,border:`1px solid ${COLORS.ruleLine}`}}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold">{en.date}</div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => patchEntry(openBook, en.id, { star: !en.star })} className="p-1.5 rounded-full" style={{background:en.star?COLORS.yellow:COLORS.paper}} title="시험 범위">
                                  <Star size={13} style={{color:en.star?"#fff":COLORS.muted}}/>
                                </button>
                                <button onClick={() => { if (confirm("이 회차를 지울까요?")) removeEntry(openBook, en.id); }} className="p-1.5 rounded-full" style={{background:COLORS.paper}}>
                                  <Trash2 size={13} style={{color:COLORS.muted}}/>
                                </button>
                              </div>
                            </div>

                            {en.source && (
                              <div className="text-[10px] rounded-lg px-2 py-1.5 mb-2" style={{background:COLORS.paper,color:COLORS.muted}}>
                                자료 근거 · {en.source.kind}{en.source.mode ? ` · ${en.source.mode}` : ""}{en.source.pages ? ` · ${en.source.pages}` : ""}
                                {en.source.name ? ` · ${en.source.name}` : ""}
                              </div>
                            )}

                            <textarea value={en.memo} onChange={(e) => patchEntry(openBook, en.id, { memo: e.target.value })}
                              rows={en.memo && en.memo.length > 160 ? 12 : 4} placeholder="이 회차 수업 노트를 자유롭게 적어요 — 길게 써도 돼요"
                              className="w-full text-sm rounded-xl px-2.5 py-2 mb-2"
                              style={{background:COLORS.paper,border:`1px solid ${COLORS.ruleLine}`,resize:"none",color:COLORS.ink}}/>

                            <div className="flex gap-1.5 mb-2">
                              {UNDERSTAND.map((u) => (
                                <button key={u.key} onClick={() => patchEntry(openBook, en.id, { understand: en.understand === u.key ? null : u.key })}
                                  className="text-[11px] px-2.5 py-1 rounded-full flex-1"
                                  style={{background:en.understand===u.key?u.color:COLORS.paper,color:en.understand===u.key?"#fff":COLORS.muted,border:`1px solid ${COLORS.ruleLine}`}}>
                                  {u.label}
                                </button>
                              ))}
                            </div>

                            {(en.files || []).length > 0 && (
                              <div className="flex flex-col gap-1 mb-2">
                                {en.files.map((f) => (
                                  <div key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{background:COLORS.paper}}>
                                    <span className="text-[11px] flex-1 truncate">{f.type === "audio" ? "🎙 " : f.type === "transcript" ? "📝 " : "📎 "}{f.name}</span>
                                    {f.type !== "transcript" && <span className="text-[9px]" style={{color:COLORS.muted}}>{fmtSize(f.size)}</span>}
                                    {f.type === "transcript" ? (
                                      <button onClick={() => summarizeTranscript(openBook, f)} disabled={trBusyId === f.id}
                                        className="text-[10px] px-2 py-0.5 rounded-full" style={{background:COLORS.strawberry,color:"#fff",opacity:trBusyId===f.id?0.6:1,whiteSpace:"nowrap"}}>
                                        {trBusyId === f.id ? "만드는 중…" : "필기본 만들기"}
                                      </button>
                                    ) : (
                                      <a href={f.url} download={f.name} className="text-[10px] px-2 py-0.5 rounded-full" style={{background:COLORS.ink,color:"#fff"}}>열기</a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-1.5">
                              <button onClick={() => toggleRecord(openBook, en.id)}
                                className="text-[11px] px-3 py-1.5 rounded-full flex-1"
                                style={{background:isRec?COLORS.strawberry:COLORS.paper,color:isRec?"#fff":COLORS.ink,border:`1px solid ${COLORS.ruleLine}`}}>
                                {isRec ? <><Square size={11} style={{display:"inline"}}/> 녹음 끝내기</> : <><Mic size={11} style={{display:"inline"}}/> 녹음</>}
                              </button>
                              <button onClick={() => { fileInputRef.current.dataset.entry = en.id; fileInputRef.current.click(); }}
                                className="text-[11px] px-3 py-1.5 rounded-full flex-1"
                                style={{background:COLORS.paper,color:COLORS.ink,border:`1px solid ${COLORS.ruleLine}`}}>
                                <Paperclip size={11} style={{display:"inline"}}/> 자료 추가
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <input ref={fileInputRef} type="file" accept="application/pdf,image/*" multiple hidden
                      onChange={(e) => { const id = fileInputRef.current.dataset.entry; attachFiles(openBook, id, e.target.files); e.target.value = ""; }}/>
                  </>
                );
              })()}
            </div>
          )}

          {scanOpen && (
            <div style={{position:"fixed",inset:0,zIndex:60,background:COLORS.page,display:"flex",flexDirection:"column"}}>
              <div className="flex items-center gap-2 px-3 py-2" style={{background:COLORS.card,borderBottom:`1px solid ${COLORS.ruleLine}`}}>
                <button onClick={() => setScanOpen(false)} className="p-1.5 rounded-full" style={{background:COLORS.paper}}><ChevronLeft size={16}/></button>
                <span className="text-sm font-semibold">교재 스캔 · 낱장</span>
              </div>
              <iframe {...(typeof window !== "undefined" && window.__SCAN_HTML__ ? { srcDoc: window.__SCAN_HTML__ } : { src: SCAN_SRC })} title="교재 스캔" style={{flex:1,width:"100%",border:0}}/>
            </div>
          )}

          {activeTab === "diary" && (
            <div style={{ height: "calc(100vh - 62px)", background: COLORS.paper, position: "relative" }}>
              <iframe
                {...(typeof window !== "undefined" && window.__DIARY_HTML__ ? { srcDoc: window.__DIARY_HTML__ } : { src: DIARY_SRC })}
                title="일기"
                style={{ width: "100%", height: "100%", border: 0, display: "block" }}
                allow="clipboard-write"
              />
            </div>
          )}

          <div style={{ borderTop: `1px solid ${COLORS.ruleLine}`, background: "rgba(255,253,252,.94)", boxShadow: "0 -8px 24px rgba(119,84,80,.05)" }} className="flex items-center justify-around py-3">
            <button onClick={() => setActiveTab("home")} className="flex flex-col items-center gap-0.5" style={{ color: activeTab === "home" ? COLORS.ink : COLORS.muted, opacity: activeTab === "home" ? 1 : 0.5 }}><Home size={18}/><span style={{fontSize:10}}>홈</span></button>
            <button onClick={() => setActiveTab("tasks")} className="flex flex-col items-center gap-0.5" style={{ color: activeTab === "tasks" ? COLORS.ink : COLORS.muted, opacity: activeTab === "tasks" ? 1 : 0.5 }}><ListTodo size={18}/><span style={{fontSize:10}}>할 일</span></button>
            <button onClick={() => setActiveTab("calendar")} className="flex flex-col items-center gap-0.5" style={{ color: activeTab === "calendar" ? COLORS.ink : COLORS.muted, opacity: activeTab === "calendar" ? 1 : 0.5 }}><CalendarDays size={18}/><span style={{fontSize:10}}>시간표</span></button>
            <button onClick={() => { setActiveTab("shelf"); setOpenBook(null); }} className="flex flex-col items-center gap-0.5" style={{ color: activeTab === "shelf" ? COLORS.ink : COLORS.muted, opacity: activeTab === "shelf" ? 1 : 0.5 }}><BookOpen size={18}/><span style={{fontSize:10}}>책장</span></button>
            <button onClick={() => setActiveTab("diary")} className="flex flex-col items-center gap-0.5" style={{ color: activeTab === "diary" ? COLORS.ink : COLORS.muted, opacity: activeTab === "diary" ? 1 : 0.5 }}><NotebookPen size={18}/><span style={{fontSize:10}}>일기</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
