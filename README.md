# Savings Planner

A full-stack savings planner for creating savings goals, tracking deposits and withdrawals, logging expenses, and viewing monthly budget allocations.

## Tech Stack

- Frontend: React, Axios, Tailwind CSS, Nginx
- Backend: Node.js, Express, JWT authentication
- Database: PostgreSQL
- Containerization: Docker Compose

## Project Structure

```text
backend/
  db/init/001_schema.sql       PostgreSQL schema used by Docker on first database startup
  src/                         Express API, routes, models, middleware
frontend/
  src/                         React application
  .env.production              Production API URL for the Docker build
docker-compose.yml             Runs Postgres, backend, and frontend together
```

## Running With Docker

Start the full app:

```bash
docker compose up -d --build
```

Open the frontend:

```text
http://localhost:8080
```

The backend API runs at:

```text
http://localhost:5001/api
```

PostgreSQL is exposed locally on:

```text
localhost:5432
```

Check container logs:

```bash
docker compose logs -f
```

Stop the app:

```bash
docker compose down
```

## Database Setup

The database schema lives in:

```text
backend/db/init/001_schema.sql
```

Docker mounts that folder into the Postgres container at `/docker-entrypoint-initdb.d`, so the schema is created automatically when the `postgres_data` volume is created for the first time.

The schema creates these tables:

- `users`
- `saving_goals`
- `categories`
- `expenses`
- `transactions`

Important: Postgres init scripts only run for a brand-new database volume. If the volume already exists, Docker will keep the current database data and skip init scripts.

To reset the database completely:

```bash
docker compose down -v
docker compose up -d --build
```

That deletes the persisted database volume, so only use it when you are okay losing local data.

## Environment

The Docker backend service sets the database connection values and frontend CORS origin in `docker-compose.yml`.

Key backend values:

```text
PORT=5001
DB_HOST=db
DB_PORT=5432
DB_NAME=quant
DB_USERNAME=postgres
FRONTEND_URL=http://localhost:8080
```

The production frontend build uses:

```text
REACT_APP_API_URL=http://localhost:5001/api
```

from `frontend/.env.production`.

## Local Development

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm start
```

When running the frontend locally with `npm start`, it usually opens on `http://localhost:3000`. The backend CORS config allows both `http://localhost:8080` and `http://localhost:3000`.

## Tests

Backend calculation model tests:

```bash
cd backend
npm test
```

Frontend tests:

```bash
cd frontend
npm test
```

## Troubleshooting

### CORS blocked login request

If the browser says the request from `http://localhost:8080` to `http://localhost:5001` is blocked by CORS, rebuild and restart the backend so the current CORS config is running:

```bash
docker compose up -d --build backend
```

### `relation "users" does not exist`

This means the backend connected to Postgres, but the database tables are missing. For a fresh reset, run:

```bash
docker compose down -v
docker compose up -d --build
```

For an existing volume where you want to keep data, apply the schema manually:

```bash
Get-Content backend\db\init\001_schema.sql | docker exec -i savings_planner_db psql -U postgres -d quant
```

### Backend cannot connect to the database

Make sure the database container is healthy:

```bash
docker compose ps
docker compose logs db
```

The backend uses `DB_HOST=db` inside Docker, not `localhost`, because it connects to the Postgres service over the Docker network.

## Admin Access

QUANT uses an `is_admin` flag on the `users` table. Admins log in with a normal account and see an **Admin** item in the sidebar.

### Grant admin to your account

**Option 1 — environment variable (recommended on startup)**

Set your email in `docker-compose.yml` or `backend/.env`:

```env
ADMIN_PROMOTE_EMAIL=you@example.com
```

Restart the backend. Migrations promote that user automatically:

```bash
docker compose up -d --build backend
```

**Option 2 — SQL**

```bash
docker exec -it savings_planner_db psql -U postgres -d quant -c "UPDATE users SET is_admin = true WHERE email = 'you@example.com';"
```

Log out and log back in so your session picks up `is_admin: true`.

## Email (Resend — recommended)

