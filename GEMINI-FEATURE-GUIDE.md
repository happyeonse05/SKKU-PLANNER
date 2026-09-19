# 담다 Gemini 기능

## 들어간 기능

### 1. 시간표 사진 → 앱 수업 등록

- 시간표 탭에서 캡처 이미지를 올립니다.
- Gemini가 과목명, 요일, 시작·종료 시간, 강의실을 읽습니다.
- 사용자가 인식 결과를 확인하고 필요한 수업만 선택해 등록합니다.
- 잘못 읽은 결과가 바로 저장되지 않도록 확인 단계를 유지합니다. 확인 목록에서 칸을 직접 고칠 수 있습니다.
- Gemini 키가 없거나 서버 호출이 실패하면 브라우저 무료 OCR(tesseract.js)로 자동 전환합니다. 키 없이도 동작합니다.

### 2. 한글 녹음 전사문 → 필기본

- 책장에서 과목을 엽니다.
- ‘녹음 전사문 → 필기본’ 칸에 한글 전사문을 붙여넣습니다.
- Gemini가 핵심 주제, 개념별 설명, 예시, 교수님 강조, 시험·과제 언급, 복습 질문으로 정리합니다.
- 만든 필기본은 새 수업 기록으로 저장됩니다.
- 원본 전사문은 TXT 파일로 같은 기록에 함께 보관됩니다.

### 3. 낱장(교재 스캔) Gemini 재인식·문법 검사

- 예전에는 화면에 API 키를 붙여넣었지만, 이제 담다 서버(/api/vision, /api/plan)를 거쳐 Vercel 키로 읽습니다.
- 화면에는 키 입력칸이 없습니다.

## 배포 설정

Vercel 프로젝트의 Settings → Environment Variables에 다음 값을 등록합니다.

    GEMINI_API_KEY=Google AI Studio에서 받은 키

GEMINI_MODEL은 비워두는 걸 권장합니다. 비우면 gemini-3.5-flash-lite를 쓰고, 그 모델이 없으면 gemini-3.1-flash-lite → gemini-2.5-flash-lite 순서로 자동으로 바꿔 씁니다.

GitHub Pages에서 앱 화면을 배포하고 Vercel API를 따로 쓰는 경우 GitHub 저장소의 Actions secrets에도 다음 주소를 등록합니다.

    VITE_PLAN_API_URL=https://내-vercel-주소.vercel.app/api/plan
    VITE_SUMMARY_API_URL=https://내-vercel-주소.vercel.app/api/plan
    VITE_VISION_API_URL=https://내-vercel-주소.vercel.app/api/vision

https://happyeonse05.github.io 는 API가 기본으로 허용합니다. 다른 주소에서 부르려면 Vercel에 ALLOWED_ORIGINS를 추가하세요.

API 키는 src/App.jsx, public 폴더, GitHub 공개 코드 어디에도 직접 넣지 않습니다.
