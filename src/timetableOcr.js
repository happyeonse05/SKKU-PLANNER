/* 담다 · 무료 시간표 OCR (API 키 없이 브라우저에서만 동작)
 *
 * 흐름: 사진 → tesseract.js(한국어) OCR → 두 가지 방식으로 해석
 *   1) 목록형: "미적분학1 월10:30-11:45【61304】,수10:30-11:45" 같은 글자 패턴
 *   2) 표형(킹고포털·에타 주간 시간표): 요일 머리글 → 열, 왼쪽 시간 눈금 → y좌표↔시각,
 *      색칠된 칸(없으면 글자 뭉치)을 수업 하나로 보고 칸마다 다시 OCR
 * 결과 형식: [{ name, day, start, end, room }]  (day: 월~일 한 글자, 시간: HH:MM, 모르면 "")
 *
 * 서버/Vercel 번들에는 들어가지 않고, 필요할 때만 브라우저가 불러옵니다.
 * OCR 엔진·한국어 데이터(약 1.5MB)는 처음 한 번 jsdelivr CDN에서 받아 브라우저에 캐시됩니다.
 * 영어 과목명이 깨져 보일 때만 영어 데이터(약 2.9MB)를 추가로 받아 그 칸만 다시 읽습니다.
 */

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const EN_DAYS = { MON: "월", TUE: "화", WED: "수", THU: "목", FRI: "금", SAT: "토", SUN: "일" };
const PERIOD_START_MIN = 9 * 60; // 교시만 있을 때: 1교시 09:00, 이후 60분 간격으로 가정
const PERIOD_STEP_MIN = 60;

/* ---------- 공통 유틸 ---------- */
const pad2 = (n) => String(n).padStart(2, "0");
const toHHMM = (min) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
const round5 = (min) => Math.round(min / 5) * 5;
const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
function fixDigits(t) {
  // OCR이 숫자를 글자로 읽는 흔한 실수 보정 (시간·강의실 번호용)
  return String(t || "").replace(/[Oo]/g, "0").replace(/[lI|]/g, "1").replace(/[;]/g, ":");
}
function hm(h, m) {
  const H = Number(h), M = Number(m);
  if (!Number.isFinite(H) || !Number.isFinite(M) || H > 23 || M > 59) return null;
  return H * 60 + M;
}
function cleanName(t) {
  return String(t || "")
    .replace(/([가-힣])[|lI\]!](?=\s|$)/g, "$11")      // "미적분학|" → "미적분학1" (과목 번호 1을 막대로 읽는 경우)
    .replace(/[^0-9A-Za-z가-힣()&+·\-\s.,]/g, " ")  // OCR 잡티(_ 。 | 등) 먼저 제거
    .replace(/[A-Z]{2,5}\d{3,5}(-\d{1,2})?/g, " ")  // 학수번호 (GEDB001-01 등)
    .replace(/\S*\d{3,}-\d{1,2}\S*/g, " ")        // OCR이 영문을 숫자로 읽은 학수번호 (6608001-01 등)
    .replace(/\(?\s*\d{1,2}\s*분반\s*\)?/g, " ")
    .replace(/\d(\.\d)?\s*학점/g, " ")
    .replace(/\s\d\s*[.,]?\s*\d\s*$/, " ")        // 줄 끝 학점 (3.0 / 3 0)
    .replace(/[.,]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[-·\s]+|[-·\s]+$/g, "");
}

/* ---------- 1) 목록형 글자 패턴 ---------- */
const T = "(\\d{1,2})\\s*[:.]\\s*(\\d{2})";
const SEG_RE = new RegExp(
  `([월화수목금토일](?:\\s*[,·/]\\s*[월화수목금토일])*)\\s*(?:요일)?\\s*${T}\\s*[-~–—]\\s*${T}` +
  `(?:\\s*[【\\[(<{]\\s*([^】\\])>}]{1,24}?)\\s*[】\\])>}])?(?:\\s*(\\d{5}))?`,
  "g"
);

