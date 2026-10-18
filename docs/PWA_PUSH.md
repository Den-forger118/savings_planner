# PWA + Web Push (QUANT)

This note covers making QUANT a Progressive Web App and delivering **push notifications** with the same content as email reminders.

**Status**

| Piece | Status |
|--------|--------|
| Email reminders + cron | Done |
| Web Push (subscribe + cron delivery) | Done — Settings → Reminders → Browser push |
| Full installable PWA (icons, Add to Home Screen polish) | Documented — complete when needed for iOS |

---

## Is QUANT a PWA today?

**Not fully.** There is a stub `frontend/public/manifest.json` and a `<link rel="manifest">`, but:

- No app icons in the manifest
- No registered service worker (until push work)
- No iOS `apple-touch-icon` / web-app-capable meta

Browsers will not reliably treat QUANT as installable, and **iOS web push only works** if the site is added to the Home Screen as a PWA (iOS 16.4+).

---

## What to add for a real PWA

| Piece | Purpose |
|--------|---------|
| Icons (192×192, 512×512, maskable) | Install prompts + home screen |
| Complete `manifest.json` | `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, theme colors |
| Service worker | Offline shell (optional) + **required for Push** |
| HTTPS | Already true on Vercel |
| iOS meta + `apple-touch-icon` | Add to Home Screen |
| Optional Settings tip | “Install QUANT” / “Add to Home Screen” |

Suggested order: **service worker + push first** (this doc’s focus) → polish icons/manifest for installability → verify iOS Home Screen + push.

---

## Web Push architecture

```
Same reminder cron (hourly)
  → build digest lines (unchanged)
  → email (if email_notifications)
  → web push (if push_notifications + subscriptions)
```

### Tools

| Layer | Tool |
|--------|------|
| Backend | `web-push` (npm) |
| Keys | VAPID key pair (generate once) |
| DB | `push_subscriptions` + `users.push_notifications` |
| Frontend | Service worker + PushManager permission |
| Settings | Opt-in toggle (never prompt on first paint) |

### Tables

```sql
-- users.push_notifications BOOLEAN DEFAULT false

CREATE TABLE push_subscriptions (
  subscription_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

One user can have many devices (phone + desktop).

### Env

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

Generate:

```bash
npx web-push generate-vapid-keys
```

### Browser reality

- **Android Chrome / desktop Chrome & Edge / Firefox:** solid
- **iOS Safari:** push only after Add to Home Screen; treat as best-effort
- Expired endpoints return 404/410 → delete subscription row
- Local Docker: push works on desktop Chrome over `localhost`; real phones need HTTPS public origin for reliable testing

### API

- `GET /api/push/vapid-public-key` — public key for `pushManager.subscribe`
- `GET /api/push/status` — preference + subscription count
- `POST /api/push/subscribe` — body: `{ subscription }`
- `DELETE /api/push/subscribe` — body: `{ endpoint }`
- `POST /api/push/disable` — clear all devices + turn preference off

### Implementation map

| Piece | Location |
|--------|----------|
| VAPID / send | `backend/src/utils/webPush.js` |
| Subscriptions DB | `backend/src/models/pushModel.js` |
| Routes | `backend/src/routes/pushRoutes.js` |
| Cron → push | `backend/src/services/pushService.js` + `reminderJob.js` |
| Service worker | `frontend/public/sw.js` |
| Client helpers | `frontend/src/utils/webPushClient.js` |
| Settings UI | Settings → Reminders → Browser push |

### How to try

1. Set `VAPID_*` in `backend/.env` (local keys may already be appended; regenerate for production)
2. Restart backend so migrations + env load
3. Settings → Reminders → **Enable on this device** (allow permission)
4. Keep reminder hour near now (or temporarily call `POST /api/internal/reminders/run` with secret) to trigger a digests

### Payload

Short title + body from the same digest lines as email (no HTML). Click opens QUANT (`/dashboard` or `/savings`).

---

## Prompt to finish PWA polish later

> Complete QUANT as an installable PWA per `docs/PWA_PUSH.md`: icons, manifest, apple-touch-icon, optional install tip. Keep existing push service worker.

---

## Related

- Reminder cron: `backend/src/jobs/reminderJob.js`
- Email reminders: Settings → Reminders
- Paystack (unrelated): `docs/PAYSTACK.md`
