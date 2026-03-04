#!/usr/bin/env bash
# ============================================================
# InFlow — OneChain Move Contract Deployment Script
# Deploys: token_factory_move, nft_factory_move, payment_escrow_move
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV="$SCRIPT_DIR/backend/.env"
FRONTEND_ENV="$SCRIPT_DIR/frontend/.env.local"
CONTRACT_DIR="$SCRIPT_DIR/contract"

ONE_VERSION="v1.1.1"
ONE_BINARY_URL="https://github.com/one-chain-labs/onechain/releases/download/$ONE_VERSION/one-mainnet-$ONE_VERSION-ubuntu-x86_64.tgz"
ONE_BIN="$HOME/.local/bin/one"

TESTNET_RPC="https://rpc-testnet.onelabs.cc:443"
FAUCET_URL="https://faucet-testnet.onelabs.cc/v1/gas"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

# ─── 1. Install one CLI if missing ────────────────────────────────────────────
install_one_cli() {
  if command -v one &>/dev/null; then
    ok "one CLI already installed: $(command -v one)"
    return
  fi

  if [ -x "$ONE_BIN" ]; then
    export PATH="$HOME/.local/bin:$PATH"
    ok "one CLI found at $ONE_BIN"
    return
  fi

  log "Downloading OneChain CLI $ONE_VERSION for Ubuntu x86_64..."
  mkdir -p "$HOME/.local/bin"
  TMP_DIR="$(mktemp -d)"
  curl -fsSL "$ONE_BINARY_URL" -o "$TMP_DIR/one.tgz"
  tar -xzf "$TMP_DIR/one.tgz" -C "$TMP_DIR"
  # The tarball contains the `one` binary (and possibly others)
  BINARY=$(find "$TMP_DIR" -type f -name "one" | head -1)
  if [ -z "$BINARY" ]; then
    # Sometimes it's the only file extracted
    BINARY=$(find "$TMP_DIR" -maxdepth 2 -type f -executable | head -1)
  fi
  [ -z "$BINARY" ] && err "Could not find 'one' binary in the downloaded archive"
  cp "$BINARY" "$ONE_BIN"
  chmod +x "$ONE_BIN"
  rm -rf "$TMP_DIR"
  export PATH="$HOME/.local/bin:$PATH"
  ok "one CLI installed → $ONE_BIN"
}

# ─── 2. Configure testnet environment ──────────────────────────────────────────
configure_testnet() {
  log "Configuring OneChain testnet environment..."

  # Check if testnet env already present (non-interactive)
  if one client envs 2>/dev/null | grep -q "testnet"; then
    ok "Testnet environment already configured"
  else
    # Add testnet env
    one client new-env --alias testnet --rpc "$TESTNET_RPC" 2>/dev/null || true
  fi

  one client switch --env testnet 2>/dev/null || true
  ok "Active network: $(one client active-env 2>/dev/null || echo 'testnet')"
}

# ─── 3. Import wallet from .env ────────────────────────────────────────────────
import_wallet() {
  if [ ! -f "$BACKEND_ENV" ]; then
    warn "backend/.env not found — skipping wallet import"
    return
  fi

  SECRET_KEY=$(grep -E "^BACKEND_WALLET_SECRET_KEY=" "$BACKEND_ENV" | cut -d= -f2 | tr -d '[:space:]')
  if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "0x" ] || [ "$SECRET_KEY" = "" ]; then
    warn "BACKEND_WALLET_SECRET_KEY not set in backend/.env — generating a new one"
    one client new-address ed25519 2>/dev/null || true
  else
    log "Importing wallet from BACKEND_WALLET_SECRET_KEY..."
    # Import the key (tolerates it already being imported)
    one keytool import "$SECRET_KEY" ed25519 2>/dev/null || true
    ok "Wallet key imported"
  fi

  ACTIVE_ADDR=$(one client active-address 2>/dev/null)
  ok "Active address: $ACTIVE_ADDR"
}

# ─── 4. Fund wallet from faucet ────────────────────────────────────────────────
fund_wallet() {
  ACTIVE_ADDR=$(one client active-address 2>/dev/null)
  [ -z "$ACTIVE_ADDR" ] && { warn "No active address — skipping faucet"; return; }

  log "Requesting test OCT from faucet for $ACTIVE_ADDR..."
  RESPONSE=$(curl -s -X POST "$FAUCET_URL" \
    -H "Content-Type: application/json" \
    -d "{\"FixedAmountRequest\":{\"recipient\":\"$ACTIVE_ADDR\"}}" 2>/dev/null || echo '{}')

  if echo "$RESPONSE" | grep -qi "error\|fail"; then
    warn "Faucet request may have failed (already funded or rate-limited): $RESPONSE"
  else
    ok "Faucet request sent. Balance will arrive in ~5 seconds."
    sleep 5
  fi
}

