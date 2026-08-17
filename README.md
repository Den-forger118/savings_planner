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

## Email (Gmail App Password)

QUANT sends mail through Gmail SMTP with an **App Password** — the same free Google approach used on FoodFusion. You need this for:

- A sign-in notice after a successful login
- Password reset links from **Forgot password?**

### 1. Turn on 2-Step Verification

1. Open [Google Account → Security](https://myaccount.google.com/security)
2. Sign in with the Gmail you want QUANT to send from
3. Enable **2-Step Verification** (required before App Passwords appear)

### 2. Create an App Password

1. Open [App Passwords](https://myaccount.google.com/apppasswords)
2. Choose **Mail** and a device name such as `QUANT`
3. Google shows a **16-character password** (spaces are fine; they are ignored)
4. Copy it. You will not see it again.

Do **not** use your normal Gmail password. Railway / Vercel will reject or Google will block it.

### 3. Add variables on Railway (backend)

In the **backend** service → **Variables**:

```env
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM=QUANT <you@gmail.com>
FRONTEND_URL=https://your-app.vercel.app
```

`FRONTEND_URL` must be your live Vercel URL (no trailing slash). Reset emails link to:

```text
https://your-app.vercel.app/reset-password?token=...
```

Redeploy the backend after saving.

### 4. Local Docker (optional)

Put the same values in `backend/.env` (already loaded by Compose):

```env
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
FRONTEND_URL=http://localhost:8080
```

Then restart:

```bash
docker compose up -d --build backend
```

### How to test

1. Sign in — you should get a **New QUANT sign-in** email
2. On the login page, click **Forgot password?** and submit your email
3. Open the link (expires in 1 hour) and set a new password
4. Sign in with the new password

If mail is not configured, login still works; the server logs `Gmail is not configured` and skips the email. Reset requests still succeed on the UI (same generic message) so accounts cannot be enumerated.

### Admin API

- `GET /api/admin/users?search=&sort=created_at&order=desc`
- `GET /api/admin/users/:userId` — read-only profile with goals, transactions, and expenses
- Requires a valid JWT for an admin user

## Status

In development.
