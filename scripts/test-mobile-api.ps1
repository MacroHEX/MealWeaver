#!/usr/bin/env pwsh
# End-to-end smoke test del surface mobile (PowerShell 7+ / Windows).
# Equivalente al test-mobile-api.sh — registra usuario nuevo cada run.
# Prereq: dev server en BASE (default http://localhost:3000) y MongoDB reachable.

[CmdletBinding()]
param(
  [string]$Base = $(if ($env:BASE) { $env:BASE } else { 'http://localhost:3000' })
)

$email = "mobile-test-$([int][double]::Parse((Get-Date -UFormat %s)))@example.com"
$pass  = 'testtest123'
$name  = 'Mobile Tester'

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
    MaximumRedirection = 0
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
Write-Host ""

Write-Host "== 1. CORS preflight =="
$resp = Invoke-WebRequest -Uri "$Base/api/auth/me" -Method OPTIONS -Headers @{
  'Origin'                         = 'http://localhost:3000'
  'Access-Control-Request-Method'  = 'GET'
  'Access-Control-Request-Headers' = 'authorization'
} -SkipHttpErrorCheck
if ([int]$resp.StatusCode -eq 204) { Pass "OPTIONS 204" }
else { Fail "OPTIONS 204" "got $([int]$resp.StatusCode)" }
$allowOrigin = $resp.Headers['Access-Control-Allow-Origin']
if ($allowOrigin) { Pass "CORS allow-origin presente ($allowOrigin)" }
else { Fail "CORS allow-origin" "header ausente" }

Write-Host ""
Write-Host "== 2. /api/auth/me sin token =="
$r = Invoke-Api GET '/api/auth/me'
if ($r.Status -eq 401) { Pass "401 sin auth" } else { Fail "401 sin auth" "got $($r.Status)" }

Write-Host ""
Write-Host "== 3. POST /api/auth/register =="
$r = Invoke-Api POST '/api/auth/register' @{ name = $name; email = $email; password = $pass }
if ($r.Status -eq 201) { Pass "201 created" } else { Fail "201 created" "got $($r.Status) - $($r.Raw)" }
$token  = $r.Body.token
$userId = $r.Body.user.id
if ($token)  { Pass "token returned" }   else { Fail "token returned" $r.Raw }
if ($userId) { Pass "user.id returned" } else { Fail "user.id returned" $r.Raw }

Write-Host ""
Write-Host "== 4. Duplicate register fails =="
$r = Invoke-Api POST '/api/auth/register' @{ name = $name; email = $email; password = $pass }
if ($r.Status -eq 409) { Pass "409 on duplicate email" } else { Fail "409 on duplicate" "got $($r.Status)" }

Write-Host ""
Write-Host "== 5. /api/auth/me con Bearer =="
$r = Invoke-Api GET '/api/auth/me' -Token $token
if ($r.Status -eq 200) { Pass "200 with token" } else { Fail "200 with token" "got $($r.Status)" }
if ($r.Body.user.id -eq $userId) { Pass "user.id matches register" }
else { Fail "user.id matches" "$($r.Body.user.id) vs $userId" }

Write-Host ""
Write-Host "== 6. POST /api/auth/mobile-login =="
$r = Invoke-Api POST '/api/auth/mobile-login' @{ email = $email; password = $pass }
if ($r.Status -eq 200) { Pass "200 login" } else { Fail "200 login" "got $($r.Status) - $($r.Raw)" }
if ($r.Body.token) { Pass "token returned on login" } else { Fail "token returned" $r.Raw }

Write-Host ""
Write-Host "== 7. Login con password incorrecto =="
$r = Invoke-Api POST '/api/auth/mobile-login' @{ email = $email; password = 'wrong' }
if ($r.Status -eq 401) { Pass "401 on bad password" } else { Fail "401 on bad password" "got $($r.Status)" }

Write-Host ""
Write-Host "== 8. Meals CRUD =="
$mealBody = @{
  name        = 'Milanesa de pollo'
  type        = 'pollo'
  ingredients = @(
    @{ name = 'pollo'; quantity = '500g' }
    @{ name = 'pan rallado'; quantity = '200g' }
  )
}
$r = Invoke-Api POST '/api/meals' $mealBody -Token $token
if ($r.Status -eq 201) { Pass "POST /api/meals 201" } else { Fail "POST /api/meals" "got $($r.Status) - $($r.Raw)" }
$mealId = $r.Body._id
if ($mealId) { Pass "_id returned" } else { Fail "_id returned" $r.Raw }