# ─── 5. Deploy a single Move package ───────────────────────────────────────────
# Returns: sets PKG_ID variable
deploy_package() {
  local PKG_PATH="$1"
  local PKG_NAME="$2"

  log "Deploying $PKG_NAME from $PKG_PATH..."
  pushd "$PKG_PATH" >/dev/null

  OUTPUT=$(one client publish \
    --gas-budget 200000000 \
    --skip-fetch-latest-git-deps \
    --json 2>&1) || {
    warn "Publish with --skip-fetch-latest-git-deps failed, retrying without flag..."
    OUTPUT=$(one client publish \
      --gas-budget 200000000 \
      --json 2>&1)
  }

  popd >/dev/null

  # Extract PackageID from JSON output
  PKG_ID=$(echo "$OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
# Look in objectChanges for Published type
for chg in data.get('objectChanges', []):
    if chg.get('type') == 'published':
        print(chg.get('packageId',''))
        sys.exit(0)
# Try effects.created
for obj in data.get('effects', {}).get('created', []):
    ref = obj.get('reference', obj.get('objectRef', {}))
    if ref:
        oid = ref.get('objectId','')
        if oid:
            print(oid)
            sys.exit(0)
print('')
" 2>/dev/null)

  if [ -z "$PKG_ID" ]; then
    # Fallback: grep for hex address after 'packageId'
    PKG_ID=$(echo "$OUTPUT" | grep -oP '"packageId"\s*:\s*"\K0x[0-9a-fA-F]+' | head -1)
  fi

  if [ -z "$PKG_ID" ]; then
    warn "Could not auto-extract PackageID. Raw output:"
    echo "$OUTPUT" | tail -40
    echo ""
    read -rp "Please paste the PackageID for $PKG_NAME: " PKG_ID
  fi

  ok "$PKG_NAME deployed → $PKG_ID"
}

# ─── 6. Update .env files ──────────────────────────────────────────────────────
update_env() {
  local FILE="$1"
  local KEY="$2"
  local VALUE="$3"

  if [ ! -f "$FILE" ]; then
    warn "$FILE not found, creating..."
    echo "$KEY=$VALUE" >> "$FILE"
    return
  fi

  if grep -qE "^${KEY}=" "$FILE"; then
    sed -i "s|^${KEY}=.*|${KEY}=${VALUE}|" "$FILE"
  else
    echo "$KEY=$VALUE" >> "$FILE"
  fi
  ok "Updated $KEY in $(basename "$FILE")"
}

# ─── Main ──────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   InFlow — OneChain Contract Deployment        ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  install_one_cli

  # Verify one is available
  one --version 2>/dev/null || one version 2>/dev/null || log "one CLI is ready (version check skipped)"

  configure_testnet
  import_wallet
  fund_wallet

  # ── Deploy contracts ──────────────────────────────────────────────────────

  deploy_package "$CONTRACT_DIR/token_factory_move" "token_factory"
  TOKEN_FACTORY_PKG_ID="$PKG_ID"

  deploy_package "$CONTRACT_DIR/nft_factory_move" "nft_factory"
  NFT_FACTORY_PKG_ID="$PKG_ID"

  deploy_package "$CONTRACT_DIR/payment_escrow_move" "payment_escrow"
  PAYMENT_PKG_ID="$PKG_ID"

  # ── Summary ───────────────────────────────────────────────────────────────
  echo ""
  echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  Deployment Complete!${NC}"
  echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
  echo -e "  TOKEN_FACTORY_PACKAGE_ID  = ${CYAN}$TOKEN_FACTORY_PKG_ID${NC}"
  echo -e "  NFT_FACTORY_PACKAGE_ID    = ${CYAN}$NFT_FACTORY_PKG_ID${NC}"
  echo -e "  PAYMENT_PACKAGE_ID        = ${CYAN}$PAYMENT_PKG_ID${NC}"
  echo ""

  # ── Update backend/.env ───────────────────────────────────────────────────
  if [ -n "$TOKEN_FACTORY_PKG_ID" ]; then
    update_env "$BACKEND_ENV" "TOKEN_FACTORY_PACKAGE_ID" "$TOKEN_FACTORY_PKG_ID"
    update_env "$BACKEND_ENV" "NFT_FACTORY_PACKAGE_ID"   "$NFT_FACTORY_PKG_ID"
    update_env "$BACKEND_ENV" "PAYMENT_PACKAGE_ID"       "$PAYMENT_PKG_ID"
  fi

  # ── Update frontend/.env.local ────────────────────────────────────────────
  if [ -f "$FRONTEND_ENV" ] || true; then
    update_env "$FRONTEND_ENV" "NEXT_PUBLIC_TOKEN_FACTORY_PACKAGE_ID" "$TOKEN_FACTORY_PKG_ID"
    update_env "$FRONTEND_ENV" "NEXT_PUBLIC_NFT_FACTORY_PACKAGE_ID"   "$NFT_FACTORY_PKG_ID"
    update_env "$FRONTEND_ENV" "NEXT_PUBLIC_PAYMENT_PACKAGE_ID"       "$PAYMENT_PKG_ID"
  fi

  echo ""
  ok "All environment files updated. Restart the backend and frontend to pick up the new Package IDs."
  echo ""
  echo -e "  Explorer: ${CYAN}https://onescan.cc/testnet${NC}"
}

main "$@"
