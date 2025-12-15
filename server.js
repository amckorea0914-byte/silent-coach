import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const app = express();

// ESM에서 __dirname 만들기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경변수
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// 미들웨어 (순서 중요)
app.use(cors());
app.use(express.json({ limit: "1mb" }));

/** ✅ Health Check */
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

/** ✅ Ping (반드시 JSON) */
app.get("/api/ping", (req, res) => {
  res.status(200).json({ ok: true, pong: true, ts: Date.now() });
});

/** ✅ Coach */
app.post("/api/coach", async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "OPENAI_API_KEY is missing on server"
      });
    }

    const { text, tone = "calm", length = "medium" } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ ok: false, error: "Missing required field: text" });
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const system = [
      'You are "Silent Coach".',
      "Give a short, practical coaching response in Korean.",
      `Tone: ${tone}`,
      `Length: ${length}`,
      "- Use simple sentences.",
      "- If helpful, respond with 3~6 short bullet points/steps.",
      "- Avoid medical/legal claims."
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: text.trim() }
      ],
      temperature: 0.7
    });

    const coach =
      completion?.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({
      ok: true,
      coach,
      usage: completion?.usage || null
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err)
    });
  }
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "public")));

// SPA fallback: /api, /healthz 제외하고 index.html
app.get(/^\/(?!api\/|healthz).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Silent Coach running on port ${PORT}`);
});
