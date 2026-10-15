# Deploying Unseen BD

One Ubuntu EC2 instance (arm64 / Graviton), nginx in front, the app run by pm2, TLS from Let's
Encrypt. This is the same setup as the owner's other sites. Nothing here has been run for you.
Read it through once, then follow it in order.

```
Internet ─▶ nginx :443 (TLS, gzip/brotli, static files, caching, rate limit)
              └─▶ 127.0.0.1:3000  node server.mjs (pm2, one process)
                                     ├─ SQLite   /srv/unseenbd/shared/db/unseenbd.sqlite
                                     └─ uploads  /srv/unseenbd/shared/media/
```

## 1. Instance

- **Size:** a t4g.small (2 vCPU, 2 GB) is plenty to serve the site. `next build` wants about
  2 GB, so add swap (below) or build on a bigger machine.
- **OS:** Ubuntu 24.04 LTS, arm64.
- **Disk:** gp3, 20 GB or more. Uploads and backups grow over time.
- **Security group:** 22 from your own IP only, 80 and 443 from anywhere. Do not open 3000.
- **Elastic IP:** attach one, then point the `A` records of `unseenbd.com` and `www.unseenbd.com`
  at it.

```sh
sudo apt update && sudo apt -y upgrade
sudo apt -y install git build-essential python3 sqlite3 nginx \
  libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static certbot python3-certbot-nginx

# Node 22 (the app needs >= 22; see web/.nvmrc) and pm2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs
sudo npm install -g pm2

# 2 GB swap for `next build`
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile
sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Firewall (the security group is the main one; this is a second layer)
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw --force enable
```

`better-sqlite3`, `@node-rs/argon2` and `sharp` ship prebuilt linux-arm64 binaries. The build
tools above are only a fallback if a prebuilt binary is missing.

## 2. Folders and user

The app runs as its own user. Each deploy goes into a new release folder, and a `current`
symlink points at the live one, so a deploy never rewrites files under a running server and a
rollback only moves the symlink.

```sh
sudo adduser --system --group --home /srv/unseenbd unseenbd
sudo -u unseenbd mkdir -p /srv/unseenbd/{releases,shared/db,shared/media,shared/photos,backups}
sudo chmod 750 /srv/unseenbd/shared
```

| Path                                         | What                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `/srv/unseenbd/releases/<git sha>/`          | A full checkout (the app needs `data/` and `assets/` from the repo root) |
| `/srv/unseenbd/current` → `releases/<sha>`   | The live release                                                         |
| `/srv/unseenbd/shared/.env.production.local` | Secrets and paths (linked into every release)                            |
| `/srv/unseenbd/shared/db/unseenbd.sqlite`    | The database (plus `-wal` / `-shm` files)                                |
| `/srv/unseenbd/shared/media/`                | Uploaded photos (`MEDIA_DIR`)                                            |
| `/srv/unseenbd/shared/photos/`               | Commons place photos (`PHOTOS_DIR`)                                      |
| `/srv/unseenbd/backups/`                     | Nightly backups                                                          |

## 3. Environment variables

Every variable is described in [`.env.example`](.env.example). Create the production file once:

```sh
sudo -u unseenbd tee /srv/unseenbd/shared/.env.production.local >/dev/null <<'EOF'
SITE_URL=https://unseenbd.com
SESSION_SECRET=<paste: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
IP_HASH_SALT=<another random string>
GOOGLE_CLIENT_ID=<optional: Google OAuth web client id>
NEXT_PUBLIC_FACEBOOK_URL=https://www.facebook.com/<page>
DATABASE_PATH=/srv/unseenbd/shared/db/unseenbd.sqlite
MEDIA_DIR=/srv/unseenbd/shared/media
PHOTOS_DIR=/srv/unseenbd/shared/photos
EOF
sudo chmod 600 /srv/unseenbd/shared/.env.production.local
```

Keep a copy of `SESSION_SECRET` in your password manager. If it changes, everyone is signed out
and device ids and IP hashes reset.

