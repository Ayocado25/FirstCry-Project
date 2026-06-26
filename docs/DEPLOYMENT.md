# Deployment Guide — Daycare Routine Tracker

## Important: This is a two-part deployment

This project has a **frontend** (React/Vite, static) and a **backend** (Node/Express + PostgreSQL, stateful). They deploy to different kinds of platforms:

| Part | Best fit | Why |
|------|----------|-----|
| `frontend/` | Vercel, Netlify, Render Static Site | Pure static build — perfect for Vercel |
| `backend/` | Render, Railway, a VPS with Docker | Needs a persistent Postgres connection pool and long-running process — not a good fit for Vercel's serverless functions without rewriting the whole API layer |

**You cannot point Vercel at the repo root and expect it to work** — that's what caused the 404. Vercel needs to be pointed specifically at the `frontend` folder, and the backend needs to be deployed separately (e.g. Render, see Option B below).

---

## Option D — Deploy Frontend to Vercel (recommended for frontend)

1. Push your code to GitHub.
2. Go to https://vercel.com → **Add New Project** → import your repo.
3. When asked for the **Root Directory**, set it to `frontend` (not the repo root). This is the step that was missing and caused your 404.
4. Vercel will auto-detect Vite. Confirm:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add an environment variable:
   - `VITE_API_BASE_URL` = `https://your-backend-url.onrender.com/api` (your deployed backend's URL — see Option B/C below to get this)
6. Deploy.

A `vercel.json` is already included in `frontend/` so Vercel picks up the SPA routing rewrite automatically (without it, refreshing any page other than `/` would 404).

Once your backend is deployed (next section), come back and update `VITE_API_BASE_URL` in Vercel's project settings, then redeploy.

---

## Option A — Docker Compose (VPS / Any Server)

### Prerequisites
- Ubuntu 22.04+ VPS (or any Docker host)
- Docker Engine 24+
- Docker Compose v2

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-org/daycare-tracker.git
cd daycare-tracker

# 2. Create production environment file
cat > .env << EOF
DB_PASSWORD=your_strong_db_password_here
JWT_ACCESS_SECRET=your_random_32_plus_char_string_here
JWT_REFRESH_SECRET=your_different_random_32_plus_char_string
FRONTEND_URL=https://your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=your_token
EOF

# 3. Build and start
docker-compose up --build -d

# 4. Run migrations (first time only)
docker-compose exec backend npm run db:migrate

# 5. Seed sample data (first time only)
docker-compose exec backend npm run db:seed

# 6. Check status
docker-compose ps
docker-compose logs backend
```

App runs at: `http://your-server-ip:3000`

---

## Option B — Render.com (Free Tier)

### Backend (Web Service)

1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Set **Root Directory**: `backend`
4. **Build Command**: `npm install`
5. **Start Command**: `node server.js`
6. **Environment Variables** — add all from `backend/.env.example`

### Database (PostgreSQL)

1. Render → New → PostgreSQL
2. Free tier, region closest to users
3. Copy the **Internal Database URL**
4. In your backend service, set `DATABASE_URL` to that value
5. Update `backend/src/config/database.js` to use `DATABASE_URL` if set:

```js
// Add to database.js connectionString support:
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({ host, port, database, user, password });
```

### Frontend (Static Site)

1. Render → New → Static Site
2. Connect repo, **Root Directory**: `frontend`
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. Set **Environment Variable**: `VITE_API_BASE_URL=https://your-backend.onrender.com/api`

---

## Option C — Railway.app

### Backend

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Deploy backend
cd backend
railway init
railway up

# Set environment variables via Railway dashboard
# or: railway variables set KEY=VALUE
```

### Database

1. Railway dashboard → New Service → Database → PostgreSQL
2. Railway auto-injects `DATABASE_URL` into your service

### Frontend

```bash
cd frontend
# Set build env var
railway variables set VITE_API_BASE_URL=https://your-api.up.railway.app/api
railway up
```

---

## Running Migrations on Production

```bash
# Docker
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed

# Render / Railway — one-off command in dashboard
node scripts/migrate.js
node scripts/seed.js
```

---

## SSL / HTTPS

- **Render** and **Railway** provide HTTPS automatically.
- For VPS, use **Nginx + Certbot**:

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Then proxy to Docker containers:

```nginx
server {
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    listen 443 ssl; # managed by Certbot
}
```

---

## Environment Variables Checklist

| Variable | Required | Notes |
|----------|----------|-------|
| `DB_HOST` | ✅ | Postgres host |
| `DB_PASSWORD` | ✅ | Strong password |
| `JWT_ACCESS_SECRET` | ✅ | Min 32 chars, random |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars, different from above |
| `SMTP_USER` | Optional | For email notifications |
| `SMTP_PASS` | Optional | App password for Gmail |
| `TWILIO_ACCOUNT_SID` | Optional | For WhatsApp |
| `TWILIO_AUTH_TOKEN` | Optional | For WhatsApp |
| `FRONTEND_URL` | ✅ (prod) | For CORS |

---

## Health Check

```bash
curl https://your-domain.com/health
# Expected: {"status":"ok","service":"Daycare Routine Tracker API",...}
```

---

## Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime)
docker-compose up --build -d

# If schema changed
docker-compose exec backend npm run db:migrate
```
