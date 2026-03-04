# InFlow → OneChain Migration Ideas & Implementation Guide

> **Current Stack**: Arbitrum Sepolia (EVM) + Solidity/Stylus + ethers.js  
> **Target Stack**: OneChain (Move-based) + Move smart contracts + OneChain TypeScript/Rust SDK  
> **OneChain Docs**: https://docs.onelabs.cc/DevelopmentDocument  
> **Native Token**: OCT (OneChain Token)

---

## 🔑 Key Architecture Difference

| Feature | Arbitrum (Current) | OneChain (Target) |
|---|---|---|
| Smart Contract Language | Solidity / Rust (Stylus) | **Move** |
| Chain Paradigm | Account-based (EVM) | **Object-based** |
| SDK | ethers.js | **@mysten/sui/transactions** (OneChain fork of Sui) |
| Native Token | ETH | **OCT** |
| Wallet | MetaMask / Privy | **OneWallet** |
| RPC | `https://sepolia-rollup.arbitrum.io/rpc` | `https://rpc-testnet.onelabs.cc:443` |
| Explorer | Arbiscan | OneChain Explorer |
| Contract Deploy | `cargo stylus deploy` / Hardhat | `one client publish` |

> **Important**: OneChain is Move-based (like Sui). Smart contracts are called **Move packages**, not Solidity contracts. There are no ABIs — you call functions by their Move module path.

---

## 🏗️ Section 1 — Core Infrastructure Changes

### 1.1 Replace Network Configuration

**File:** `backend/config/constants.js`

```js
// BEFORE (Arbitrum)
ARBITRUM_SEPOLIA_RPC: 'https://sepolia-rollup.arbitrum.io/rpc',
NETWORK_NAME: 'Arbitrum Sepolia',
EXPLORER_BASE_URL: 'https://sepolia.arbiscan.io',

// AFTER (OneChain)
ONECHAIN_TESTNET_RPC: 'https://rpc-testnet.onelabs.cc:443',
ONECHAIN_MAINNET_RPC: 'https://rpc-mainnet.onelabs.cc:443',
NETWORK_NAME: 'OneChain Testnet',
EXPLORER_BASE_URL: 'https://explorer-testnet.onelabs.cc',
NATIVE_TOKEN: 'OCT',
```

### 1.2 Replace ethers.js with OneChain SDK

OneChain is built on the same architecture as Sui.  
Install: `npm install @mysten/sui`

```ts
// BEFORE (ethers.js)
import { ethers } from 'ethers';
const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
const wallet = new ethers.Wallet(privateKey, provider);

// AFTER (OneChain SDK)
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://rpc-testnet.onelabs.cc:443' });
const keypair = Ed25519Keypair.fromSecretKey(secretKey);
```

### 1.3 Replace `blockchain.js` Utility

```js
// AFTER — new backend/utils/blockchain.js
const { SuiClient } = require('@mysten/sui/client');
const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

function getClient() {
  return new SuiClient({ url: ONECHAIN_RPC });
}

async function getBalance(address) {
  const client = getClient();
  const balance = await client.getBalance({ owner: address });
  return balance.totalBalance; // in MIST (1 OCT = 1,000,000,000 MIST)
}
```

### 1.4 Replace `helpers.js` Explorer URLs

```js
// BEFORE
getTxExplorerUrl: (hash) => `https://sepolia.arbiscan.io/tx/${hash}`

// AFTER
getTxExplorerUrl: (digest) => `https://explorer-testnet.onelabs.cc/txblock/${digest}`
getAddressExplorerUrl: (addr) => `https://explorer-testnet.onelabs.cc/address/${addr}`
getObjectExplorerUrl: (id) => `https://explorer-testnet.onelabs.cc/object/${id}`
```

---

## 📦 Section 2 — Smart Contract Migration (Move Packages)

All Solidity / Stylus contracts must be rewritten in **Move** for OneChain.

### 2.1 Token Factory → Move Coin Package

**Current**: Stylus ERC-20 factory (`contract/token_factory/`)  
**New**: Move package using `one::coin` module

```move
// contract/token_factory_move/sources/token_factory.move
module token_factory::managed_coin;

use one::coin::{Self, TreasuryCap, CoinMetadata};
use one::tx_context::TxContext;

