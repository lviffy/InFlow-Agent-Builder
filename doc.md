# InFlow

> **Build blockchain agents without writing a single line of code.**

InFlow is a no-code, AI-powered platform for building, deploying, and interacting with blockchain agents on **OneChain**. It bridges the gap between complex on-chain operations and everyday users by combining a visual drag-and-drop workflow builder with **Gemini 2.0 Flash AI** — so anyone can automate blockchain tasks through natural language or a visual canvas.

---

## What It Does

InFlow lets users create sophisticated blockchain automation workflows in minutes. Whether you want to deploy a token, launch an NFT collection, publish a Move package on OneChain, or orchestrate multi-step on-chain transactions, InFlow handles the complexity under the hood.

---

## Available Tools & Automations

### Token Operations

| Tool | What It Does |
|---|---|
| **Deploy Move Token** | Deploy a custom fungible token on OneChain using the Move token factory module. Configure name, symbol, decimals, and initial supply. |
| **Get Token Info** | Retrieve metadata for any deployed Move coin — name, symbol, decimals, total supply, and package ID. |
| **Get Token Balance** | Check the Move coin balance of any wallet address for a specific coin type. |

### NFT Operations

| Tool | What It Does |
|---|---|
| **Deploy Move NFT Collection** | Launch a new NFT collection via the Move NFT factory module with custom name, symbol, and description. On-chain metadata supported. |
| **Mint NFT** | Mint a new NFT in an existing collection to any wallet address. Supports batch minting and custom token URIs. |
| **Get NFT Info** | Query NFT ownership, token URI, and collection metadata for any collection and token ID. |

### Transfer & Balance

| Tool | What It Does |
|---|---|
| **Transfer OCT / Move Coins** | Send native OCT or any Move coin type between addresses with automatic gas budget estimation and balance checking. |
| **Get Wallet Balance** | Check the native OCT balance (in MIST) of any wallet address on OneChain. |

### Token Approvals

| Tool | What It Does |
|---|---|
| **Approve Coin Spending** | Approve a spender address to use Move coins on your behalf via the kiosk or transfer-policy pattern. |
| **Revoke Approval** | Revoke a previously granted coin spending approval. |
| **Check Allowance** | Query the current spending allowance between any owner-spender pair. |

### Wallet Utilities

| Tool | What It Does |
|---|---|
| **Wrap OCT** | Wrap native OCT for use in DeFi protocols. |
| **Unwrap OCT** | Unwrap previously wrapped OCT back to native form. |
| **Transaction Status** | Look up any transaction by digest — status, effects, and gas used. |
| **Wallet History** | Fetch full transaction history for any OneChain address via the explorer API. |

### Price & Market Data

| Tool | What It Does |
|---|---|
| **Fetch Token Price** | AI-powered real-time crypto price lookups via CoinGecko. Supports multi-token queries ("btc eth sol" in one go), with 24h change, market cap, and volume data. |
| **Calculate** | Perform math operations with variables — useful for chaining with price and balance queries (e.g., compute portfolio value). |

### Smart Contract Interaction

| Tool | What It Does |
|---|---|
| **Contract Explorer** | Discover any verified contract — fetches ABI from Etherscan and lists all read/write functions, categorized. |
| **Natural Language Executor** | Speak natural language to interact with any smart contract. The AI maps your intent to the correct function call and executes it. |
| **Contract AI Chat** | Ask questions about any smart contract's ABI and get AI-powered explanations of what its functions do. |

### Move Package Deployment on OneChain

| Tool | What It Does |
|---|---|
| **AI-Guided Package Configuration** | A conversational AI walks you through configuring a Move package on OneChain step-by-step — use case, package name, network (testnet/mainnet), owner address, and gas budget. |
| **Use-Case Presets** | Pre-built configuration templates for Token, NFT, DeFi, Gaming, and General-purpose packages. |
| **Deploy Move Package** | Deploy the configured Move package with real-time deployment progress tracking. |
| **Config Management** | Save, load, update, validate, and delete package configurations. |

### Communication

| Tool | What It Does |
|---|---|
| **Send Email** | Send plain text, HTML, or attachment emails via Gmail SMTP. Supports CC, BCC, reply-to, and multiple recipients — useful for automated notifications in workflows. |

