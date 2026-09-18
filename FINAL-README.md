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
- AI 계획 히스토리/다시 보기
- GitHub Pages base path에 의존하지 않도록 상대 경로로 빌드

## 배포

- Vercel: 저장소 Import 후 `npm run build` / `dist`를 사용하세요. `api` 폴더가 자동으로 서버리스 함수가 됩니다.
- GitHub Pages: Actions가 빌드·배포합니다. AI까지 쓰려면 저장소 Secrets에 `VITE_PLAN_API_URL`, `VITE_SUMMARY_API_URL`, `VITE_VISION_API_URL`, `VITE_DELETE_ACCOUNT_API_URL`을 Vercel API 주소로 등록하세요.
- Vercel에는 `ANTHROPIC_API_KEY`를 등록하세요. 회원탈퇴까지 사용하려면 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`도 Vercel에만 등록하세요. 서비스 키를 클라이언트에 넣지 마세요.
