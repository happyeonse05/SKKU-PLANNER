# 최종 점검 메모

- 기존 Google/Supabase 인증·저장, 과제, 시간표, 공강 계산, 생활 루틴, 알림, 다크모드 유지
- 할 일 전용 탭, 주간 시간표, 기록/성취, 7/30일 통계, AI 계획 히스토리, 공강 활용 기록 추가
- AI 서버 호출 실패 시 로컬 우선순위 플래너로 자동 대체
- 새 기록 데이터(planHistory/gapHistory)는 기존 Supabase 테이블 스키마를 깨지 않도록 브라우저 로컬 저장소에 분리 저장
- 완료 취소/생활루틴 기록 취소 시 통계도 함께 감소하도록 수정
- 삭제/전체 초기화 확인창, 잘못된 일정 시간 입력 방지, 공강 기록 메모 입력 추가
- GitHub Pages base/manifest/start_url/scope/icon 경로를 /today-gap-planner/ 기준으로 수정
- api/plan.js Node 구문 검사 통과, App.jsx 정적 구조/괄호 점검 통과
- 이 실행 환경에서는 npm registry 연결이 시간 초과되어 로컬 Vite build는 수행하지 못함. GitHub Actions의 npm run build가 최종 빌드 검증 단계임.
