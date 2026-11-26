import 'dotenv/config';
import express from 'express';
import { db } from './src/db.js';
import { auditQueue } from './src/queue.js';
import { apiRouter } from './src/routes.js';

if (process.env.USE_MOCKS === undefined) {
  process.env.USE_MOCKS = 'true';
}

const PORT = Number(process.env.PORT) || 4000;
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

async function startServer() {
  await db.init();
  await auditQueue.init();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-cron-secret');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      service: 'Edgelink SEO Automation Backend (MERN)',
      status: 'running',
      database: db.getMode(),
      queue: auditQueue.getMode(),
      health: '/api/health',
    });
  });

  app.use('/api', apiRouter);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Edgelink SEO Backend] Listening on http://0.0.0.0:${PORT} (DB=${db.getMode()}, USE_MOCKS=${process.env.USE_MOCKS}, Queue=${auditQueue.getMode()})`
    );
  });
}

startServer().catch((err) => {
  console.error('[Backend Fatal Error]', err);
  process.exit(1);
});
