# Silent Coach

브라우저 음성 인식으로 말을 텍스트로 바꾸고,
AI가 “요약 + 행동 3개” 형태로 차분한 코칭을 제공하는 웹 앱입니다.

## Live Demo (Render)
- https://silent-coach.onrender.com

## Features
- 🎙️ 실시간 음성 전사 (interim / final)
- 🧠 AI 코칭 (차분/코치/멘토 말투 선택)
- 📏 답변 길이 선택 (짧게/보통/길게)
- 🧾 히스토리 저장 (localStorage)
- 🙋 닉네임/세션 개념
- 🗓️ 하루 1회 코칭 콘셉트(데모용)

## Tech Stack
- Frontend: HTML / CSS / Vanilla JS
- Backend: Node.js (Express)
- Hosting: Render
- AI: OpenAI API

## Env
- OPENAI_API_KEY=...
- (선택) OPENAI_MODEL=gpt-4o-mini
