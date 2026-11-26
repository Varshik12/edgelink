# Edgelink SEO Automation — Frontend Application (MERN Stack · Pure JavaScript / React)

Standalone **React 19 + Vite + Tailwind CSS v4** frontend for the **Edgelink SEO Automation Platform**. Provides both the **Admin Portal** and the **Client Dashboard** connected to the Express + MongoDB backend.

---

## 1. Folder Structure

```
frontend/
├── index.html                     # HTML entry point & Google Fonts (Plus Jakarta Sans, DM Sans, JetBrains Mono)
├── package.json                   # Pure JS React + Vite + Tailwind CSS dependencies
├── vite.config.js                 # Vite config with /api proxy to http://localhost:4000
├── .env.example                   # VITE_API_URL template for Render Static Site deployment
└── src/
    ├── main.jsx                   # React root bootstrap
    ├── index.css                  # Tailwind CSS v4 @import & typography theme variables
    ├── api.js                     # Centralized API base URL & fetch wrapper
    ├── App.jsx                    # Dual-portal shell, navigation, global state & live job polling
    └── components/
        ├── AdminPortal.jsx        # Client management, live 10-step monitor & cron controls
        ├── ClientDashboard.jsx    # Audit scores, executive summary, issues triage, roadmap & signals
        ├── AuditQueueView.jsx     # Full queue monitor (QUEUED / RUNNING / COMPLETED / FAILED)
        ├── NotificationsView.jsx  # WhatsApp & Email notification dispatch log
        └── RunAuditModal.jsx      # Quick-launch modal to enqueue client or custom URL audits
```

---

## 2. Component-by-Component Explanation

- **`src/api.js`**: Prepends `VITE_API_URL` (empty in local dev so Vite proxies `/api` to `http://localhost:4000`; set to your live Render backend URL in production).
- **`src/App.jsx`**: Top navigation (`Admin Portal`, `Client Dashboard`, `Audit Queue`, `Notifications`, `Run SEO Audit`), initial workspace fetch, and 1-second real-time polling of `GET /api/audit/:id` while jobs are `QUEUED` or `RUNNING`.
- **`src/components/AdminPortal.jsx`**: Portfolio KPI cards, live 10-step pipeline progress grid, Client Properties CRUD table (`POST`, `PATCH`, `DELETE /api/clients`), and Cron sweep controls (`POST /api/admin/trigger-cron`).
- **`src/components/ClientDashboard.jsx`**: Audit report selector, `Download PDF Report` link, Overall Score + 5-axis `score_breakdown`, `executive_summary`, filterable `critical_issues` / `important_issues` / `quick_wins`, prioritized `recommendations` (with `finding`, `fix`, `estimated_impact`, `effort`, `falsifiability_check`), and 4-tab technical signals inspector (CWV, GSC, DataForSEO, Crawl & Schema).
- **`src/components/AuditQueueView.jsx`**: Filterable table of all `seo-audit-jobs` with queue mode, progress bar, score, and trace/dashboard actions.
- **`src/components/NotificationsView.jsx`**: Log of WhatsApp (`twilio.mock.js`) and Email notifications dispatched upon audit completion.
- **`src/components/RunAuditModal.jsx`**: Dialog for starting an audit on an existing client or any custom public `https://` URL.

---

## 3. Running Locally on Laptop

Start `backend/` first on port `4000`, then in a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## 4. Deploying Frontend on Render (Static Site)

1. Go to [Render Dashboard](https://dashboard.render.com) -> **New +** -> **Static Site**.
2. Connect the same GitHub repository and configure:
   - **Name**: `edgelink-seo-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Add **Environment Variable**:
   - `VITE_API_URL`: `https://edgelink-seo-backend.onrender.com` (your live Render backend URL, no trailing slash)
4. Under **Redirects/Rewrites**, add SPA fallback rule:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
5. Deploy, then copy your frontend URL (`https://edgelink-seo-frontend.onrender.com`) back into the backend service's `FRONTEND_URL` env var on Render so CORS permits browser requests.