### Payments (x402 Protocol)

| Tool | What It Does |
|---|---|
| **OCT Payment Escrow** | On-chain payment escrow for premium agent features. OCT is held in escrow and released only on successful execution — automatic refunds on failure. |
| **AI Quota Tracking** | Track usage and spending per agent with per-tool pricing. |

---

## How It Works

Users have two ways to build agents:

**AI-Powered Generation** — describe your workflow in plain English and Gemini 2.0 Flash automatically selects, configures, and connects the right blockchain tools for you.

**Visual Builder** — drag and drop tools onto a React Flow canvas, connect them into a sequence, and configure parameters through a clean UI — no terminal, no code.

Once built, agents can be interacted with via a **chat interface** or called programmatically through a **REST API** using a personal API key.

### Intelligent Tool Routing

Under the hood, InFlow uses an **AI-powered tool routing system** that:

1. **Analyzes** your natural language message to determine intent
2. **Plans execution** — decides which tools to call, in what order (sequential or parallel), and extracts parameters automatically
3. **Chains outputs** — passes results between sequential tools (e.g., get balance → fetch price → calculate total value)
4. **Handles missing info** — asks for any parameters it can't infer before executing
5. **Guards against off-topic requests** — rejects non-blockchain questions with regex + AI classification
6. **Falls back gracefully** — if the AI agent backend is unavailable, a direct tool executor handles requests locally

### AI Provider Chain

All AI operations use a cascading fallback pattern for reliability:

1. **Groq** (Primary) — Kimi K2 Instruct / Llama 3.3 70B
2. **Google Gemini** (Fallback) — Gemini 2.0 Flash
3. **OpenAI GPT-4** (Final fallback)

---

## Technical Architecture

InFlow is a full-stack application composed of five services:

| Layer | Technology | Port |
|---|---|---|
| Frontend | Next.js 15, React 19, TypeScript, React Flow, Tailwind CSS | 3000 |
| Backend API | Express.js, `@mysten/sui` SDK | 3000 |
| AI Agent Service | FastAPI, Groq / Gemini with function calling | 8000 |
| Workflow Generator | FastAPI, Gemini 2.0 Flash | 8001 |
| Package Deployer AI | FastAPI, Groq / Gemini (multi-turn conversational) | 8002 |
| Blockchain | OneChain Testnet / Mainnet (OCT) | — |
| Smart Contracts | Move language modules | — |
| Auth | OneWallet via `@mysten/dapp-kit` | — |
| Database | Supabase (PostgreSQL) | — |

The smart contracts powering token and NFT deployment are written in **Move** and deployed as packages on OneChain — leveraging the Move object model for safety and composability.

Payments flow through a custom **PaymentEscrow Move module** implementing the x402 protocol, with automatic refunds triggered on failed transactions.

---

## Key Highlights

- **Zero-code blockchain automation** — visual builder and AI generation lower the barrier to entry for on-chain operations
- **Move-powered contracts** — token and NFT factories leverage the Move object model for safety and composability on OneChain
- **Composable agent workflows** — chain multiple blockchain tools into sequential, automated pipelines
- **Natural language contract interaction** — talk to any verified smart contract in plain English
- **Move package deployment** — configure and deploy custom Move packages through a conversational AI
- **Intelligent multi-tool execution** — AI plans and sequences complex operations with parameter passing between steps
- **API-first agents** — every agent exposes a REST API, enabling programmatic access from any external system
- **Secure key management** — encrypted key storage in Supabase with backend-authorized payment execution
- **Pay-per-use model** — x402 OCT escrow ensures users only pay for actions that succeed
- **Email automation** — send notifications and reports as part of agent workflows
- **Multi-provider AI resilience** — cascading fallback across Groq, Gemini, and OpenAI

---

## Live Demo

| Resource | Link |
|---|---|
| Live App | [blockops.in](https://blockops.in) |
| Demo Video | [Google Drive](https://drive.google.com/drive/folders/137-DEv4MkspcmfuAN-ETsxpGMqzmZeZl?usp=sharing) |
| Payment Contract | [OneChain Explorer](https://explorer-testnet.onelabs.cc) |

---

*Built on OneChain · MIT License*