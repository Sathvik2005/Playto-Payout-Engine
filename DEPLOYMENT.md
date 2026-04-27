# Deployment Guide - Playto Payout Engine

This guide covers deploying the Playto Payout Engine to production.

## Backend Deployment (Railway, Render, or Fly.io)

### Prerequisites
- PostgreSQL database (managed service recommended)
- Redis instance (managed service recommended)
- Environment variables configured

### Step 1: Set Up Database and Redis

1. Create a PostgreSQL database (e.g., on Railway or Render)
2. Create a Redis instance (e.g., on Railway or Render)
3. Note the connection URLs for both

### Step 2: Deploy Backend

#### Option A: Railway

```bash
npm install -g @railway/cli
railway init
railway add postgresql
railway add redis
railway up
```

Then set environment variables in Railway dashboard:

```env
DJANGO_SECRET_KEY=<generate-a-secure-random-key>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=*.railway.app,your-domain.com
DB_ENGINE=django.db.backends.postgresql
DB_NAME=playto_payouts
DB_USER=<from-railway>
DB_PASSWORD=<from-railway>
DB_HOST=<from-railway>
DB_PORT=5432
CELERY_BROKER_URL=redis://default:<password>@<host>:<port>/0
CELERY_RESULT_BACKEND=redis://default:<password>@<host>:<port>/1
CELERY_TASK_ALWAYS_EAGER=False
CORS_ALLOWED_ORIGINS=https://<your-frontend-url>
JWT_SECRET_KEY=<generate-a-secure-random-key>
JWT_ACCESS_TTL_SECONDS=3600
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
```

Then run migrations:

```bash
railway run python manage.py migrate
railway run python manage.py seed_payout_data
```

#### Option B: Render

1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Select Python environment
4. Set build command: `pip install -r backend/requirements.txt && python backend/manage.py migrate`
5. Set start command: `gunicorn config.wsgi:application --bind 0.0.0.0:10000 --workers 4`
6. Add PostgreSQL and Redis services via Render dashboard
7. Configure environment variables (as listed above)

#### Option C: Fly.io

```bash
flyctl launch --name playto-payout-backend
# Follow prompts to create Postgres and Redis databases
# Configure environment variables
flyctl secrets set DJANGO_SECRET_KEY=<key> DJANGO_DEBUG=False ...
flyctl deploy
```

### Step 3: Run Celery Worker

Create a separate deployment/service for Celery worker:

**For Railway:**
```
Python service with start command:
celery -A config worker -l info
```

**For Render:**
Create a "Background Worker" with:
```
Start command: celery -A config worker -l info
```

**For Fly.io:**
```
Add to fly.toml:
[processes]
web = "gunicorn config.wsgi:application --bind 0.0.0.0:${PORT} --workers 4"
worker = "celery -A config worker -l info"
```

### Step 4: Verify Backend

Once deployed:

```bash
curl https://<backend-url>/
# Should return: {"status": "ok", "service": "playto-payout-engine"}

curl https://<backend-url>/api/v1/merchants
# Should return: list of merchants (or 401 if no auth token - expected)
```

## Frontend Deployment (Vercel)

### Step 1: Connect to Vercel

```bash
npm install -g vercel
vercel
```

Follow prompts to connect your GitHub repo.

### Step 2: Configure Environment

In Vercel dashboard, add environment variable:

```env
VITE_API_BASE_URL=https://<backend-url>
```

### Step 3: Verify Build

Vercel will automatically build on each push. Verify in Deployment logs that build succeeded.

### Step 4: Test Deployment

Navigate to your Vercel deployment URL:
- `/dashboard` - Should show merchant dashboard
- `/ledger` - Should show ledger entries
- `/payouts` - Should show payout history

## Health Checks and Monitoring

### Backend Health
```bash
curl https://<backend-url>/
```

### Database Migrations
Ensure migrations are applied:
```bash
python manage.py migrate
```

### Seed Data
To seed initial merchants:
```bash
python manage.py seed_payout_data
```

## Security Checklist

- [ ] `DJANGO_SECRET_KEY` is set to a strong random value
- [ ] `DJANGO_DEBUG=False` in production
- [ ] `SECURE_SSL_REDIRECT=True` when using HTTPS
- [ ] `SESSION_COOKIE_SECURE=True`
- [ ] `CSRF_COOKIE_SECURE=True`
- [ ] `SECURE_HSTS_SECONDS` set to a high value (e.g., 31536000 for 1 year)
- [ ] `ALLOWED_HOSTS` includes only your domain(s)
- [ ] `CORS_ALLOWED_ORIGINS` includes only your frontend domain
- [ ] Database backups are configured
- [ ] Redis persistence is enabled

## Troubleshooting

### "Connection refused" errors
- Ensure PostgreSQL and Redis are running and accessible
- Check `DB_HOST`, `DB_PORT`, `CELERY_BROKER_URL` are correct

### "Merchant not found" errors
- Run `python manage.py seed_payout_data` to create test merchants

### Migrations fail
- Verify database credentials
- Ensure database exists and is accessible
- Check for migration conflicts: `python manage.py showmigrations`

### Frontend shows API errors
- Verify `VITE_API_BASE_URL` is set correctly
- Ensure backend `CORS_ALLOWED_ORIGINS` includes frontend URL
- Check browser console for specific errors

## Production Maintenance

### Regular Tasks
- Monitor Celery worker health
- Review payout processor logs for failures
- Monitor database performance and backups
- Review JWT token usage and expiry

### Scaling
- Increase Celery worker instances for higher payout volume
- Use read replicas for database if needed
- Cache merchant list responses if high traffic

## Rolling Back

If a deployment has issues:

1. **Vercel**: Use dashboard to revert to previous deployment
2. **Railway/Render/Fly.io**: Use their rollback features or redeploy previous commit

## Support

For deployment issues, check the logs:

```bash
# Railway
railway logs

# Render
# View in Render dashboard

# Fly.io
fly logs

# Vercel
# View in Vercel dashboard
```
