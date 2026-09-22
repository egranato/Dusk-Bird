<#
.SYNOPSIS
    One entry point for every DuskBird ops command — local dev and NUC production.

.DESCRIPTION
    Wraps the commands documented in LOCAL_DEV.md (dev-*) and README.md (prod-*) so you
    never have to remember the exact docker compose incantation. Run it from anywhere —
    it always operates from the repo root (wherever this script lives).

    dev-*  commands are for your local Windows dev machine (adds docker-compose.dev.yml).
    prod-* commands are meant to be run ON the NUC itself (e.g. over the SSH session set
           up in nuc-ssh-setup.md) — they operate on docker-compose.yml only.

.EXAMPLE
    .\duskbird.ps1 dev-up
    .\duskbird.ps1 dev-logs -Service api
    .\duskbird.ps1 prod-restart      # picks up .env changes — a plain `docker compose restart` won't
    .\duskbird.ps1 prod-update

.EXAMPLE
    .\duskbird.ps1 help
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet(
        'help',
        'dev-setup', 'dev-up', 'dev-down', 'dev-restart', 'dev-logs',
        'dev-migrate', 'dev-migrate-revert', 'dev-seed',
        'dev-reset-db', 'dev-reset-files', 'dev-reset-all', 'dev-web',
        'prod-deploy', 'prod-update', 'prod-restart', 'prod-logs',
        'prod-migrate', 'prod-migrate-revert', 'prod-seed', 'prod-backup', 'prod-reset'
    )]
    [string]$Command = 'help',

    # Service name for *-logs / *-restart (default: api for restart, all services for logs)
    [string]$Service,

    # Skip confirmation prompts on destructive commands (dev-reset-all, prod-reset)
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Local dev always needs both compose files — docker-compose.dev.yml is intentionally
# not auto-merged, so a bare `docker compose` on the NUC can never pick it up by accident.
$devCompose = @('-f', 'docker-compose.yml', '-f', 'docker-compose.dev.yml')

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Confirm-Destructive($msg) {
    if ($Force) { return $true }
    $answer = Read-Host "$msg Type 'yes' to continue"
    return $answer -eq 'yes'
}

