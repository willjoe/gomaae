#!/usr/bin/env bash
# run-pokedex.sh — Run the Pokédex end-to-end lifecycle test
#
# Usage:
#   ./e2e/run-pokedex.sh                # headless + record
#   ./e2e/run-pokedex.sh --headed       # live browser window
#   ./e2e/run-pokedex.sh --headed --no-record
#
# After the test finishes, the latest .webm recording is automatically
# converted to .mp4 using ffmpeg (if available).

set -euo pipefail
cd "$(dirname "$0")/.."

HEADED=""

for arg in "$@"; do
  case "$arg" in
    --headed) HEADED="--headed" ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Gomaae — Pokédex Lifecycle Demo (e2e)                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Ensure Gomaae app is reachable at localhost:4000 (check /api/tickets — root SSR can be slow).
if ! curl -s --max-time 8 http://localhost:4000/api/tickets > /dev/null; then
  echo "⚠️  Gomaae app does not appear to be running at http://localhost:4000"
  echo "   Start it with: npm run dev"
  echo ""
  read -r -p "   Continue anyway? [y/N] " yn
  [[ "$yn" =~ ^[Yy]$ ]] || exit 1
fi

# Wait for the Next.js dev server to finish compiling all routes.
# The server responds with 200 while still emitting "compiling" chunks on first
# load — we hit the /api/tickets endpoint (which covers most route compilation)
# and retry until it responds properly, or 30 s elapses.
echo "⏳  Waiting for server to finish compiling…"
for i in $(seq 1 15); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:4000/api/tickets 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    echo "   ✓  Server ready (${i} attempts)"
    break
  fi
  sleep 2
done

RUN_TS=$(date '+%Y%m%d-%H%M%S')
RUN_OUTPUT_DIR="../DocsAssets/Evidence/E2E-Raw-Results/run-${RUN_TS}"
mkdir -p "$RUN_OUTPUT_DIR"

