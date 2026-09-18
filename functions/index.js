const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");

exports.chatWithAssistant = onRequest(
  {
    cors: true,
    secrets: ["GEMINI_API_KEY"]
  },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).send("");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Server API key secret is missing" });
      }

      const { message, messages } = req.body || {};

      const systemInstruction = `
        أنت مساعد ذكي لشركة "الأمين للبرجولات" (Al-Amin Pergolas) في مصر.
        متخصصون في البرجولات الخشبية، برجولات روف، حدائق، وأعمال خشبية وديكورية.
        رقم التواصل: 01017919385.
        أجب بلهجة مصرية مهذبة وودودة ومختصرة ومفيدة.
        إذا سأل العميل عن الأسعار، وضح له أن السعر يعتمد على المساحة ونوع الخشب والتصميم، واعرض عليه رفع المقاسات مجاناً أو التواصل على الواتساب للمعاينة.
      `;

      const contents = [];
      if (Array.isArray(messages) && messages.length > 0) {
        messages.forEach((m) => {
          contents.push({
            role: m.role === "bot" ? "model" : "user",
            parts: [{ text: m.text || "" }]
          });
        });
      } else if (message) {
        contents.push({
          role: "user",
          parts: [{ text: message }]
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction
        }
      });

      const reply = response.text || "أهلاً بك! تواصل معنا على 01017919385 للمعاينة المجانية وتفاصيل الأسعار.";
      return res.status(200).json({ reply });
    } catch (err) {
      console.error("Gemini Cloud Function Error:", err);
      return res.status(500).json({ error: "فشل الاتصال بالذكاء الاصطناعي، يرجى المحاولة لاحقاً" });
    }
  }
);