export function parseTimetableText(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => fixDigitsInTimes(l)).filter((l) => l.trim());
  const rows = [];
  let lastName = "";
  lines.forEach((line) => {
    SEG_RE.lastIndex = 0;
    const matches = [...line.matchAll(SEG_RE)];
    if (!matches.length) {
      // 시간 줄 위의 줄을 과목명으로 봅니다. 영어 과목명이 깨져 비어 보여도 다음 줄에 이전 과목명이 붙지 않게 갱신.
      lastName = cleanName(line).slice(0, 40);
      return;
    }
    const prefix = cleanName(line.slice(0, matches[0].index));
    const name = prefix.length >= 2 ? prefix.slice(0, 40) : lastName;
    matches.forEach((m, mi) => {
      const start = hm(m[2], m[3]);
      const end = hm(m[4], m[5]);
      if (start == null || end == null || end <= start) return;
      // 괄호 없이 "제1공학관 21102"처럼 뒤에 붙은 강의실도 찾습니다 (다음 요일·시간 전까지).
      const after = line.slice(m.index + m[0].length, mi + 1 < matches.length ? matches[mi + 1].index : undefined);
      const room = (m[6] || m[7] || findRoom(after.split("/")[0]) || "").replace(/\s+/g, "").trim();
      m[1].split(/[,·/\s]+/).filter((d) => DAYS.includes(d)).forEach((day) => {
        rows.push({ name, day, start: toHHMM(start), end: toHHMM(end), room });
      });
    });
    lastName = name;
  });
  return dedupe(rows);
}
function nameAboveTime(text, start, end) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const tm = fixDigitsInTimes(lines[i]).match(TIME_RANGE_RE);
    if (!tm || toHHMM(hm(tm[1], tm[2]) ?? -1) !== start || toHHMM(hm(tm[3], tm[4]) ?? -1) !== end) continue;
    const before = cleanName(lines[i].slice(0, tm.index).replace(/[월화수목금토일]\s*$/, ""));
    if (plausibleName(before)) return before;
    return i > 0 ? cleanName(lines[i - 1]) : "";
  }
  return "";
}
function fixDigitsInTimes(line) {
  // "1O:3O-11:45" 처럼 시간 부분에 섞인 O/l만 고칩니다 (과목명은 그대로)
  return line.replace(/[0-9OolI|]{1,2}\s*[:;.]\s*[0-9OolI|]{2}/g, (s) => fixDigits(s));
}
function dedupe(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const k = `${r.name}|${r.day}|${r.start}|${r.end}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ---------- 2) 표형 (주간 격자) ---------- */
function dayOf(text) {
  const t = String(text || "").replace(/[\s()（）[\]|.,:;'"`~_\-]/g, "");
  let m = t.match(/^(월|화|수|목|금|토|일)(요일)?(MON|TUE|WED|THU|FRI|SAT|SUN)?$/i);
  if (m) return m[1];
  m = t.toUpperCase().match(/^(MON|TUE|WED|THU|FRI|SAT|SUN)/);
  if (m && t.length <= 9) return EN_DAYS[m[1]];
  return null;
}

function findDayColumns(words, imageWidth) {
  const cands = [];
  words.forEach((w) => {
    const d = dayOf(w.text);
    if (d) { cands.push({ day: d, bbox: w.bbox }); return; }
    // "월화수목금" 처럼 붙어서 읽힌 경우 글자 수만큼 폭을 나눕니다.
    const t = String(w.text || "").replace(/\s/g, "");
    if (/^[월화수목금토일]{3,7}$/.test(t)) {
      const step = (w.bbox.x1 - w.bbox.x0) / t.length;
      [...t].forEach((ch, i) => cands.push({ day: ch, bbox: { x0: w.bbox.x0 + step * i, x1: w.bbox.x0 + step * (i + 1), y0: w.bbox.y0, y1: w.bbox.y1 } }));
    }
  });
  if (cands.length < 3) return null;
  let best = null;
  cands.forEach((c) => {
    const cy = (c.bbox.y0 + c.bbox.y1) / 2;
    const h = Math.max(8, c.bbox.y1 - c.bbox.y0);
    const group = cands.filter((o) => Math.abs((o.bbox.y0 + o.bbox.y1) / 2 - cy) < h * 0.9);
    const byDay = new Map();
    group.forEach((g) => { if (!byDay.has(g.day)) byDay.set(g.day, g); });
    const uniq = [...byDay.values()].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    // 요일 순서가 왼쪽→오른쪽으로 맞아야 머리글로 인정
    const ordered = uniq.every((u, i) => i === 0 || DAYS.indexOf(u.day) > DAYS.indexOf(uniq[i - 1].day));
    if (!ordered || uniq.length < 3) return;
    if (!best || uniq.length > best.length || (uniq.length === best.length && cy < best.cy)) best = { items: uniq, length: uniq.length, cy };
  });
  if (!best) return null;
  const items = best.items.map((it) => ({ day: it.day, cx: (it.bbox.x0 + it.bbox.x1) / 2, bottom: it.bbox.y1 }));
  const gaps = items.slice(1).map((it, i) => (it.cx - items[i].cx) / (DAYS.indexOf(it.day) - DAYS.indexOf(items[i].day)));
  const sp = median(gaps);
  if (!(sp > 10)) return null;
  // OCR이 놓친 요일(예: 목)을 간격으로 채웁니다.
  const cols = [];
  const first = DAYS.indexOf(items[0].day);
  const last = DAYS.indexOf(items[items.length - 1].day);
  for (let di = first; di <= last; di += 1) {
    const found = items.find((it) => DAYS.indexOf(it.day) === di);
    const cx = found ? found.cx : items[0].cx + (di - first) * sp;
    cols.push({ day: DAYS[di], cx, left: cx - sp / 2, right: cx + sp / 2 });
  }
  // 머리글 끝 요일(월·금)을 OCR이 놓쳤어도 자리가 있으면 채웁니다. (토·일은 머리글이 보일 때만)
  while (DAYS.indexOf(cols[0].day) > 0 && cols[0].left - sp >= -sp * 0.1) {
    const cx = cols[0].cx - sp;
    cols.unshift({ day: DAYS[DAYS.indexOf(cols[0].day) - 1], cx, left: cx - sp / 2, right: cx + sp / 2 });
  }
  while (DAYS.indexOf(cols[cols.length - 1].day) < 4 && cols[cols.length - 1].right + sp * 0.8 <= imageWidth) {
    const lastCol = cols[cols.length - 1];
    const cx = lastCol.cx + sp;
    cols.push({ day: DAYS[DAYS.indexOf(lastCol.day) + 1], cx, left: cx - sp / 2, right: cx + sp / 2 });
  }
  cols.forEach((c) => { c.left = Math.max(0, c.left); c.right = Math.min(imageWidth, c.right); });
  return { cols, headerBottom: Math.max(...items.map((it) => it.bottom)), spacing: sp };
}

