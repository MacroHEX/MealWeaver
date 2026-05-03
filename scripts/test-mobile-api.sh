#!/usr/bin/env bash
# End-to-end smoke test for the mobile API surface.
# Prereq: dev server running at http://localhost:3000 and MongoDB reachable.

set -u
BASE="${BASE:-http://localhost:3000}"
EMAIL="mobile-test-$(date +%s)@example.com"
PASS="testtest123"
NAME="Mobile Tester"
PASS_COUNT=0
FAIL_COUNT=0

ok()   { echo "  PASS — $1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail() { echo "  FAIL — $1"; echo "    $2"; FAIL_COUNT=$((FAIL_COUNT+1)); }

# --- helpers ---
req() {
  # req METHOD PATH [BODY] [TOKEN]
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local args=(-s -X "$method" -w "\nHTTP_STATUS:%{http_code}" -H "Content-Type: application/json")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body"  ]] && args+=(-d "$body")
  curl "${args[@]}" "$BASE$path"
}

status_of() { echo "$1" | tail -n1 | sed 's/HTTP_STATUS://'; }
body_of()   { echo "$1" | sed '$d'; }
# Extract a string field from a flat JSON path (e.g. "token", "user.id", "user.householdId").
# Walks the JSON: for each segment, finds "key":"value" or "key":nested-object scoped to its braces.
json_str() {
  node -e "try{let v=JSON.parse(process.argv[1]);for(const k of process.argv[2].split('.'))v=v?.[k];process.stdout.write(v==null?'':String(v))}catch(e){}" "$1" "$2"
}
json_len() {
  node -e "try{process.stdout.write(String(JSON.parse(process.argv[1]).length))}catch(e){process.stdout.write('?')}" "$1"
}

# ============================================================
echo "== 1. CORS preflight =="
PRE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE/api/auth/me" -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization")
[[ "$PRE" == "204" ]] && ok "OPTIONS returns 204" || fail "OPTIONS returns 204" "got $PRE"

ALLOW=$(curl -s -I -X OPTIONS "$BASE/api/auth/me" -H "Origin: http://localhost:3000" | grep -i "access-control-allow-origin" | tr -d '\r')
[[ -n "$ALLOW" ]] && ok "CORS allow-origin header present ($ALLOW)" || fail "CORS allow-origin header" "missing"

echo
echo "== 2. /api/auth/me without token =="
RESP=$(req GET /api/auth/me)
S=$(status_of "$RESP")
[[ "$S" == "401" ]] && ok "401 without auth" || fail "401 without auth" "got $S — body: $(body_of "$RESP")"

