# Playto Payout Engine Challenge 2026

Minimal, correctness-first payout engine for the Playto Founding Engineer challenge.

## Tech Stack

- Backend: Django + DRF + Celery
- Database: PostgreSQL (primary), SQLite (local fallback)
- Queue: Redis
- Frontend: React + Vite + Tailwind + React Query + Zustand

## What Is Implemented

- Ledger model in paise using `BigIntegerField`
- Payout create API with idempotency (`Idempotency-Key` header)
- Concurrency-safe fund holding using DB row locks
- Payout state machine (`pending -> processing -> completed/failed`)
- Background payout processor with 70/20/10 simulation and retry logic
- Dashboard, ledger, payout form, payout history with polling every 5s
- Lightweight JWT auth for merchant-scoped API access
- Merchant switcher in UI powered by token issuance, not query-param scoping
- Theme modes: light, dark, and system with persistent preference
- Tests for idempotency and concurrent overdraw protection
- GitHub Actions CI job that runs payout tests against Postgres
- Seed command for merchants, bank accounts, and credit history

## Project Structure

- `backend/`: Django project
- `src/`: React frontend

## Local Setup

### 1. Start infra (Postgres + Redis)

```bash
docker compose up -d
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_payout_data
python manage.py runserver 8000
```

Run worker in another terminal:

```bash
cd backend
celery -A config worker -l info
```

Optional periodic trigger terminal:

```bash
cd backend
python manage.py shell -c "from payouts.tasks import process_pending_payouts_task; process_pending_payouts_task.delay()"
```

Backend auth environment variables:

- `JWT_SECRET_KEY`: secret used to sign merchant access tokens
- `JWT_ACCESS_TTL_SECONDS`: token TTL in seconds (default `3600`)

### 3. Frontend setup

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies `/api/*` to Django at `http://localhost:8000`.

### Vercel frontend deployment

This repo is ready to deploy as the React frontend on Vercel.

1. Set the Vercel project to use the Vite build output `dist`.
2. Add `VITE_API_BASE_URL` in Vercel to your deployed backend origin, for example `https://your-backend.example.com`.
3. Keep the backend deployed separately and set `CORS_ALLOWED_ORIGINS` on backend, for example `https://your-app.vercel.app`.
4. Refreshes on `/dashboard`, `/ledger`, and `/payouts` are handled by the SPA fallback config.

## Tests

```bash
cd backend
set "USE_SQLITE=True" && python manage.py test payouts
```

Notes:
- Idempotency test runs on all DBs.
- Concurrency test is skipped on SQLite because row-level lock semantics differ from Postgres.
- CI enforces the same payout test suite on Postgres in `.github/workflows/backend-postgres-ci.yml`.

Run tests locally against Postgres:

```bash
cd backend
python manage.py test payouts
```

## API Endpoints

- `GET /api/v1/merchant/dashboard`
- `GET /api/v1/merchants`
- `POST /api/v1/auth/token`
- `GET /api/v1/bank-accounts`
- `GET /api/v1/ledger`
- `GET /api/v1/payouts`
- `POST /api/v1/payouts` with `Authorization: Bearer <access-token>` and `Idempotency-Key: <uuid>`

Example token request:

```bash
curl -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"merchant_id": 1}'
```

Example payout request:

```bash
curl -X POST http://localhost:8000/api/v1/payouts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -H "Idempotency-Key: 4f3dc8c7-bf5c-43f8-8896-7f2ee5bd3a63" \
  -d '{"amount_paise": 6000, "bank_account_id": 1}'
```

## Explainer

See `EXPLAINER.md` for the exact ledger query, lock code, idempotency behavior, state machine guard, and AI audit.