$r = Invoke-Api GET '/api/meals' -Token $token
if ($r.Status -eq 200) { Pass "GET /api/meals 200" } else { Fail "GET /api/meals" "got $($r.Status)" }
if ($r.Body.Count -eq 1) { Pass "list has 1 meal" } else { Fail "list has 1 meal" "got $($r.Body.Count)" }

$r = Invoke-Api GET "/api/meals/$mealId" -Token $token
if ($r.Status -eq 200) { Pass "GET /api/meals/[id] 200" } else { Fail "GET by id" "got $($r.Status)" }

$r = Invoke-Api PUT "/api/meals/$mealId" @{ name = 'Milanesa de pollo con papas' } -Token $token
if ($r.Status -eq 200) { Pass "PUT /api/meals/[id] 200" } else { Fail "PUT" "got $($r.Status)" }

# Sembrar 4 más para llegar a 5 (mínimo para generar menú)
foreach ($i in 1..4) {
  $extra = @{
    name        = "Comida $i"
    type        = 'pollo'
    ingredients = @(@{ name = "ing$i"; quantity = '100g' })
  }
  Invoke-Api POST '/api/meals' $extra -Token $token | Out-Null
}
Pass "seeded 5 meals total"

Write-Host ""
Write-Host "== 9. /api/menus/weekly =="
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$cal     = $culture.Calendar
$now     = Get-Date
$year    = $now.Year
$week    = $cal.GetWeekOfYear($now, [System.Globalization.CalendarWeekRule]::FirstFourDayWeek, [DayOfWeek]::Monday)

$r = Invoke-Api POST '/api/menus/weekly' @{ year = $year; week = $week; mealsPerDay = 3 } -Token $token
if ($r.Status -eq 200) { Pass "POST /api/menus/weekly 200" } else { Fail "POST weekly" "got $($r.Status) - $($r.Raw)" }

$r = Invoke-Api GET "/api/menus/weekly?year=$year&week=$week" -Token $token
if ($r.Status -eq 200) { Pass "GET /api/menus/weekly 200" } else { Fail "GET weekly" "got $($r.Status)" }

Write-Host ""
Write-Host "== 10. /api/shopping-list =="
$r = Invoke-Api GET "/api/shopping-list?year=$year&week=$week" -Token $token
if ($r.Status -eq 200) { Pass "GET /api/shopping-list 200" } else { Fail "GET shopping" "got $($r.Status)" }

Write-Host ""
Write-Host "== 11. Household create + token reissue =="
$r = Invoke-Api POST '/api/household' @{ name = 'Test Home' } -Token $token
if ($r.Status -eq 201) { Pass "POST /api/household 201" } else { Fail "POST household" "got $($r.Status) - $($r.Raw)" }
$newToken = $r.Body.token
$invite   = $r.Body.inviteCode
if ($newToken -and $newToken -ne $token) { Pass "new token issued (with householdId)" }
else { Fail "new token issued" "old=$token new=$newToken" }
if ($invite) { Pass "inviteCode returned ($invite)" } else { Fail "inviteCode returned" $r.Raw }

$r = Invoke-Api GET '/api/auth/me' -Token $newToken
if ($r.Body.user.householdId) { Pass "/me reflects new householdId" }
else { Fail "/me reflects new householdId" $r.Raw }

$r = Invoke-Api POST '/api/household/leave' -Token $newToken
if ($r.Status -eq 200) { Pass "POST /api/household/leave 200" } else { Fail "leave" "got $($r.Status)" }

Write-Host ""
Write-Host "== 12. Cleanup - delete test meals =="
$r = Invoke-Api GET '/api/meals' -Token $token
foreach ($m in $r.Body) {
  if ($m._id) { Invoke-Api DELETE "/api/meals/$($m._id)" -Token $token | Out-Null }
}
Pass "meals cleaned"

Write-Host ""
Write-Host "================================================"
Write-Host " RESULTS:  $($script:passed) passed, $($script:failed) failed"
Write-Host "================================================"
if ($script:failed -eq 0) { exit 0 } else { exit 1 }
