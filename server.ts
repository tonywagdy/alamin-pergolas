import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const directory = path.dirname(fileURLToPath(import.meta.url));
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
// Firebase is the authoritative store. Never expose unauthenticated disk-backed
// writes, customer reads, or uploads through an alternative API.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(directory, 'dist')));
    // Preserve real 404 responses for unknown paths and /api.
    app.get(['/admin', '/roof-pergolas', '/garden-pergolas'], (req, res) => {
      const page = req.path === '/admin' ? 'index' : req.path.slice(1);
      res.sendFile(path.join(directory, 'dist', page + '.html'));
    });
  }
  app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
startServer().catch(() => { console.error('Server startup failed'); process.exit(1); });
