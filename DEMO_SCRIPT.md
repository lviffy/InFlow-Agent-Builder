# InFlow — OneHack 3.0 Demo Script
**Track: AI | Hackathon: OneHack 3.0 (AI & GameFi Edition) | Prize Pool: $16,100 USDT**

---

## What Judges Are Looking For

OneHack 3.0 scores submissions on four criteria. Every scene in this demo is designed to hit at least one of them directly.

| Criterion | What it means | Where InFlow wins |
|---|---|---|
| **Originality** | Fresh approach, not a generic clone | AI-to-blockchain workflow pipeline; no comparable tool on OneChain |
| **Technical execution** | Working MVP, real transactions, no smoke-and-mirrors | Live Move contract deploys and transfers on testnet |
| **Product usability** | End-to-end UX, not just a tech demo | Natural language chat → on-chain action in one turn |
| **OneChain integration** | Meaningful use of OneChain-native infra | Move smart contracts, OCT token, `@mysten/sui` SDK, x402 escrow |

> **Submission checklist:** GitHub link ✅ · Demo video ✅ · Built on OneChain Move ✅ · Registered via official Google Form ✅

---

## Project Summary (30-second elevator pitch)

> "InFlow is a no-code AI agent platform for OneChain. Instead of writing Move code to deploy tokens, mint NFTs, or automate transfers, you describe what you want in plain English. AI generates a visual workflow, the agent executes it on-chain, and you can expose the whole thing via a chat UI or a REST endpoint — without touching a single line of code."

---

## Demo Script

### Scene 1 — The Problem (0:00 – 0:20)

**Voiceover:**
> "Building on OneChain today requires Move expertise: writing modules, constructing PTBs, managing TreasuryCaps, handling gas. That knowledge barrier shuts out most developers. InFlow removes it entirely."

**On screen:**
- Brief slide or text overlay: `Move code → 50+ lines to deploy a token`
- Transition to InFlow landing page at `InFlow.vercel.app`
- Connect OneWallet — show address in nav

---

### Scene 2 — AI Track: Natural Language to Workflow (0:20 – 1:00)

**Voiceover:**
> "This is the AI track entry. InFlow takes a plain English prompt and converts it into a complete, executable blockchain workflow using Gemini 2.0 Flash. No config files. No ABIs. No deployment scripts."

**On screen:**
1. Navigate to **Agent Builder → AI Generation tab**
2. Type the prompt:
   > `"Deploy a token called PixelGold with symbol PXG and 1 billion supply, then transfer 10,000 PXG to 0xABCD..."`
3. Hit generate — show the AI processing indicator
4. **React Flow canvas populates**: two connected nodes appear — `Deploy Move Token → Transfer`
5. Click each node to show auto-filled parameters: name, symbol, decimals, recipient address

**Why this scores on originality + OneChain integration:**
InFlow is the only no-code AI agent builder targeting OneChain's Move stack. Every node maps directly to a PTB (Programmable Transaction Block) executed through `@mysten/sui`.

---

### Scene 3 — Visual Builder: Extend the Workflow (1:00 – 1:25)

**Voiceover:**
> "The generated workflow is fully editable. Builders can drag in additional tools — NFT collection deployment, price fetching, extra transfers — and chain them together visually. This is React Flow wired directly to Move smart contract calls."

**On screen:**
1. Drag the **NFT Collection** tool node from the sidebar
2. Connect it after the token transfer node
3. Open the node config panel — fill in: `name: PixelHeroes`, `symbol: PHRO`, `description: GameFi NFT collection`
4. Click **Save Agent** — show the success toast and agent ID being stored in Supabase

---

### Scene 4 — Live Execution: Real On-Chain Transaction (1:25 – 2:10)

**Voiceover:**
> "Now we interact with the saved agent through its chat interface. This isn't a simulation. The agent resolves our natural language prompt, calls the Move factory contracts, signs the transactions with the agent wallet, and broadcasts to OneChain testnet — all in one turn."

**On screen:**
1. Navigate to the agent's chat page (`/agent/:id`)
2. Type:
   > `"Deploy the PixelGold token and send 500 PXG to 0xABCD..."`
3. Show the agent response including:
   - `packageId: 0x...`
   - `transactionDigest: ABC123...`
   - Explorer link: `https://explorer-testnet.onelabs.cc/txblock/ABC123...`
4. **Click the explorer link** — show the confirmed transaction on OneChain testnet with:
   - Token deployed via `TokenFactory` Move module
   - Transfer PTB confirmed
   - Gas paid in OCT

**Why this scores on technical execution:**
Real Move contract deployment. Real on-chain state. Real transaction hash that anyone can verify.

---

### Scene 5 — GameFi Angle: Token Rewards Agent (2:10 – 2:35)

