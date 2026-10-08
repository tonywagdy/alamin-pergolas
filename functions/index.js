const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getAppCheck } = require('firebase-admin/app-check');
const { getFirestore } = require('firebase-admin/firestore');
const { createHmac } = require('node:crypto');
const { GoogleGenAI } = require('@google/genai');
if (!getApps().length) initializeApp();
const allowedOrigins = ['https://www.alaminpergolas.com', 'https://alaminpergolas.com'];

exports.chatWithAssistant = onRequest({
  cors: allowedOrigins, secrets: ['GEMINI_API_KEY'], timeoutSeconds: 30, maxInstances: 2
}, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowedOrigins.includes(req.headers.origin)) return res.status(403).json({ error: 'Origin not allowed' });
  const token = req.header('X-Firebase-AppCheck');
  if (!token) return res.status(401).json({ error: 'App Check required' });
  try { await getAppCheck().verifyToken(token); }
  catch { return res.status(401).json({ error: 'Invalid App Check token' }); }
  const { message, messages } = req.body || {};
  const history = Array.isArray(messages) ? messages : [{ role: 'user', text: message }];
  if (!history.length || history.length > 12 || history.some(m => !m || !['user', 'bot'].includes(m.role) || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 1500)) {
    return res.status(400).json({ error: 'Invalid message' });
  }
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Service unavailable' });
    // Distributed limiter across instances. No raw client IP stored.
    const key = createHmac('sha256', apiKey).update(`${req.ip}:${Math.floor(Date.now() / 3600000)}`).digest('hex');
    const db = getFirestore(undefined, 'ai-studio-c9dea870-1bc9-4dc9-9cf3-99089ddb6a4a');
    const ref = db.collection('_chat_limits').doc(key);
    const permitted = await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      const count = snapshot.data()?.count || 0;
      if (count >= 10) return false;
      tx.set(ref, { count: count + 1, expiresAt: new Date(Date.now() + 86400000) });
      return true;
    });
    if (!permitted) return res.status(429).json({ error: 'Too many requests' });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: history.map(m => ({ role: m.role === 'bot' ? 'model' : 'user', parts: [{ text: m.text }] })),
      config: { maxOutputTokens: 500, systemInstruction: 'أنت مساعد الأمين للبرجولات في مصر. أجب باختصار وبلهجة مصرية مهذبة. رقم التواصل 01017919385. السعر حسب المقاس والخامة والتصميم. لا تخترع أسعارًا أو ضمانات أو مواعيد ولا تؤكد حجزًا أو استلام طلب.' }
    });
    return res.json({ reply: response.text || 'تواصل معنا على 01017919385 لطلب عرض سعر.' });
  } catch { return res.status(503).json({ error: 'تعذر الاتصال بالخدمة. يرجى التواصل معنا مباشرة.' }); }
});