function parseTimeLabels(words, gridLeft, headerBottom) {
  let left = words.filter((w) => w.bbox.x1 <= gridLeft + 4 && w.bbox.y0 >= headerBottom - 2);
  // "오전" "9시"처럼 따로 읽힌 경우 같은 줄 오른쪽 단어에 붙입니다.
  const ampm = left.filter((w) => /^(오전|오후|AM|PM)$/i.test(w.text.trim()));
  left = left.filter((w) => !ampm.includes(w)).map((w) => {
    const cy = (w.bbox.y0 + w.bbox.y1) / 2;
    const tag = ampm.find((a) => Math.abs((a.bbox.y0 + a.bbox.y1) / 2 - cy) < (w.bbox.y1 - w.bbox.y0) && a.bbox.x1 <= w.bbox.x0 + 4);
    return tag ? { ...w, text: tag.text.trim() + w.text } : w;
  });
  const hasPeriodWord = left.some((w) => /교시/.test(w.text));
  const explicit = [], hourWords = [], bare = [];
  left.forEach((w) => {
    const t = fixDigits(w.text).replace(/\s/g, "");
    let m = t.match(/^(오전|오후|AM|PM)?(\d{1,2})[:.](\d{2})/i);
    if (m) {
      let min = hm(m[2], m[3]);
      if (min != null && /오후|PM/i.test(m[1] || "") && min < 12 * 60) min += 12 * 60;
      if (min != null) explicit.push({ min, bbox: w.bbox });
      return;
    }
    m = t.match(/^(오전|오후|AM|PM)?(\d{1,2})시?$/i);
    if (m && (m[1] || /시$/.test(t))) {
      let h = Number(m[2]);
      if (/오후|PM/i.test(m[1] || "") && h < 12) h += 12;
      if (h <= 23) hourWords.push({ min: h * 60, bbox: w.bbox });
      return;
    }
    m = t.match(/^(\d{1,2})(교시)?$/);
    if (m) bare.push({ n: Number(m[1]), bbox: w.bbox, period: !!m[2] });
  });
  if (explicit.length >= 2) return explicit;
  if (hourWords.length >= 2) {
    // 오전/오후 표시가 빠진 "12시 1시 2시"는 위에서 아래로 갈수록 늘도록 12시간을 더합니다.
    hourWords.sort((a, b) => a.bbox.y0 - b.bbox.y0);
    let prev = -1;
    return hourWords.map((hw) => {
      let min = hw.min;
      while (min <= prev && min + 720 < 24 * 60) min += 720;
      prev = min;
      return { ...hw, min };
    });
  }
  if (bare.length < 2) return explicit.concat(hourWords);
  bare.sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const asPeriod = hasPeriodWord || bare.some((b) => b.period) || bare[0].n <= 4;
  if (asPeriod) return bare.map((b) => ({ min: PERIOD_START_MIN + (b.n - 1) * PERIOD_STEP_MIN, bbox: b.bbox }));
  // 에타식 "9 10 11 12 1 2 3" → 12시간제 넘김 보정
  let offset = 0, prev = null;
  return bare.map((b) => {
    let v = b.n + offset;
    if (prev != null && v <= prev) { offset += 12; v = b.n + offset; }
    prev = v;
    return { min: v * 60, bbox: b.bbox };
  }).filter((a) => a.min <= 23 * 60 + 59);
}

function fitLine(points) {
  // minutes = a * y + b (최소제곱)
  const n = points.length;
  if (n < 2) return null;
  const sx = points.reduce((s, p) => s + p.y, 0), sy = points.reduce((s, p) => s + p.min, 0);
  const sxx = points.reduce((s, p) => s + p.y * p.y, 0), sxy = points.reduce((s, p) => s + p.y * p.min, 0);
  const den = n * sxx - sx * sx;
  if (!den) return null;
  const a = (n * sxy - sx * sy) / den;
  const b = (sy - a * sx) / n;
  return a > 0 ? { a, b } : null;
}

