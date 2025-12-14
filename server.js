// server.js
"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ✅ Render/일반 배포에서 정적 파일 제공: public/index.html
app.use(express.static(path.join(__dirname, "public")));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const COACH_SYSTEM = `
너는 'Silent Coach'다. 사용자의 말을 차분하고 따뜻한 멘토/코치 톤으로 돕는다.
규칙:
- 판단/비난 금지, 짧고 명확하게.
- 사용자의 말에서 핵심 감정/상황을 먼저 공감.
- 결론은 항상 "요약 + 다음 행동 3개"로 끝낸다.
- 행동은 5분 안에 할 수 있는 수준으로 제안한다.
- 출력은 반드시 JSON만. 다른 텍스트 금지.
JSON 스키마:
{
  "tone": "calm|coach|mentor",
  "summary": "한 문장 요약",
  "insight": "핵심 통찰 1~2문장",
  "actions": ["행동1", "행동2", "행동3"],
  "one_liner": "짧은 마무리 한 줄"
}
`.trim();

function pickTone(mode = "calm") {
  if (mode === "coach") return "coach";
  if (mode === "mentor") return "mentor";
  return "calm";
}

function pickMaxTokens(length = "medium") {
  if (length === "short") return 180;
  if (length === "long") return 450;
  return 300;
}

function safeJsonParse(maybeJsonText) {
  const raw = String(maybeJsonText || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    // 모델이 실수로 앞뒤 텍스트를 섞었을 때 보정
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("JSON parse failed");
  }
}

// ✅ 헬스 체크
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ 코치 API
app.post("/api/coach", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const tone = pickTone(req.body?.tone);
    const length = req.body?.length || "medium";

    if (!text) {
      return res.status(400).json({ ok: false, error: "text is required" });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "Missing OPENAI_API_KEY" });
    }

    const messages = [
      { role: "system", content: COACH_SYSTEM },
      { role: "user", content: `tone=${tone}\n사용자 발화:\n${text}` },
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.6,
      max_tokens: pickMaxTokens(length),
    });

    const content = response.choices?.[0]?.message?.content ?? "";
    const coach = safeJsonParse(content);

    // ✅ 최소 검증 (필수 필드 없으면 보정)
    if (!coach.summary) coach.summary = "요약을 만들지 못했어요.";
    if (!Array.isArray(coach.actions)) coach.actions = [];
    while (coach.actions.length < 3) coach.actions.push("지금 할 수 있는 작은 행동을 하나 정해보세요.");
    coach.actions = coach.actions.slice(0, 3);

    return res.json({ ok: true, coach });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Server error",
    });
  }
});

// ✅ Render 포트
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Silent Coach running on http://localhost:${PORT}`);
  console.log("Your service is live 🚀");
});