**Voiceover:**
> "For the GameFi track: imagine a game backend that needs to reward players automatically. With InFlow, you create an agent that listens for a REST call, deploys reward tokens, and transfers them — no backend blockchain code needed. The game server sends one API call and InFlow handles everything on-chain."

**On screen:**
1. Show the **API key** on the My Agents dashboard
2. Show a short `curl` snippet:
   ```bash
   curl -X POST https://your-backend/agent/chat \
     -H "x-api-key: YOUR_KEY" \
     -d '{"user_message": "Send 100 PXG to player 0xDEF... as milestone reward"}'
   ```
3. Show the JSON response with `transactionDigest` and `explorerUrl`
4. Briefly show the **x402 payment demo** page — OCT escrow flow for premium tool calls

---

### Scene 6 — Architecture Callout (2:35 – 2:50)

**Voiceover:**
> "Under the hood: a Next.js frontend, an Express backend using the `@mysten/sui` SDK, two FastAPI services powered by Gemini 2.0 Flash, and Move smart contracts for token and NFT deployment and x402 payment escrow. Everything runs on OneChain."

**On screen:**
- Show the architecture diagram from the README (Mermaid graph)
- Highlight the OneChain layer: `TokenFactory`, `NFTFactory`, `PaymentEscrow` Move modules
- Point to OCT as the native gas and payment token

---

### Scene 7 — Closing (2:50 – 3:00)

**Voiceover:**
> "InFlow makes OneChain's Move capabilities accessible to anyone — game developers, product teams, non-technical founders — through an AI-first interface. Build an agent in minutes. Ship on-chain in seconds. That's InFlow."

**On screen:**
- End on the My Agents dashboard showing the saved agent card with its name, tool count, and API key
- Fade to InFlow logo

---

## Judging Scorecard — How InFlow Maps to Each Criterion

### Originality
InFlow is the only no-code AI agent platform on OneChain. The combination of Gemini 2.0 function calling + React Flow visual builder + Move PTB execution is novel within the OneChain ecosystem. There is no comparable tool in the current DoraHacks submission pool.

### Technical Execution
- Move `TokenFactory` and `NFTFactory` modules deployed and verified on testnet
- PTBs constructed and broadcast via `@mysten/sui` SDK
- Gemini 2.0 Flash function calling routes natural language to the correct tool endpoint
- FastAPI + Express microservices architecture with async execution
- Supabase for agent persistence, Privy/OneWallet for auth
- x402 protocol OCT escrow implemented and testable on `/payment-demo`

### Product Usability
- Zero blockchain knowledge required to create and run an agent
- End-to-end flow: describe → generate → save → chat → transaction confirmed, in under 2 minutes
- Every transaction surfaces a clickable OneChain explorer link
- REST API + unique API key allows programmatic access from any backend
- Responsive UI works on desktop and mobile

### OneChain Ecosystem Integration
| Component | OneChain usage |
|---|---|
| Token deployment | `TokenFactory` Move module, `Coin<T>` standard, `TreasuryCap` |
| NFT deployment | `NFTFactory` Move module, `Display` + `CollectionCap` |
| Transfers | PTBs via `@mysten/sui`, native OCT and custom coin types |
| Payments | x402 protocol, OCT escrow, `PaymentEscrow` Move module |
| RPC | `https://rpc-testnet.onelabs.cc:443` |
| Explorer | `https://explorer-testnet.onelabs.cc` |
| Wallet | OneWallet via `@mysten/dapp-kit` |

---

## Submission Checklist

- [ ] Project registered via official OneHack 3.0 Google Form
- [ ] DoraHacks BUIDL submission linked to the same project
- [ ] GitHub repo is public and contains all four services (frontend, backend, AI backend, contracts)
- [ ] Demo video is ≤ 3 minutes and shows a live on-chain transaction
- [ ] Explorer link to at least one confirmed testnet transaction included in submission
- [ ] README documents setup, environment variables, and contract addresses
- [ ] Track selected: **AI**

---

## Key Links for Submission

| Resource | URL |
|---|---|
| Live demo | `https://InFlow.vercel.app/` |
| GitHub | *(add repo URL)* |
| Payment contract on explorer | `https://explorer-testnet.onelabs.cc` |
| Hackathon page | `https://onehackathon.com` |
| DoraHacks listing | `https://dorahacks.io/hackathon/onehackathon` |

---

## Recording Tips

- Record at 1080p, browser zoom at 90–100%
- Preload `/agent/:id` chat page before recording — cold loads can be slow
- Have the `curl` snippet pre-typed in a terminal so you can paste it instantly
- If a testnet transaction takes more than 10 seconds, narrate the expected result and cut to the confirmed explorer page recorded separately
- Final cut target: **under 3 minutes** (OneHack requires a demo video; shorter and tighter is better)
- Export as MP4, 1080p, under 500MB