`PORT`, `LISTEN_HOST=127.0.0.1`, `LOG_LEVEL` and `SHUTDOWN_TIMEOUT_MS` are set in
[`ecosystem.config.cjs`](ecosystem.config.cjs). `SITE_URL` and `NEXT_PUBLIC_*` are read at **build**
time, so a change to them needs a new build.

## 4. Build and first deploy

Save this as `/srv/unseenbd/deploy.sh` (owned by `unseenbd`, `chmod 750`). It is used for every
deploy, the first one included.

```sh
#!/usr/bin/env bash
# Usage: deploy.sh [git ref]   (default: origin/main)
set -euo pipefail
REPO=https://github.com/<owner>/unseenbd.git
BASE=/srv/unseenbd
REF=${1:-main}

SHA=$(git ls-remote "$REPO" "refs/heads/$REF" | head -1 | cut -c1-12)
DIR=$BASE/releases/$SHA
[ -d "$DIR" ] || git clone --depth 1 --branch "$REF" "$REPO" "$DIR"
cd "$DIR/web"
ln -sf $BASE/shared/.env.production.local .env.production.local

npm ci                      # exact versions from package-lock.json
npm run db:migrate          # apply new migrations to the shared database
npm run db:seed             # reload the content tables from ../data (never touches user data)
npm run build               # prebuild syncs ../assets into public/ and seeds again (idempotent)

ln -sfn "$DIR" $BASE/current
cd $BASE/current/web
APP_DIR=$BASE/current/web pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

sleep 3
curl -fsS http://127.0.0.1:3000/api/health && echo " ← $SHA is live"

# keep the five newest releases
ls -1dt $BASE/releases/*/ | tail -n +6 | xargs -r rm -rf
```

On the **first** deploy, also:

```sh
sudo -u unseenbd -H bash /srv/unseenbd/deploy.sh

# the first admin (asks for the password; nothing is stored in a file)
cd /srv/unseenbd/current/web && sudo -u unseenbd -H npm run admin:create -- --email you@example.com --name "Your Name"

# optional: real place photos from Wikimedia Commons (needs network; takes a while; resumable)
sudo -u unseenbd -H npm run photos

# start pm2 at boot as the unseenbd user, and rotate its logs
sudo env PATH=$PATH pm2 startup systemd -u unseenbd --hp /srv/unseenbd
sudo -u unseenbd -H pm2 install pm2-logrotate
sudo -u unseenbd -H pm2 set pm2-logrotate:max_size 20M
sudo -u unseenbd -H pm2 set pm2-logrotate:retain 14
sudo -u unseenbd -H pm2 set pm2-logrotate:compress true
```

`db:migrate` then `db:seed` run on every deploy. Both are idempotent: the seed replaces only the
content tables (divisions, districts, places, routes, trains, …) in one transaction, with stable
ids. Accounts, photos, posts and listings are never touched.

**Rollback:** `ln -sfn /srv/unseenbd/releases/<older sha> /srv/unseenbd/current`, then
`APP_DIR=/srv/unseenbd/current/web pm2 startOrReload ecosystem.config.cjs --update-env`. Migrations
only ever add, so an older release runs on a newer database.

### What the server does

- `npm start` runs `server.mjs`: Next.js on `PORT`, bound to `LISTEN_HOST`. Logs are **JSON
  lines** on stdout/stderr (`pm2 logs unseenbd`, files in `~/.pm2/logs/`). Each request gets one
  line with method, path (no query string), status, milliseconds and nginx's request id. Errors
  carry their stack. IP addresses and bodies are never logged.
- **Graceful shutdown:** on `SIGTERM` (from `pm2 reload`/`stop` or a reboot) it stops accepting
  connections, finishes requests in flight for up to `SHUTDOWN_TIMEOUT_MS`, closes SQLite cleanly
  and exits. pm2's `kill_timeout` (12 s) is longer than that. `wait_ready` makes pm2 wait for the
  new process to listen.
- **Health:** `GET /api/health` → `200 {"status":"ok","version","build","uptime","db":{"ok":true,"places":257,"ms"}}`.
  It answers `503` if the database cannot be read. It is not cached and not rate limited. Point
  an uptime monitor at `https://unseenbd.com/api/health`.

