# Edgelink SEO Automation — Backend Service (MERN Stack · Pure JavaScript)

Standalone **Node.js + Express.js + MongoDB (Mongoose)** backend powering the **Edgelink SEO Automation Platform**. It exposes the REST API, persists clients, audits, and notifications in MongoDB (with automatic local JSON fallback if `MONGODB_URI` is unset), manages the `seo-audit-jobs` queue (BullMQ + Redis with automatic in-process fallback), executes the 10-step SEO Audit Pipeline, synthesizes findings via Anthropic Claude (`claude-sonnet-4-6`), generates downloadable PDF reports, and dispatches WhatsApp/Email mock alerts.

---

## 1. Folder Structure & Component Breakdown

```
backend/
├── server.js                      # Express entry point, CORS middleware, MongoDB & queue init
├── package.json                   # Pure JS Node ESM dependencies (express, mongoose, bullmq, cheerio, pdfkit, zod)
├── .env.example                   # Environment variable template (MONGODB_URI, PORT, USE_MOCKS, CRON_SECRET, etc.)
└── src/
    ├── config/
    │   └── mongo.js               # Mongoose connection manager (connectMongo, isMongoConnected)
    ├── models/
    │   ├── Client.js              # Mongoose schema & model for managed client websites
    │   ├── Audit.js               # Mongoose schema & model for 10-step audit jobs & Master SEO JSON results
    │   └── Notification.js        # Mongoose schema & model for WhatsApp & Email dispatch logs
    ├── db.js                      # Async repository layer (MongoDB primary + JSON store fallback)
    ├── routes.js                  # All 13 REST API endpoints (/api/*)
    ├── queue.js                   # BullMQ + Redis worker/queue ("seo-audit-jobs") + fallback runner
    ├── auditPipeline.js           # 10-step sequential SEO audit orchestrator
    ├── pdfReport.js               # PDFKit executive SEO report generator
    ├── security.js                # SSRF URL validator, timing-safe CRON_SECRET check, Zod schemas
    └── mocks/
        ├── index.js               # USE_MOCKS=true router for PageSpeed, GSC, DataForSEO & alerts
        ├── pagespeed.mock.js      # Core Web Vitals & Lighthouse mock payload
        ├── gsc.mock.js            # Google Search Console clicks/impressions/queries mock
        ├── dataforseo.mock.js     # Keyword rankings, search volume, CPC & competitors mock
        └── twilio.mock.js         # WhatsApp (console.log) & Email mock dispatcher
```

### What Each Backend Component Does

1. **`server.js`**:
   - Loads `.env`, defaults `USE_MOCKS=true` if unset, connects MongoDB via `db.init()`, initializes `auditQueue.init()`, configures origin-checked CORS from `FRONTEND_URL`, mounts `/api`, and listens on `PORT` (default `4000`).
2. **`src/config/mongo.js` & `src/models/*`**:
   - `Client.js`, `Audit.js`, and `Notification.js` define strict Mongoose schemas for MongoDB Atlas or local MongoDB.
   - If `MONGODB_URI` is provided, all CRUD and pipeline updates persist directly to MongoDB and automatically seed 3 sample clients + 1 baseline audit when the `clients` collection is empty.
3. **`src/db.js`**:
   - Unified async repository (`listClients`, `createClient`, `updateClient`, `deleteClient`, `listAudits`, `getAudit`, `createAudit`, `updateAudit`, `listNotifications`, `createNotification`) supporting both MongoDB (`dbMode: "mongodb"`) and zero-config local JSON fallback (`dbMode: "json-fallback"`).
4. **`src/queue.js`**:
   - Manages `seo-audit-jobs` via BullMQ + Redis when `REDIS_URL` is configured, and falls back to an in-process async queue when Redis is not running.
