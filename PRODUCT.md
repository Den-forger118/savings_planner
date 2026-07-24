# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individuals planning personal savings — people who want to set concrete goals, track deposits and progress, and understand how spending affects what they can save. Primary job: turn income and intent into clear goals with visible progress.

Secondary audiences (admin operators reviewing platform activity; household/shared use) are not confirmed as primary design targets.

## Product Purpose

QUANT is a savings planner that helps people create savings goals, record deposits and withdrawals, log expenses by category, and see how monthly budget and allocation support those goals.

Success means a member can answer: what am I saving for, how far along am I, what did I spend, and (when applicable) how should this month’s budget be allocated across goals.

## Positioning

Quiet, premium, goal-led savings — a private ledger feel rather than loud consumer fintech. The product differentiates through goal progress plus an earner / non-earner model (including automatic budget allocation for earners), not through generic expense charts alone.

## Operating Context

Members use QUANT in a browser on desktop and mobile as first-class contexts. Typical rituals: register and complete multi-chapter onboarding, set income/budget stance, create goals, log expenses, review dashboard trends and activity, adjust settings. Admins use a separate operations overview (users, platform stats).

Local development commonly runs via Docker Compose (frontend ~8080, API ~5001) or CRA + Express against PostgreSQL.

## Capabilities and Constraints

Confirmed capabilities:
- Authentication (register / login) and JWT sessions
- Multi-chapter onboarding before the main app
- Earner and non-earner modes with monthly budget / income and goal allocation behavior
- Savings goals (create, track, progress)
- Expense logging and category breakdowns
- Activity / transactions
- Admin panel (users, platform overview)
- Brand name QUANT

Platform scope: web and mobile. Today the shipped surface is a responsive web app that must work well on phones; whether native iOS/Android apps are required (vs mobile web) remains an open product decision.

Technical stack (factual): React (CRA) frontend, Express API, PostgreSQL, Docker Compose for local full stack; production historically targets Vercel (frontend) and Railway (API/DB).

Terminology to preserve: QUANT, goals, expenses, earner / non-earner, allocation, onboarding chapters, admin / operations.

## Brand Commitments

- Product name: **QUANT** (binding)
- Voice: calm, premium, discreet — ledger/folio tone over hype fintech
- Visual identity already in product (navy / gold / cream, serif + sans + mono money figures) is **binding** for refinement work; do not reinvent the brand without an explicit redesign request

## Evidence on Hand

- Working app UI under `frontend/src` (auth, onboarding, dashboard, expenses, goals, settings, admin)
- Feature guide copy describing how QUANT is used (`frontend/src/components/FeatureGuide.jsx`)
- Brand/illustration assets under `frontend/public/illustrations/`
- No third-party testimonials, press, or customer case studies on hand — do not fabricate social proof

## Product Principles

1. Goal clarity first — every primary surface should make progress toward savings objectives legible.
2. Quiet trust — feel private and composed; avoid loud fintech tropes and clutter.
3. Mode honesty — earner vs non-earner behavior and allocation must stay understandable and consistent.
4. Mobile is not optional — layouts and interactions must hold on phone as well as desktop.
5. Preserve QUANT’s identity — name, voice, and established navy/gold/cream world unless the user asks to replace them.

## Accessibility & Inclusion

No product-specific accessibility standard was confirmed beyond general web best practice. Treat clear contrast, readable money figures, and usable touch targets on mobile as baseline expectations until a formal standard is set.
