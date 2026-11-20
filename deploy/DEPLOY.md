# Deploying on the devserver

The game is one small Node process (`server/index.mjs`) that serves the built
PWA from `dist/` and the API under `/api/`. Caddy sits in front for HTTPS.
Data (playtest logs, push subscriptions, scheduled notifications, the VAPID
keys) lives in `/var/lib/wormwood` as plain JSON/NDJSON files.

## First time (as root)

```bash
/usr/sbin/useradd --system --home /var/lib/wormwood --shell /usr/sbin/nologin wormwood
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

## The admin key

Writing to the testers and listing their e-mail addresses (dev menu, "Testarna")
needs the admin key. It is `ADMIN_KEY` in `/etc/wormwood/env` if set; otherwise the
server makes one on first start and keeps it in `/var/lib/wormwood/admin-key.json`.
Jonas pastes it into the dev menu once per device. The addresses live in
`/var/lib/wormwood/contacts.json`, apart from the logs, and the server empties that
file by itself after 31 January 2027.
Keep that file: new keys make every existing push subscription invalid.

The signups from jonasolson.se/exjobb and the invitations (dev menu, "Testarna")
live in `/var/lib/wormwood/signups.json`, `invites.json` and `rounds.json`. Names and
addresses are emptied by the server after 31 January 2027; the codes and rounds stay.

## Reading the playtest log

One file per day, one JSON object per line:

```bash
tail -f /var/lib/wormwood/logs/$(date -u +%F).ndjson      # the playtest site (the study's data)
tail -f /var/lib/wormwood/logs/dev/$(date -u +%F).ndjson  # the dev site
```

Every event line carries the site the server saw (`site`), the app version
(`v`), the player's own event number (`seq`, holes mean lost events) and the
player's place in the test (`ctx`: test day, minutes in, hook step, challenges
won). To get tables for the analysis (one row per player, one per player and
hook, and every event flat):

```bash
node /opt/wormwood/app/tools/log-report.mjs /var/lib/wormwood/logs /var/lib/wormwood/report
```


## Testarnas kontor and its mail

Jonas's page for the testers is `/kontor` on the dev site (server/kontor.html,
server/outreach.mjs). It takes the admin key. Its mails go through AgentMail:
`AGENTMAIL_API_KEY` (or `AGENTMAIL`) in `/etc/wormwood/env`, sent from
`AGENTMAIL_INBOX` (default `jonas-exjobb@agentmail.to`) with replies to
hej@jonasolson.se. Without the key nothing is sent and the page says so. Every
mail is kept in `/var/lib/wormwood/outbox.json`; the switches and Jonas's own
texts are `autos.json` and `templates.json`.
