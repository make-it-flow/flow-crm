#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/flow-crm}"
BRANCH="${STG_BRANCH:-stg}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.fullapp.yml}"
COMPOSE_SERVICES="${COMPOSE_SERVICES:-app postgres redis meilisearch}"

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

build_and_start() {
  cd "$APP_DIR"
  require_cmd docker
  # shellcheck disable=SC2086
  docker compose -f "$COMPOSE_FILE" --env-file .env up -d --build $COMPOSE_SERVICES
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
  build_and_start
  log "staging is up on :3000"
}

main "$@"
