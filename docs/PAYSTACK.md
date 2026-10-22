# Paystack in QUANT

This note documents Paystack Option 1 (goal checkout), Option 2 (DVA wallet), cash-out, and the recommended product architecture.

**Status**

| Phase | Pattern | Status |
|--------|---------|--------|
| **Option 1** | Intentional deposit → metadata → specific goal | **Done** (local verified) |
| **Option 1 ledger** | Double-entry `accounts` / `journal_entries` / `postings` on deposit | **Done** |
| **Option 2** | Blind DVA transfer → wallet → allocate to goals | **Done** (consent-gated DVA + auto-allocate) |
| **Cash-out** | Wallet → Paystack Transfer (MoMo / bank) | **Done** (recipient + transfer + webhooks) |

---

## Recommended architecture (locked)

**One Dedicated Virtual Account per user → wallet → goals** is the advised production path for QUANT (Ghana / West Africa).

| Decision | Choice | Why |
|----------|--------|-----|
| DVA scope | **Per user**, not per goal | Paystack DVAs are customer-level; per-goal accounts add cost, provisioning, and ops without enough UX win for a savings app |
| Blind inbound | Credit `wallet_balance`, then allocate | Bank/MoMo transfers cannot carry QUANT `goal_id` metadata |
| Default allocate | **Auto-allocate on** (priority waterfall) | Same mechanics as manual allocate; folio priority already expresses intent; toggle off to park funds |
| Intentional inbound | **Option 1 metadata checkout** | When the user is in-app funding a specific goal, attach meaning *before* money moves |
| Source of truth | PostgreSQL ledger + `transactions` / `saved_amount` | Never trust Paystack aggregate balance for per-user or per-goal bars |

**Do not build per-goal DVAs** unless a concrete need appears (e.g. employer must pay into a named goal account, or funds must never mix). Until then, shared DVA + wallet + auto-allocate stays the default.

### Product truth (UX must match)

QUANT does **not** open-bank or sync everyday MoMo/bank balances. There is no “link my MTN MoMo and pull savings.”

**Member-facing funding path (current UI):** transfer **to Paystack DVA** → wallet → **auto-allocate** or **Allocate from wallet** on a goal. Manual ledger entry is books-only. Goal deposit/withdraw forms do **not** open Paystack checkout.

Option 1 metadata checkout remains available on the API for ops/legacy, but is not offered on goal cards.

Copy in Settings → Funding, goal transaction modal, Feature Guide, and emails should state this explicitly.

### Budget vs cash in (Earner)

`monthly_budget` remains a **plan target**. Month-to-date **funded** = sum of successful `payment_references` (`wallet_deposit` / `goal_deposit`) in the member’s timezone month — not manual ledger rows. Dashboard + Funding show behind / on track / ahead. Goal “underfunded” warnings stay plan-feasibility only.

### Are metadata-tagged transfers worth it?

**Yes — for in-app deposits. That is Option 1, and it is already shipped.**

- User opens a goal → Paystack popup → initialize includes `metadata.goal_id` / `user_id` → webhook/verify credits **that** goal.
- Use this whenever the member is already in QUANT and knows which goal to fund (MoMo/card checkout).

**No — metadata cannot replace DVAs for blind external transfers.**

- When someone pays from a bank app into a DVA, Paystack only sees “money hit this virtual account.” The payer cannot attach QUANT `goal_id` metadata from their bank UI.
- Asking users to type a special narration/reference is fragile and not reliable enough as the primary rail.
- For that path, **apply meaning after arrival**: wallet credit → auto-allocate (or manual allocate).

So the two rails are complementary, not competing:

```
In-app, specific goal  →  Option 1 metadata checkout
Outside QUANT / salary →  Option 2 DVA → wallet → auto-allocate
```

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

1. **Attach meaning before money moves** (Option 1 — metadata) — preferred when the user is in-app
2. **Apply meaning after money arrives** (Option 2 — wallet + auto-allocate) — required for blind DVA credits

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
| Credit goal (product progress) | `backend/src/services/paymentService.js` → `transactionModel.recordTransaction` |
| Double-entry journal | `backend/src/services/ledgerService.js` → `accounts` / `journal_entries` / `postings` |
| Routes | `backend/src/routes/paymentRoutes.js` |
| Webhook (raw body, before `express.json`) | `backend/src/index.js` |
| Popup helper | `frontend/src/utils/paystackPopup.js` |
| Goal modal CTA | `frontend/src/App.js` (GoalPortfolioCard) |
| Callback / confirm page | `frontend/src/components/PaymentCallbackPage.jsx` → `/payments/callback` |

### Double-entry ledger (Option 1)

Paystack holds pooled merchant funds. QUANT’s PostgreSQL ledger is the internal balance sheet for cash movements:

1. On register (and lazily on first deposit): liability account `User Wallet - {user_id}`
2. System accounts: `Paystack Clearing` (ASSET), `Gateway Fee Expense` (EXPENSE)
3. Successful verify/webhook (same DB transaction as goal credit):
   - **Debit** Paystack Clearing / **Credit** User Wallet (gross ledger amount)
   - If fee known and same currency: **Debit** Gateway Fee Expense / **Credit** Paystack Clearing
4. Idempotency: `journal_entries.idempotency_key` = Paystack `reference` (UNIQUE), plus existing `payment_references`
5. Goal progress bars still come from `transactions` / `saved_amount` — not from Paystack balances
6. `payment_references.journal_entry_id` links the payment row to the journal for audit