## 5. nginx

`/etc/nginx/sites-available/unseenbd` (then
`sudo ln -s /etc/nginx/sites-available/unseenbd /etc/nginx/sites-enabled/` and remove `default`):

```nginx
# Rate limit before the app does: 50 requests/s per IP to the API, with bursts.
limit_req_zone $binary_remote_addr zone=ubd_api:10m rate=50r/s;
# Cache for uploaded media and Commons photos (the app sends one-year immutable headers).
proxy_cache_path /var/cache/nginx/unseenbd levels=1:2 keys_zone=ubd_media:20m max_size=2g inactive=30d use_temp_path=off;

upstream unseenbd {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name unseenbd.com www.unseenbd.com;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://unseenbd.com$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.unseenbd.com;
    # certbot fills in ssl_certificate / ssl_certificate_key
    return 301 https://unseenbd.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name unseenbd.com;
    # certbot fills in ssl_certificate / ssl_certificate_key (see §6)

    root /srv/unseenbd/current/web/public;
    client_max_body_size 60m;          # largest form: an owner listing with 10 photos
    server_tokens off;

    # The app sets CSP, HSTS, X-Frame-Options, Referrer- and Permissions-Policy itself.
    # Files served from disk below get the basics here.
    add_header X-Content-Type-Options nosniff always;

    # --- compression -------------------------------------------------------------------------
    gzip on;
    gzip_vary on;
    gzip_comp_level 5;
    gzip_min_length 512;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/javascript application/json
               application/manifest+json application/xml image/svg+xml font/ttf;
    brotli on;
    brotli_comp_level 5;
    brotli_min_length 512;
    brotli_types text/plain text/css text/xml application/javascript application/json
                 application/manifest+json application/xml image/svg+xml font/ttf;

    # --- proxy defaults ----------------------------------------------------------------------
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    # Overwrite, never append: the app's per-IP limits trust these two headers.
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Request-Id $request_id;
    proxy_read_timeout 60s;

    # --- built JS/CSS: content-hashed names, cache for a year --------------------------------
    location /_next/static/ {
        alias /srv/unseenbd/current/web/.next/static/;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Content-Type-Options nosniff always;
        access_log off;
        try_files $uri =404;
    }

    # --- copied assets in public/: place covers, icons, maps, brand, … ------------------------
    # Unhashed names, so a week in the browser plus a day of stale-while-revalidate (the same
    # header the app would send). Falls back to the app when a file is not on disk.
    location ~ ^/(places|icons|brand|illustrations|maps|stamps|badges|card-themes|social)/ {
        add_header Cache-Control "public, max-age=604800, stale-while-revalidate=86400";
        add_header X-Content-Type-Options nosniff always;
        access_log off;
        try_files $uri @app;
    }
    location ~ ^/(favicon\.ico|favicon\.svg|favicon-\d+\.png|apple-touch-icon\.png)$ {
        add_header Cache-Control "public, max-age=604800";
        access_log off;
        try_files $uri @app;
    }

    # --- uploads and Commons photos: through the app (path checks, CSP sandbox), cached here ---
    location ~ ^/(media|photos)/ {
        proxy_pass http://unseenbd;
        proxy_cache ubd_media;
        proxy_cache_valid 200 30d;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating;
        add_header X-Cache $upstream_cache_status;
        access_log off;
    }

    # --- the service worker must never be served stale -----------------------------------------
    location = /sw.js {
        proxy_pass http://unseenbd;
    }

    # --- API: rate limited (the app limits too: 3,000/min per IP, plus per-endpoint limits) ----
    location /api/ {
        limit_req zone=ubd_api burst=100 nodelay;
        limit_req_status 429;
        proxy_pass http://unseenbd;
    }
    location = /api/health {
        proxy_pass http://unseenbd;
        access_log off;
    }

    # --- pages ----------------------------------------------------------------------------------
    location / {
        proxy_pass http://unseenbd;
    }
    location @app {
        proxy_pass http://unseenbd;
    }
}
```

```sh
sudo mkdir -p /var/cache/nginx/unseenbd
sudo nginx -t && sudo systemctl reload nginx
```

