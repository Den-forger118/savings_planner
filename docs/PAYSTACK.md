# Paystack in QUANT

This note preserves the payments architecture so Option 2 can be picked up later without re-deriving it.

**Status**

| Phase | Pattern | Status |
|--------|---------|--------|
| **Option 1** | Intentional deposit → metadata → specific goal | **Done** (local verified) |
| **Option 2** | Blind DVA transfer → wallet → allocate to goals | **Deferred** — implement when prompted |

---

## The core problem

```
QUANT knows about goals.
Paystack knows about money.

They speak different languages.

QUANT:   "Amina wants to save for a Phone by December"
Paystack: "Someone sent GHS 10. That's it."

Job: bridge "money arrived" → "THIS goal's progress goes up"
```

Two bridges:

1. **Attach meaning before money moves** (Option 1 — metadata)
2. **Apply meaning after money arrives** (Option 2 — wallet allocation)

---

## Option 1 — Metadata pattern (DONE)

### When to use

- User is inside QUANT and funds a **specific** goal
- MoMo / card via Paystack popup
- Intentional deposit (most Ghana MoMo-first usage)

### Flow

1. User opens a goal → Record Transaction → **Pay with Paystack**
2. Backend `POST /api/payments/initialize` with `goalId` + `amount`
3. Paystack initialize includes metadata: `user_id`, `goal_id`, `goal_name`, `transaction_type`
4. Frontend opens **Inline popup** (`resumeTransaction(access_code)`) — not full-page redirect
5. On success, frontend calls `GET /api/payments/verify/:reference` (credits ledger)
6. Webhook `POST /api/payments/webhook` on `charge.success` also credits (idempotent) — needed especially in production

### Implementation map

| Piece | Location |
|--------|----------|
| Paystack helpers | `backend/src/utils/paystack.js` |
| Pending refs + idempotency | `backend/src/models/paymentModel.js`, table `payment_references` |
| Credit goal (reuse ledger) | `backend/src/services/paymentService.js` → `transactionModel.recordTransaction` |
| Routes | `backend/src/routes/paymentRoutes.js` |
| Webhook (raw body, before `express.json`) | `backend/src/index.js` |
| Popup helper | `frontend/src/utils/paystackPopup.js` |
| Goal modal CTA | `frontend/src/App.js` (GoalPortfolioCard) |
| Callback / confirm page | `frontend/src/components/PaymentCallbackPage.jsx` → `/payments/callback` |

### Env vars

```env
PAYSTACK_SECRET_KEY=sk_test_...   # or sk_live_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_CURRENCY=GHS
FRONTEND_URL=https://your-frontend.vercel.app
```

Paystack dashboard:

- **Test Webhook URL:** `https://YOUR_RAILWAY_HOST/api/payments/webhook`
- **Test Callback URL:** `https://YOUR_FRONTEND/payments/callback`
- Event: `charge.success`

### Local vs production

- **Local:** Paystack webhooks cannot reach `localhost`. Credit relies on **verify after popup**. That is enough for Option 1 testing.
- **Production:** Set the same keys on Railway; webhook URL must include `/api/payments/webhook`. Verify + webhook both OK; `payment_references.paystack_ref` UNIQUE prevents double credit.
- Display currency must match `PAYSTACK_CURRENCY` (default GHS) or initialize is rejected.

### Important rules (keep when extending)

- Never update `saved_amount` by hand in the webhook — always `recordTransaction`
- Trust HMAC on **raw** webhook body; also ensure `goal_id` belongs to `user_id`
- Never expose the secret key to the frontend

---

## Option 2 — Main wallet + DVA (DEFERRED)

Build this when ready. Do **not** confuse with Option 1; they coexist.

### When to use

- User transfers from their bank app **without** opening QUANT
- Salary / third-party money hits a dedicated account
- User wants to park money, then allocate to goals later

### Analogy

Money lands in a general pool (wallet). Labels (which goal) are applied afterward inside QUANT — pure DB moves, no Paystack fee on allocation.

### Target UX

```
Wallet balance: GHS 350  [Allocate funds →]

Goals:
  Buy a Phone     [Deposit via MoMo]  [Allocate from wallet]
  Emergency Fund  [Deposit via MoMo]  [Allocate from wallet]
```

### Intended flow

1. Create Paystack **customer** + **Dedicated Virtual Account (DVA)** per user (consent required)
2. Store on `users`: account number, bank, customer code, account name
3. User (or employer) transfers to that account outside QUANT
4. Paystack webhook fires for the DVA credit (event name — confirm against current Paystack docs at build time; often related to `charge.success` with DVA channel, not only `dedicatedaccount.assign`)
5. Backend credits **`wallet_balance`** (not a goal)
6. Notify user: “GHS X in your QUANT wallet — allocate to a goal”
7. User allocates in-app: `wallet_balance -= X`, goal deposit via `recordTransaction`, note e.g. `Allocated from wallet`

### Suggested schema (when implementing)

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paystack_customer_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS virtual_account_bank VARCHAR(100),
  ADD COLUMN IF NOT EXISTS virtual_account_name VARCHAR(255);
```

Reuse `payment_references` (or a sibling table) for inbound DVA transfers so the same Paystack reference cannot credit twice.

### Product / platform notes (easy to forget)

- Paystack DVA docs: available to registered businesses in **Nigeria and Ghana** after go-live; sandbox/`test-bank` flows are historically **Nigeria-oriented** — confirm GH DVA on the live account before promising Titan-style numbers in UI.
- Generating a DVA needs customer consent and PII (name, email, phone); financial-services categories may need extra customer validation.
- Holding / routing user funds can have regulatory framing — prefer “Paystack-powered payments into your plan,” not “QUANT bank account,” until clarified.
- Option 2 allocation is **internal only** — no Paystack call, no extra fee.

### Build order when un-deferring

1. Confirm DVA enabled for the QUANT Paystack business (GH) + webhook events in docs
2. Migrations: `wallet_balance` + DVA columns on `users`
3. API: create/fetch DVA for current user; show number in Settings or Wallet panel
4. Webhook branch: credit wallet (idempotent)
5. UI: wallet banner + Allocate to goal (calls existing deposit path with wallet debit in one transaction)
6. Keep Option 1 MoMo button unchanged

### How both coexist

| Option 1 | Option 2 |
|----------|----------|
| In-app, specific goal | Blind / external transfer |
| MoMo / card popup | DVA bank transfer |
| Metadata on charge | Wallet then allocate |
| Already shipped | Later power feature |

---

## Prompt to resume Option 2

When ready, something like:

> Implement Paystack Option 2 from `docs/PAYSTACK.md`: DVA per user, wallet_balance, webhook → wallet, allocate-to-goal UI. Leave Option 1 as-is.

---

## Related

- Goal ledger: `backend/src/models/transactionModel.js`
- Env template: `backend/.env.example`
- Main project README: local Docker / Railway / Resend setup