switch ($Command) {

    # ── Local dev ────────────────────────────────────────────────────────────────
    'dev-setup' {
        Step 'First-time local setup (see LOCAL_DEV.md for the full guide)'
        if (-not (Test-Path .env)) {
            Copy-Item .env.example .env
            Write-Host 'Created .env — open it and set the local-dev values from LOCAL_DEV.md step 2 before running dev-up.' -ForegroundColor Yellow
        } else {
            Write-Host '.env already exists — leaving it alone.'
        }
        if (-not (Test-Path web/node_modules)) {
            Step 'Installing frontend dependencies'
            Push-Location web; npm install; Pop-Location
        }
        if (-not (Test-Path web/.env.local)) {
            'VITE_API_BASE_URL=http://localhost:3000' | Out-File web/.env.local -Encoding utf8NoBOM
            Write-Host 'Created web/.env.local'
        }
        Write-Host "Next: .\duskbird.ps1 dev-up, then .\duskbird.ps1 dev-migrate and dev-seed." -ForegroundColor Green
    }

    'dev-up' {
        Step 'Starting local dev stack (build + up)'
        docker compose @devCompose up -d --build
        Write-Host "Watch startup with: .\duskbird.ps1 dev-logs" -ForegroundColor Green
    }

    'dev-down' {
        Step 'Stopping local dev stack'
        docker compose @devCompose down
    }

    'dev-restart' {
        $target = if ($Service) { $Service } else { 'api' }
        Step "Restarting '$target' (hot-reload occasionally misses changes on Windows + Docker Desktop)"
        docker compose @devCompose restart $target
    }

    'dev-logs' {
        Step "Following logs$(if ($Service) { " for $Service" } else { ' (all services)' })"
        if ($Service) { docker compose @devCompose logs -f $Service }
        else { docker compose @devCompose logs -f }
    }

    'dev-migrate' {
        Step 'Running migrations'
        docker compose @devCompose exec -T api npm run migration:run
    }

    'dev-migrate-revert' {
        Step 'Reverting last migration'
        docker compose @devCompose exec -T api npm run migration:revert
    }

    'dev-seed' {
        Step 'Seeding admin user'
        docker compose @devCompose exec -T api npm run seed:admin
    }

    'dev-reset-db' {
        Step 'Resetting local database only (files in local-storage/ are kept)'
        docker compose @devCompose down
        docker volume rm duskbird_postgres_data
        docker compose @devCompose up -d
        docker compose @devCompose exec -T api npm run migration:run
        docker compose @devCompose exec -T api npm run seed:admin
    }

    'dev-reset-files' {
        Step 'Clearing local-storage/ (MinIO originals + thumbnails) — database records are kept'
        if (Test-Path local-storage) { Remove-Item local-storage\* -Recurse -Force -ErrorAction SilentlyContinue }
        docker compose @devCompose restart minio
    }

    'dev-reset-all' {
        if (-not (Confirm-Destructive 'This wipes the local database AND all local-storage files.')) {
            Write-Host 'Aborted.'; break
        }
        Step 'Full local reset'
        docker compose @devCompose down -v
        if (Test-Path local-storage) { Remove-Item local-storage\* -Recurse -Force -ErrorAction SilentlyContinue }
        docker compose @devCompose up -d --build
        docker compose @devCompose exec -T api npm run migration:run
        docker compose @devCompose exec -T api npm run seed:admin
    }

    'dev-web' {
        Step 'Starting the Vite dev server (Ctrl+C to stop)'
        Push-Location web
        try { npm run dev } finally { Pop-Location }
    }

    # ── NUC production ──────────────────────────────────────────────────────────
    'prod-deploy' {
        Step 'Building and starting the production stack'
        docker compose up -d --build
        Step 'Running migrations'
        docker compose exec -T api node_modules/.bin/typeorm migration:run -d dist/database/data-source.js
        Step 'Seeding admin user (safe to re-run)'
        docker compose exec -T api npm run seed:admin
    }

    'prod-update' {
        Step 'Pulling latest code'
        git pull
        Step 'Rebuilding and restarting'
        docker compose up -d --build
        Step 'Running migrations'
        docker compose exec -T api node_modules/.bin/typeorm migration:run -d dist/database/data-source.js
    }

    'prod-restart' {
        # Plain `docker compose restart` reuses the existing containers as-is and will NOT
        # pick up .env changes — force-recreate is what actually reloads the environment.
        Step 'Force-recreating containers (picks up .env changes — a plain restart will not)'
        docker compose up -d --force-recreate
    }

    'prod-logs' {
        Step "Following logs$(if ($Service) { " for $Service" } else { ' (all services)' })"
        if ($Service) { docker compose logs -f $Service }
        else { docker compose logs -f }
    }

    'prod-migrate' {
        Step 'Running migrations'
        docker compose exec -T api node_modules/.bin/typeorm migration:run -d dist/database/data-source.js
    }

    'prod-migrate-revert' {
        Step 'Reverting last migration'
        docker compose exec -T api node_modules/.bin/typeorm migration:revert -d dist/database/data-source.js
    }

    'prod-seed' {
        Step 'Seeding admin user'
        docker compose exec -T api npm run seed:admin
    }

    'prod-backup' {
        $stamp = Get-Date -Format yyyyMMdd
        $outFile = "backup_$stamp.sql"
        Step "Dumping database to $outFile"
        docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' |
            Out-File -FilePath $outFile -Encoding utf8NoBOM
        Write-Host "Wrote $outFile" -ForegroundColor Green
    }

    'prod-reset' {
        if (-not (Confirm-Destructive 'This DELETES the database and named volumes. Media files on the drive are safe.')) {
            Write-Host 'Aborted.'; break
        }
        Step 'Stopping stack and removing volumes'
        docker compose down -v
    }

    default {
        Write-Host @"
DuskBird ops — .\duskbird.ps1 <command> [-Service <name>] [-Force]

Local dev (run from your Windows dev machine):
  dev-setup            First-time setup: copy .env, npm install, web/.env.local
  dev-up               Build + start the dev stack (hot reload)
  dev-down             Stop the dev stack
  dev-restart          Restart a service (default: api) — Windows hot-reload workaround
  dev-logs             Follow logs (-Service to scope to one)
  dev-migrate          Run pending migrations
  dev-migrate-revert   Revert the last migration
  dev-seed             Seed the admin user (safe to re-run)
  dev-reset-db         Wipe DB only, keep local-storage files
  dev-reset-files      Wipe local-storage only, keep DB
  dev-reset-all        Wipe everything (asks to confirm; -Force skips)
  dev-web              Run the Vite dev server (foreground)

NUC production (run on the NUC itself):
  prod-deploy          Build, start, migrate, seed — first-time bring-up
  prod-update          git pull, rebuild, restart, migrate
  prod-restart         Force-recreate containers — use this after editing .env
  prod-logs            Follow logs (-Service to scope to one)
  prod-migrate         Run pending migrations
  prod-migrate-revert  Revert the last migration
  prod-seed            Seed the admin user (safe to re-run)
  prod-backup          pg_dump the database to backup_<date>.sql
  prod-reset           DESTROYS the DB + named volumes (asks to confirm; -Force skips)
"@
    }
}
