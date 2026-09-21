# Hostinger VPS production deployment

Target: Hostinger KVM 2, Ubuntu 24.04 LTS, Docker Engine and Docker Compose.

## First deployment

1. Point `forsa.today` and `www.forsa.today` A records to the VPS IPv4 address.
2. Install Docker Engine and the Compose plugin.
3. Clone this repository into `/opt/forsa`.
4. Copy `.env.production.example` to `.env.production` and replace every placeholder.
5. Build and start the stack:

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```

6. Verify `https://forsa.today/api/health` returns `{ "status": "ok" }`.

Caddy requests and renews the TLS certificate automatically after DNS points to the VPS and ports 80/443 are open.

## Database migration

Export the current Replit PostgreSQL database in custom format:

```sh
pg_dump "$REPLIT_DATABASE_URL" --no-owner --no-acl -Fc > forsa-replit.dump
```

Copy the dump to `/opt/forsa/backups/`, then restore it before switching DNS:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --clean --if-exists' \
  < backups/forsa-replit.dump
```

## Backups

Run `scripts/backup-postgres.sh` nightly from root's cron and copy backups to storage outside the VPS. Hostinger's weekly VPS backup is useful for disaster recovery but should not be the only database backup.

## Update deployment

```sh
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Check status after every deployment:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 app
```
