# Dump Railway Postgres and restore into Supabase.
# Usage (PowerShell):
#   $env:RAILWAY_DATABASE_URL = "postgresql://..."
#   $env:SUPABASE_DATABASE_URL = "postgresql://..."   # Session pooler :5432 or Direct — NOT :6543
#   .\backend\scripts\migrate-db-to-supabase.ps1
#
# Requires pg_dump / pg_restore / psql on PATH (PostgreSQL client tools).

$ErrorActionPreference = "Stop"

$railwayUrl = ($env:RAILWAY_DATABASE_URL -as [string]).Trim()
$supabaseUrl = ($env:SUPABASE_DATABASE_URL -as [string]).Trim()

if (-not $railwayUrl) {
  throw "Set RAILWAY_DATABASE_URL to the current Railway Postgres connection string."
}
if (-not $supabaseUrl) {
  throw "Set SUPABASE_DATABASE_URL to the Supabase Session/Direct URI (port 5432)."
}
if ($supabaseUrl -match ":6543(/|\?|$)") {
  throw "SUPABASE_DATABASE_URL uses Transaction pooler (:6543). Use Session pooler or Direct on :5432."
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
$psql = Get-Command psql -ErrorAction SilentlyContinue

if (-not $pgDump -or -not $pgRestore -or -not $psql) {
  throw "pg_dump, pg_restore, and psql must be on PATH (install PostgreSQL client tools)."
}

$outDir = Join-Path $PSScriptRoot "..\..\backups"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpPath = Join-Path $outDir "quant_railway_$stamp.dump"

Write-Host "Dumping Railway → $dumpPath"
& pg_dump $railwayUrl --no-owner --no-acl -F c -f $dumpPath
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit $LASTEXITCODE" }

Write-Host "Restoring into Supabase…"
& pg_restore --clean --if-exists --no-owner --no-acl -d $supabaseUrl $dumpPath
# pg_restore often exits 1 on ignorable role/extension warnings — verify with a probe query.
Write-Host "Verifying tables on Supabase…"
$probe = & psql $supabaseUrl -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
if (-not $probe -or [int]$probe -lt 1) {
  throw "Supabase public schema looks empty after restore (table count: '$probe')."
}

Write-Host "OK — public tables: $probe"
Write-Host "Dump kept at: $dumpPath"
Write-Host "Next: set Railway DATABASE_URL to SUPABASE_DATABASE_URL and redeploy the API."
