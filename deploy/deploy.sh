#!/usr/bin/env bash
# Builds and (re)starts My Dear Wormwood on the devserver from origin/main
# (or the ref given as $1). Run as root. First-time setup: see deploy/DEPLOY.md.
set -euo pipefail
REF="${1:-origin/main}"
# Two builds: dist/ with the dev menu (Jonas), and dist-test/ without it for
# playtesters, served at https://spela.84.247.143.6.sslip.io/ by the same server.
export VITE_DEV_MENU=true
APP=/opt/wormwood/app
cd "$APP"
git fetch --quiet origin
git checkout --quiet --detach "$REF"
npm ci --no-audit --no-fund
npm run verify
# The expansion (worlds, week staircase, neighbours) stays out of the tester
# build until the pilot is over: TEST_EXPANSION=true deploy.sh ... turns it on.
VITE_DEV_MENU=false VITE_EXPANSION="${TEST_EXPANSION:-false}" npx vite build --outDir dist-test --emptyOutDir
chown -R wormwood:wormwood "$APP/dist" "$APP/dist-test"
systemctl restart wormwood
sleep 1
# The service needs a moment after the restart; try for up to 10 seconds.
for i in $(seq 1 20); do curl -fsS http://127.0.0.1:8787/api/health && echo && break; sleep 0.5; done
echo "Deployed $(git rev-parse --short HEAD)"
