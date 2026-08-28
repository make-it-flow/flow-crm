#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/flow-crm}"
BRANCH="${STG_BRANCH:-stg}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.fullapp.yml}"
# Traefik terminates TLS. The app issues Secure session cookies whenever
# NODE_ENV=production, so plain HTTP leaves every login stuck at "session
# expired" — the browser drops the cookie before the redirect lands.
TRAEFIK_COMPOSE_FILE="${TRAEFIK_COMPOSE_FILE:-docker-compose.fullapp.traefik.yml}"
TRAEFIK_STG_COMPOSE_FILE="${TRAEFIK_STG_COMPOSE_FILE:-docker-compose.fullapp.traefik.stg.yml}"
TRAEFIK_CONFIG_DIR="${TRAEFIK_CONFIG_DIR:-/etc/mercato/traefik}"
COMPOSE_SERVICES="${COMPOSE_SERVICES:-app postgres redis meilisearch traefik}"

log() {
  printf '[stg-deploy] %s\n' "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[stg-deploy] missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return 0
  fi
  log "installing Docker"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
}

install_doppler() {
  if command -v doppler >/dev/null 2>&1; then
    return 0
  fi
  log "installing Doppler CLI"
  curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh
}

ensure_swap() {
  if swapon --show | grep -q .; then
    return 0
  fi
  log "creating 8G swap"
  fallocate -l 8G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
}

ensure_repo() {
  mkdir -p "$(dirname "$APP_DIR")"
  if [ ! -d "$APP_DIR/.git" ]; then
    log "cloning make-it-flow/flow-crm"
    GIT_SSH_COMMAND='ssh -i /root/.ssh/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new' \
      git clone git@github.com:make-it-flow/flow-crm.git "$APP_DIR"
  fi
  cd "$APP_DIR"
  git remote set-url origin git@github.com:make-it-flow/flow-crm.git
  GIT_SSH_COMMAND='ssh -i /root/.ssh/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new' \
    git fetch --prune origin
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
}

sync_env_from_doppler() {
  require_cmd doppler
  if [ -z "${DOPPLER_TOKEN:-}" ]; then
    printf '[stg-deploy] DOPPLER_TOKEN is not set\n' >&2
    exit 1
  fi
  umask 077
  log "downloading Doppler secrets into ${APP_DIR}/.env"
  doppler secrets download --no-file --format docker > "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
}

env_value() {
  grep -m1 -E "^$1=" "${APP_DIR}/.env" | cut -d= -f2-
}

# Traefik's static and dynamic config files take no `${...}` interpolation, so
# both are rendered here from the Doppler-provided environment.
render_traefik_config() {
  local host acme_email
  host="$(env_value PLATFORM_PRIMARY_HOST)"
  acme_email="$(env_value ACME_EMAIL)"
  if [ -z "$host" ] || [ -z "$acme_email" ]; then
    printf '[stg-deploy] PLATFORM_PRIMARY_HOST and ACME_EMAIL must be set in Doppler\n' >&2
    exit 1
  fi
  log "rendering Traefik config for ${host}"
  mkdir -p "$TRAEFIK_CONFIG_DIR"
  cat > "${TRAEFIK_CONFIG_DIR}/traefik.yml" <<EOF
global:
  checkNewVersion: false
  sendAnonymousUsage: false

log:
  level: INFO

accessLog: {}

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: ${acme_email}
      storage: /letsencrypt/acme.json
      tlsChallenge: {}

providers:
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true
EOF
  # Only the platform host is routed. Staging serves no custom customer
  # domains, and a catch-all router would ask Let's Encrypt for a certificate
  # on every hostname a scanner sends at the droplet.
  cat > "${TRAEFIK_CONFIG_DIR}/dynamic.yml" <<EOF
http:
  routers:
    platform:
      rule: "Host(\`${host}\`)"
      priority: 100
      entryPoints:
        - websecure
      service: app-upstream
      tls:
        certResolver: letsencrypt
  services:
    app-upstream:
      loadBalancer:
        servers:
          - url: "http://app:${CONTAINER_PORT:-3000}"
        passHostHeader: true
EOF
}

build_and_start() {
  cd "$APP_DIR"
  require_cmd docker
  # shellcheck disable=SC2086
  docker compose -f "$COMPOSE_FILE" -f "$TRAEFIK_COMPOSE_FILE" -f "$TRAEFIK_STG_COMPOSE_FILE" \
    --env-file .env up -d --build $COMPOSE_SERVICES
}

main() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq git ca-certificates curl gnupg
  install_docker
  install_doppler
  ensure_swap
  ensure_repo
  sync_env_from_doppler
  render_traefik_config
  build_and_start
  log "staging is up on https://${PLATFORM_PRIMARY_HOST:-138-68-111-199.sslip.io}"
}

main "$@"