/* ---------- 픽셀 분석 ---------- */
function px(img, x, y) {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function backgroundColor(img, x0, y0, x1, y1) {
  const counts = new Map();
  let best = [255, 255, 255], bestN = 0;
  for (let y = Math.max(0, y0); y < Math.min(img.height, y1); y += 3) {
    for (let x = Math.max(0, x0); x < Math.min(img.width, x1); x += 3) {
      const c = px(img, x, y);
      const k = (c[0] >> 3) * 1024 + (c[1] >> 3) * 32 + (c[2] >> 3);
      const n = (counts.get(k) || 0) + 1;
      counts.set(k, n);
      if (n > bestN) { bestN = n; best = c; }
    }
  }
  return best;
}

// 가로줄(표 선) 찾기: 구간 폭의 대부분이 배경이 아닌 얇은 줄
function horizontalLines(img, x0, x1, y0, y1, bg, minFrac = 0.8) {
  const xa = Math.max(0, Math.round(x0)), xb = Math.min(img.width, Math.round(x1));
  const ya = Math.max(0, Math.round(y0)), yb = Math.min(img.height, Math.round(y1));
  const lines = [];
  let start = -1, prev = -1;
  for (let y = ya; y < yb; y += 1) {
    let non = 0, tot = 0;
    for (let x = xa; x < xb; x += 2) { tot += 1; if (dist(px(img, x, y), bg) > 22) non += 1; }
    const isLine = tot > 0 && non / tot >= minFrac;
    if (isLine) { if (start < 0) start = y; prev = y; }
    // 칸 테두리와 시간선이 겹치면 두꺼워지므로 12px까지 선으로 봅니다 (색칸은 이보다 훨씬 두꺼움).
    else if (start >= 0) { if (prev - start <= 12) lines.push(start); start = -1; }
  }
  if (start >= 0 && prev - start <= 12) lines.push(start);
  return lines;
}

// 한 열 안의 색칠된 칸(수업 블록) 찾기
function colorBlocks(img, col, y0, y1, bg, minH) {
  const w = col.right - col.left;
  const xa = Math.max(0, Math.round(col.left + w * 0.12)), xb = Math.min(img.width, Math.round(col.right - w * 0.12));
  const fill = [];
  const rowColor = [];
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(img.height, Math.round(y1)); y += 1) {
    let tot = 0;
    const rs = [], gs = [], bs = [];
    for (let x = xa; x < xb; x += 2) {
      tot += 1;
      const c = px(img, x, y);
      if (dist(c, bg) >= 28 && lum(c) >= 90) { rs.push(c[0]); gs.push(c[1]); bs.push(c[2]); }
    }
    // 글자 테두리(안티앨리어싱) 때문에 색이 흔들리지 않게 평균 대신 중앙값을 씁니다.
    const mc = rs.length ? [median(rs), median(gs), median(bs)] : null;
    // 검은 글씨 가장자리(회색)는 칸으로 치지 않되, 줄 대부분이 회색이면 회색 수업 칸으로 봅니다.
    const grayText = mc && Math.max(...mc) - Math.min(...mc) < 10 && lum(mc) < 200 && rs.length / tot < 0.75;
    const isFill = tot > 0 && rs.length / tot >= 0.4 && !grayText;
    fill.push({ y, isFill });
    rowColor.push(isFill ? mc : null);
  }
  const runs = [];
  let cur = null;
  fill.forEach((f, i) => {
    if (f.isFill) {
      const c = rowColor[i];
      // 굵은 흰 글씨 줄에서 잠깐 끊겨도 같은 색이면 한 칸으로 잇습니다.
      if (cur && f.y - cur.end <= 14 && dist(c, cur.color) < 70) { cur.end = f.y; return; }
      if (cur) runs.push(cur);
      cur = { start: f.y, end: f.y, color: c };
    }
  });
  if (cur) runs.push(cur);
  // 짧게 떨어져 나온 조각(흐린 사진에서 글자 줄 때문에 끊긴 부분)은 바로 붙은 칸에 합칩니다.
  const merged = [];
  runs.forEach((r) => {
    const prev = merged[merged.length - 1];
    const short = (x) => x.end - x.start + 1 < minH;
    if (prev && r.start - prev.end <= 14 && (short(prev) || short(r))) { prev.end = r.end; return; }
    merged.push({ ...r });
  });
  return merged.filter((r) => r.end - r.start + 1 >= minH).map((r) => ({ top: r.start, bottom: r.end + 1 }));
}

