// server.js (ESM) - Render friendly
import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const app = express();

// ---- ESM에서 __dirname 만들기 ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- 환경변수 ----
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// ---- 미들웨어 (순서 중요) ----
app.use(cors());
app.use(express.json({ limit: "1mb" })); // ✅ body 파싱은 라우트보다 먼저!

// ---- 헬스체크 ----
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

// ---- 핑 (반드시 JSON) ----
app.get("/api/ping", (req, res) => {
  res.status(200).json({ ok: true, pong: true, ts: Date.now() });
});

// ---- 코치 API ----
app.post("/api/coach", async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "OPENAI_API_KEY is missing on server",
      });
    }

    const { text, tone = "calm", length = "medium" } = req.body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Missing required field: text",
      });
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const system = `
You are "Silent Coach".
Give a short, practical coaching response in Korean.
Tone: ${tone}
Length: ${length}
- Use simple sentences.
- Prefer 3~6 bullet points or short steps when helpful.
- Avoid medical/legal claims.
`.trim();

    const user = text.trim();

    // ⚠️ 모델명은 계정/권한에 따라 다를 수 있어.
    // Render에서 실패하면 로그/에러 JSON에 모델 관련 메시지가 찍힘.
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
    });

    const content =
      completion?.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({
      ok: true,
      coach: content,
      usage: completion?.usage || null,
    });
  } catch (err) {
    // ✅ 어떤 오류든 JSON으로 반환해서 프론트가 파싱 실패 안 하게
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
    });
  }
});

// ---- 정적 파일 제공 (public/index.html) ----
app.use(express.static(path.join(__dirname, "public")));

// ---- SPA fallback (중요: /api, /healthz 제외) ----
app.get(/^\/(?!api\/|healthz).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---- 서버 시작 ----
app.listen(PORT, () => {
  console.log(`✅ Silent Coach running on port ${PORT}`);
});