nginx caches `/media` and `/photos` (immutable file names). When a photo is deleted, the app
removes the file, but nginx may serve its cached copy until `inactive` expires. If you need it
gone at once, run `sudo find /var/cache/nginx/unseenbd -type f -delete`.

## 6. TLS with Let's Encrypt

With DNS pointing at the instance and the port-80 server block live:

```sh
sudo certbot --nginx -d unseenbd.com -d www.unseenbd.com --redirect -m you@example.com --agree-tos
sudo systemctl status certbot.timer        # renews automatically twice a day
sudo certbot renew --dry-run
```

The app sends `Strict-Transport-Security: max-age=63072000; includeSubDomains`. Make sure every
subdomain of `unseenbd.com` works over HTTPS before going live. Only submit the domain to the
HSTS preload list once you are sure.

## 7. Backups

The database and `shared/media/` are everything that cannot be rebuilt. Content tables, `public/`
and `.next/` all come from the repository. Use `sqlite3 .backup`, which is safe while the app
writes. Never just `cp` a live WAL database.

`/srv/unseenbd/backup.sh`:

```sh
#!/usr/bin/env bash
set -euo pipefail
B=/srv/unseenbd/backups
STAMP=$(date -u +%Y%m%d-%H%M)
sqlite3 /srv/unseenbd/shared/db/unseenbd.sqlite ".backup '$B/unseenbd-$STAMP.sqlite'"
sqlite3 "$B/unseenbd-$STAMP.sqlite" "PRAGMA integrity_check;" | grep -qx ok
gzip "$B/unseenbd-$STAMP.sqlite"
tar -C /srv/unseenbd/shared -czf "$B/media-$STAMP.tar.gz" media
# off the instance (needs an instance role allowed to s3:PutObject on the bucket)
aws s3 cp "$B/unseenbd-$STAMP.sqlite.gz" s3://<backup-bucket>/unseenbd/db/ --only-show-errors
aws s3 sync /srv/unseenbd/shared/media s3://<backup-bucket>/unseenbd/media/ --only-show-errors
# keep 14 days locally
find "$B" -type f -mtime +14 -delete
```

```sh
sudo -u unseenbd crontab -e
# 03:15 Bangladesh time (21:15 UTC) every night
15 21 * * * /srv/unseenbd/backup.sh >> /srv/unseenbd/backups/backup.log 2>&1
```

Also turn on EBS snapshots (Data Lifecycle Manager, daily, keep 7) as a second layer. Give the S3
bucket versioning and a lifecycle rule (for example, expire after 90 days).

**Restore:** `pm2 stop unseenbd`, then `gunzip -c unseenbd-<stamp>.sqlite.gz >
/srv/unseenbd/shared/db/unseenbd.sqlite` and remove any `unseenbd.sqlite-wal` / `-shm` beside it.
Unpack `media-<stamp>.tar.gz` into `/srv/unseenbd/shared/`, then `pm2 start unseenbd` and check
`/api/health`.

## 8. Day to day

| Task            | Command                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Deploy `main`   | `sudo -u unseenbd -H /srv/unseenbd/deploy.sh`                                                        |
| Status / memory | `sudo -u unseenbd pm2 status`                                                                        |
| Logs            | `sudo -u unseenbd pm2 logs unseenbd` (JSON; pipe through `jq`)                                       |
| Only errors     | `sudo -u unseenbd pm2 logs unseenbd --err`                                                           |
| Restart         | `sudo -u unseenbd pm2 reload unseenbd`                                                               |
| Health          | `curl -s https://unseenbd.com/api/health`                                                            |
| New admin       | `cd /srv/unseenbd/current/web && sudo -u unseenbd -H npm run admin:create`                           |
| Moderation      | `https://unseenbd.com/admin` (signed in as an admin)                                                 |
| OS updates      | `sudo apt update && sudo apt -y upgrade` (reboot when the kernel changes; pm2 comes back on its own) |

Before each release, run `npm run check` and `npx playwright test` on your machine. See
[`ACCEPTANCE.md`](ACCEPTANCE.md).
