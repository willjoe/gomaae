#!/usr/bin/env bash
# complete-all-tickets.sh — Drive every ticket in the active project to Done.
#
# Calls POST /api/tickets/complete-all in a loop.  Each pass works bottom-up:
#   UnitTest / QA  → Task  → Story  → Epic / Operation
#
# Usage:
#   ./e2e/complete-all-tickets.sh               # default: localhost:4000
#   ./e2e/complete-all-tickets.sh --port 3000   # custom port
#   ./e2e/complete-all-tickets.sh --timeout 300 # max wait seconds (default 600)

set -euo pipefail
cd "$(dirname "$0")/.."

PORT=4000
TIMEOUT=600       # give up after this many seconds
INTERVAL=8        # seconds between passes

for arg in "$@"; do
  case "$arg" in
    --port)    shift; PORT="$1" ;;
    --timeout) shift; TIMEOUT="$1" ;;
  esac
done

BASE="http://localhost:${PORT}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   HIAD — Complete All Tickets Loop                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Target : ${BASE}/api/tickets/complete-all"
echo "  Timeout: ${TIMEOUT}s   Interval: ${INTERVAL}s"
echo ""

# Ensure server is reachable.
if ! curl -sf --max-time 6 "${BASE}/api/tickets" > /dev/null 2>&1; then
  echo "❌  HIAD app not responding at ${BASE} — start it with: npm run dev"
  exit 1
fi

START_TIME=$(date +%s)
PASS=0

while true; do
  ELAPSED=$(( $(date +%s) - START_TIME ))
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo ""
    echo "⏰  Timeout (${TIMEOUT}s) reached.  Some tickets may still be open."
    break
  fi

  PASS=$(( PASS + 1 ))

  # Call the completion endpoint.
  RESPONSE=$(curl -sf -X POST \
    -H 'Content-Type: application/json' \
    "${BASE}/api/tickets/complete-all" 2>/dev/null || echo '{"success":false,"error":"request failed","remaining":-1,"acted":[]}')

  SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success','false'))" 2>/dev/null || echo "false")
  REMAINING=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('remaining',-1))" 2>/dev/null || echo "-1")
  ACTED=$(echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for a in d.get('acted', []):
    print(f'  ✓  [{a[\"tier\"]}] {a[\"identifier\"]} — {a[\"action\"]}')
" 2>/dev/null || true)

  TIMESTAMP=$(date '+%H:%M:%S')
  echo "── Pass ${PASS}  [${TIMESTAMP}]  remaining=${REMAINING} ──────────────────"
  if [ -n "$ACTED" ]; then
    echo "$ACTED"
  else
    echo "  (nothing to close this pass)"
  fi

  if [ "$SUCCESS" != "True" ] && [ "$SUCCESS" != "true" ]; then
    ERROR=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','unknown'))" 2>/dev/null || echo "unknown")
    echo "  ⚠️  API error: $ERROR"
    sleep "$INTERVAL"
    continue
  fi

  if [ "$REMAINING" -eq 0 ] 2>/dev/null; then
    echo ""
    echo "══════════════════════════════════════════════════════════════"
    echo "✅  All tickets are Done!  (${PASS} passes, ${ELAPSED}s elapsed)"
    echo "══════════════════════════════════════════════════════════════"
    echo ""
    exit 0
  fi

  sleep "$INTERVAL"
done

# Print final tally before exiting non-zero.
echo ""
FINAL=$(curl -sf "${BASE}/api/tickets" 2>/dev/null | python3 -c "
import sys, json
d = json.load(sys.stdin)
tickets = d.get('tickets', [])
not_done = [t for t in tickets if t.get('status','') != 'Done']
print(f'Remaining not-Done: {len(not_done)}')
for t in not_done[:20]:
    print(f'  [{t[\"tier\"]}] {t[\"identifier\"]} — {t[\"status\"]} — {t[\"title\"][:55]}')
" 2>/dev/null || echo "(could not fetch)")
echo "$FINAL"
exit 1
