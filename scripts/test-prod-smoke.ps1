#!/usr/bin/env pwsh
# Smoke test contra producción usando credenciales reales (login, no registro).
# PowerShell 7+ (pwsh). Uso:
#
#   $env:BASE='https://meal-weaver.vercel.app'
#   $env:TEST_EMAIL='tu@email.com'
#   $env:TEST_PASSWORD='tu_pass'
#   pwsh ./scripts/test-prod-smoke.ps1
#
# O por parámetros directos:
#   pwsh ./scripts/test-prod-smoke.ps1 -Email tu@email.com -Password 'tu_pass'

[CmdletBinding()]
param(
  [string]$Base     = $null,
  [string]$Email    = $null,
  [string]$Password = $null
)

# Autocarga scripts/.env si existe (env vars / parámetros tienen prioridad).
$envPath = Join-Path $PSScriptRoot '.env'
if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*?)\s*$') {
      $key = $matches[1]
      $val = $matches[2].Trim().Trim("'", '"')
      if (-not [System.Environment]::GetEnvironmentVariable($key, 'Process')) {
        [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
      }
    }
  }
}

if (-not $Base)     { $Base     = if ($env:BASE)          { $env:BASE }          else { 'https://meal-weaver.vercel.app' } }
if (-not $Email)    { $Email    = $env:TEST_EMAIL }
if (-not $Password) { $Password = $env:TEST_PASSWORD }

if (-not $Email)    { throw "Falta TEST_EMAIL (en scripts/.env, env var, o -Email)" }
if (-not $Password) { throw "Falta TEST_PASSWORD (en scripts/.env, env var, o -Password)" }

$script:passed = 0
$script:failed = 0
function Pass($msg)         { Write-Host "  PASS - $msg"; $script:passed++ }
function Fail($msg, $detail){ Write-Host "  FAIL - $msg"; Write-Host "    $detail"; $script:failed++ }

function Invoke-Api {
  param(
    [Parameter(Mandatory)] [string]$Method,
    [Parameter(Mandatory)] [string]$Path,
    $Body = $null,
    [string]$Token = $null
  )
  $headers = @{ 'Content-Type' = 'application/json' }
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }

  $params = @{
    Uri                = "$Base$Path"
    Method             = $Method
    Headers            = $headers
    SkipHttpErrorCheck = $true
    ErrorAction        = 'Stop'
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Compress -Depth 8)
  }

  $resp = Invoke-WebRequest @params
  $parsed = $null
  if ($resp.Content) {
    try { $parsed = $resp.Content | ConvertFrom-Json } catch { $parsed = $null }
  }
  return [pscustomobject]@{
    Status = [int]$resp.StatusCode
    Body   = $parsed
    Raw    = $resp.Content
  }
}

Write-Host "Target: $Base"
Write-Host "User:   $Email"
Write-Host ""

Write-Host "== 1. CORS preflight =="
$resp = Invoke-WebRequest -Uri "$Base/api/auth/me" -Method OPTIONS -Headers @{
  'Origin'                         = 'http://localhost:5000'
  'Access-Control-Request-Method'  = 'GET'
  'Access-Control-Request-Headers' = 'authorization'
} -SkipHttpErrorCheck
if ([int]$resp.StatusCode -eq 204) { Pass "OPTIONS 204" }
else { Fail "OPTIONS 204" "got $([int]$resp.StatusCode) (¿proxy.ts deployado?)" }

Write-Host ""
Write-Host "== 2. Login (POST /api/auth/mobile-login) =="
$r = Invoke-Api POST '/api/auth/mobile-login' @{ email = $Email; password = $Password }
if ($r.Status -ne 200) {
  Fail "200 login" "got $($r.Status) - $($r.Raw)"
  Write-Host ""
  Write-Host "Login falló - abortando. Verificá credenciales y deploy."
  exit 1
}
Pass "200 login"
$token       = $r.Body.token
$userId      = $r.Body.user.id
$householdId = $r.Body.user.householdId
if ($token)  { Pass "token recibido" }    else { Fail "token recibido" $r.Raw }
if ($userId) { Pass "user.id recibido" }  else { Fail "user.id recibido" $r.Raw }
Write-Host "  · householdId: $(if ($householdId) { $householdId } else { '<none>' })"

