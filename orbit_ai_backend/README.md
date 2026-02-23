# Orbit AI Backend

A dedicated FastAPI service providing a **multi-turn conversational AI** that guides users through creating and deploying **Move packages on OneChain** (token, NFT, DeFi, game contracts).

> Previously: Arbitrum Orbit L3 chain deployer  
> Now: OneChain Move Package Deployer

---

## Quick Start

```bash
cp .env.example .env
# Fill in your API keys in .env
docker-compose up -d
```

Or run locally:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## What It Does

1. User opens the chat UI and describes what they want to build (token, NFT, game contract, etc.)
2. The AI collects required configuration step by step:
   - **use_case** — token / nft / defi / game / general
   - **package_name** — Move-friendly name (e.g. `my_token`, `crypto_knights_nft`)
   - **network** — testnet / mainnet / devnet
   - **owner_address** — OneChain wallet address (0x + 64 hex)
   - **gas_budget** — in MIST (1 OCT = 1,000,000,000 MIST)
3. AI builds a `PackageConfig` and sends it to the Node.js backend for deployment via `one client publish`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/api/orbit-ai/chat` | Main conversation endpoint |
| GET | `/api/orbit-ai/session/{id}` | Get session state + history |
| POST | `/api/orbit-ai/session/{id}/reset` | Reset session to start over |
| GET | `/api/orbit-ai/presets` | Use-case presets (token, nft, defi, game, general) |
| POST | `/api/orbit-ai/deploy` | Deploy Move package (proxy to Node.js backend) |
| GET | `/api/orbit-ai/deploy/status/{id}` | Poll deployment progress |

---

## Environment Variables

```env
# LLM (Groq keys rotate on rate-limit; Gemini is fallback)
GROQ_API_KEY1=gsk_...
GROQ_API_KEY2=gsk_...
GROQ_API_KEY3=gsk_...
GEMINI_API_KEY=AIzaSy...

# Node.js backend URL (receives deploy requests)
BACKEND_URL=http://localhost:3000

# OneChain
ONECHAIN_ACTIVE_NETWORK=testnet
ONECHAIN_TESTNET_RPC=https://rpc-testnet.onelabs.cc:443
ONECHAIN_MAINNET_RPC=https://rpc-mainnet.onelabs.cc:443

# Service
PORT=8000
SESSION_TTL_SECONDS=7200
LOG_LEVEL=info
```

---

## Backend Payload Format

When the user confirms deployment, the service POSTs to `BACKEND_URL/api/orbit/deploy`:

```json
{
  "packageName": "my_token",
  "network": "testnet",
  "ownerAddress": "0xabc...def",
  "packageType": "token",
  "gasBudget": 50000000,
  "useCase": "token",
  "tokenConfig": {
    "name": "MyToken",
    "symbol": "MTK",
    "decimals": 9,
    "initialSupply": 1000000000
  }
}
```

---

## Package Structure

```
orbit_ai_backend/
├── main.py                    # FastAPI app + endpoints
├── core/
│   ├── ai_engine.py           # Groq + Gemini LLM orchestration
│   ├── config_builder.py      # Builds PackageConfig from collected params
│   ├── conversation.py        # State machine + value extraction
│   └── prompts.py             # System prompts + step questions
├── models/
│   ├── conversation.py        # ConversationSession, ConfigStep enum
│   ├── messages.py            # API request/response schemas
│   └── orbit_config.py        # PackageConfig, PackageType, NetworkType
└── utils/
    ├── defaults.py            # Use-case presets + ONECHAIN_NETWORKS
    └── validators.py          # OneChain address validation + NLP helpers
```

---

## OneChain Key Concepts

| Concept | Description |
|---------|-------------|
| **Move Package** | Collection of Move modules deployed as one unit |
| **Object** | Everything on OneChain is an object (owned / shared / immutable) |
| **OCT** | Native gas token — 1 OCT = 1,000,000,000 MIST |
| **PTB** | Programmable Transaction Block — batch multiple ops in one tx |
| **one client publish** | CLI command to deploy a Move package |
| **Testnet Faucet** | https://faucet.onelabs.cc — free OCT for testing |
