// server.js
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // ✅ Render는 PORT를 자동 제공 :contentReference[oaicite:1]{index=1}

app.use(express.json({ limit: "1mb" }));

// ✅ 정적 파일(public) 제공 -> https://도메인/ 로 index.html 열림
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ✅ OpenAI (키는 환경변수로만)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 헬스체크
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Chat API
app.post("/api/chat", async (req, res) => {
  const text = (req.body?.text || "").trim();
  if (!text) return res.json({ reply: "조금 더 말해줄래?" });

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: text,
    });

    const reply = response.output_text?.trim() || "응답이 비어있어. 다시 말해줘.";
    return res.json({ reply });
  } catch (err) {
    console.error("❌ OpenAI ERROR:", err);
    return res.status(500).json({
      reply: "서버에서 AI 답변 생성 실패",
      error: err?.message || String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Silent Coach running: http://localhost:${PORT}`);
});
