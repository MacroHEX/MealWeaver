#!/usr/bin/env bash
# Smoke test contra producción usando credenciales reales (login, no registro).
# Uso:
#   BASE=https://meal-weaver.vercel.app \
#   TEST_EMAIL=tu@email.com \
#   TEST_PASSWORD='tu_pass' \
#     bash scripts/test-prod-smoke.sh
#
# No commitea credenciales. Si tu pass tiene caracteres especiales para tu
# shell (*, $, !), usá comillas simples al exportarla.

set -u

# Autocarga scripts/.env si existe (las env vars del shell tienen prioridad).
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a
fi

BASE="${BASE:-https://meal-weaver.vercel.app}"
EMAIL="${TEST_EMAIL:?Falta TEST_EMAIL (en scripts/.env o env var)}"
PASS="${TEST_PASSWORD:?Falta TEST_PASSWORD (en scripts/.env o env var)}"
PASS_COUNT=0
FAIL_COUNT=0

ok()   { echo "  PASS — $1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail() { echo "  FAIL — $1"; echo "    $2"; FAIL_COUNT=$((FAIL_COUNT+1)); }

# Construye JSON via node — escapa cualquier carácter especial de la pass.
build_login_body() {
  node -e "process.stdout.write(JSON.stringify({email:process.argv[1],password:process.argv[2]}))" "$EMAIL" "$PASS"
}

req() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local args=(-s -X "$method" -w "\nHTTP_STATUS:%{http_code}" -H "Content-Type: application/json")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body"  ]] && args+=(-d "$body")
  curl "${args[@]}" "$BASE$path"
}

status_of() { echo "$1" | tail -n1 | sed 's/HTTP_STATUS://'; }
body_of()   { echo "$1" | sed '$d'; }
json_str()  {
  node -e "try{let v=JSON.parse(process.argv[1]);for(const k of process.argv[2].split('.'))v=v?.[k];process.stdout.write(v==null?'':String(v))}catch(e){}" "$1" "$2"
}

echo "Target: $BASE"
echo "User:   $EMAIL"
echo

echo "== 1. CORS preflight =="
S=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE/api/auth/me" \
  -H "Origin: http://localhost:5000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization")
[[ "$S" == "204" ]] && ok "OPTIONS 204" || fail "OPTIONS 204" "got $S (¿proxy.ts deployado?)"

echo
echo "== 2. Login (POST /api/auth/mobile-login) =="
LOGIN_BODY=$(build_login_body)
RESP=$(req POST /api/auth/mobile-login "$LOGIN_BODY")
S=$(status_of "$RESP"); B=$(body_of "$RESP")
if [[ "$S" != "200" ]]; then
  fail "200 login" "got $S — $B"
  echo
  echo "Login falló — abortando. Verificá credenciales y deploy."
  exit 1
fi
ok "200 login"
TOKEN=$(json_str "$B" 'token')
USER_ID=$(json_str "$B" 'user.id')
HOUSEHOLD_ID=$(json_str "$B" 'user.householdId')
[[ -n "$TOKEN" ]] && ok "token recibido" || fail "token recibido" "$B"
[[ -n "$USER_ID" ]] && ok "user.id recibido" || fail "user.id recibido" "$B"
echo "  · householdId: ${HOUSEHOLD_ID:-<none>}"

echo
echo "== 3. GET /api/auth/me =="
RESP=$(req GET /api/auth/me "" "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "200 /me" || fail "200 /me" "got $S — $(body_of "$RESP")"
ME_ID=$(json_str "$(body_of "$RESP")" 'user.id')
[[ "$ME_ID" == "$USER_ID" ]] && ok "user.id matches login" || fail "user.id matches login" "$ME_ID vs $USER_ID"

echo
echo "== 4. /me sin token devuelve 401 (no redirect a /login) =="
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/me")
[[ "$S" == "401" ]] && ok "401 sin auth" || fail "401 sin auth" "got $S (proxy.ts puede estar redirigiendo)"

echo
echo "== 5. GET /api/meals (read-only) =="
RESP=$(req GET /api/meals "" "$TOKEN")
S=$(status_of "$RESP"); B=$(body_of "$RESP")
[[ "$S" == "200" ]] && ok "200 meals" || fail "200 meals" "got $S"
COUNT=$(node -e "try{process.stdout.write(String(JSON.parse(process.argv[1]).length))}catch(e){process.stdout.write('?')}" "$B")
echo "  · meals existentes: $COUNT"

echo
echo "== 6. GET /api/menus/weekly (semana actual, read-only) =="
YEAR=$(date +%Y); WEEK=$(date +%V)
RESP=$(req GET "/api/menus/weekly?year=$YEAR&week=$WEEK" "" "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "200 weekly $YEAR-W$WEEK" || fail "200 weekly" "got $S"

echo
echo "== 7. GET /api/shopping-list (read-only) =="
RESP=$(req GET "/api/shopping-list?year=$YEAR&week=$WEEK" "" "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "200 shopping list" || fail "200 shopping list" "got $S"

echo
echo "== 8. GET /api/household =="
RESP=$(req GET /api/household "" "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "200 household" || fail "200 household" "got $S"

echo
echo "== 9. GET /api/user =="
RESP=$(req GET /api/user "" "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "200 user" || fail "200 user" "got $S"

echo
echo "== 10. Write test: crear + borrar meal throwaway =="
RESP=$(req POST /api/meals '{"name":"__smoke_test__","type":"otro","ingredients":[{"name":"placeholder","quantity":"1"}]}' "$TOKEN")
S=$(status_of "$RESP")
MEAL_ID=$(json_str "$(body_of "$RESP")" '_id')
if [[ "$S" == "201" && -n "$MEAL_ID" ]]; then
  ok "201 meal creada"
  RESP=$(req DELETE "/api/meals/$MEAL_ID" "" "$TOKEN")
  S=$(status_of "$RESP")
  [[ "$S" == "200" ]] && ok "200 meal borrada (cleanup)" || fail "200 meal borrada" "got $S — meal id $MEAL_ID quedó en DB"
else
  fail "201 meal creada" "got $S — $(body_of "$RESP")"
fi

echo
echo "================================================"
echo " RESULTS:  $PASS_COUNT passed, $FAIL_COUNT failed"
echo "================================================"
[[ "$FAIL_COUNT" == "0" ]] && exit 0 || exit 1
