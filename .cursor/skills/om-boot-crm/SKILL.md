---
name: om-boot-crm
description: >-
  Boots the local Open Mercato CRM after probing whether it is already seeded.
  Starts docker compose plus yarn dev when users exist; runs yarn dev:greenfield
  only on an empty database or after confirmed wipe. Use when the user asks to
  odpal CRM, uruchom CRM, odpal Open Mercato, start the CRM, fresh install,
  greenfield, setup from scratch, or zainstaluj CRM.
---

# Boot Open Mercato CRM

Work in the Open Mercato repo root (directory that has `docker-compose.yml` and `apps/mercato`). In the Flow checkout that is `open-mercato-flow`.

Probe first. Pick one branch. Greenfield drops every table in `DATABASE_URL` and flushes Redis (`initialize --reinstall`).

Recovery for failed probes or a stuck runtime: [troubleshoot.md](troubleshoot.md).

## Guardrails

- Root `docker compose up -d` only (postgres, redis, meilisearch, verdaccio, opencode).
- One app process on port 3000.
- Existing `apps/mercato/.env` stays as-is. Copy from `.env.example` only when the file is missing.
- Official scripts only: `yarn install`, `yarn dev`, `yarn dev:greenfield`, `yarn dev:reset`.

Stop instead of: `yarn db:greenfield`, `docker compose down -v`, `docker-compose.fullapp*.yml`, a second `yarn dev` on a live :3000, greenfield when `users > 0` without an explicit yes.

## 1. Probe

Run in order. Each step has a done check. All probes are read-only except starting unhealthy Docker deps.

### 1.1 Runtime already up

```bash
curl -sI -o /dev/null -w '%{http_code}' http://localhost:3000/backend
```

Done: status is `200` or `302`. Report http://localhost:3000/backend and http://localhost:4000. Stop. Do not start another process.

If curl fails, continue.

### 1.2 Tools

```bash
node -v
yarn -v
docker info >/dev/null
```

Done: Node 24.x (`engines` in root `package.json`), Yarn 4.x, Docker daemon answers. Otherwise stop and name the missing tool.

### 1.3 Docker deps

```bash
docker compose ps
```

Done: `mercato-postgres` is `healthy`. If not:

```bash
docker compose up -d
```

Wait until postgres is healthy. If it never becomes healthy, stop and open [troubleshoot.md](troubleshoot.md).

### 1.4 Env

If `apps/mercato/.env` is missing: `cp apps/mercato/.env.example apps/mercato/.env`, then uncomment local Docker Redis (example leaves it commented):

```
REDIS_URL=redis://localhost:6379
```

Do not overwrite an existing `.env`. Do not invent API keys, Meili, or new `JWT_SECRET` for local boot. Example already has working local defaults: `DATABASE_URL`, `POSTGRES_*`, `JWT_SECRET`, `AUTH_SECRET`, `APP_URL`.

Done: file exists and has `DATABASE_URL` plus an uncommented `REDIS_URL` or `EVENTS_REDIS_URL`.

### 1.5 Seeded database

Use `POSTGRES_USER` / `POSTGRES_DB` from `.env` (defaults `postgres` / `open-mercato`):

```bash
docker exec mercato-postgres psql -U postgres -d open-mercato -tAc "SELECT COALESCE(to_regclass('public.users')::text, '');"
```

If that returns `users`:

```bash
docker exec mercato-postgres psql -U postgres -d open-mercato -tAc "SELECT COUNT(*) FROM users;"
```

Done: you have either `users_count` (integer) or `no_users_table`. If psql fails after healthy postgres, stop and open [troubleshoot.md](troubleshoot.md).

### 1.6 Workspace

Done: `node_modules` exists at repo root. If not: `yarn install`, then `node_modules` exists.

## 2. Decide

User said fresh / greenfield / od zera / wipe **and** `users_count > 0`: ask. Yes → Fresh. No → Start.

Otherwise:

- `users_count > 0` → Start
- `no_users_table` or `users_count = 0` → Fresh
- Port 3000 is occupied and step 1.1 did not pass → do not start a second app. Ask whether to stop that process only (not Docker).

Tell the user which branch you picked and why (`users_count` or empty DB) before you start a long command.

## 3. Start (already seeded)

```bash
docker compose up -d   # only if postgres is not healthy
yarn dev               # background; not --greenfield
```

Done: `http://localhost:3000/backend` or `http://localhost:4000` returns 200/302.

## 4. Fresh (empty DB or confirmed wipe)

```bash
yarn dev:greenfield    # background; drops tables, flushes Redis, seeds, then watches
```

Done: same URLs as Start. Read the init log for the login. Demo default when env does not override: `superadmin@acme.com` / `secret`.

Research profile after boot: `/backend/research/companies/:id`.
