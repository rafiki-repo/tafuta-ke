#!/usr/bin/env bash
# Starts ngrok tunnel on port 3000, then updates .env with the new public URLs.
# Run from any directory:  bash backend/scripts/dev-tunnel.sh

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"
PORT="${PORT:-3000}"

echo "→ Stopping any existing ngrok tunnels..."
pkill -x ngrok 2>/dev/null || true
sleep 1

echo "→ Starting ngrok on port $PORT..."
ngrok http "$PORT" --log=stdout > /tmp/ngrok-tafuta.log 2>&1 &
NGROK_PID=$!

# Wait until the local API is ready
for i in $(seq 1 15); do
  if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Get the HTTPS tunnel URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels \
  | python3 -c "import sys,json; ts=json.load(sys.stdin)['tunnels']; print(next(t['public_url'] for t in ts if t['public_url'].startswith('https')))" 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
  echo "✗ Failed to get ngrok URL. Check /tmp/ngrok-tafuta.log"
  kill "$NGROK_PID" 2>/dev/null || true
  exit 1
fi

echo "→ Tunnel URL: $NGROK_URL"

# Update .env
sed -i "s|PESAPAL_CALLBACK_URL=.*|PESAPAL_CALLBACK_URL=${NGROK_URL}/api/payments/callback|" "$ENV_FILE"
sed -i "s|PESAPAL_IPN_URL=.*|PESAPAL_IPN_URL=${NGROK_URL}/api/payments/webhook|" "$ENV_FILE"

echo ""
echo "✓ .env updated:"
grep -E 'PESAPAL_(CALLBACK|IPN)_URL' "$ENV_FILE"
echo ""
echo "→ Restart the backend server now so it picks up the new URLs."
echo "   (Press Ctrl+C here to stop the tunnel)"
echo ""

wait "$NGROK_PID"
