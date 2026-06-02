# Local Development

Runs the full backend stack (NestJS, PostgreSQL, MinIO) in Docker with hot reload. Caddy is excluded — no real domain or cert needed locally. The React frontend runs as a separate Vite dev server.

---

## First-time setup

### 1 — Install frontend dependencies

```powershell
cd web; npm install; cd ..
```

> **Do not run `npm install` in `api/`.** The API runs inside Docker and manages its own dependencies there. Running it on Windows produces Windows-compiled native binaries (argon2, sharp) that won't execute inside the Linux container.

### 2 — Configure the backend environment

```powershell
Copy-Item .env.example .env
```

Open `.env` and set these values (leave everything else as-is):

```env
NUC_STORAGE_PATH=./local-storage

DB_NAME=duskbird
DB_USER=duskbird_user
DB_PASSWORD=localdev

JWT_SECRET=localdev_secret_at_least_32_characters_long

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=duskbird

ADMIN_EMAIL=admin@local.dev
ADMIN_INITIAL_PASSWORD=localadmin123
ALLOWED_ORIGINS=http://localhost:5173
```

### 3 — Configure the frontend environment

```powershell
"VITE_API_BASE_URL=http://localhost:3000" | Out-File web/.env.local -Encoding utf8
```

### 4 — Start the backend stack

```powershell
docker compose up -d --build
```

The `--build` flag installs all API dependencies (including `sharp` for thumbnail generation) inside the Linux container automatically. Watch for all services to become healthy:

```powershell
docker compose logs -f
```

### 5 — Run migrations and seed the admin user

```powershell
docker compose exec api npm run migration:run
docker compose exec api npm run seed:admin
```

### 6 — Start the frontend

```powershell
cd web
npm run dev
```

Open **http://localhost:5173** and sign in with `admin@local.dev` / `localadmin123`.

---

## Useful URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | admin@local.dev / localadmin123 |
| **API** | http://localhost:3000/api/v1 | Bearer token from login |
| **Swagger UI** | http://localhost:3000/api/docs | — |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin |
| **PostgreSQL** | localhost:5432 | duskbird_user / localdev |

---

## Day-to-day

```powershell
# Start the backend (from repo root)
docker compose up -d

# Start the frontend (in a separate terminal)
cd web; npm run dev

# Stop the backend
docker compose down

# Stream logs
docker compose logs -f api       # API only
docker compose logs -f           # all services
```

Both the API and frontend hot-reload on file save — no restarts needed during development.

```powershell
# After adding a new database migration
docker compose exec api npm run migration:run

# Revert the last migration
docker compose exec api npm run migration:revert
```

> **Hot reload note:** On Windows with Docker Desktop, the NestJS file watcher occasionally misses changes due to how volume mounts work. If a backend change doesn't appear to take effect, run `docker compose restart api` to force a reload.

---

## Reset everything

Wipes containers and named volumes (database data is lost). Media files in `local-storage/` are **not** deleted.

```powershell
docker compose down -v
docker compose up -d --build
docker compose exec api npm run migration:run
docker compose exec api npm run seed:admin
```
