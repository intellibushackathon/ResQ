# ResQ — Disaster Intelligence Platform

A real-time disaster reporting and response coordination platform built for Jamaica. Members of the public can submit geo-tagged incident reports with photo evidence, AI triage analyses the severity and routes reports to the appropriate government department, and staff/admin can manage the response workflow.

**Live app:** [https://res-q-ecru.vercel.app](https://res-q-ecru.vercel.app)

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | testadmin@gmail.com | 1234567890 |
| Citizen | citizentest@gmail.com | 12345678 |

---

## Features

- **Incident reporting** — photo upload, GPS pin, damage category, AI-assisted triage
- **Offline mode** — reports queue locally when there's no internet and auto-sync on reconnect
- **QR code sharing** — share a queued offline report as a QR code so someone with internet can submit it on your behalf; photo uploads automatically when your device reconnects
- **AI analysis** — severity scoring, department routing (NWA / JPS / ODPEM), hazard detection
- **Staff dashboard** — live incident map, queue management, verify/dispatch/resolve workflow
- **Admin panel** — moderation, system settings, audit logs

---

## Tech Stack

- **Frontend** — React 19, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend** — Supabase (Postgres + Auth + Storage)
- **Maps** — Leaflet / react-leaflet
- **AI** — OpenRouter (Claude) or a custom proxy, with a local heuristic fallback
- **Deployment** — Vercel

---

## Running Locally

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Clone and install

```bash
git clone https://github.com/your-org/resq.git
cd resq
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Required — Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_AUTH_REDIRECT_URL=http://localhost:5173

# Optional — AI analysis (pick one or leave blank to use local fallback)
VITE_OPENROUTER_API_KEY=sk-or-...
VITE_OPENROUTER_MODEL=anthropic/claude-sonnet-4
VITE_OPENROUTER_SITE_URL=http://localhost:5173
VITE_OPENROUTER_SITE_NAME=ResQ

# Or use a custom AI proxy instead
VITE_AI_PROXY_URL=https://your-proxy.example.com/api/analyze
```

### 3. Start the dev server

```bash
npm run dev
```

App runs at [http://localhost:5173](http://localhost:5173)

### 4. Build for production

```bash
npm run build
```

Output goes to `dist/`. Deploy to Vercel, Netlify, or any static host.

---

## Roles

| Role | Access |
|------|--------|
| Public / Guest | Submit reports, view own history, scan QR reports |
| Staff | All of the above + dashboard, verify/dispatch/resolve |
| Admin | All of the above + admin panel, system settings, audit logs |

---

## Offline QR Flow

1. Submit a report while offline — it queues locally
2. In **My Reports**, tap **Share QR** on any queued draft
3. A second person with internet scans the QR at `/scan` and submits the report on your behalf
4. Tap **Mark as submitted** to remove the draft from your queue
5. When you reconnect, the photo uploads automatically and attaches to the submitted report
