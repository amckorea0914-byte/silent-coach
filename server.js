"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ✅ 요청이 들어오는지 Render Logs에서 무조건 보이게
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// ✅ 정적 파일
app.use(express.static(path.join(__dirname, "public")));

// ✅ 서버 살아있나 테스트용
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ✅ 코치 호출
app.post("/api/coach", async (req, res) => {
  try {
    const { text = "", tone = "calm", length = "medium" } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;

    console.log("[COACH] text:", text);

    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY in environment." });
    }

    if (!text.trim()) {
      return res.json({ reply: "말한 내용이 비어 있어요. 다시 한 번 말해줘." });
    }

    const client = new OpenAI({ apiKey });

    const system = `
너는 사용자의 말을 요약하고, ${tone} 톤으로 ${length} 길이로 코칭한다.
- 핵심: 짧고 명확하게
- 욕설/비난 금지
- 2~5문장
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: text }
      ],
      temperature: 0.6
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "(응답이 비어있음)";
    console.log("[COACH] reply:", reply);

    res.json({ reply });
  } catch (err) {
    console.error("[COACH ERROR]", err?.message || err);
    res.status(500).json({
      error: "Coach failed",
      detail: err?.message || String(err)
    });
  }
});

// ✅ Render 포트
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Silent Coach running on port ${PORT}`);
});