// Each token is a unique Move type (not an ERC-20 mapping)
// Users call this to create their own fungible token
public fun create_token<T: drop>(
    witness: T,
    decimals: u8,
    symbol: vector<u8>,
    name: vector<u8>,
    description: vector<u8>,
    icon_url: vector<u8>,
    initial_supply: u64,
    ctx: &mut TxContext,
): (TreasuryCap<T>, CoinMetadata<T>) {
    coin::create_currency(
        witness, decimals, symbol, name,
        description, icon_url, ctx
    )
}
```

- Deploy with: `one client publish --gas-budget 50000000`
- No factory contract needed — each Move module is its own token type

### 2.2 NFT Factory → Move NFT Package

**Current**: Stylus ERC-721 factory (`contract/nft_factory/`)  
**New**: Move package using `one::object` and `one::display`

```move
// contract/nft_factory_move/sources/nft.move
module nft_factory::nft;

use one::{object::{Self, UID}, tx_context::{Self, TxContext}};
use one::transfer;
use std::string::{Self, String};

public struct NFT has key, store {
    id: UID,
    name: String,
    description: String,
    url: String,
    creator: address,
}

public fun mint(
    name: vector<u8>,
    description: vector<u8>,
    url: vector<u8>,
    ctx: &mut TxContext,
): NFT {
    NFT {
        id: object::new(ctx),
        name: string::utf8(name),
        description: string::utf8(description),
        url: string::utf8(url),
        creator: tx_context::sender(ctx),
    }
}

public fun transfer(nft: NFT, recipient: address) {
    transfer::public_transfer(nft, recipient);
}
```

### 2.3 Payment Contract → Move Escrow Package

**Current**: Solidity ERC-20 payment escrow (`contract/payment-contracts/`)  
**New**: Move escrow using `one::coin` and shared objects

```move
// contract/payment_escrow_move/sources/escrow.move
module payment_escrow::escrow;

use one::{coin::{Self, Coin}, oct::OCT, transfer, object::{Self, UID}};
use one::tx_context::{Self, TxContext};

public struct Payment has key {
    id: UID,
    payer: address,
    recipient: address,
    amount: u64,
    tool_name: std::string::String,
    executed: bool,
}

public fun create_payment(
    coin: Coin<OCT>,
    recipient: address,
    tool_name: vector<u8>,
    ctx: &mut TxContext,
) {
    let payment = Payment {
        id: object::new(ctx),
        payer: tx_context::sender(ctx),
        recipient,
        amount: coin::value(&coin),
        tool_name: std::string::utf8(tool_name),
        executed: false,
    };
    // Hold coin in escrow by sharing the object
    transfer::share_object(payment);
    // In real impl, use dynamic fields to hold the coin
}
```

---

## 💻 Section 3 — Backend Controller Changes

### 3.1 Token Controller (PTB-based deployment)

```js
// AFTER — backend/controllers/tokenController.js
const { Transaction } = require('@mysten/sui/transactions');
const { SuiClient } = require('@mysten/sui/client');

async function deployToken(req, res) {
  const { name, symbol, decimals, initialSupply, secretKey } = req.body;
  const client = new SuiClient({ url: ONECHAIN_TESTNET_RPC });
  
  const tx = new Transaction();
  // Call the Move token factory package
  tx.moveCall({
    target: `${TOKEN_FACTORY_PACKAGE_ID}::token_factory::create_token`,
    arguments: [
      tx.pure(decimals),
      tx.pure(Array.from(Buffer.from(symbol))),
      tx.pure(Array.from(Buffer.from(name))),
      tx.pure(Array.from(Buffer.from(`${name} token`))),
      tx.pure([]),
      tx.pure(initialSupply),
    ],
  });
  
  const result = await client.signAndExecuteTransaction({
    signer: keypairFromSecret(secretKey),
    transaction: tx,
  });
  
  return res.json({
    success: true,
    digest: result.digest,
    explorerUrl: `https://explorer-testnet.onelabs.cc/txblock/${result.digest}`,
  });
}
```

### 3.2 Transfer Controller

```js
// AFTER — OCT transfer using PTB
async function transferOCT(req, res) {
  const { toAddress, amount, secretKey } = req.body;
  const client = new SuiClient({ url: ONECHAIN_TESTNET_RPC });
  
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount * 1_000_000_000)]); // Convert to MIST
  tx.transferObjects([coin], tx.pure(toAddress));
  
  const result = await client.signAndExecuteTransaction({
    signer: keypairFromSecret(secretKey),
    transaction: tx,
  });
  
  return res.json({ success: true, digest: result.digest });
}
```

### 3.3 NL Executor — Replace Etherscan with OneChain RPC

```js
// BEFORE
const params = {
  chainid: ARBITRUM_SEPOLIA_CHAIN_ID,
  module: 'contract',
  action: 'getabi',
  address: contractAddress,
  apikey: ETHERSCAN_API_KEY,
};

