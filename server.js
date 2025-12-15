// server.js (ESM / type:module 대응)
import "dotenv/config";

import path from "path";
import { fileURLToPath } from "url";

import express from "express";
import cors from "cors";
import OpenAI from "openai";

// ESM에서 __dirname 만들기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Render/브라우저 호출 허용
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ✅ 정적 파일 제공: public/index.html
app.use(express.static(path.join(__dirname, "public")));

// ✅ OpenAI 클라이언트
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY가 설정되어 있지 않습니다. Render 환경변수 확인 필요!");
}
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// ✅ 헬스 체크 (Render 확인용)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ✅ 코치 응답 API
app.post("/api/coach", async (req, res) => {
  try {
    const {
      text = "",
      tone = "calm",     // calm | strict | friendly 등
      length = "medium", // short | medium | long
      lang = "ko",       // ko 기본
    } = req.body || {};

    const userText = String(text).trim();
    if (!userText) {
      return res.status(400).json({ ok: false, error: "text is required" });
    }
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "OPENAI_API_KEY missing" });
    }

    // 길이 가이드
    const lengthGuide =
      length === "short"
        ? "2~3문장"
        : length === "long"
        ? "8~12문장"
        : "4~7문장";

    const system = [
      "You are a coaching assistant.",
      "Answer as plain text only.",
      `Write in ${lang === "ko" ? "Korean" : "English"}.`,
      `Tone: ${tone}.`,
      `Length: ${lengthGuide}.`,
      "Give practical steps. Avoid long preambles.",
    ].join(" ");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userText },
      ],
    });

    const answer = completion?.choices?.[0]?.message?.content?.trim() || "";
    return res.json({ ok: true, answer });
  } catch (err) {
    console.error("❌ /api/coach error:", err?.message || err);
    return res.status(500).json({
      ok: false,
      error: "coach_failed",
      detail: err?.message ? String(err.message) : "unknown",
    });
  }
});

// ✅ PORT: 로컬은 3000, Render는 자동 PORT 사용
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ Silent Coach running: http://localhost:${PORT}`);
});
