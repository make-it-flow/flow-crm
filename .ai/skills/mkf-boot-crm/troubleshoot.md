# Boot CRM recovery

Open this file only after a probe or start step fails. Fix the matching case, then return to [SKILL.md](SKILL.md) at the failed step.

## Node is not 24

Repo `engines.node` is `24.x`. Switch with nvm / fnm / the version in `.nvmrc`, then `node -v` starts with `v24`.

## Docker daemon down

Start Docker Desktop (or the engine). Done: `docker info` exits 0.

## Postgres never healthy

```bash
docker compose ps
docker compose logs postgres --tail 80
```

Typical causes: port 5432 already taken, volume from another project, container crash-loop. Fix the port or the conflicting process. Do not `docker compose down -v`.

Done: `mercato-postgres` is `healthy`.

## Users probe fails

`docker exec mercato-postgres psql ...` fails after healthy postgres: check `POSTGRES_USER` / `POSTGRES_DB` / `DATABASE_URL` in `apps/mercato/.env`. The query must hit the same database as `DATABASE_URL`.

Done: `to_regclass('public.users')` returns a row without a connection error.

## Port 3000 occupied, backend not answering

Another process holds the port (stale Next, leftover `yarn dev`). Ask before killing. Kill only that PID. Leave Docker volumes and containers running.

Done: `curl -sI http://localhost:3000/backend` either fails cleanly (port free) or returns 200/302 (reuse it).

## Splash up, backend stale

```bash
yarn dev:reset
```

Then restart the same branch as before (`yarn dev` or `yarn dev:greenfield`). Done: `/backend` returns 200/302.

## Greenfield died mid-init

Read the greenfield / initialize log. Missing `DATABASE_URL` or `JWT_SECRET` is an env gap, not a wipe. After a failed `--reinstall` the database may already be empty: re-probe `users`, then Fresh if the table is gone or count is 0.
