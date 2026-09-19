# 담다 — GitHub Pages/Vercel 배포판
- 기존 인증/Supabase/과제/공강/생활루틴/알림/다크모드 기능 유지
- 할 일 전용 관리 탭
- 주간 시간표 한눈에 보기 + 일정 관리
- 기록/성취 + 7/30일 완료 통계
- 공강 활용 기록
- 다음 수업 준비물·읽을 범위 메모
- 로그인 데이터 안내, JSON 백업·복원, 회원탈퇴
- 책장 PDF·녹음 파일 포함 백업
- 강의계획서·PPT·녹음 대본·족보 기반 교수님 출제 스타일 분석
- Gemini 시간표 사진 인식 → 확인 후 수업 자동 등록
- 한글 녹음 전사문 → 필기본 변환, 원문 txt 함께 보관
- AI 계획 히스토리/다시 보기
- GitHub Pages base path에 의존하지 않도록 상대 경로로 빌드

## 배포

- Vercel: 저장소 Import 후 `npm run build` / `dist`를 사용하세요. `api` 폴더가 자동으로 서버리스 함수가 됩니다.
- GitHub Pages: Actions가 빌드·배포합니다. AI까지 쓰려면 저장소 Secrets에 `VITE_PLAN_API_URL`, `VITE_SUMMARY_API_URL`, `VITE_VISION_API_URL`, `VITE_DELETE_ACCOUNT_API_URL`을 Vercel API 주소로 등록하세요.
- Vercel에는 `GEMINI_API_KEY`를 등록하세요. `GEMINI_MODEL`은 비워두면 gemini-3.5-flash-lite부터 자동으로 골라 씁니다.
- 회원탈퇴까지 사용하려면 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`도 Vercel에만 등록하세요. 서비스 키를 클라이언트에 넣지 마세요.

## AI 기능 사용 순서

1. 시간표 탭에서 시간표 캡처를 올립니다.
2. Gemini가 찾은 과목·요일·시간을 확인하고 선택한 수업만 저장합니다.
3. 책장에서 과목을 열고 ‘녹음 전사문 → 필기본’에 한글 전사문을 붙여넣습니다.
4. 만들어진 필기본은 새 수업 기록으로 저장되고 원문 전사문도 txt 파일로 함께 보관됩니다.

## 2026-09-19 수정 (damda-gemini-todo-v2)

- 일기 탭·교재 스캔 iframe 경로 수정 (`diary.html` → `diary/index.html`, `scan.html` → `scan/index.html`)
- 오늘 계획 만들기: Gemini 응답(`{ text }`)을 제대로 읽도록 수정. 전에는 항상 기기 안 대체 계획으로 넘어갔음
- 로그인 토큰 자동 갱신 + 만료(401) 시 재시도. 저장 실패 시 "다시 저장" 배너 표시
- 백업 복원: 이 앱이 만든 version 2 백업 복원 가능, 책장도 함께 복원, Supabase에 없는 칸은 제외
- 오늘 할 일 체크: 같은 이름 할 일이 있어도 누른 항목이 체크되도록 id 기준으로 변경
- 시간표 사진 인식: 시간 형식 정리(9:00 → 09:00), 같은 수업 중복 등록 방지
- 낱장 Gemini: 브라우저 키 입력 제거, 서버 API 경유
- api/plan.js·vision.js: 기본 모델 gemini-3.5-flash-lite + 자동 대체, deprecated된 temperature 제거, 55초 타임아웃, GitHub Pages CORS 허용
- vercel.json: API 최대 실행 시간 60초 (긴 전사문 필기본용)
- manifest.json: 상대 경로로 변경해 Vercel·GitHub Pages 둘 다 홈 화면 추가 가능

## 2026-09-19 수정 2 (damda-gemini-todo-v3) — 시간표 사진 무료 OCR

- 시간표 사진은 먼저 서버(/api/vision)로 읽고, 실패하면(키 없음·404·한도 초과·해석 실패) 브라우저 안 무료 OCR(tesseract.js)로 자동 전환
- 새 파일 `src/timetableOcr.js`: 목록형(월10:30-11:45【61304】)·주간 격자형(킹고포털·에타 캡처) 둘 다 해석
- 인식 결과 확인 목록에서 요일·과목명·시간·강의실을 직접 고치고, 줄 추가·삭제 후 등록 가능 (시간 검사 포함)
- 무료 OCR 엔진과 한국어 데이터(약 1.5MB)는 처음 한 번만 받고, 영어 과목명이 깨져 보일 때만 영어 데이터(약 2.9MB)를 추가로 받음
- 서버(Vercel 함수)에는 아무것도 추가되지 않음. `package.json`에 `tesseract.js`만 추가

## 2026-09-19 수정 3 (damda-gemini-todo-v4) — 실제 폰 캡처 대응

- 상태바·앱 제목·하단 탭바가 같이 찍힌 캡처, 다크 모드, 날짜 붙은 요일(월 9/15), 토요일 열, 회색 수업 칸 인식
- "오전 9시 / 오후 1시" 시간 눈금(오전·오후가 따로 읽혀도) 처리
- 세로 표 선에 맞춰 열 경계를 잡아 시간 눈금 글자가 과목명에 섞이지 않게 함
- 두 줄로 잘린 과목명(창의적공학 / 설계) 사이 OCR 잡음 줄 제거, 끝 숫자(미적분학1) 누락 줄임
- 목록형: 괄호 없는 강의실(제1공학관 21102), 영어 과목명(Academic English) 재인식
- 테스트: 합성 캡처 12종 83개 수업 — 시간 83/83, 강의실 83/83, 과목명 81/83, 잘못 생긴 줄 0