// 세로 표 선이 보이면 열 경계를 선에 맞춥니다 (머리글 글자 폭만으로 잡으면 시간 눈금이 첫 열에 섞임).
function verticalLineNear(img, xFrom, xTo, y0, y1, bg) {
  let best = null, bestFrac = 0;
  const ya = Math.max(0, Math.round(y0)), yb = Math.min(img.height, Math.round(y1));
  for (let x = Math.max(0, Math.round(xFrom)); x <= Math.min(img.width - 1, Math.round(xTo)); x += 1) {
    let non = 0, tot = 0;
    for (let y = ya; y < yb; y += 3) { tot += 1; if (dist(px(img, x, y), bg) > 18) non += 1; }
    const frac = tot ? non / tot : 0;
    if (frac > bestFrac) { bestFrac = frac; best = x; }
  }
  return bestFrac >= 0.55 ? best : null;
}
function snapColumnsToLines(img, cols, sp, gridTop, bg) {
  const y1 = Math.min(img.height, gridTop + sp * 4);
  const edges = [cols[0].left, ...cols.map((c) => c.right)];
  const snapped = edges.map((x) => verticalLineNear(img, x - sp * 0.3, x + sp * 0.3, gridTop, y1, bg));
  cols.forEach((c, i) => {
    if (snapped[i] != null) c.left = snapped[i] + 2;
    if (snapped[i + 1] != null) c.right = snapped[i + 1] - 1;
  });
}

/* ---------- 칸 글자 해석 ---------- */
const ROOM_RES = [/\d{5}/, /\d{1,2}-\d{3,4}/, /[가-힣]{1,6}관\s?\d{2,4}\s?호?/, /\d{3,4}\s?호/, /[A-Z]\d{3,4}/];
function findRoom(t) {
  const f = fixDigits(t);
  for (const re of ROOM_RES) { const m = f.match(re); if (m) return m[0]; } // 성대 5자리 강의실 번호 우선
  return "";
}
const TIME_RANGE_RE = /(\d{1,2})\s*[:.]\s*(\d{2})\s*[-~–—]\s*(\d{1,2})\s*[:.]\s*(\d{2})/;

const SURNAMES = "김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반라왕금옥육인맹제모탁국어은편용예경봉사부";

export function splitBlockText(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let room = "", start = null, end = null;
  const nameParts = [];
  lines.forEach((raw) => {
    const line = fixDigitsInTimes(raw);
    const tm = line.match(TIME_RANGE_RE);
    if (tm && start == null) {
      const s = hm(tm[1], tm[2]), e = hm(tm[3], tm[4]);
      if (s != null && e != null && e > s) { start = s; end = e; }
    }
    const rest = line.replace(TIME_RANGE_RE, " ");
    const rm = findRoom(rest);
    const compact = rest.replace(/\s/g, "");
    // 줄 대부분이 강의실 번호면 강의실 줄로 봅니다 ("제1공학관 21102"처럼 건물명이 붙어도 허용)
    const roomLike = rm && (compact.length <= rm.replace(/\s/g, "").length + 4 || /관|호|강의실/.test(compact));
    let nameText = rest;
    if (rm && !room) {
      room = rm.replace(/\s+/g, "");
      if (roomLike) return;
      nameText = fixDigits(rest).includes(rm) ? rest.replace(new RegExp(`\\s*${rm.replace(/\s/g, "\\s?")}\\s*`), " ") : rest;
    }
    if (tm && !cleanName(nameText)) return;
    // OCR 잡음 줄 건너뛰기: 낱자모(ㅜㅋ 등)가 섞였거나 글자 없이 숫자·기호뿐인 줄
    if (/[ㄱ-ㅎㅏ-ㅣ]/.test(nameText)) return;
    const nm = cleanName(nameText);
    if (!/[가-힣A-Za-z]/.test(nm)) return;
    if (nm && nameParts.length < 2 && !/교수$/.test(nm)) nameParts.push(nm);
  });
  // 줄바꿈으로 잘린 과목명은 붙이고, 두 번째 줄이 교수명(한글 2~4자)처럼 보이면 버립니다.
  let name = nameParts[0] || "";
  if (nameParts[1]) {
    const second = nameParts[1];
    // 교수명은 대개 '흔한 성씨 + 두 글자'(3자). "설계"처럼 잘린 과목명 조각과 구분합니다.
    const looksProf = /^[가-힣]{3}$/.test(second) && SURNAMES.includes(second[0]);
    if (!looksProf) name = /[가-힣]$/.test(name) && /^[가-힣]/.test(second) ? name + second : `${name} ${second}`;
  }
  return { name: name.slice(0, 40), room, start, end };
}