// AFTER — OneChain Move module inspection via RPC
async function fetchMoveModule(packageId, moduleName) {
  const client = new SuiClient({ url: ONECHAIN_TESTNET_RPC });
  const module = await client.getNormalizedMoveModule({
    package: packageId,
    module: moduleName,
  });
  return module; // Returns Move function signatures — no ABI needed
}
```

---

## 🌐 Section 4 — Frontend Changes

### 4.1 Wallet — Replace Privy with OneWallet

**Current**: Privy wallet (MetaMask/EVM)  
**New**: OneWallet (OneChain's native wallet)

```tsx
// frontend/app/providers.tsx — AFTER
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { networkConfig } = createNetworkConfig({
  testnet: { url: 'https://rpc-testnet.onelabs.cc:443' },
  mainnet: { url: 'https://rpc-mainnet.onelabs.cc:443' },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
```

Install: `npm install @mysten/dapp-kit @mysten/sui @tanstack/react-query`

### 4.2 Update Chain Config in Frontend

```ts
// frontend/lib/chain.ts — AFTER
export const ONECHAIN_TESTNET = {
  name: 'OneChain Testnet',
  rpc: 'https://rpc-testnet.onelabs.cc:443',
  faucet: 'https://faucet-testnet.onelabs.cc/',
  explorer: 'https://explorer-testnet.onelabs.cc',
  nativeCurrency: { name: 'OneChain Token', symbol: 'OCT', decimals: 9 },
};

export const ONECHAIN_MAINNET = {
  name: 'OneChain Mainnet',
  rpc: 'https://rpc-mainnet.onelabs.cc:443',
  explorer: 'https://explorer.onelabs.cc',
  nativeCurrency: { name: 'OneChain Token', symbol: 'OCT', decimals: 9 },
};
```

### 4.3 Update Payment Component

```tsx
// Replace "Please switch to Arbitrum Sepolia" → "Please connect OneWallet"
// Replace chainId: 421614 → OneChain network detection via SuiClientProvider
// Replace USDC → OCT payments
```

---

## 🔄 Section 5 — Orbit AI Backend Changes

The Orbit L3 deployer was specifically for Arbitrum Orbit chains.  
On OneChain, the equivalent concept would be **deploying Move packages** instead of full L3 chains.

### 5.1 Repurpose Orbit AI → OneChain Move Package Deployer

**New Feature Idea**: AI-guided Move package creation and deployment

```python
# orbit_ai_backend/core/prompts.py — AFTER
SYSTEM_PROMPT = """You are an expert assistant helping users deploy Move packages on OneChain.

Your role:
1. Help users create Move smart contracts (tokens, NFTs, DeFi logic)
2. Guide them through testing with `one move test`
3. Deploy packages using `one client publish`
4. Leverage OneChain-native modules: one::coin, one::nft, one::transfer

Key concepts:
- Move Package: A collection of Move modules (like an app on-chain)
- Object: Everything on OneChain is an object (owned, shared, or immutable)
- OCT: Native gas token (1 OCT = 1,000,000,000 MIST)
- PTB: Programmable Transaction Block — batch multiple operations
"""
```

### 5.2 Update ParentChain Enum

```python
# orbit_ai_backend/models/orbit_config.py — AFTER
class NetworkType(str, Enum):
    """Supported OneChain networks."""
    TESTNET = "testnet"
    MAINNET = "mainnet"
    DEVNET = "devnet"

class PackageConfig(BaseModel):
    """Move package deployment configuration."""
    package_name: str
    network: NetworkType = NetworkType.TESTNET
    owner_address: str
    gas_budget: int = 50_000_000  # in MIST
    use_case: Optional[str] = None  # token, nft, defi, game, general
```

---

## 🆕 Section 6 — New Features to Build Using OneChain Native Products

These are brand-new features that leverage OneChain's native ecosystem.

### 6.1 OneTransfer Integration

Use **OneTransfer** (native cross-chain transfer) in InFlow' transfer UI.

- Add a "OneTransfer" option in the transfer controller
- UI: Transfer tokens across chains using OneTransfer protocol
- API endpoint: `POST /api/transfer/one-transfer`

### 6.2 OneDEX Integration

Integrate **OneDEX** (native DEX on OneChain) for token swaps.

- New feature: AI-powered swap suggestions ("Swap X OCT for Y tokens")
- NL Executor command: "Swap 10 OCT for GameCoin on OneDEX"
- Move call to OneDEX package from the InFlow backend

```js
// New backend/controllers/dexController.js
async function swapTokens(req, res) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${ONEDEX_PACKAGE_ID}::swap::swap_exact_input`,
    arguments: [...],
  });
  // ...
}
```

### 6.3 OneID Integration

Use **OneID** (decentralized identity on OneChain) for user profiles.

- Replace Privy user profiles with OneID
- Display `.one` names instead of raw wallet addresses
- "Register your OneID" onboarding step

```ts
// Resolve OneID to address
const identity = await client.resolveNameServiceAddress({ name: 'username.one' });
```

### 6.4 OneWallet Connect

Integrate **OneWallet** as the primary wallet:

- Install OneWallet browser extension for users
- Use `@mysten/dapp-kit` `<ConnectButton />` component
- Replace all Privy wallet connect UI with OneWallet connect

### 6.5 AI-Powered Move Contract Generator

New feature: Chat interface that generates and deploys Move packages.

- User types: "Create an NFT collection for my game called CryptoKnights"  
- AI generates Move package code  
- Backend calls `one move build` and `one client publish`  
- Returns package ID and explorer link

```python
# New n8n_agent_backend tool: deploy_move_package
{
    "type": "deploy_move_package",
    "description": "Generate and deploy a Move package on OneChain",
    "parameters": {
        "package_type": "token|nft|game|defi",
        "name": "package name",
        "config": {}
    }
}
```

### 6.6 OCT Faucet Integration (Testnet)

Add a faucet button in the frontend for testnet OCT.

```ts
// Request testnet OCT
await fetch('https://faucet-testnet.onelabs.cc/v1/gas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    FixedAmountRequest: { recipient: userAddress }
  }),
});
```

### 6.7 OneRWA Integration

Add **Real World Asset** tokenization feature using OneRWA.

- New section in InFlow: "Tokenize Real Assets"  
- Create RWA tokens representing real-world assets  
- Deploy on OneChain via OneRWA protocol

### 6.8 OnePredict Integration

Integrate **OnePredict** (prediction markets) as an AI-powered feature.

- "Create a prediction market" NL command
- AI helps structure prediction contract parameters
- Deploy via OnePredict protocol on OneChain

---

## 🗂️ Section 7 — File-by-File Change Summary

| File | Change Required | Priority |
|---|---|---|
| `backend/config/constants.js` | Replace Arbitrum RPC/config with OneChain | 🔴 Critical |
| `backend/utils/blockchain.js` | Replace ethers.js with OneChain SDK | 🔴 Critical |
| `backend/utils/helpers.js` | Update explorer URLs | 🔴 Critical |
| `backend/controllers/tokenController.js` | Rewrite for Move PTB | 🔴 Critical |
| `backend/controllers/nftController.js` | Rewrite for Move PTB | 🔴 Critical |
| `backend/controllers/transferController.js` | Use OCT transfers via PTB | 🔴 Critical |
| `backend/controllers/nlExecutorController.js` | Replace Etherscan with OneChain RPC | 🔴 Critical |
| `backend/controllers/priceController.js` | Add OCT price tracking | 🟡 Important |
| `backend/controllers/orbitController.js` | Repurpose for Move package deploy | 🟡 Important |
| `backend/utils/orbitDeployer.js` | Rewrite for OneChain package deployer | 🟡 Important |
| `frontend/lib/chain.ts` (new) | OneChain network config | 🔴 Critical |
| `frontend/app/providers.tsx` | Replace Privy with OneWallet/SuiClientProvider | 🔴 Critical |
| `frontend/components/payment/*` | Replace USDC/Arbitrum with OCT/OneChain | 🔴 Critical |
| `frontend/.env.local` | Update RPC URL, Chain ID | 🔴 Critical |
| `contract/token_factory/` | Rewrite in Move | 🔴 Critical |
| `contract/nft_factory/` | Rewrite in Move | 🔴 Critical |
| `contract/payment-contracts/` | Rewrite in Move | 🔴 Critical |
| `orbit_ai_backend/models/orbit_config.py` | Replace Arbitrum Orbit with OneChain pkg config | 🟡 Important |
| `orbit_ai_backend/core/prompts.py` | Update AI prompts for Move/OneChain | 🟡 Important |
| `README.md` | Update all references | 🟢 Low |

---

## 🛠️ Section 8 — Environment Variable Changes

```env
# frontend/.env.local — AFTER

# OneChain Network
NEXT_PUBLIC_RPC_URL=https://rpc-testnet.onelabs.cc:443
NEXT_PUBLIC_CHAIN_NAME=OneChain Testnet
NEXT_PUBLIC_FAUCET_URL=https://faucet-testnet.onelabs.cc/

# Move Package IDs (after deployment)
NEXT_PUBLIC_TOKEN_FACTORY_PACKAGE_ID=0x...
NEXT_PUBLIC_NFT_FACTORY_PACKAGE_ID=0x...
NEXT_PUBLIC_PAYMENT_PACKAGE_ID=0x...

# OneChain-native products
NEXT_PUBLIC_ONEDEX_PACKAGE_ID=0x...
NEXT_PUBLIC_ONEID_PACKAGE_ID=0x...
NEXT_PUBLIC_ONETRANSFER_PACKAGE_ID=0x...

# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_AI_BACKEND_URL=http://localhost:8000

# Supabase (unchanged)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

```env
# backend/.env — AFTER
ONECHAIN_TESTNET_RPC=https://rpc-testnet.onelabs.cc:443
ONECHAIN_MAINNET_RPC=https://rpc-mainnet.onelabs.cc:443
TOKEN_FACTORY_PACKAGE_ID=0x...
NFT_FACTORY_PACKAGE_ID=0x...
PAYMENT_PACKAGE_ID=0x...
BACKEND_WALLET_SECRET_KEY=your_ed25519_secret_key
```

---

## 🚀 Section 9 — Quick Start for OneChain Dev

```bash
# 1. Install OneChain CLI
cargo install --locked --git https://github.com/one-chain-labs/onechain.git one --features tracing

# 2. Connect to testnet
one client new-env --alias testnet --rpc https://rpc-testnet.onelabs.cc:443
one client switch --env testnet

# 3. Get testnet OCT
one client faucet

# 4. Create a new Move package
one move new blockops_token

# 5. Build and test
one move build
one move test

# 6. Deploy (publish)
one client publish --gas-budget 50000000

# 7. Check your address and objects
one client address
one client objects
```

---

## 📋 Section 10 — Suggested Implementation Order

1. **Phase 1 - Infrastructure** (Week 1)
   - Replace `constants.js` network config
   - Rewrite `blockchain.js` with OneChain SDK
   - Update `helpers.js` explorer URLs
   - Update `.env` files

2. **Phase 2 - Smart Contracts** (Week 1-2)
   - Write Move token factory package
   - Write Move NFT factory package
   - Write Move payment escrow package
   - Test with `one move test`
   - Deploy to testnet with `one client publish`

3. **Phase 3 - Backend** (Week 2)
   - Rewrite token/NFT/transfer controllers for PTB
   - Update NL Executor for Move modules
   - Add OCT price to price controller
   - Update health check endpoint

4. **Phase 4 - Frontend** (Week 2-3)
   - Replace Privy with `@mysten/dapp-kit` + OneWallet
   - Update payment components for OCT
   - Add testnet faucet button
   - Update chain config

5. **Phase 5 - New Features** (Week 3+)
   - OneDEX swap integration
   - OneID name resolution
   - AI Move contract generator
   - OneTransfer cross-chain support
   - OneRWA / OnePredict integrations

---

## 📚 Resources

| Resource | Link |
|---|---|
| Developer Docs | https://docs.onelabs.cc/DevelopmentDocument |
| RPC Reference | https://docs.onelabs.cc/RPC |
| Testnet Faucet | https://faucet-testnet.onelabs.cc/ |
| Devnet Faucet | https://faucet-devnet.onelabs.cc/ |
| OneBox (AI Toolkit) | https://onebox.onelabs.cc/chat |
| GitHub | https://github.com/one-chain-labs/onechain |
| OneChain Framework | `@mysten/sui` npm package |
| Move Examples | https://github.com/one-chain-labs/onechain/tree/main/examples |
| OneLabs Homepage | https://onelabs.cc/ |
