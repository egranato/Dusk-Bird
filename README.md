# DuskBird

A private media gallery for a home NUC server. Upload images and videos, tag them, browse in a filterable grid, and download individually or in bulk. Built for a small group of friends — no open registration.

**Backend stack:** NestJS · PostgreSQL · MinIO · Caddy · Docker  
**Frontend stack:** React 18 · TypeScript · Vite · Tailwind CSS · Firebase Hosting

---

## Features

- Upload images and videos (drag-and-drop or file picker, up to 2 GB per file)
- Automatic thumbnail generation for images — fast grid browsing without loading full-resolution files
- Duplicate detection via SHA-256 — re-uploading the same file is caught and skipped
- Tag-based browsing with AND / OR filter toggle
- Sort by newest or random shuffle
- Single and bulk download (ZIP)
- Bulk select — apply or remove tags across multiple items at once, or bulk delete
- Mobile-first layout — single column with full natural proportions on mobile, responsive grid on desktop
- Upload progress bar for large files
- Admin panel: user management, tag rename / merge / delete
- Tags are automatically lowercased, space-insensitive (e.g. "postmodern" matches "post modern"), and deleted when no longer used

---

## Architecture

```
duskbird.com (Firebase Hosting)     ← React frontend (deployed separately)
        │  API calls (HTTPS)
        ▼
your-nuc.tplink.com (NUC)
        │
     Caddy (:443)                   ← TLS termination + reverse proxy
        │
     NestJS API (:3000)             ← Business logic, auth, media streaming
        │            │
  PostgreSQL        MinIO           ← User/tag metadata · Raw media files + thumbnails
                     │
           NUC drive (bind mount)   ← Your physical storage drive
```

The frontend and backend are deployed independently. The frontend lives at its own domain (Firebase) and talks to the NestJS API over HTTPS. See `web/` for the frontend source.

---

## Repository layout

```
DuskBird/
├── api/          NestJS backend
├── web/          React frontend (deployed to Firebase)
├── caddy/        Custom Caddy Dockerfile (Cloudflare DNS plugin)
├── Caddyfile     Reverse proxy config (choose your TLS option inside)
├── docker-compose.yml
├── docker-compose.dev.yml        Dev overrides (hot reload, exposed ports) — pass explicitly, not auto-merged
└── local-storage/                Created automatically for local dev (gitignored)
```

---

## Prerequisites (NUC / backend)

- **Docker Engine 24+** and **Docker Compose v2** on the NUC
- **A domain** pointing to your NUC (TP-Link DDNS or similar)
- **One or more drives mounted** on the NUC (e.g. `/mnt/storage1`)

## Prerequisites (frontend)

- **Node 20+** and npm
- A **Firebase project** with Hosting enabled (`firebase.json` and `.firebaserc` are pre-configured in `web/`)
- Firebase CLI: `npm install -g firebase-tools`

---

## TLS Options

Choose **one** before deploying the backend. Edit `Caddyfile` to activate your choice.

| Option | Best for | What's needed |
|--------|----------|---------------|
| **A — HTTP-01 ACME** | Router with ports 80 + 443 forwarded | Domain resolves publicly |
| **B — Internal CA (LAN only)** | No internet exposure | Install Caddy root cert on each device |
| **C — DNS-01 via Cloudflare** | NUC behind NAT/CGNAT (recommended) | Cloudflare manages your domain; API token |

**Recommendation:** Option C works even behind CGNAT with no port forwarding. Option A is simplest if your router supports it.

---

## Backend Deployment (NUC)

### 1 — Clone and configure

```bash
git clone https://github.com/youruser/duskbird.git
cd duskbird
cp .env.example .env
```

Edit `.env` — change every password and secret. Key values:

| Variable | What to set |
|----------|-------------|
| `JWT_SECRET` | 32+ random chars — `openssl rand -hex 32` |
| `JWT_REFRESH_EXPIRES_IN` | Optional; refresh token lifetime (default `30d`) |
| `DB_PASSWORD`, `MINIO_ROOT_PASSWORD` | Strong unique passwords |
| `NUC_STORAGE_PATH` | Absolute path on the NUC host, e.g. `/mnt/storage1` |
| `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` | Your initial admin account |
| `ALLOWED_ORIGINS` | Your Firebase frontend domain, e.g. `https://duskbird.com` |
| `CLOUDFLARE_API_TOKEN` | Option C only — Zone → DNS → Edit permission |

### 2 — Choose your TLS option

**Option A (HTTP-01):**
Open `Caddyfile`, uncomment Option A, comment out Option C. Update domain names. No custom image needed.