QUANT sends mail with **[Resend](https://resend.com)** for:

- A sign-in notice after a successful login
- Password reset links from **Forgot password?**

### 1. Create an API key in Resend

1. Sign in at [resend.com](https://resend.com)
2. Go to **API Keys** → **Create API Key**
3. Name it e.g. `QUANT Railway` → copy the key (`re_...`)

### 2. Choose a From address

**Quick test (no domain):** use Resend’s onboarding sender:

```env
MAIL_FROM=QUANT <onboarding@resend.dev>
```

On the free test sender, Resend usually only delivers to **the email you signed up with**.  
**Production:** add and verify your domain in Resend → Domains, then use e.g. `QUANT <noreply@yourdomain.com>`.

### 3. Railway backend variables (email)

On the **Express** service → **Variables**:

```env
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM=QUANT <onboarding@resend.dev>
FRONTEND_URL=https://your-app.vercel.app
```

`FRONTEND_URL` must be your live Vercel URL (**no trailing slash**) so reset links work:

```text
https://your-app.vercel.app/reset-password?token=...
```

Redeploy the backend after saving. You can remove old `GMAIL_*` vars; Gmail remains an optional fallback only if Resend is unset.

### 4. Railway backend + Postgres (restore checklist)

Keep **frontend on Vercel** and **API + Postgres on Railway**.

**A. Postgres service (Railway)**  
- Add a PostgreSQL plugin/service in the same Railway project.  
- Link it to the backend service so Railway injects `DATABASE_URL` (preferred).  
- The API also still accepts manual `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` if you set those instead.

**B. Backend service → Variables** (set these on the API service):

```env
NODE_ENV=production
PORT=5001
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://your-app.vercel.app
DATABASE_URL=${{Postgres.DATABASE_URL}}
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM=QUANT <onboarding@resend.dev>
ADMIN_PROMOTE_EMAIL=you@example.com
```

Notes:
- `FRONTEND_URL` = live Vercel URL, **no trailing slash** (CORS + reset-email links).
- If you use a `www` Vercel domain too, also set `FRONTEND_URL_WWW=https://www.your-app.vercel.app`.
- Vercel preview URLs change every deploy. The API allows `https://*.vercel.app` by default (`ALLOW_VERCEL_PREVIEWS=false` to turn that off).
- Still set `FRONTEND_URL` to your main Vercel URL (no trailing slash) so password-reset emails link to the right place.
- Optional: `FRONTEND_URLS=https://url1.vercel.app,https://url2.vercel.app` for extra exact origins.
- `DATABASE_URL` is normally auto-filled when Postgres is linked; do not invent host pieces if the URL is already there.
- Start command / root: service root directory = `backend`, start = `npm start` (or Docker `backend/Dockerfile`).

**C. Vercel frontend → Environment Variables**

```env
REACT_APP_API_URL=https://your-railway-api.up.railway.app/api
```

Redeploy **both** after saving. Reset emails link to:

```text
https://your-app.vercel.app/reset-password?token=...
```

**D. Smoke test**
1. Open `https://your-railway-api.up.railway.app/` → should return `{ "message": "Savings Planner API is running!" }`
2. Open the Vercel site → Register / Login
3. If login fails in the browser console with CORS, `FRONTEND_URL` does not match the exact Vercel origin

### 5. Local (Docker or `npm run dev`)

1. Copy the example env file and paste your Resend key:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
RESEND_API_KEY=re_your_real_key
MAIL_FROM=QUANT <onboarding@resend.dev>
FRONTEND_URL=http://localhost:8080
```

Use `FRONTEND_URL=http://localhost:3000` if you run the frontend with `npm start` instead of Docker on 8080.

2. Restart the API:

```bash
# Docker
docker compose up -d --build backend

# Or bare Node from /backend
npm run dev
```

3. Request a reset from the local login page. With `onboarding@resend.dev`, the inbox must be the **email on your Resend account**.

### How to test

1. Sign in — you should get a **New QUANT sign-in** email (to an allowed recipient)
2. On the login page, click **Forgot password?** and submit your email
3. Open the link (expires in 1 hour) and set a new password
4. Sign in with the new password

If mail is not configured, login still works; the server logs that no provider is set and skips the email. Reset requests still succeed on the UI (same generic message) so accounts cannot be enumerated.

### Admin API

- `GET /api/admin/users?search=&sort=created_at&order=desc`
- `GET /api/admin/users/:userId` — read-only profile with goals, transactions, and expenses
- Requires a valid JWT for an admin user

## Paystack (goal deposits)

**Option 1** (MoMo/card → specific goal via metadata + popup) is implemented.  
**Option 2** (dedicated virtual account → wallet → allocate later) is deferred.

Full architecture, env vars, webhook notes, and the Option 2 build checklist: **[docs/PAYSTACK.md](docs/PAYSTACK.md)**.

## PWA + Web Push

QUANT is not a full installable PWA yet (stub manifest only). Web push rides on a service worker and the reminder cron.

Plan, VAPID keys, iOS notes, and remaining PWA polish: **[docs/PWA_PUSH.md](docs/PWA_PUSH.md)**.

## Status

In development.