# Pre-warm /initiative — Next.js Turbopack compiles lazily and blocks ALL bytes
# until done (can take 20+ min cold start). We WAIT for it to compile before
# launching Playwright so the browser finds a cached page and loads instantly.
echo "⏳  Waiting for /initiative to compile (this may take up to 30 min on cold start)…"
COMPILE_DONE=0
for attempt in $(seq 1 60); do
  STATUS=$(node -e "
    const http = require('http');
    const req = http.get({ host: 'localhost', port: 4000, path: '/initiative' }, (res) => {
      let got = false;
      res.on('data', (chunk) => { if (!got) { got = true; process.stdout.write('ok'); res.destroy(); process.exit(0); } });
      res.on('end', () => process.exit(0));
    });
    req.on('error', () => { process.stdout.write('err'); process.exit(0); });
    req.setTimeout(30000, () => { req.destroy(); process.stdout.write('timeout'); process.exit(0); });
  " 2>/dev/null)
  if [[ "$STATUS" == "ok" ]]; then
    echo "   ✓  /initiative responded (attempt $attempt) — page is compiled and cached"
    COMPILE_DONE=1
    break
  fi
  echo "   … attempt $attempt: ${STATUS:-pending} — still compiling"
  sleep 30
done
if [[ $COMPILE_DONE -eq 0 ]]; then
  echo "   ⚠️  /initiative did not respond in time — launching Playwright anyway"
fi

# Deregister ALL Pokédex workspaces from config.yaml so the test's
# POST /api/projects doesn't get a 409 "name already taken" on subsequent runs.
# Loop until none remain — there may be more than one from prior runs.
echo "🧹  Clearing stale Pokédex workspace registrations…"
DEREGISTERED=0
for _attempt in $(seq 1 10); do
  PROJECTS_JSON=$(curl -sf http://localhost:4000/api/projects 2>/dev/null || echo '{}')
  POKEDEX_ID=$(echo "$PROJECTS_JSON" | python3 -c "
import sys, json, re
try:
    d = json.load(sys.stdin)
    for p in d.get('projects', []):
        if re.search(r'pok.?dex', p.get('name',''), re.IGNORECASE):
            print(p['id'])
            break
except: pass
" 2>/dev/null || true)
  if [[ -z "$POKEDEX_ID" ]]; then
    break
  fi
  curl -sf -X DELETE http://localhost:4000/api/projects \
      -H 'Content-Type: application/json' \
      -d "{\"id\": \"$POKEDEX_ID\", \"deleteDirectory\": true}" > /dev/null 2>&1 || true
  echo "   ✓  Deregistered pokédex (id=$POKEDEX_ID)"
  DEREGISTERED=$((DEREGISTERED + 1))
done
if [[ $DEREGISTERED -eq 0 ]]; then
  echo "   ℹ️   No Pokédex workspaces in registry"
fi

# Clean up any leftover pokédex workspace directories on disk from prior runs.
# The UI deletion removes the DB record but leaves the directory, which causes
# "directory already exists" errors when the test tries to re-initialize.
for dir in "/Users/will/Agentic/pokédex" "/Users/will/Agentic/Pokédex" "/Users/will/Agentic/pokedex" "/Users/will/Agentic/Pokedex"; do
  if [ -d "$dir" ]; then
    echo "🧹  Removing leftover workspace dir: $dir"
    rm -rf "$dir"
  fi
done

START_TIME=$(date +%s)

# Final health check: block until /api/tickets responds immediately before launching
# Playwright, so reuseExistingServer sees a healthy server.
echo "🔍  Final server health check…"
for i in $(seq 1 40); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:4000/api/tickets 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    echo "   ✓  Server healthy ($i attempts)"
    break
  fi
  [[ $i -eq 40 ]] && echo "   ⚠️  Server still not healthy — Playwright will attempt to start it"
  sleep 3
done

echo "▶  Running Playwright test…"
echo "   Spec:    e2e/pokedex-lifecycle.spec.ts"
echo "   Browser: chromium"
[[ -n "$HEADED"  ]] && echo "   Mode:    HEADED (live window)" || echo "   Mode:    Headless"
echo "   Video:   enabled → $RUN_OUTPUT_DIR"
echo ""

# Build the Playwright command
PLAYWRIGHT_OPTS=(
  "--project=chromium"
  "--reporter=list"
  "--output=$RUN_OUTPUT_DIR"
)

[[ -n "$HEADED" ]] && PLAYWRIGHT_OPTS+=("$HEADED")

set +e
npx playwright test "e2e/pokedex-lifecycle.spec.ts" "${PLAYWRIGHT_OPTS[@]}"
TEST_EXIT=$?
set -e

END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))
MINS=$(( ELAPSED / 60 ))
SECS=$(( ELAPSED % 60 ))

echo ""
echo "══════════════════════════════════════════════════════════════"
if [[ $TEST_EXIT -eq 0 ]]; then
  echo "✅  TEST PASSED  (${MINS}m ${SECS}s)"
else
  echo "❌  TEST FAILED  (${MINS}m ${SECS}s)  — exit code $TEST_EXIT"
fi
echo "══════════════════════════════════════════════════════════════"
echo ""

# Find the .webm produced by this run specifically
LATEST_WEBM=$(find "$RUN_OUTPUT_DIR" -name "*.webm" 2>/dev/null | sort | tail -1 || true)

if [[ -n "$LATEST_WEBM" ]] && command -v ffmpeg &> /dev/null; then
  MP4="${LATEST_WEBM%.webm}.mp4"
  echo "🎬  Converting recording to mp4 (2× speed)…"
  if ffmpeg -filters 2>/dev/null | grep -q drawtext; then
    # drawtext available — burn elapsed-time HUD into the video (HUD time is real, not sped-up).
    RUN_LABEL="Run $(date -r "$LATEST_WEBM" '+%Y-%m-%d %H-%M-%S' 2>/dev/null || date '+%Y-%m-%d %H-%M-%S')"
    FILTER_FILE="$(mktemp /tmp/ffmpeg-drawtext-XXXXXX.txt)"
    printf "setpts=0.5*PTS,drawtext=text='%s  |  2× speed  |  real elapsed\\: %%{pts\\:hms}':fontcolor=white:fontsize=14:box=1:boxcolor=black@0.6:boxborderw=6:x=10:y=10" \
      "$RUN_LABEL" > "$FILTER_FILE"
    ffmpeg -y -i "$LATEST_WEBM" \
      -vf "$(cat "$FILTER_FILE")" \
      -an \
      -c:v libx264 -crf 18 -preset fast -movflags +faststart "$MP4" \
      2>&1 | grep -E "(frame|fps|time|bitrate|speed|Error)" || true
    rm -f "$FILTER_FILE"
  else
    # drawtext not available — 2× speed via setpts, no audio track.
    ffmpeg -y -i "$LATEST_WEBM" \
      -vf "setpts=0.5*PTS" \
      -an \
      -c:v libx264 -crf 18 -preset fast -movflags +faststart "$MP4" \
      2>&1 | grep -E "(frame|fps|time|bitrate|speed|Error)" || true
  fi
  [[ -f "$MP4" ]] && echo "    → $MP4"
elif [[ -n "$LATEST_WEBM" ]]; then
  echo "ℹ️   ffmpeg not found — recording at: $LATEST_WEBM"
fi

echo ""
echo "📁  Full report: playwright-report/index.html"
echo ""

exit $TEST_EXIT
