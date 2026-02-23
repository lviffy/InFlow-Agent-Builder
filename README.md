# BlockOps

## Introduction

**BlockOps** is a no-code AI-powered platform that enables users to build, deploy, and interact with blockchain agents on **OneChain** (OCT-native Move-based chain). The platform combines a visual drag-and-drop workflow builder with AI-powered natural language processing, allowing users to create sophisticated blockchain automation workflows without writing any code.

The platform supports blockchain operations including **Move token deployment, NFT collection deployment, token transfers, and more**. All operations are powered by OneChain Move smart contracts and integrated with Gemini 2.0 Flash AI for intelligent agent interactions.

> **Note:** This is a complete full-stack application including frontend (Next.js), backend API (Express.js), AI agent services (FastAPI), and smart contracts (Move).

## Resources

* **Live Demo**: [https://blockops.vercel.app/](https://blockops.vercel.app/)
* **Demo Video**: [Watch on Google Drive](https://drive.google.com/drive/folders/137-DEv4MkspcmfuAN-ETsxpGMqzmZeZl?usp=sharing)
* **Payment Contract**: [View on OneChain Explorer](https://explorer-testnet.onelabs.cc)

### Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, React Flow
- **Backend**: Express.js, `@mysten/sui` SDK
- **AI Services**: FastAPI, Google Gemini 2.0 Flash
- **Blockchain**: OneChain (OCT), Move smart contracts
- **Authentication**: OneWallet via `@mysten/dapp-kit`
- **Database**: Supabase (PostgreSQL)

---

## How to Use

Getting started with BlockOps is simple! Follow these steps:

1. **Visit** [https://blockops.vercel.app/](https://blockops.vercel.app/)
2. **Sign In** by connecting your OneWallet (via the Connect button)
3. **Create or Import Agent Wallet** 
   - Create a new agent wallet (automatically generated)
   - Or import your own wallet using a private key

4. **Build Your Agent** - Choose your preferred method:
   
   **Option A: AI-Powered Generation**
   - Describe your agent in natural language
   - Gemini 2.0 Flash AI generates the complete workflow for you
   - AI automatically selects and configures the right tools
   
   **Option B: Visual Builder**
   - Drag and drop blockchain tools onto the canvas
   - Connect tools to create your workflow
   - Configure parameters for each tool
   - Use React Flow for visual workflow management

5. **Save Your Agent** to your Supabase database

6. **Interact with Your Agent**:
   - **UI Chat Interface**: Chat with your agent using natural language
   - **API Integration**: Use REST API calls with your unique API key
   - For premium features, payments are handled via x402 protocol with OCT escrow

7. **Execute Blockchain Actions** seamlessly on OneChain (testnet or mainnet)

That's it! You've created your first BlockOps agent without writing a single line of code!

---

## Table of Contents

1. [Platform Architecture](#platform-architecture)
2. [System Components](#system-components)
   - [Frontend](#frontend)
   - [Backend API](#backend-api)
   - [AI Agent Service](#ai-agent-service)
   - [Workflow Generator](#workflow-generator)
3. [Available Blockchain Tools](#available-blockchain-tools)
4. [Smart Contract Implementations](#smart-contract-implementations)
5. [Setup & Installation](#setup--installation)
6. [Environment Configuration](#environment-configuration)
7. [API Documentation](#api-documentation)

---

## Platform Architecture

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "User Layer"
        U[👤 User Browser]
        UI[🖥️ Next.js Frontend<br/>Port: 3000]
    end
    
    subgraph "Authentication & Database"
        WALLET[🔐 OneWallet / dapp-kit]
        SUPA[🗄️ Supabase Database]
    end
    
    subgraph "Backend Services"
        AI[🤖 AI Agent Backend<br/>FastAPI - Port 8000]
        BK[⚙️ Blockchain Backend<br/>Express - Port 3000]
        WF[🔄 Workflow Generator<br/>FastAPI - Port 8001]
    end
    
    subgraph "Blockchain Layer"
        ONE[🔗 OneChain (OCT)<br/>Testnet / Mainnet]
    end
    
    subgraph "Smart Contracts (Move)"
        TF[📝 Token Factory<br/>Move Module]
        NF[🎨 NFT Factory<br/>Move Module]
        PE[💰 Payment Escrow<br/>x402 Protocol]
        OCT[🪙 OCT Token]
    end
    
    U -->|User Actions| UI
    UI <-->|Connect Wallet| WALLET
    UI <-->|Data Storage| SUPA
    UI -->|AI Chat/Generate| AI
    UI -->|Workflow Build| WF
    AI -->|Tool Execution| BK
    BK -->|Deploy/Transfer| ONE
    ONE -->|Token Deploy| TF
    ONE -->|NFT Deploy| NF
    ONE -->|Payments| PE
    PE -->|OCT Escrow| OCT
```

### Data Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant AI
    participant Backend
    participant Blockchain
    
    User->>Frontend: Describe workflow
    Frontend->>AI: POST /agent/chat
    AI->>AI: Process with Gemini 2.0
    AI->>AI: Identify tools & parameters
    
    loop For each tool
        AI->>Backend: Execute tool endpoint
        Backend->>Blockchain: Sign & send transaction
        Blockchain-->>Backend: Transaction confirmed
        Backend-->>AI: Tool result
    end
    
    AI->>AI: Format response
    AI-->>Frontend: Results with transaction hashes
    Frontend-->>User: Display results
```

---

## System Components

### Frontend

**Technology Stack:**
- Next.js 15 (React 19)
- TypeScript
- React Flow (visual workflow builder)
- Tailwind CSS + Radix UI components
- `@mysten/dapp-kit` + OneWallet for authentication
- Supabase client for database

**Key Features:**
- Visual drag-and-drop workflow builder
- Node-based tool configuration
- Real-time AI chat interface
- Workflow saving and loading
- Agent management dashboard
- x402 protocol payment integration

**Main Pages:**
- `/` - Landing page
- `/agent-builder` - Visual workflow builder
- `/my-agents` - Agent management
- `/agent/:id` - Agent interaction interface
- `/payment-demo` - Payment testing interface

**Port:** 3000 (development)

### Backend API

**Technology Stack:**
- Express.js
- `@mysten/sui` SDK for OneChain interactions
- Axios for HTTP requests
- OpenAI/Gemini SDK for AI features

**Network:**
- OneChain Testnet RPC: `https://rpc-testnet.onelabs.cc:443`
- OneChain Mainnet RPC: `https://rpc-mainnet.onelabs.cc:443`
- Explorer: `https://explorer-testnet.onelabs.cc`
- Native token: OCT (1 OCT = 1,000,000,000 MIST)

**Key Responsibilities:**
- Blockchain interaction via `@mysten/sui`
- Move package deployment and interaction
- Token/NFT creation via Move factory modules
- PTB (Programmable Transaction Block) construction
- Transaction signing and broadcasting

**Main Endpoints:**
- `/health` - Health check
- `/token/*` - OCT fungible token operations
- `/nft/*` - Move NFT operations
- `/transfer` - Token transfer operations
- `/price` - Token price fetching

**Port:** 3000 (default)

### AI Agent Service

**Technology Stack:**
- FastAPI (Python)
- Google Gemini 2.0 Flash
- httpx for async HTTP requests

**Key Features:**
- Natural language to blockchain action conversion
- Dynamic tool configuration based on workflow
- Function calling with Gemini AI
- Context-aware tool selection
- Sequential execution support

**Main Endpoints:**
- `POST /agent/chat` - Process natural language messages
- `GET /tools` - List available tools
- `GET /health` - Health check

**Port:** 8000 (default)

### Workflow Generator

**Technology Stack:**
- FastAPI (Python)
- Google Gemini 2.0 Flash

**Key Features:**
- Natural language to workflow conversion
- Structured JSON output with tool connections
- Tool validation and suggestion
- Sequential execution planning

**Main Endpoints:**
- `POST /create-workflow` - Generate workflow from description
- `GET /available-tools` - List available tools
- `GET /health` - Health check

**Port:** 8001 (default)

---

## Available Blockchain Tools

### 1. Move Fungible Token Deployment

**Description:** Deploy custom fungible tokens on OneChain using the Move token factory module.

**Endpoint:** `POST /token/deploy`

**Parameters:**
- `name` - Token name (e.g., "MyToken")
- `symbol` - Token symbol (e.g., "MTK")
- `decimals` - Number of decimals (typically 9)
- `initialSupply` - Initial token supply (in smallest unit)
- `ownerAddress` - Deployer's OneChain address

**Implementation:**
- Uses TokenFactory Move module
- Constructs a Programmable Transaction Block (PTB)
- Automatically initializes the `TreasuryCap` and `CoinMetadata` objects
- Returns package ID and transaction digest

**Example Response:**
```json
{
  "success": true,
  "packageId": "0x...",
  "transactionDigest": "ABC123...",
  "explorerUrl": "https://explorer-testnet.onelabs.cc/txblock/ABC123..."
}
```

### 2. Move NFT Collection Deployment

**Description:** Create NFT collections with customizable metadata on OneChain.

**Endpoint:** `POST /nft/deploy-collection`

**Parameters:**
- `name` - Collection name
- `symbol` - Collection symbol
- `description` - Collection description
- `ownerAddress` - Deployer's OneChain address

**Implementation:**
- Uses NFTFactory Move module
- Supports batch minting via PTBs
- On-chain metadata storage
- Returns `CollectionCap` object ID

**Example Response:**
```json
{
  "success": true,
  "packageId": "0x...",
  "collectionCapId": "0x...",
  "transactionDigest": "ABC123...",
  "explorerUrl": "https://explorer-testnet.onelabs.cc/object/0x..."
}
```

### 3. OCT / Token Transfer

**Description:** Transfer native OCT or Move fungible tokens between OneChain addresses.

**Endpoint:** `POST /transfer`

**Parameters:**
- `senderAddress` - Sender's OneChain address
- `to` - Recipient address
- `amount` - Amount to transfer (in MIST for OCT)
- `coinType` - (Optional) Move coin type for non-OCT transfers

**Implementation:**
- Native OCT transfers use `sui.transferObjects` PTB
- Custom coin transfers use the coin's `transfer` entry function
- Automatic gas budget estimation
- Returns transaction digest on confirmation

### 4. Token Price Fetching

**Description:** Fetch real-time cryptocurrency prices using AI-powered search.

**Endpoint:** `POST /price`

**Parameters:**
- `query` - Token symbol or natural language query

**Implementation:**
- Uses Gemini 2.0 with search capabilities
- Returns current price and market data
- Supports multiple cryptocurrencies

---

## Smart Contract Implementations

### TokenFactory (Move)

**Location:** `contract/token_factory_move/`

**Technology:** Move language on OneChain

**Key Features:**
- Move `Coin<T>` standard implementation
- Object-based ownership model
- `TreasuryCap` mint/burn authority
- Customizable `CoinMetadata`

**Main Functions:**
```move
// Create a new fungible token
public fun create_token(
    name: vector<u8>,
    symbol: vector<u8>,
    decimals: u8,
    ctx: &mut TxContext
): (TreasuryCap<TOKEN>, CoinMetadata<TOKEN>)

// Mint tokens
public fun mint(
    cap: &mut TreasuryCap<TOKEN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
)

// Transfer
public entry fun transfer(
    coin: Coin<TOKEN>,
    recipient: address,
    ctx: &mut TxContext
)
```

**Deploy:**
```bash
cd contract/token_factory_move
sui move build
sui client publish --gas-budget 100000000
```

### NFTFactory (Move)

**Location:** `contract/nft_factory_move/`

**Technology:** Move language on OneChain

**Key Features:**
- Move `Display` + object-based NFT standard
- Batch minting via PTBs
- On-chain metadata with `VecMap`
- Transfer policy support

**Main Functions:**
```move
// Initialize collection
public fun init_collection(
    name: vector<u8>,
    ctx: &mut TxContext
): CollectionCap

// Mint NFT
public fun mint_nft(
    cap: &CollectionCap,
    name: vector<u8>,
    description: vector<u8>,
    url: vector<u8>,
    recipient: address,
    ctx: &mut TxContext
)

// Transfer
public entry fun transfer_nft(
    nft: NFT,
    recipient: address,
    ctx: &mut TxContext
)
```

**Deploy:**
```bash
cd contract/nft_factory_move
sui move build
sui client publish --gas-budget 100000000
```

### PaymentEscrow (Move)

**Location:** `contract/payment-contracts/`

**Technology:** Move language on OneChain

**Key Features:**
- x402 protocol implementation
- OCT escrow for premium features
- Automatic refunds on failure
- Capability-based backend authorization
- Shared object escrow pattern

**Main Functions:**
```move
// Create payment escrow
public fun create_payment(
    agent_id: vector<u8>,
    tool_name: vector<u8>,
    coin: Coin<OCT>,
    ctx: &mut TxContext
): EscrowId

// Execute payment (backend cap required)
public fun execute_payment(
    _cap: &BackendCap,
    escrow: EscrowId,
    ctx: &mut TxContext
)

// Refund payment (backend cap required)
public fun refund_payment(
    _cap: &BackendCap,
    escrow: EscrowId,
    ctx: &mut TxContext
)
```

**Deploy:**
```bash
cd contract/payment-contracts
sui move build
sui client publish --gas-budget 100000000
```

---

## Setup & Installation

### Prerequisites

- Node.js 18+ 
- Python 3.9+
- Move CLI (`sui` binary)
- npm or yarn
- Git

### Clone Repository

```bash
git clone <repository-url>
cd n8nrollup
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

Frontend will run on `http://localhost:3000`

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

Backend will run on `http://localhost:3000`

### AI Agent Backend Setup

```bash
cd AI_workflow_backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Gemini API key
uvicorn main:app --reload --port 8000
```

AI Agent service will run on `http://localhost:8000`

### Workflow Generator Setup

```bash
cd n8n_agent_backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Gemini API key
uvicorn main:app --reload --port 8001
```

Workflow Generator will run on `http://localhost:8001`

### Smart Contract Deployment

**Token Factory (Move):**
```bash
cd contract/token_factory_move
sui move build
sui client publish --gas-budget 100000000
```

**NFT Factory (Move):**
```bash
cd contract/nft_factory_move
sui move build
sui client publish --gas-budget 100000000
```

**Payment Contract (Move):**
```bash
cd contract/payment-contracts
sui move build
sui client publish --gas-budget 100000000
```

---

## Environment Configuration

### Frontend (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# OneChain Wallet (via @mysten/dapp-kit)
NEXT_PUBLIC_ONECHAIN_NETWORK=testnet
NEXT_PUBLIC_ONECHAIN_TESTNET_RPC=https://rpc-testnet.onelabs.cc:443

# Payment Contract
NEXT_PUBLIC_PAYMENT_CONTRACT_PACKAGE=your_deployed_package_id

# Backend URLs
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_AI_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WORKFLOW_BACKEND_URL=http://localhost:8001

# Payment Backend
JWT_SECRET=your_jwt_secret
```

### Backend (.env)

```env
# Server
PORT=3000

# Blockchain
ONECHAIN_TESTNET_RPC=https://rpc-testnet.onelabs.cc:443
ONECHAIN_MAINNET_RPC=https://rpc-mainnet.onelabs.cc:443
TOKEN_FACTORY_PACKAGE=your_token_factory_package_id
NFT_FACTORY_PACKAGE=your_nft_factory_package_id

# API Keys
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

### AI Services (.env)

```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Backend URL
BACKEND_URL=http://localhost:3000
```

---

## API Documentation

### AI Agent Chat Endpoint

**POST** `/agent/chat`

Process natural language messages and execute blockchain actions.

**Request:**
```json
{
  "user_message": "Deploy a token called MyToken with symbol MTK",
  "tools": ["deploy_erc20", "transfer", "mint_nft"],
  "private_key": "0x..."
}
```

**Response:**
```json
{
  "message": "Token deployed successfully!",
  "results": {
    "tokenAddress": "0x...",
    "transactionHash": "0x...",
    "explorerUrl": "https://explorer-testnet.onelabs.cc/txblock/ABC123..."
  },
  "tool_used": "deploy_move_token"
}
```

### Workflow Generation Endpoint

**POST** `/create-workflow`

Generate workflow structure from natural language description.

**Request:**
```json
{
  "description": "Create a workflow that deploys a token and then transfers it to multiple addresses"
}
```

**Response:**
```json
{
  "workflow": {
    "nodes": [
      {
        "id": "1",
        "type": "agent",
        "data": { "label": "Start" }
      },
      {
        "id": "2",
        "type": "tool",
        "data": { 
          "tool": "deploy_erc20",
          "label": "Deploy Token"
        }
      },
      {
        "id": "3",
        "type": "tool",
        "data": { 
          "tool": "transfer",
          "label": "Transfer Tokens"
        }
      }
    ],
    "edges": [
      { "source": "1", "target": "2" },
      { "source": "2", "target": "3" }
    ]
  }
}
```

### Token Deployment Endpoint

**POST** `/token/deploy`

Deploy a new Move fungible token.

**Request:**
```json
{
  "name": "MyToken",
  "symbol": "MTK",
  "decimals": 9,
  "initialSupply": "1000000000000",
  "ownerAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "packageId": "0x...",
  "transactionDigest": "ABC123...",
  "explorerUrl": "https://explorer-testnet.onelabs.cc/txblock/ABC123...",
  "tokenInfo": {
    "name": "MyToken",
    "symbol": "MTK",
    "decimals": 9,
    "totalSupply": "1000000000000"
  }
}
```

### NFT Collection Deployment Endpoint

**POST** `/nft/deploy-collection`

Deploy a new Move NFT collection.

**Request:**
```json
{
  "name": "MyNFT Collection",
  "symbol": "MNFT",
  "description": "A unique NFT collection on OneChain",
  "ownerAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "packageId": "0x...",
  "collectionCapId": "0x...",
  "transactionDigest": "ABC123...",
  "explorerUrl": "https://explorer-testnet.onelabs.cc/object/0x..."
}
```

---

## Docker Support

The project includes Docker Compose configuration for easy deployment.

### Run All Services

```bash
docker-compose up -d
```

This will start:
- Frontend (Next.js) on port 3000
- Backend (Express) on port 3000
- AI Agent Backend (FastAPI) on port 8000
- Workflow Generator (FastAPI) on port 8001

### Individual Services

```bash
# Frontend only
docker-compose up frontend

# Backend only
docker-compose up backend

# AI services
docker-compose up ai-agent workflow-generator
```

---

## Project Structure

```
n8nrollup/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # Next.js app directory
│   │   ├── agent-builder/  # Visual workflow builder
│   │   ├── my-agents/      # Agent management
│   │   └── api/            # API routes
│   ├── components/          # React components
│   ├── lib/                # Utilities and helpers
│   └── package.json
│
├── backend/                 # Express.js backend API
│   ├── controllers/         # Request handlers
│   ├── routes/             # API routes
│   ├── config/             # Configuration files
│   │   ├── abis.js        # Contract ABIs
│   │   └── constants.js   # Network constants
│   ├── utils/              # Utility functions
│   └── package.json
│
├── AI_workflow_backend/     # FastAPI AI agent service
│   ├── main.py             # Main FastAPI application
│   └── requirements.txt
│
├── n8n_agent_backend/       # FastAPI workflow generator
│   ├── main.py             # Main FastAPI application
│   └── requirements.txt
│
├── contract/                # Smart contracts
│   ├── token_factory_move/ # Move token factory module
│   ├── nft_factory_move/   # Move NFT factory module
│   └── payment-contracts/  # Payment escrow (Move)
│
├── docker-compose.yml       # Docker orchestration
├── README.md               # This file
└── WORKFLOW_DIAGRAM.md     # Detailed workflow diagrams
```

---

## Key Features

### 🤖 AI-Powered Workflow Generation
- Describe your blockchain workflow in natural language
- Gemini 2.0 Flash automatically generates the complete workflow
- Intelligent tool selection and parameter configuration

### 🎨 Visual Workflow Builder
- Drag-and-drop interface powered by React Flow
- Connect blockchain tools visually
- Real-time workflow validation
- Save and load workflows

### 🔗 Blockchain Integration
- Native support for OneChain (testnet & mainnet)
- Move-language smart contract modules
- OCT fungible token and Move NFT deployment
- Transaction signing and broadcasting via PTBs

### 💰 Payment System
- x402 protocol integration
- OCT escrow for premium features
- Automatic refunds on transaction failure
- Pay-per-use pricing model

### 🔐 Security
- Privy authentication (Web3 + Web2)
- Encrypted private key storage in Supabase
- Backend authorization for payment execution
- Transaction verification before payment release

### 📊 Agent Management
- Create multiple agents with different workflows
- API key generation for programmatic access
- Chat interface for natural language interaction
- Transaction history and analytics

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Support

For support, please:
- Open an issue on GitHub
- Contact the development team
- Check the documentation in `WORKFLOW_DIAGRAM.md`

---

## Acknowledgments

- **Arbitrum** for Stylus technology
- **Google** for Gemini AI
- **Privy** for authentication infrastructure
- **Supabase** for database and backend services
- **Vercel** for hosting and deployment

---

**Built with ❤️ on Arbitrum Sepolia**