function preprocessCrop(src, x0, y0, x1, y1) {
  // 칸 하나를 잘라 흑백·명암 보정. 색칸 위 흰 글씨면 반전해서 '흰 바탕 검은 글씨'로 만듭니다.
  const w = Math.max(1, Math.round(x1 - x0)), h = Math.max(1, Math.round(y1 - y0));
  const scale = h < 120 ? 2 : 1;
  const c = document.createElement("canvas");
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingQuality = "high";
  g.drawImage(src, x0, y0, w, h, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height);
  const L = new Float32Array(c.width * c.height);
  for (let i = 0; i < L.length; i += 1) L[i] = 0.299 * d.data[i * 4] + 0.587 * d.data[i * 4 + 1] + 0.114 * d.data[i * 4 + 2];
  const sample = [];
  for (let i = 0; i < L.length; i += 7) sample.push(L[i]);
  const bgL = median(sample);
  let lighter = 0, darker = 0;
  sample.forEach((v) => { if (v > bgL + 35) lighter += 1; else if (v < bgL - 35) darker += 1; });
  const invert = lighter > darker;
  // 글자와 바탕의 실제 명암 차이에 맞춰 늘립니다 (연한 색칸 위 흰 글씨도 진하게).
  const inkVals = [];
  for (let i = 0; i < L.length; i += 5) { const v = invert ? L[i] - bgL : bgL - L[i]; if (v > 12) inkVals.push(v); }
  inkVals.sort((a, b) => a - b);
  const ink = Math.max(30, inkVals.length ? inkVals[Math.floor(inkVals.length * 0.85)] : 60);
  for (let i = 0; i < L.length; i += 1) {
    const v = invert ? L[i] - bgL : bgL - L[i]; // 글자일수록 큼
    const out = 255 - Math.max(0, Math.min(255, ((v - 8) / (ink - 8)) * 255));
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = out;
    d.data[i * 4 + 3] = 255;
  }
  // 가장자리 3px는 표 선 찌꺼기일 때가 많아 하얗게 지우고, 둘레에 흰 여백을 둡니다 (OCR이 끝 글자를 덜 놓침).
  const E = 3;
  for (let yy = 0; yy < c.height; yy += 1) {
    for (let xx = 0; xx < c.width; xx += 1) {
      if (xx >= E && yy >= E && xx < c.width - E && yy < c.height - E) continue;
      const k = (yy * c.width + xx) * 4;
      d.data[k] = d.data[k + 1] = d.data[k + 2] = 255;
    }
  }
  g.putImageData(d, 0, 0);
  const PAD = 16;
  const out = document.createElement("canvas");
  out.width = c.width + PAD * 2; out.height = c.height + PAD * 2;
  const og = out.getContext("2d");
  og.fillStyle = "#fff"; og.fillRect(0, 0, out.width, out.height);
  og.drawImage(c, PAD, PAD);
  // 좌표 되돌리기용: 여백만큼 빼고 배율로 나눕니다.
  out.__map = { x0: x0 - PAD / scale, y0: y0 - PAD / scale, scale };
  return out;
}

// 잘라낸 영역을 OCR하고 단어·줄 좌표를 원래 이미지 좌표로 되돌립니다.
async function stripOcr(worker, canvas, x0, y0, x1, y1) {
  const crop = preprocessCrop(canvas, x0, y0, x1, y1);
  const r = await worker.recognize(crop, {}, { text: true, blocks: true });
  const { scale, x0: ox, y0: oy } = crop.__map;
  const back = (b) => ({ x0: ox + b.x0 / scale, x1: ox + b.x1 / scale, y0: oy + b.y0 / scale, y1: oy + b.y1 / scale });
  const words = flattenWords(r.data.blocks).map((w) => ({ ...w, bbox: back(w.bbox) }));
  const lines = [];
  (r.data.blocks || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => {
    const t = String(l.text || "").trim();
    if (t && l.confidence > 20) lines.push({ text: t, bbox: back(l.bbox) });
  })));
  return { words, lines };
}

/* ---------- 이미지 준비 ---------- */
async function fileToCanvas(file) {
  let source;
  if (typeof createImageBitmap === "function") {
    source = await createImageBitmap(file);
  } else {
    source = await new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); res(im); };
      im.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
      im.src = url;
    });
  }
  const sw = source.width, sh = source.height;
  // 작은 캡처는 키우고(OCR 정확도), 너무 큰 사진은 줄입니다(속도·메모리).
  const scale = Math.max(0.4, Math.min(2.5, sw < 1300 ? 1600 / sw : 2200 / Math.max(sw, 2200)));
  const c = document.createElement("canvas");
  c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.imageSmoothingQuality = "high";
  g.drawImage(source, 0, 0, c.width, c.height);
  if (source.close) source.close();
  return c;
}

function flattenWords(blocks) {
  const words = [];
  (blocks || []).forEach((b) => (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => (l.words || []).forEach((w) => {
    const t = String(w.text || "").trim();
    if (t && w.confidence > 20) words.push({ text: t, bbox: w.bbox, conf: w.confidence });
  }))));
  return words;
}

// 한국어 모델이 영어 과목명을 숫자 덩어리로 잘못 읽은 흔적 ("684 51 408", "72 프로그래밍")
// 숫자가 3개 이상 섞였거나("티184 5"), 숫자 토막으로 시작하거나("8 프로그래밍"), 따로 떨어진 두 자리 이상 숫자
const DIGIT_JUNK = /\d\D*\d\D*\d|^\d+\s|(^|\s)\d{2,}(\s|$)/;
export function looksLikeMisreadLatin(name) {
  const n = String(name || "").trim();
  return !n || !/[가-힣]/.test(n) || DIGIT_JUNK.test(n);
}
// 다시 읽은 결과를 받아들일지: 한글이 있거나 영어 단어(3자 이상)가 있고, 숫자 덩어리가 없을 것
function plausibleName(name) {
  const n = String(name || "").trim();
  return n.length >= 2 && !DIGIT_JUNK.test(n) && (/[가-힣]/.test(n) || /[A-Za-z]{3,}/.test(n));
}

