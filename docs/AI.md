# AI in QUANT

Plan for where AI helps, what to **skip for now**, what to build first, and how to run it on a **free Hugging Face** model (with a clean path to paid later).

**Status:** Goal Coach v1 implemented (`/coach`, `POST /api/ai/coach`, Hugging Face by default).

---

## What AI is for (and what it is not)

| AI should | Code / rules should |
|-----------|---------------------|
| Explain, coach, summarize | Balances, Paystack, `recordTransaction` |
| Turn vague goals into structured drafts | Cadence math, allocation scores |
| Suggest plans the user confirms | Reminder cron schedule, idempotency |
| Draft reminder / weekly narrative copy | Exact GHS/USD amounts in the ledger |

**Rule:** AI never silently changes `saved_amount`, wallet, or payments. It proposes; the user (or an explicit “Apply”) confirms.

---

## Skip for now

Do **not** prioritize these until Coach (or weekly briefing) is solid:

1. **AI that moves money without confirmation** — auto-allocate, auto-deposit, auto-reorder goals  
2. **Receipt / MoMo SMS scraping** — privacy, parsing fragility, support burden  
3. **Fine-tuned private model** — overkill before a product loop exists  
4. **Multi-agent / tool swarms** — one coach with a few tools is enough  
5. **Voice coach / realtime avatars** — shiny, not accountability  
6. **AI expense OCR / photo receipts** — later; start with text notes only  
7. **Household / multi-user AI** — after single-user coach works  
8. **Replacing reminder cron with an LLM** — keep cron; AI only writes copy if needed  
9. **Paid frontier APIs as a hard dependency** — optional later; start free for prototyping  
10. **Full installable PWA polish solely for AI** — unrelated; see `docs/PWA_PUSH.md`  
11. **Paystack Option 2 (DVA + wallet) “AI allocator”** — finish Option 2 product first (`docs/PAYSTACK.md`)

---

## Do now (recommended order)

### 1. Goal Coach (chat) — SHIPPED

**Surface:** Nav → **Coach** (`/coach`) — short chat against the user’s goals.

**Capabilities (v1):**

- Answer “am I on track?” using live goal breakdowns  
- Suggest a catch-up cadence (call existing simulator / calculation helpers)  
- Draft a goal from plain language (“Bali by December, about 8k”) → user confirms create  
- One clear next action for the week  

**Backend shape:**

- `POST /api/ai/coach` with `{ messages }`  
- Server builds a **context pack** (goals, budget mode, currency) — do not dump raw passwords  
- Provider adapter: Hugging Face now, OpenAI/Anthropic later behind the same interface  
- Optional tools later: `get_goals`, `run_simulator` — still no auto-writes  

### 2. Weekly narrative (optional second)

Reuse reminder cron: after digest lines, ask the model for **one short paragraph**; email/push stay rule-triggered.

### 3. Expense note → category (optional third)

If note is empty/unknown category, suggest a category; user accepts.

---

## Hugging Face free vs paid

### Recommendation for QUANT right now

**Yes — start with Hugging Face Inference (free / low-cost) for the Coach prototype.**

| | Hugging Face free (or HF Inference) | Paid (OpenAI / Anthropic / etc.) |
|--|--------------------------------------|----------------------------------|
| Cost | Good for learning and early users | Predictable quality, higher cost |
| Latency | Can be slow; cold starts | Usually faster / steadier |
| Quality | 7B–14B instruct = “good enough coach” | Better nuance and long chats |
| Limits | Rate limits; models rotate | Higher ceilings |
| Fit | Prototype + student / early QUANT | When Coach is sticky and budget allows |

**Opinion:** Free HF is the right **first** move. Do not block the feature on a paid key. Design `aiProvider` so swapping to a paid model is an env change, not a rewrite.

**Alternatives if HF is flaky:** [Groq](https://groq.com) free tier (very fast Llama/Mixtral) — same “OpenAI-compatible chat” pattern.

---

## Which model to use (Hugging Face)

Prefer **instruction-tuned** chat models in the ~7B–14B range (quality vs free-tier speed).

### First choice (try in this order)

1. **`meta-llama/Llama-3.1-8B-Instruct`** — default; widely available on Inference Providers  
2. **`Qwen/Qwen3-8B`** — strong alternative if Llama is gated for your account  
3. **`google/gemma-3-4b-it`** — lighter fallback  

> Note: `Qwen/Qwen2.5-7B-Instruct` often returns *“not supported by any provider you have enabled”* on the current router — prefer the list above.  

### Avoid for v1 Coach

- Tiny models (&lt;3B) — too shallow for multi-goal advice  
- Base (non-Instruct) models — poor chat behavior  
- Huge 70B on free serverless — timeouts and queueing  

### Env sketch (when implementing)

```env
# Hugging Face (needs Inference Providers credits)
AI_PROVIDER=huggingface
HF_TOKEN=hf_...
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct

# Or Groq free tier if HF credits are empty:
# AI_PROVIDER=groq
# GROQ_API_KEY=gsk_...
# GROQ_MODEL=llama-3.1-8b-instant
```

Use the HF token from https://huggingface.co/settings/tokens (read access is enough for Inference API on public models).

---

## Product constraints (keep forever)

1. **Numbers from QUANT, not from the model’s imagination** — inject real `saved_amount` / daily need into the prompt; ask the model to reason over them  
2. **Currency-aware** — pass `user.currency` / symbol into context  
3. **Confirm before writes** — create goal / change priority only after UI confirm  
4. **Privacy** — don’t log full prompts with PII to third parties beyond the provider; no training opt-in by default  
5. **Failure mode** — if HF is down, Coach returns a friendly error; reminders/Paystack keep working  

---

## Prompt to implement later

> Implement QUANT Goal Coach per `docs/AI.md`: Hugging Face provider (`Qwen2.5-7B-Instruct`), `POST /api/ai/coach`, context from goals, confirm-only actions. Skip the “Skip for now” list.

---

## Related

- Reminders / push: `docs/PWA_PUSH.md`  
- Paystack: `docs/PAYSTACK.md`  
- Suggestions (rules today): `backend/src/routes/suggestionsRoute.js`  
- Simulator: frontend + backend goal simulator helpers  
