# InFlow — Environment Variables Setup Guide

Complete reference for every environment variable used across all services. Copy each folder's `.env.example` (or `.env.local.example` for the frontend) to `.env` / `.env.local` and fill in the values below.

---

## Table of Contents

- [OneChain Network & Package IDs](#onechain-network--package-ids) — shared across backend services
- [backend/](#backend) — Node.js API server (port 3000)
- [frontend/](#frontend) — Next.js app
- [n8n\_agent\_backend/](#n8n_agent_backend) — AI agent execution service (port 8000)
- [AI\_workflow\_backend/](#ai_workflow_backend) — Workflow builder service (port 8001)
- [orbit\_ai\_backend/](#orbit_ai_backend) — Move package deployer AI (port 8002)
- [Obtaining API Keys](#obtaining-api-keys)

---

## OneChain Network & Package IDs

These values appear in both `backend/` and `orbit_ai_backend/`. They describe the OneChain network topology and the on-chain package addresses for each deployed Move module.

### Network Variables

| Variable | Default | Description |
|---|---|---|
| `ONECHAIN_ACTIVE_NETWORK` | `testnet` | Active network: `testnet`, `mainnet`, or `devnet` |
| `ONECHAIN_TESTNET_RPC` | `https://rpc-testnet.onelabs.cc:443` | Testnet RPC endpoint |
| `ONECHAIN_MAINNET_RPC` | `https://rpc-mainnet.onelabs.cc:443` | Mainnet RPC endpoint |
| `ONECHAIN_DEVNET_RPC` | `https://rpc-devnet.onelabs.cc:443` | DevNet RPC endpoint |
| `ONECHAIN_NETWORK` | `OneChain Testnet` | Human-readable network name (display only) |

The RPC defaults point to the official OneLabs nodes. Override only if using a custom or self-hosted node.

### Move Package IDs

After publishing each Move module with `sui client publish`, copy the printed **Package ID** (`0x...`) here.

| Variable | Move module | Description |
|---|---|---|
| `TOKEN_FACTORY_PACKAGE_ID` | `token_factory` | Fungible token creation factory |
| `NFT_FACTORY_PACKAGE_ID` | `nft_factory` | NFT collection + mint factory |
| `PAYMENT_PACKAGE_ID` | `payment-contracts` | x402 payment channel contract |
| `ONEDEX_PACKAGE_ID` | OneDEX | OneChain native DEX integration |
| `ONEID_PACKAGE_ID` | OneID | On-chain identity protocol |
| `ONETRANSFER_PACKAGE_ID` | OneTransfer | Cross-asset transfer protocol |

Leave empty (`=`) if the module is not yet deployed. The backend will gracefully skip those features.

**How to obtain a Package ID:**

```bash
# Publish a Move package (run from the contract directory)
sui client publish --gas-budget 100000000

# The output will include a line like:
# ┌──────────────────────────────────────────────────────────────┐
# │ Object Changes                                               │
# │ Published Objects:                                           │
# │  ┌ PackageID: 0xabc123...                                    │
```

---

## backend/

Node.js / Express API server. Copy `backend/.env.example` → `backend/.env`.

```bash
cp backend/.env.example backend/.env
```

### Server

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3000` | No | HTTP port the server listens on |
| `AGENT_BACKEND_URL` | `http://localhost:8000` | No | URL of the n8n_agent_backend service |

### OneChain Network

Same variables as the [OneChain section above](#onechain-network--package-ids). All have sensible defaults so only override if needed.

```env
ONECHAIN_ACTIVE_NETWORK=testnet
ONECHAIN_TESTNET_RPC=https://rpc-testnet.onelabs.cc:443
ONECHAIN_MAINNET_RPC=https://rpc-mainnet.onelabs.cc:443
ONECHAIN_DEVNET_RPC=https://rpc-devnet.onelabs.cc:443
```

### Move Package IDs

```env
TOKEN_FACTORY_PACKAGE_ID=0x...
NFT_FACTORY_PACKAGE_ID=0x...
PAYMENT_PACKAGE_ID=0x...
ONEDEX_PACKAGE_ID=0x...
ONEID_PACKAGE_ID=0x...
ONETRANSFER_PACKAGE_ID=0x...
```

### Backend Wallet

| Variable | Required | Description |
|---|---|---|
| `BACKEND_WALLET_SECRET_KEY` | Yes (for on-chain ops) | Ed25519 secret key used by the backend to sign Move transactions (deployments, airdrops, etc.) |

**How to get it:** Generate a new keypair with the Sui CLI:

```bash
sui keytool generate ed25519
# Outputs: address, publicBase64Key, scheme
# The secret key is in ~/.sui/sui_config/sui.keystore — a base64-encoded string
```

Or generate programmatically:

```bash
node -e "
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const kp = new Ed25519Keypair();
console.log('Address:', kp.getPublicKey().toSuiAddress());
console.log('Secret (export):', kp.export().privateKey);
"
```

> **Security:** Never commit this key. Use a dedicated hot-wallet with only the minimum OCT balance needed for gas.

### AI API Keys

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY1` | At least one | Primary Groq key for LLM features |
| `GROQ_API_KEY2` | No | Second Groq key (rate-limit fallback) |
| `GROQ_API_KEY3` | No | Third Groq key (rate-limit fallback) |
| `GEMINI_API_KEY` | No | Google Gemini fallback (price fetching, AI) |
| `OPENAI_API_KEY` | No | Reserved for future features |

See [Obtaining API Keys](#obtaining-api-keys) for step-by-step instructions.

### Pinata (IPFS)

Used for uploading NFT metadata and images to IPFS.

| Variable | Required | Description |
|---|---|---|
| `PINATA_API_KEY` | Only for NFT uploads | Pinata API key |
| `PINATA_SECRET_KEY` | Only for NFT uploads | Pinata secret key |

**How to get it:** Sign up at [app.pinata.cloud](https://app.pinata.cloud) → **API Keys** → **New Key** → enable `pinFileToIPFS` and `pinJSONToIPFS`.

### Supabase (Conversation Memory)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes (for memory) | Your project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Yes (for memory) | Service role key (full DB access, keep secret) |

**How to get it:** Go to [supabase.com](https://supabase.com) → your project → **Settings → API**.  
- **Project URL** → `SUPABASE_URL`  
- **service_role** (under Secret) → `SUPABASE_SERVICE_KEY`

> Run `backend/database/schema.sql` against your Supabase project to create the required tables.

### Admin Secret

| Variable | Required | Description |
|---|---|---|
| `ADMIN_SECRET` | Yes | Random secret for protected maintenance endpoints (e.g. `/admin/cleanup`) |

Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Gmail (Email Tool)

| Variable | Required | Description |
|---|---|---|
| `GMAIL_USER` | Only for email tool | Gmail address used as sender |
| `GMAIL_APP_PASSWORD` | Only for email tool | 16-character Gmail App Password (not your account password) |

**How to get an App Password:**

1. Enable 2-Step Verification on the Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Select app **Mail**, device **Other**, enter a name → **Generate**
4. Copy the 16-character code

---

## frontend/

Next.js app. Copy `frontend/.env.local.example` → `frontend/.env.local`.

```bash
cp frontend/.env.local.example frontend/.env.local
```

> Variables prefixed with `NEXT_PUBLIC_` are bundled into the browser. Never put secrets in `NEXT_PUBLIC_` variables.

### Supabase

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same project URL as backend `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/public key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server routes) | Service role key (server-side API routes only) |

**How to get it:** Supabase → **Settings → API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### Backend Service URLs

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:3000` | Main InFlow Node.js backend |
| `NEXT_PUBLIC_BLOCKCHAIN_BACKEND_URL` | `http://localhost:3000` | Alias used by blockchain-specific libs |
| `NEXT_PUBLIC_AI_AGENT_BACKEND_URL` | `http://localhost:8000` | n8n agent backend (AI execution) |
| `NEXT_PUBLIC_AI_WORKFLOW_BACKEND_URL` | `http://localhost:8001` | AI workflow builder |
| `NEXT_PUBLIC_ORBIT_AI_URL` | `http://localhost:8002` | Orbit AI (Move package deployer) |

### OneChain Network

| Variable | Recommended value | Description |
|---|---|---|
| `NEXT_PUBLIC_ONECHAIN_ACTIVE_NETWORK` | `testnet` | Active network |
| `NEXT_PUBLIC_ONECHAIN_TESTNET_RPC` | `https://rpc-testnet.onelabs.cc:443` | Testnet RPC |
| `NEXT_PUBLIC_ONECHAIN_MAINNET_RPC` | `https://rpc-mainnet.onelabs.cc:443` | Mainnet RPC |
| `NEXT_PUBLIC_ONECHAIN_DEVNET_RPC` | `https://rpc-devnet.onelabs.cc:443` | DevNet RPC |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://explorer-testnet.onelabs.cc` | Block explorer base URL |
| `NEXT_PUBLIC_RPC_URL` | same as testnet RPC | Generic RPC alias used in some components |

### Move Package IDs (Frontend)

Mirror the same values set in `backend/.env`:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_TOKEN_FACTORY_PACKAGE_ID` | Token factory package ID (`0x...`) |
| `NEXT_PUBLIC_NFT_FACTORY_PACKAGE_ID` | NFT factory package ID (`0x...`) |
| `NEXT_PUBLIC_PAYMENT_PACKAGE_ID` | Payment contract package ID (`0x...`) |
| `NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS` | Payment contract object address (`0x...`) |

### Payment (Server-side)

These are **server-only** — never expose them to the browser.

| Variable | Required | Description |
|---|---|---|
| `PAYMENT_BACKEND_PRIVATE_KEY` | Only for x402 payments | Ed25519 secret key for the payment service wallet (signs payment channel transactions) |
| `JWT_SECRET` | Yes (for payment routes) | Random secret for signing payment JWTs. Generate with `openssl rand -hex 32` |

### AI (Frontend)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | No | Used in server-side API routes for AI-assisted features |

---

## n8n\_agent\_backend/

AI agent execution service. Copy `n8n_agent_backend/.env.example` → `n8n_agent_backend/.env`.

See [n8n_agent_backend/ENV_SETUP.md](n8n_agent_backend/ENV_SETUP.md) for detailed per-variable instructions.

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY1` | At least one | Primary Groq LLM key (`gsk_...`) |
| `GROQ_API_KEY2` | No | Second key (rate-limit fallback) |
| `GROQ_API_KEY3` | No | Third key (rate-limit fallback) |
| `GEMINI_API_KEY` | No | Gemini fallback LLM (`AIza...`) |
| `BACKEND_URL` | No (default: `http://localhost:3000`) | URL of the Node.js backend for tool execution |

---

## AI\_workflow\_backend/

Workflow builder service — converts natural language to workflow JSON. Copy `AI_workflow_backend/.env.example` → `AI_workflow_backend/.env`.

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY1` | At least one | Primary Groq LLM key (`gsk_...`) |
| `GROQ_API_KEY2` | No | Second key (rate-limit fallback) |
| `GROQ_API_KEY3` | No | Third key (rate-limit fallback) |
| `GEMINI_API_KEY` | No | Gemini fallback LLM (`AIza...`) |
| `PORT` | No (default: `8001`) | Port the service listens on |

---

## orbit\_ai\_backend/

Move package deployer AI. Copy `orbit_ai_backend/.env.example` → `orbit_ai_backend/.env`.

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY1` | At least one | Primary Groq LLM key (`gsk_...`) |
| `GROQ_API_KEY2` | No | Second key (rate-limit fallback) |
| `GROQ_API_KEY3` | No | Third key (rate-limit fallback) |
| `GEMINI_API_KEY` | No | Gemini fallback LLM (`AIza...`) |
| `BACKEND_URL` | No (default: `http://localhost:3000`) | Node.js backend (deploy proxy endpoint) |
| `ONECHAIN_ACTIVE_NETWORK` | No (default: `testnet`) | Network to deploy Move packages to |
| `ONECHAIN_TESTNET_RPC` | No | Override default testnet RPC |
| `ONECHAIN_MAINNET_RPC` | No | Override default mainnet RPC |
| `ONECHAIN_DEVNET_RPC` | No | Override default devnet RPC |
| `PORT` | No (default: `8000`) | Port the service listens on |
| `SESSION_TTL_SECONDS` | No (default: `7200`) | How long an AI session is kept in memory (seconds) |
| `LOG_LEVEL` | No (default: `info`) | Logging verbosity: `debug`, `info`, `warning`, `error` |

---

## Obtaining API Keys

### Groq

1. Go to [console.groq.com](https://console.groq.com) and sign in
2. **API Keys → Create API Key** — give it a name (e.g. `inflow-1`)
3. Copy the key immediately (shown only once, starts with `gsk_`)
4. Repeat to create additional keys for rate-limit resilience

> Free tier has per-minute and daily token limits. Multiple keys from separate accounts give independent quotas.

### Google Gemini

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API Key → Create API key** (starts with `AIza`)

Or via Google Cloud Console: enable **Generative Language API** → **APIs & Services → Credentials → Create API key**.

> Free tier is rate-limited. Enable billing on the Google Cloud project for production workloads.

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. **Settings → API** — copy Project URL, `anon` key, and `service_role` key
3. Run the schema: **SQL Editor → New query** → paste contents of `backend/database/schema.sql` → **Run**

### Pinata (IPFS)

1. Sign up at [app.pinata.cloud](https://app.pinata.cloud)
2. **API Keys → New Key** → enable `pinFileToIPFS` + `pinJSONToIPFS` → **Generate**

### Gmail App Password

1. The Gmail account must have 2-Step Verification enabled
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. **Select app: Mail** / **Select device: Other** → enter `InFlow` → **Generate**
4. Copy the 16-character password

### OneChain Faucet (Testnet OCT)

After setting up a wallet, get test OCT from the official faucet:

```bash
curl -X POST https://faucet-testnet.onelabs.cc/gas \
  -H 'Content-Type: application/json' \
  -d '{"FixedAmountRequest": {"recipient": "YOUR_ADDRESS"}}'
```

Or use the web faucet at [faucet-testnet.onelabs.cc](https://faucet-testnet.onelabs.cc).