async function parseGrid({ canvas, words, worker, getEngWorker, onProgress }) {
  const header = findDayColumns(words, canvas.width);
  if (!header) return [];
  const img = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const { cols, headerBottom } = header;
  const gridTop = headerBottom + 2;
  const bg = backgroundColor(img, cols[0].left, gridTop, cols[cols.length - 1].right, img.height);
  snapColumnsToLines(img, cols, header.spacing, gridTop, bg);
  const gridLeft = cols[0].left, gridRight = cols[cols.length - 1].right;

  // 시간 눈금 → y좌표와 시각을 잇는 직선
  // 격자선 때문에 전체 OCR이 시간 눈금을 놓치기 쉬워서, 왼쪽 눈금 띠만 따로 읽습니다.
  onProgress("시간 눈금 읽는 중…");
  let axisWords = [];
  if (gridLeft > 12) axisWords = await stripOcr(worker, canvas, 0, gridTop, Math.max(8, gridLeft - 2), img.height).then((r) => r.words).catch(() => []);
  let labels = parseTimeLabels(axisWords, gridLeft, headerBottom);
  if (labels.length < 2) labels = parseTimeLabels(words, gridLeft, headerBottom);
  // 흰 수업 칸이 선을 가리는 경우가 있어 60%만 이어져도 표 선으로 봅니다.
  const fullLines = horizontalLines(img, gridLeft, gridRight, gridTop, img.height, bg, 0.6);
  let anchors = labels.map((l) => ({ min: l.min, y: l.bbox.y0 - 2, cy: (l.bbox.y0 + l.bbox.y1) / 2, h: l.bbox.y1 - l.bbox.y0 }));
  let fit = fitLine(anchors);
  if (fit && fullLines.length) {
    const steps = anchors.slice(1).map((a, i) => a.min - anchors[i].min).filter((d) => d > 0);
    const rowPx = (median(steps) || 60) / fit.a;
    anchors = anchors.map((a) => {
      const near = fullLines.filter((ly) => ly <= a.cy + 2 && ly >= a.y - rowPx * 0.6);
      if (!near.length) return a;
      const ly = near.reduce((p, c) => (Math.abs(c - a.y) < Math.abs(p - a.y) ? c : p));
      return { ...a, y: ly, snapped: true };
    });
    // 표 선에 맞춘 눈금이 2개 이상이면 그것만으로 다시 맞춥니다 (선에 안 붙은 눈금은 오차가 큼).
    const snapped = anchors.filter((a) => a.snapped);
    fit = fitLine(snapped.length >= 2 ? snapped : anchors) || fit;
  }
  const yToMin = (y) => (fit ? round5(Math.round(fit.a * y + fit.b)) : null);
  const minH = fit ? Math.max(12, 20 / fit.a) : 24;

  // 칸 찾기: 색칠된 칸 우선, 없으면 글자 뭉치
  let blocks = [];
  cols.forEach((col) => colorBlocks(img, col, gridTop, img.height, bg, minH).forEach((b) => blocks.push({ col, ...b, fromColor: true })));
  if (!blocks.length) {
    // 색칸이 없는 흰 표: 열마다 따로 OCR한 뒤 글자 뭉치를 수업 하나로 봅니다.
    for (let ci = 0; ci < cols.length; ci += 1) {
      const col = cols[ci];
      onProgress(`${col.day}요일 칸 읽는 중… ${ci + 1}/${cols.length}`);
      const { lines: colLines } = await stripOcr(worker, canvas, col.left + 3, gridTop, col.right - 3, img.height).catch(() => ({ lines: [] }));
      const lh = median(colLines.map((l) => l.bbox.y1 - l.bbox.y0)) || 20;
      const inCol = colLines
        .filter((l) => /[가-힣A-Za-z0-9]/.test(l.text))
        .sort((p, q) => p.bbox.y0 - q.bbox.y0);
      const seps = horizontalLines(img, col.left + (col.right - col.left) * 0.1, col.right - (col.right - col.left) * 0.1, gridTop, img.height, bg, 0.85);
      let cl = null;
      const flush = () => {
        if (!cl) return;
        const above = seps.filter((sy) => sy <= cl.top - 1);
        const below = seps.filter((sy) => sy >= cl.bottom + 1);
        blocks.push({
          col,
          top: above.length ? above[above.length - 1] + 1 : cl.top - lh * 0.5,
          bottom: below.length ? below[0] : cl.bottom + lh * 0.5,
          text: cl.lines.join("\n"),
        });
      };
      inCol.forEach((l) => {
        // 사이에 표 선이 있으면 다른 수업으로 나눕니다.
        const lineBetween = cl && seps.some((sy) => sy > cl.bottom && sy < l.bbox.y0);
        if (cl && !lineBetween && l.bbox.y0 - cl.bottom <= lh * 1.2) {
          cl.lines.push(l.text);
          cl.bottom = Math.max(cl.bottom, l.bbox.y1);
        } else {
          flush();
          cl = { top: l.bbox.y0, bottom: l.bbox.y1, lines: [l.text] };
        }
      });
      flush();
    }
  }
  blocks = blocks.slice(0, 40);

  const rows = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    let text = b.text;
    let crop = null;
    if (b.fromColor) {
      onProgress(`칸 글자 읽는 중… ${i + 1}/${blocks.length}`);
      crop = preprocessCrop(canvas, b.col.left + 2, b.top, b.col.right - 2, b.bottom);
      const r = await worker.recognize(crop);
      text = r.data.text;
    }
    let info = splitBlockText(text);
    if (looksLikeMisreadLatin(info.name)) {
      // 영어가 섞인 과목명일 수 있어 이 칸만 한국어+영어로 다시 읽습니다 (영어 데이터는 이때만 받음).
      try {
        onProgress(`영어 과목명 다시 읽는 중… ${i + 1}/${blocks.length}`);
        const ew = await getEngWorker();
        const c2 = crop || preprocessCrop(canvas, b.col.left + 2, b.top, b.col.right - 2, b.bottom);
        const r2 = await ew.recognize(c2);
        const info2 = splitBlockText(r2.data.text);
        if (plausibleName(info2.name)) info = { ...info2, room: info2.room || info.room, start: info2.start ?? info.start, end: info2.end ?? info.end };
      } catch (e) { /* 영어 재인식 실패는 무시하고 원래 결과 사용 */ }
    }
    if (!info.name) continue;
    const s = info.start != null ? info.start : yToMin(b.top);
    const e = info.end != null ? info.end : yToMin(b.bottom);
    const ok = s != null && e != null && e > s && s >= 0 && e < 24 * 60;
    rows.push({ name: info.name, day: b.col.day, start: ok ? toHHMM(s) : "", end: ok ? toHHMM(e) : "", room: info.room });
  }
  return dedupe(rows);
}

