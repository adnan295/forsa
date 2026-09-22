# NAYVO production website — Hostinger

Canonical branch: main. Read PROJECT_GUIDE.md and RELEASE.md.
The web store and native apps share app/ and components/.

## Existing VPS: initial 1.1.0 deployment

The user explicitly authorized deletion of old application data. The following is a one-time reset, including old accounts, orders and tickets. The admin account is recreated using ADMIN_PASSWORD from the existing .env.production.

```bash
cd /opt/forsa
git fetch origin
git switch main
git pull --ff-only origin main
bash scripts/deploy-production.sh --reset-data
```

The script builds first, checks the dedicated forsa database, stops the app, saves and checks a private PostgreSQL backup, resets public in a transaction, starts the web/API, and checks key routes. It retains a rollback image and prevents repeat resets.
It never removes .env.production, signing credentials, backups or Caddy volumes.

## Later updates

```bash
cd /opt/forsa
git pull --ff-only origin main
bash scripts/deploy-production.sh --update
```

--update preserves data and does not run schema migrations. If shared/schema.ts changes later, supply and test a separate migration first.

## After initial reset

Open https://nayvo.store/admin/login. Sign in with admin and ADMIN_PASSWORD from the server environment.
Add real products/photos/prices, draw details and payment configuration. Verify an entire order before submitting the mobile release.
The new storefront is at /; /about keeps the brand introduction; /shop redirects to /products.

## Diagnostics

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 app
```

For regular backups, run scripts/backup-postgres.sh and keep an additional copy off the VPS.
Initial-reset backups use a distinct nayvo-before- prefix and are not deleted by that script's retention rule.
Do not use docker compose down -v. Follow RELEASE.md for recovery notes.
