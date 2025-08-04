#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE_URL:-http://localhost:8080}

echo "# Health"
curl -i -sS "$BASE/health" | sed -n "1,20p"
echo

echo "# Register (may 409)"
curl -i -sS -X POST "$BASE/api/auth/register" -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\",\"phone\":\"+10000000000\",\"company\":\"Test Company\"}" \
  | sed -n "1,40p"
echo

echo "# Login"
LOGIN_JSON=$(curl -sS -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}")
echo "$LOGIN_JSON" | sed -n "1,30p"
TOKEN=$(echo "$LOGIN_JSON" | sed -n "s/.*\"token\"\\s*:\\s*\"\\([^\"]*\\)\".*/\\1/p" | head -n1)
if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to extract token from login response" >&2
  exit 1
fi
echo

auth() { curl -i -sS -H "Authorization: Bearer $TOKEN" "$@"; }

echo "# Me (protected)"
auth "$BASE/api/auth/me" | sed -n "1,60p"
echo

echo "# Reports dashboard-stats"
auth "$BASE/api/reports/dashboard-stats" | sed -n "1,80p"
echo

echo "# Reports expiring-batches?days=30"
auth "$BASE/api/reports/expiring-batches?days=30" | sed -n "1,80p"
echo

echo "# Reports low-stock?threshold=10"
auth "$BASE/api/reports/low-stock?threshold=10" | sed -n "1,80p"
echo

echo "# Reports inventory-value"
auth "$BASE/api/reports/inventory-value" | sed -n "1,80p"
echo