Write-Host ""
Write-Host "== 3. GET /api/auth/me =="
$r = Invoke-Api GET '/api/auth/me' -Token $token
if ($r.Status -eq 200) { Pass "200 /me" } else { Fail "200 /me" "got $($r.Status) - $($r.Raw)" }
$meId = $r.Body.user.id
if ($meId -eq $userId) { Pass "user.id matches login" }
else { Fail "user.id matches login" "$meId vs $userId" }

Write-Host ""
Write-Host "== 4. /me sin token devuelve 401 (no redirect a /login) =="
$resp = Invoke-WebRequest -Uri "$Base/api/auth/me" -Method GET -SkipHttpErrorCheck -MaximumRedirection 0
if ([int]$resp.StatusCode -eq 401) { Pass "401 sin auth" }
else { Fail "401 sin auth" "got $([int]$resp.StatusCode) (proxy.ts puede estar redirigiendo)" }

Write-Host ""
Write-Host "== 5. GET /api/meals (read-only) =="
$r = Invoke-Api GET '/api/meals' -Token $token
if ($r.Status -eq 200) {
  Pass "200 meals"
  Write-Host "  · meals existentes: $($r.Body.Count)"
} else { Fail "200 meals" "got $($r.Status)" }

Write-Host ""
Write-Host "== 6. GET /api/menus/weekly (semana actual) =="
# ISO week en PowerShell
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$cal     = $culture.Calendar
$now     = Get-Date
$year    = $now.Year
$week    = $cal.GetWeekOfYear($now, [System.Globalization.CalendarWeekRule]::FirstFourDayWeek, [DayOfWeek]::Monday)
$r = Invoke-Api GET "/api/menus/weekly?year=$year&week=$week" -Token $token
if ($r.Status -eq 200) { Pass "200 weekly $year-W$week" }
else { Fail "200 weekly" "got $($r.Status)" }

Write-Host ""
Write-Host "== 7. GET /api/shopping-list =="
$r = Invoke-Api GET "/api/shopping-list?year=$year&week=$week" -Token $token
if ($r.Status -eq 200) { Pass "200 shopping list" } else { Fail "200 shopping list" "got $($r.Status)" }

Write-Host ""
Write-Host "== 8. GET /api/household =="
$r = Invoke-Api GET '/api/household' -Token $token
if ($r.Status -eq 200) { Pass "200 household" } else { Fail "200 household" "got $($r.Status)" }

Write-Host ""
Write-Host "== 9. GET /api/user =="
$r = Invoke-Api GET '/api/user' -Token $token
if ($r.Status -eq 200) { Pass "200 user" } else { Fail "200 user" "got $($r.Status)" }

Write-Host ""
Write-Host "== 10. Write test: crear + borrar meal throwaway =="
$mealBody = @{
  name        = '__smoke_test__'
  type        = 'otro'
  ingredients = @(@{ name = 'placeholder'; quantity = '1' })
}
$r = Invoke-Api POST '/api/meals' $mealBody -Token $token
$mealId = $r.Body._id
if ($r.Status -eq 201 -and $mealId) {
  Pass "201 meal creada"
  $r2 = Invoke-Api DELETE "/api/meals/$mealId" -Token $token
  if ($r2.Status -eq 200) { Pass "200 meal borrada (cleanup)" }
  else { Fail "200 meal borrada" "got $($r2.Status) - meal $mealId quedó en DB" }
} else {
  Fail "201 meal creada" "got $($r.Status) - $($r.Raw)"
}

Write-Host ""
Write-Host "================================================"
Write-Host " RESULTS:  $($script:passed) passed, $($script:failed) failed"
Write-Host "================================================"
if ($script:failed -eq 0) { exit 0 } else { exit 1 }