### Cash-out — Paystack Transfer (DONE)

Withdraw unallocated `wallet_balance` to MoMo or bank:

1. Settings → Wallet → **Withdraw with Paystack**
2. `POST /api/wallet/withdraw` creates a transfer recipient, reserves wallet funds, posts pending journal (`User Wallet` → `Pending Disbursal`), then `POST /transfer` with `source: balance`
3. Webhooks `transfer.success` finalize (`Pending Disbursal` → `Paystack Clearing`); `transfer.failed` / `transfer.reversed` restore wallet + revert journal
4. Idempotency via `payouts.paystack_ref` (`quant_payout_{userId}_…`) and journal keys `:pending` / `:success` / `:revert`

| Piece | Location |
|--------|----------|
| Transfer helpers | `backend/src/utils/paystack.js` (`createTransferRecipient`, `initiateTransfer`, `listBanks`) |
| Service | `backend/src/services/payoutService.js` |
| Table | `payouts` |
| Routes | `GET/POST /api/wallet/payout-destinations`, `/payouts`, `/withdraw` |
| Webhooks | `paymentRoutes.handlePaystackWebhook` |

Dashboard: enable Transfers, fund balance, subscribe to `transfer.success` / `transfer.failed` / `transfer.reversed`. Test mode may require disabling Transfer OTP for API.

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
- Display currencies **GHS, USD, EUR, GBP, NGN** can use Paystack (configurable via `PAYSTACK_LEDGER_CURRENCIES`).
- Paystack still charges in `PAYSTACK_CURRENCY` (default **GHS** for Ghana). USD/EUR/GBP amounts are FX-converted for checkout; the goal is credited in the user’s display currency.

### Important rules (keep when extending)

- Never update `saved_amount` by hand in the webhook — always `recordTransaction`
- Never trust Paystack aggregate balance for per-user or per-goal amounts — use QUANT ledger + goal transactions
- Every financial journal must balance (`SUM(debits) = SUM(credits)`); use UNIQUE `idempotency_key` on retries
- Trust HMAC on **raw** webhook body; also ensure `goal_id` belongs to `user_id`
- Never expose the secret key to the frontend

---

## Option 2 — Main wallet + DVA (DONE)

Do **not** confuse with Option 1; they coexist. Spendable unallocated cash is `users.wallet_balance` (DVA inbound only). Option 1 never changes that column.

**One DVA per QUANT user** (Paystack customer), not one DVA per goal. Goal labeling happens inside QUANT after credit.

### When to use

- User transfers from their bank app **without** opening QUANT
- Salary / third-party money hits a dedicated account
- User wants funds applied to goals without opening checkout (auto-allocate), or parked then allocated manually

### Flow

1. Settings → **Wallet** → phone + consent → `POST /api/wallet/dva` creates Paystack customer + Dedicated Virtual Account
2. Store on `users`: `phone`, `paystack_customer_code`, `virtual_account_*`, `wallet_balance`, `auto_allocate_wallet`
3. User transfers to that account outside QUANT
4. Webhook `charge.success` without goal metadata → `applyWalletCredit` (idempotent via `payment_references.kind = wallet_deposit`)
5. Credits `wallet_balance` + double-entry journal
6. **Auto-allocate (default on):** waterfall into active goals by priority (`Auto-allocated from wallet`), same mechanics as manual allocate; leftover stays in wallet. Toggle in Settings → Wallet (`auto_allocate_wallet`)
7. Manual allocate still available: `POST /api/wallet/allocate`
8. Email notice summarizes credit and any auto-applied goals

### Implementation map

| Piece | Location |
|--------|----------|
| Customer / DVA helpers | `backend/src/utils/paystack.js` |
| Wallet service (credit, auto-allocate, plan) | `backend/src/services/walletService.js` |
| Routes | `backend/src/routes/walletRoutes.js` → `/api/wallet` |
| Webhook routing | `backend/src/routes/paymentRoutes.js` (`isGoalDepositCharge`) |
| Settings UI | `frontend/src/components/SettingsPage.jsx` (Wallet tab) |
| Allocate CTA | `frontend/src/App.js` (transaction modal) |

### Env

```env
PAYSTACK_DVA_BANK=test-bank   # optional preferred provider
```

Dashboard webhooks: `charge.success`, `dedicatedaccount.assign`, plus transfer events for cash-out.

### Product notes

- GH DVA may require a live Paystack business enablement; sandbox is often Nigeria-oriented (`test-bank`).
- Framing: “Paystack-powered payments into your plan,” not “QUANT bank account.”
- Allocation (auto or manual) is **internal only** — no Paystack call, no extra fee.
- Metadata on DVA webhook payloads is not a substitute for Option 1; blind transfers rarely carry usable goal intent.

### How both coexist

| Option 1 (metadata) | Option 2 (DVA + wallet) |
|----------|----------|
| In-app, specific goal | Blind / external transfer |
| MoMo / card popup | One shared DVA per user |
| `goal_id` on charge metadata | Wallet credit → auto/manual allocate |
| Does not touch `wallet_balance` | Credits / debits `wallet_balance` |
| Best when intent is known up front | Best when money arrives without QUANT open |

---

## Related

- Goal ledger: `backend/src/models/transactionModel.js`
- Double-entry: `backend/src/services/ledgerService.js`
- Env template: `backend/.env.example`
- Main project README: local Docker / Railway / Resend setup
