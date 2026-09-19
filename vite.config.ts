import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv, Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function devChatProxyPlugin(apiKey: string): Plugin {
  return {
    name: 'dev-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const { message, messages } = parsed;

            if (!apiKey) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ 
                reply: "مرحباً بك في شركة الأمين للبرجولات! يرجى التواصل معنا مباشرة عبر الواتساب أو الهاتف على 01017919385 وسنوافيك بكافة التفاصيل والأسعار فوراً."
              }));
              return;
            }

            const systemInstruction = `
              أنت مساعد ذكي لشركة "الأمين للبرجولات" (Al-Amin Pergolas) في مصر.
              متخصصون في البرجولات الخشبية، برجولات روف، حدائق، وأعمال خشبية وديكورية.
              رقم التواصل: 01017919385.
              أجب بلهجة مصرية مهذبة وودودة ومختصرة ومفيدة.
              إذا سأل العميل عن الأسعار، وضح له أن السعر يعتمد على المساحة ونوع الخشب والتصميم، واعرض عليه رفع المقاسات مجاناً أو التواصل على الواتساب للمعاينة.
            `;

            const contents: any[] = [];
            if (Array.isArray(messages) && messages.length > 0) {
              messages.forEach((m: any) => {
                contents.push({
                  role: m.role === 'bot' ? 'model' : 'user',
                  parts: [{ text: m.text }]
                });
              });
            } else if (message) {
              contents.push({
                role: 'user',
                parts: [{ text: message }]
              });
            }

            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents
              })
            });

            if (!geminiRes.ok) {
              throw new Error(`Gemini API error: ${geminiRes.status}`);
            }

            const geminiData = await geminiRes.json();
            const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، حدث خطأ ما. يرجى المحاولة لاحقاً.";

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ reply }));
          } catch (err: any) {
            console.error("Dev chat error:", err);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      devChatProxyPlugin(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '')
    ],
    base: '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