/* ---------- 바깥에서 부르는 함수 ---------- */
export async function readTimetableLocally(file, onProgress = () => {}) {
  onProgress("사진 준비 중…");
  const canvas = await fileToCanvas(file);
  onProgress("무료 OCR 준비 중… (처음 한 번은 글자 데이터를 받느라 10초쯤 걸려요)");
  const { createWorker } = await import("tesseract.js");
  const logger = (m) => {
    if (m.status === "recognizing text" && typeof m.progress === "number") onProgress(`글자 읽는 중… ${Math.round(m.progress * 100)}%`);
  };
  const worker = await createWorker("kor", 1, { logger });
  let engWorkerPromise = null;
  const getEngWorker = () => (engWorkerPromise ||= createWorker(["kor", "eng"], 1));
  const getEngBlockWorker = async () => { const w = await getEngWorker(); await w.setParameters({ tessedit_pageseg_mode: "6" }); return w; };
  try {
    const full = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const text = full.data.text || "";
    let listRows = parseTimetableText(text);
    if (listRows.length) {
      if (listRows.some((r) => looksLikeMisreadLatin(r.name))) {
        try {
          onProgress("영어 과목명 다시 읽는 중…");
          const again = await (await getEngWorker()).recognize(canvas);
          const altText = again.data.text || "";
          const alt = parseTimetableText(altText);
          listRows = listRows.map((r) => {
            if (!looksLikeMisreadLatin(r.name)) return r;
            const m = alt.find((x) => x.day === r.day && x.start === r.start && x.end === r.end);
            // 다시 읽을 때 요일 글자가 깨질 수 있어, 같은 시간 줄 바로 위 줄에서도 과목명을 찾습니다.
            const nm = m && plausibleName(m.name) ? m.name : nameAboveTime(altText, r.start, r.end);
            return plausibleName(nm) ? { ...r, name: nm, room: r.room || (m && m.room) || "" } : r;
          });
        } catch (e) { /* 무시 */ }
      }
      return { rows: listRows, text, mode: "list" };
    }
    const words = flattenWords(full.data.blocks);
    // 여기부터는 잘라낸 칸·띠만 읽으므로 '한 덩어리 글' 모드(PSM 6)가 잡음이 적습니다.
    await worker.setParameters({ tessedit_pageseg_mode: "6" });
    const gridRows = await parseGrid({ canvas, words, worker, getEngWorker: getEngBlockWorker, onProgress });
    return { rows: gridRows, text, mode: gridRows.length ? "grid" : "none" };
  } finally {
    await worker.terminate().catch(() => {});
    if (engWorkerPromise) await engWorkerPromise.then((w) => w.terminate()).catch(() => {});
  }
}
