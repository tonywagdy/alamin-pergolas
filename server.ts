import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Support heavy image payloads up to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure persistent directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded images statically with browser caching
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '30d',
  immutable: true
}));

const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const BEFORE_AFTER_FILE = path.join(DATA_DIR, 'before_after.json');
const ORDER_FILE = path.join(DATA_DIR, 'order.json');
const DELETED_STATIC_FILE = path.join(DATA_DIR, 'deleted_static.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

// Helper: Safely read JSON file
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return fallback;
}

// Helper: Safely write JSON file
function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
  }
}

// Helper: Convert Base64 data URL to physical disk file in /uploads
function saveBase64Image(dataUrl: string, prefix: string): string {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
  if (!dataUrl.startsWith('data:image/')) return dataUrl;

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches) return dataUrl;

    let ext = matches[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (ext.includes('svg')) ext = 'svg';

    const base64Data = matches[2];
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to save base64 image to disk:', err);
    return dataUrl;
  }
}

// Helper: Delete physical file if it starts with /uploads/
function deleteUploadFile(imageUrl: string | undefined): void {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  if (imageUrl.startsWith('/uploads/')) {
    try {
      const filename = path.basename(imageUrl);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn('Could not delete upload file:', imageUrl, e);
    }
  }
}

// -------------------------------------------------------------
// 1. DIRECT IMAGE UPLOAD API
// -------------------------------------------------------------
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { image, prefix } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const savedUrl = saveBase64Image(image, prefix || 'img');
    res.json({ success: true, url: savedUrl });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// 2. GALLERY API
// -------------------------------------------------------------
app.get('/api/gallery', (_req: Request, res: Response) => {
  const items = readJsonFile<any[]>(GALLERY_FILE, []);
  res.json({ success: true, items });
});

app.post('/api/gallery', (req: Request, res: Response) => {
  try {
    const item = req.body;
    if (!item || !item.id) {
      return res.status(400).json({ success: false, error: 'Invalid item data' });
    }

    // Convert Base64 image to real static file on disk
    if (item.image && typeof item.image === 'string' && item.image.startsWith('data:image/')) {
      item.image = saveBase64Image(item.image, 'gallery');
    }

    const items = readJsonFile<any[]>(GALLERY_FILE, []);
    const existingIndex = items.findIndex((p: any) => String(p.id) === String(item.id));

    if (existingIndex >= 0) {
      // If replacing image, clean up old file
      if (items[existingIndex].image !== item.image) {
        deleteUploadFile(items[existingIndex].image);
      }
      items[existingIndex] = { ...items[existingIndex], ...item };
    } else {
      items.unshift(item);
    }

    writeJsonFile(GALLERY_FILE, items);
    res.json({ success: true, item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/gallery/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const items = readJsonFile<any[]>(GALLERY_FILE, []);
    const target = items.find((p: any) => String(p.id) === String(id));
    if (target) {
      deleteUploadFile(target.image);
    }

    const filtered = items.filter((p: any) => String(p.id) !== String(id));
    writeJsonFile(GALLERY_FILE, filtered);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// 3. BEFORE & AFTER API
// -------------------------------------------------------------
app.get('/api/before-after', (_req: Request, res: Response) => {
  const data = readJsonFile<any>(BEFORE_AFTER_FILE, null);
  res.json({ success: true, data });
});

app.post('/api/before-after', (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data || !data.beforeImage || !data.afterImage) {
      return res.status(400).json({ success: false, error: 'Both before and after images are required' });
    }

    // Convert Base64 images to real static files on disk
    if (data.beforeImage.startsWith('data:image/')) {
      data.beforeImage = saveBase64Image(data.beforeImage, 'ba_before');
    }
    if (data.afterImage.startsWith('data:image/')) {
      data.afterImage = saveBase64Image(data.afterImage, 'ba_after');
    }

    // Clean up previous files if changed
    const current = readJsonFile<any>(BEFORE_AFTER_FILE, null);
    if (current) {
      if (current.beforeImage && current.beforeImage !== data.beforeImage) {
        deleteUploadFile(current.beforeImage);
      }
      if (current.afterImage && current.afterImage !== data.afterImage) {
        deleteUploadFile(current.afterImage);
      }
    }

    writeJsonFile(BEFORE_AFTER_FILE, data);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// 4. ORDER & DELETED STATIC APIS
// -------------------------------------------------------------
app.get('/api/order', (_req: Request, res: Response) => {
  const orderIds = readJsonFile<string[]>(ORDER_FILE, []);
  res.json({ success: true, orderIds });
});

app.post('/api/order', (req: Request, res: Response) => {
  const { orderIds } = req.body;
  writeJsonFile(ORDER_FILE, Array.isArray(orderIds) ? orderIds : []);
  res.json({ success: true });
});

app.get('/api/deleted-static', (_req: Request, res: Response) => {
  const ids = readJsonFile<number[]>(DELETED_STATIC_FILE, []);
  res.json({ success: true, ids });
});

app.post('/api/deleted-static', (req: Request, res: Response) => {
  const { ids } = req.body;
  writeJsonFile(DELETED_STATIC_FILE, Array.isArray(ids) ? ids : []);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 5. LEADS API
// -------------------------------------------------------------
app.get('/api/leads', (_req: Request, res: Response) => {
  const leads = readJsonFile<any[]>(LEADS_FILE, []);
  res.json({ success: true, leads });
});

app.post('/api/leads', (req: Request, res: Response) => {
  try {
    const lead = req.body;
    const leads = readJsonFile<any[]>(LEADS_FILE, []);
    const newLead = {
      id: lead.id || 'lead_' + Date.now(),
      ...lead,
      createdAt: lead.createdAt || new Date().toISOString()
    };
    leads.unshift(newLead);
    writeJsonFile(LEADS_FILE, leads);
    res.json({ success: true, lead: newLead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// 6. SERVER MOUNT (Vite in dev, static files in prod)
// -------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Server] Alamin Pergolas running at http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Startup failed:', err);
  process.exit(1);
});
