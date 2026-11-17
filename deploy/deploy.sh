#!/usr/bin/env bash
# Builds and (re)starts My Dear Wormwood on the devserver from origin/main
# (or the ref given as $1). Run as root. First-time setup: see deploy/DEPLOY.md.
set -euo pipefail
REF="${1:-origin/main}"
# DEV_MENU=false deploy/deploy.sh  -> build for playtesters, without the dev menu
export VITE_DEV_MENU="${DEV_MENU:-true}"
APP=/opt/wormwood/app
cd "$APP"
git fetch --quiet origin
git checkout --quiet --detach "$REF"
npm ci --no-audit --no-fund
npm run verify
chown -R wormwood:wormwood "$APP/dist"
systemctl restart wormwood
sleep 1
curl -fsS http://127.0.0.1:8787/api/health && echo
echo "Deployed $(git rev-parse --short HEAD)"