echo
echo "== 3. POST /api/auth/register =="
RESP=$(req POST /api/auth/register "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
S=$(status_of "$RESP"); B=$(body_of "$RESP")
[[ "$S" == "201" ]] && ok "201 created" || fail "201 created" "got $S — $B"
TOKEN=$(json_str "$B" 'token')
USER_ID=$(json_str "$B" 'user.id')
[[ -n "$TOKEN" ]] && ok "token returned" || fail "token returned" "$B"
[[ -n "$USER_ID" ]] && ok "user.id returned" || fail "user.id returned" "$B"

echo
echo "== 4. Duplicate register fails =="
RESP=$(req POST /api/auth/register "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
S=$(status_of "$RESP")
[[ "$S" == "409" ]] && ok "409 on duplicate email" || fail "409 on duplicate email" "got $S"

echo
echo "== 5. /api/auth/me with Bearer token =="
RESP=$(req GET /api/auth/me "" "$TOKEN")
S=$(status_of "$RESP"); B=$(body_of "$RESP")
[[ "$S" == "200" ]] && ok "200 with token" || fail "200 with token" "got $S — $B"
ME_ID=$(json_str "$B" 'user.id')
[[ "$ME_ID" == "$USER_ID" ]] && ok "user.id matches register" || fail "user.id matches register" "$ME_ID vs $USER_ID"

echo
echo "== 6. POST /api/auth/mobile-login =="
RESP=$(req POST /api/auth/mobile-login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
S=$(status_of "$RESP"); B=$(body_of "$RESP")
[[ "$S" == "200" ]] && ok "200 login" || fail "200 login" "got $S — $B"
LOGIN_TOKEN=$(json_str "$B" 'token')
[[ -n "$LOGIN_TOKEN" ]] && ok "token returned on login" || fail "token returned on login" "$B"

echo
echo "== 7. Login with wrong password =="
RESP=$(req POST /api/auth/mobile-login "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}")
S=$(status_of "$RESP")
[[ "$S" == "401" ]] && ok "401 on bad password" || fail "401 on bad password" "got $S"

echo
echo "== 8. Meals CRUD =="
# Create
RESP=$(req POST /api/meals '{"name":"Milanesa de pollo","type":"pollo","ingredients":[{"name":"pollo","quantity":"500g"},{"name":"pan rallado","quantity":"200g"}]}' "$TOKEN")
S=$(status_of "$RESP"); B=$(body_of "$RESP")
[[ "$S" == "201" ]] && ok "POST /api/meals 201" || fail "POST /api/meals 201" "got $S — $B"
MEAL_ID=$(json_str "$B" '_id')
[[ -n "$MEAL_ID" ]] && ok "_id returned" || fail "_id returned" "$B"

# List
RESP=$(req GET /api/meals "" "$TOKEN")
S=$(status_of "$RESP"); B=$(body_of "$RESP")
[[ "$S" == "200" ]] && ok "GET /api/meals 200" || fail "GET /api/meals 200" "got $S"
COUNT=$(json_len "$B")
[[ "$COUNT" == "1" ]] && ok "list has 1 meal" || fail "list has 1 meal" "got $COUNT"

# Get one
RESP=$(req GET "/api/meals/$MEAL_ID" "" "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "GET /api/meals/[id] 200" || fail "GET /api/meals/[id] 200" "got $S"

# Update
RESP=$(req PUT "/api/meals/$MEAL_ID" '{"name":"Milanesa de pollo con papas"}' "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "PUT /api/meals/[id] 200" || fail "PUT /api/meals/[id] 200" "got $S"

# Add 4 more meals so we have ≥5 (required for menu generation)
for i in 1 2 3 4; do
  req POST /api/meals "{\"name\":\"Comida $i\",\"type\":\"pollo\",\"ingredients\":[{\"name\":\"ing$i\",\"quantity\":\"100g\"}]}" "$TOKEN" > /dev/null
done
ok "seeded 5 meals total"

echo
echo "== 9. /api/menus/weekly =="
YEAR=$(date +%Y); WEEK=$(date +%V)
RESP=$(req POST /api/menus/weekly "{\"year\":$YEAR,\"week\":$WEEK,\"mealsPerDay\":3}" "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "POST /api/menus/weekly 200" || fail "POST /api/menus/weekly 200" "got $S — $(body_of "$RESP")"

RESP=$(req GET "/api/menus/weekly?year=$YEAR&week=$WEEK" "" "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "GET /api/menus/weekly 200" || fail "GET /api/menus/weekly 200" "got $S"

echo
echo "== 10. /api/shopping-list =="
RESP=$(req GET "/api/shopping-list?year=$YEAR&week=$WEEK" "" "$TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "GET /api/shopping-list 200" || fail "GET /api/shopping-list 200" "got $S"

echo
echo "== 11. Household create + token reissue =="
RESP=$(req POST /api/household '{"name":"Test Home"}' "$TOKEN")
S=$(status_of "$RESP"); B=$(body_of "$RESP")
[[ "$S" == "201" ]] && ok "POST /api/household 201" || fail "POST /api/household 201" "got $S — $B"
NEW_TOKEN=$(json_str "$B" 'token')
INVITE=$(json_str "$B" 'inviteCode')
[[ -n "$NEW_TOKEN" && "$NEW_TOKEN" != "$TOKEN" ]] && ok "new token issued (with householdId)" || fail "new token issued" "old=$TOKEN new=$NEW_TOKEN"
[[ -n "$INVITE" ]] && ok "inviteCode returned ($INVITE)" || fail "inviteCode returned" "$B"

# Verify the new token sees the household
RESP=$(req GET /api/auth/me "" "$NEW_TOKEN")
HID=$(json_str "$(body_of "$RESP")" 'user.householdId')
[[ -n "$HID" ]] && ok "/me reflects new householdId" || fail "/me reflects new householdId" "$(body_of "$RESP")"

# Leave
RESP=$(req POST /api/household/leave "" "$NEW_TOKEN")
S=$(status_of "$RESP")
[[ "$S" == "200" ]] && ok "POST /api/household/leave 200" || fail "POST /api/household/leave 200" "got $S"

echo
echo "== 12. Cleanup — delete test meals =="
# Get fresh list (meal IDs)
RESP=$(req GET /api/meals "" "$TOKEN")
node -e "try{JSON.parse(process.argv[1]).forEach(m=>process.stdout.write(m._id+'\n'))}catch(e){}" "$(body_of "$RESP")" | while read -r mid; do
  [[ -n "$mid" ]] && curl -s -X DELETE "$BASE/api/meals/$mid" -H "Authorization: Bearer $TOKEN" > /dev/null
done
ok "meals cleaned"

# ============================================================
echo
echo "================================================"
echo " RESULTS:  $PASS_COUNT passed, $FAIL_COUNT failed"
echo "================================================"
[[ "$FAIL_COUNT" == "0" ]] && exit 0 || exit 1
