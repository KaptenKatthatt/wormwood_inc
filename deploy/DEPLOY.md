# Deploying on the devserver

The game is one small Node process (`server/index.mjs`) that serves the built
PWA from `dist/` and the API under `/api/`. Caddy sits in front for HTTPS.
Data (playtest logs, push subscriptions, scheduled notifications, the VAPID
keys) lives in `/var/lib/wormwood` as plain JSON/NDJSON files.

## First time (as root)

```bash
useradd --system --home /var/lib/wormwood --shell /usr/sbin/nologin wormwood
mkdir -p /opt/wormwood /var/lib/wormwood /etc/wormwood
chown wormwood:wormwood /var/lib/wormwood
git clone https://github.com/KaptenKatthatt/wormwood_inc.git /opt/wormwood/app
echo 'VAPID_CONTACT=mailto:<contact address>' > /etc/wormwood/env
cp /opt/wormwood/app/deploy/wormwood.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable wormwood
# add deploy/Caddyfile.snippet to the Caddyfile, then
systemctl reload caddy
/opt/wormwood/app/deploy/deploy.sh
```

Node 20 or newer is required.

## Every update

```bash
/opt/wormwood/app/deploy/deploy.sh            # origin/main
/opt/wormwood/app/deploy/deploy.sh origin/<branch>
```

The VAPID keys are generated on first start into `/var/lib/wormwood/vapid.json`.
Keep that file: new keys make every existing push subscription invalid.

## Reading the playtest log

One file per day, one JSON object per line:

```bash
tail -f /var/lib/wormwood/logs/$(date -u +%F).ndjson
```