5. **`src/auditPipeline.js`**:
   - Executes all 10 steps sequentially:
     1) Crawl URL (`fetch` + `cheerio`)
     2) PageSpeed Insights (`USE_MOCKS` aware)
     3) Google Search Console (`USE_MOCKS` aware)
     4) Schema.org JSON-LD & Microdata validation
     5) On-Page SEO analysis
     6) `robots.txt` & `sitemap.xml` validation
     7) DataForSEO keyword rankings (`USE_MOCKS` aware)
     8) Claude API (`claude-sonnet-4-6`) strict JSON synthesis with deterministic fallback
     9) Persist audit, score breakdown, and client score to MongoDB
     10) Generate PDF report (`pdfkit`) + WhatsApp (`console.log` mock) & Email notifications
6. **`src/security.js`**:
   - SSRF protection blocking loopback, private, and link-local metadata IPs (`169.254.169.254`, `127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`), timing-safe `CRON_SECRET` verification, and Zod validation schemas.

---

## 2. Complete Backend API Reference

Base URL (local default): `http://localhost:4000`

1. **`GET /api/health`** — Returns `{ ok, dbMode, queueMode, useMocks, timestamp }`.
2. **`GET /api/config/status`** — Returns `{ dbMode, mongoConfigured, useMocks, claudeConfigured, redisConfigured, queueMode, cronProtected }`.
3. **`GET /api/clients`** — Lists all client websites.
4. **`POST /api/clients`** — Creates a client (`name`, `domain`, `contactEmail`, `whatsappNumber`, `auditSchedule`, `targetKeywords`). Returns `201`.
5. **`PATCH /api/clients/:id`** — Updates client fields, cadence (`daily`/`weekly`/`manual`), or `active` status.
6. **`DELETE /api/clients/:id`** — Deletes a client by ID.
7. **`GET /api/audits`** — Lists audits (optional `?clientId=...&status=QUEUED|RUNNING|COMPLETED|FAILED`).
8. **`POST /api/audit`** — Enqueues a job in `seo-audit-jobs` (`{ clientId }` or `{ url }`). Returns `202 { auditId, status, queueMode, clientId }`.
9. **`GET /api/audit/:id`** — Returns live job progress (`0–100`), `status`, `currentStep`, `steps[]`, `overallScore`, `result`, `technicalSignals`, and `reportUrl`.
10. **`GET /api/audit/:id/report.pdf`** — Streams the generated executive PDF report (`application/pdf`).
11. **`GET /api/notifications`** — Lists the latest 50 WhatsApp and Email mock dispatches.
12. **`GET /api/cron/audits`** — Protected by `CRON_SECRET` (`Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`). Optional `?schedule=daily|weekly`.
13. **`POST /api/admin/trigger-cron`** — Triggers scheduled cron sweep from the Admin Portal.

---

## 3. Running Locally on Laptop

1. Ensure Node.js 20+ and MongoDB (local MongoDB service OR a free MongoDB Atlas connection string) are ready.
2. Setup & start:
   ```bash
   cd backend
   cp .env.example .env
   # Add MONGODB_URI=mongodb://127.0.0.1:27017/edgelink_seo (or your Atlas URI) in .env
   npm install
   npm run dev
   ```
   Backend starts at `http://localhost:4000`.

---

## 4. Deploying Backend on Render (Web Service)

1. Push your project (`backend/` and `frontend/`) to a GitHub repository.
2. Go to [Render Dashboard](https://dashboard.render.com) -> **New +** -> **Web Service**.
3. Connect your GitHub repository and configure:
   - **Name**: `edgelink-seo-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add **Environment Variables** in Render:
   - `MONGODB_URI`: Your MongoDB Atlas connection string (`mongodb+srv://...`)
   - `USE_MOCKS`: `true` (or `false` if providing live API keys)
   - `FRONTEND_URL`: Your deployed Render frontend URL (e.g. `https://edgelink-seo-frontend.onrender.com`)
   - `APP_URL`: Your deployed Render backend URL (e.g. `https://edgelink-seo-backend.onrender.com`)
   - `CRON_SECRET`: Strong random secret string
   - `ANTHROPIC_API_KEY`: Optional Anthropic key for live Claude `claude-sonnet-4-6` analysis
   - `REDIS_URL`: Optional Render Redis URL for BullMQ
5. Click **Create Web Service**. Verify `/api/health` returns `{"ok":true,"dbMode":"mongodb",...}`.