**Option B (LAN / internal CA):**
Open `Caddyfile`, uncomment Option B, comment out Option C. Set your LAN hostnames. After first run, install the CA cert (see [After first start](#after-first-start)).

**Option C (Cloudflare DNS-01) — default:**
`Caddyfile` is pre-configured for Option C. Update the domain names. Switch Caddy to the custom image in `docker-compose.yml`:

```yaml
# Replace:
  caddy:
    image: caddy:2-alpine

# With:
  caddy:
    build:
      context: ./caddy
      dockerfile: Dockerfile
```

### 3 — Prepare the storage drive

```bash
sudo mkdir -p /mnt/storage1

# Find your drive UUID
sudo blkid /dev/sdX

# Mount permanently — add to /etc/fstab:
echo "UUID=<uuid> /mnt/storage1 ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
sudo mount -a
```

### 4 — Start the stack

```bash
docker compose up -d --build
docker compose logs -f   # watch until all services are healthy (~30s)
```

### 5 — Run migrations and seed admin

The production image only ships compiled `dist/`, not `src/` — run migrations against the compiled data source, not the `migration:run` npm script (which expects `src/` and ts-node):

```bash
docker compose exec api node_modules/.bin/typeorm migration:run -d dist/database/data-source.js
docker compose exec api npm run seed:admin
```

`seed:admin` reads `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` from `.env`. Safe to run multiple times.

### 6 — Verify

```bash
curl https://your-nuc.tplink.com/api/v1/health
# → { "status": "ok" }
```

Swagger UI: `https://your-nuc.tplink.com/api/docs`

---

## Frontend Deployment (Firebase)

### 1 — Configure the API URL

Create `web/.env.production` (gitignored):

```env
VITE_API_BASE_URL=https://your-nuc.tplink.com
```

### 2 — Build and deploy

```bash
cd web
npm install
npm run build
firebase deploy --only hosting
```

The `VITE_API_BASE_URL` is baked into the bundle at build time. Update `.env.production` and redeploy whenever your NUC's domain changes.

### 3 — Point `.firebaserc` at your project

Edit `web/.firebaserc` and replace `your-firebase-project-id` with your actual Firebase project ID.

---

## After First Start

**Option B only — install the Caddy internal CA certificate:**

```bash
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```

Install `caddy-root.crt` on every device that will access DuskBird:

- **macOS** — Double-click → Keychain Access → trust for SSL
- **Windows** — Double-click → Install Certificate → Local Machine → Trusted Root
- **Linux** — `sudo cp caddy-root.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates`
- **iOS/Android** — AirDrop / email the file → Settings → VPN & Device Management

---

## API Reference

All endpoints except `/api/v1/health` and `POST /api/v1/auth/login` require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/login` | Login; returns access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Refresh access token using refresh token |

### Users (admin only except `GET /:id`)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/users` | List all users |
| `POST` | `/api/v1/users` | Create a user |
| `GET` | `/api/v1/users/:id` | Get user by ID |
| `PATCH` | `/api/v1/users/:id` | Update user |
| `DELETE` | `/api/v1/users/:id` | Delete user |

### Media
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/media/upload` | Upload image or video (multipart/form-data) |
| `GET` | `/api/v1/media` | Browse — `?tags=slug1,slug2&mode=and\|or&sort=newest\|random&page=1&limit=50` |
| `GET` | `/api/v1/media/:id` | Get metadata |
| `GET` | `/api/v1/media/:id/download` | Stream full file (accepts `?token=<jwt>`) |
| `GET` | `/api/v1/media/:id/download?thumbnail=true` | Stream thumbnail (800px JPEG, cached immutably) |
| `POST` | `/api/v1/media/bulk-download` | ZIP download — body: `{ "tags": ["slug1"] }` |
| `DELETE` | `/api/v1/media/:id` | Delete (owner or admin) |
| `POST` | `/api/v1/media/:id/tags` | Add tags — body: `{ "tagNames": ["beach"] }` |
| `DELETE` | `/api/v1/media/:id/tags/:tagId` | Remove a tag from an item |

### Tags
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/tags` | List all tags with usage count |
| `POST` | `/api/v1/tags` | Create a tag |
| `PATCH` | `/api/v1/tags/:id` | Rename (admin) |
| `POST` | `/api/v1/tags/merge` | Merge — body: `{ "sourceId": "...", "targetId": "..." }` (admin) |
| `DELETE` | `/api/v1/tags/:id` | Delete (admin) |

---

## Updating

```bash
git pull
docker compose up -d --build
docker compose exec api node_modules/.bin/typeorm migration:run -d dist/database/data-source.js
```

Frontend:

```bash
cd web
npm run build
firebase deploy --only hosting
```

---

## Backup

**Database:**
```bash
docker compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql
```

**Media files** (originals and thumbnails) live at `$NUC_STORAGE_PATH` on the NUC host:
```bash
rsync -av --progress /mnt/storage1/ user@backup-server:/backups/duskbird/
```

---

## Troubleshooting

**API won't start:**
```bash
docker compose logs api
```

**Caddy certificate issues:**
```bash
docker compose logs caddy
```
For Options A and C, ensure your domain resolves to the NUC's IP before Caddy starts.

**Images not loading on the frontend:**
The download endpoint accepts `?token=<jwt>` for cross-origin image tags. Ensure `ALLOWED_ORIGINS` in `.env` includes your Firebase domain exactly (no trailing slash).

**Thumbnails not generating:**
Sharp supports JPEG, PNG, WebP, and GIF. HEIC/HEIF from iPhones may not generate a thumbnail on Alpine Linux — the original file is used as fallback and browsing still works, just without a smaller preview.

**MinIO errors:**
```bash
docker compose logs minio
```
Verify `NUC_STORAGE_PATH` exists and is writable by the Docker user:
```bash
ls -la $NUC_STORAGE_PATH
```

**Reset everything** (destructive — drops DB data and named volumes; media files on the drive are safe):
```bash
docker compose down -v
```

---

## Local Development

See [LOCAL_DEV.md](LOCAL_DEV.md) for the full local setup guide.
