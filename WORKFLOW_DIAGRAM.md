# BlockOps - Complete System Workflow Diagram

This document contains comprehensive Mermaid diagrams visualizing the entire BlockOps platform architecture, data flow, and interactions.

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "User Layer"
        U[👤 User Browser]
        UI[🖥️ Next.js Frontend<br/>Port: 3000]
    end
    
    subgraph "Authentication & Database"
        PRIVY[🔐 Privy Auth]
        SUPA[🗄️ Supabase Database]
    end
    
    subgraph "Backend Services"
        AI[🤖 AI Agent Backend<br/>FastAPI - Port 8000]
        BK[⚙️ Blockchain Backend<br/>Express - Port 3000]
        WF[🔄 Workflow Generator<br/>FastAPI - Port 8001]
    end
    
    subgraph "Blockchain Layer"
        ARB[🔗 Arbitrum Sepolia<br/>Chain ID: 421614]
        ETH[🔗 Ethereum Sepolia]
    end
    
    subgraph "Smart Contracts"
        TF[📝 Token Factory<br/>Stylus Contract]
        NF[🎨 NFT Factory<br/>Stylus Contract]
        PE[💰 Payment Escrow<br/>x402 Protocol]
        USDC[💵 USDC Token]
    end
    
    U -->|User Actions| UI
    UI <-->|Authentication| PRIVY
    UI <-->|Data Storage| SUPA
    UI -->|AI Chat/Generate| AI
    UI -->|Workflow Build| WF
    AI -->|Tool Execution| BK
    BK -->|Deploy/Transfer| ARB
    BK -->|Price Fetch| ETH
    ARB -->|Token Deploy| TF
    ARB -->|NFT Deploy| NF
    ARB -->|Payments| PE
    PE -->|USDC Escrow| USDC
    
    style U fill:#e1f5ff
    style UI fill:#bbdefb
    style AI fill:#fff9c4
    style BK fill:#c8e6c9
    style ARB fill:#f8bbd0
    style PE fill:#ffccbc
```

---

## 2. Complete User Journey Flow

```mermaid
flowchart TD
    START([👤 User Visits Platform]) --> AUTH{Authenticated?}
    
    AUTH -->|No| LOGIN[🔐 Login with Privy<br/>Google/Email/Wallet]
    AUTH -->|Yes| DASH[📊 Dashboard]
    
    LOGIN --> CREATE_USER[💾 Create User in DB<br/>Generate API Key]
    CREATE_USER --> WALLET_SETUP{Has Wallet?}
    
    WALLET_SETUP -->|No| CREATE_WALLET[🔑 Create Agent Wallet<br/>Store Private Key]
    WALLET_SETUP -->|Yes| IMPORT_WALLET[📥 Import Private Key]
    
    CREATE_WALLET --> DASH
    IMPORT_WALLET --> DASH
    
    DASH --> CHOICE{What to Do?}
    
    CHOICE -->|Build Manually| BUILDER[🎨 Visual Workflow Builder]
    CHOICE -->|Use AI| AI_GEN[🤖 AI Agent Generator]
    CHOICE -->|View Agents| MY_AGENTS[📋 My Agents]
    
    BUILDER --> DRAG[🖱️ Drag & Drop Tools]
    DRAG --> CONNECT[🔗 Connect Tools]
    CONNECT --> CONFIG[⚙️ Configure Parameters]
    CONFIG --> SAVE[💾 Save Agent]
    
    AI_GEN --> AI_PROMPT[💬 Describe Agent in NL]
    AI_PROMPT --> AI_PROCESS[🧠 Gemini 2.0 Processes]
    AI_PROCESS --> AI_WORKFLOW[🔄 Generate Workflow]
    AI_WORKFLOW --> SAVE
    
    SAVE --> AGENT_READY[✅ Agent Ready]
    
    MY_AGENTS --> SELECT_AGENT[🔍 Select Agent]
    SELECT_AGENT --> AGENT_READY
    
    AGENT_READY --> INTERACT{How to Interact?}
    
    INTERACT -->|UI Chat| CHAT[💬 Chat Interface]
    INTERACT -->|API| API_CALL[📡 REST API Call]
    
    CHAT --> PAYMENT_CHECK{Premium<br/>Feature?}
    API_CALL --> PAYMENT_CHECK
    
    PAYMENT_CHECK -->|Free Tier| EXECUTE[⚡ Execute Tools]
    PAYMENT_CHECK -->|Premium| PAY_MODAL[💳 Payment Modal]
    
    PAY_MODAL --> APPROVE[✅ Approve USDC]
    APPROVE --> ESCROW[🔒 Deposit to Escrow]
    ESCROW --> EXECUTE
    
    EXECUTE --> BLOCKCHAIN[⛓️ Blockchain Transaction]
    BLOCKCHAIN --> SUCCESS{Success?}
    
    SUCCESS -->|Yes| PAY_COMPLETE[💰 Execute Payment]
    SUCCESS -->|No| REFUND[↩️ Auto Refund]
    
    PAY_COMPLETE --> RESULT[📊 Show Results]
    REFUND --> ERROR[❌ Show Error]
    ERROR --> RESULT
    
    RESULT --> MORE{Continue?}
    MORE -->|Yes| INTERACT
    MORE -->|No| END([✅ Complete])
    
    style START fill:#e1f5ff
    style AUTH fill:#fff9c4
    style BUILDER fill:#c8e6c9
    style AI_GEN fill:#ffccbc
    style EXECUTE fill:#f8bbd0
    style BLOCKCHAIN fill:#ce93d8
    style PAY_COMPLETE fill:#a5d6a7
```

---

## 3. AI Chat Message Processing Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Frontend<br/>(Next.js)
    participant DB as Supabase DB
    participant AI as AI Agent Backend<br/>(Port 8000)
    participant BK as Blockchain Backend<br/>(Port 3000)
    participant Chain as Arbitrum Sepolia
    participant Contract as Smart Contracts
    
    User->>Frontend: Send message: "Deploy token MyToken"
    
    Frontend->>DB: Get agent config by API key
    DB-->>Frontend: Agent tools & workflow
    
    Frontend->>DB: Get user's private key
    DB-->>Frontend: Private key (encrypted)
    
    Frontend->>AI: POST /agent/chat<br/>{tools, user_message, private_key}
    
    Note over AI: Parse with Gemini 2.0
    AI->>AI: Identify tool: deploy_erc20
    AI->>AI: Extract parameters:<br/>name="MyToken"<br/>symbol="MTK"<br/>supply="1000000"
    
    AI->>BK: POST /token/deploy<br/>{privateKey, name, symbol, supply}
    
    Note over BK: Validate & Prepare
    BK->>BK: Create wallet from private key
    BK->>BK: Convert params to bytes32
    BK->>Chain: Connect to RPC
    
    BK->>Contract: Call TokenFactory.createToken()
    Contract->>Chain: Deploy new ERC20
    Chain-->>Contract: Token deployed at address
    Contract-->>BK: TokenID & Transaction hash
    
    BK->>Chain: Wait for confirmation
    Chain-->>BK: Block confirmed
    
    BK-->>AI: {success, tokenId, txHash, explorerUrl}
    
    Note over AI: Format response
    AI-->>Frontend: {message, results, tool_used}
    
    Frontend->>DB: Save chat message
    Frontend->>User: Display: "Token deployed successfully!<br/>View on Explorer"
    
    User->>Frontend: Click explorer link
    Frontend->>Chain: Open block explorer
```

---

## 4. x402 Payment Flow (Premium Features)

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Frontend
    participant DB as Supabase
    participant Escrow as Payment Escrow<br/>Smart Contract
    participant USDC as USDC Token
    participant Backend as Backend Service
    participant Chain as Arbitrum Sepolia
    
    User->>Frontend: Request premium feature
    
    Frontend->>DB: Check AI quota
    DB-->>Frontend: 0 free calls remaining
    
    Frontend->>User: Show Payment Modal<br/>Cost: 0.10 USDC
    
    User->>Frontend: Click "Pay & Execute"
    
    Note over Frontend: Step 1: Approve USDC
    Frontend->>USDC: approve(escrow, 0.10 USDC)
    USDC-->>Frontend: Approval confirmed
    
    Note over Frontend: Step 2: Create Agreement
    Frontend->>Escrow: createAgreement(recipient, 0.10 USDC)
    Escrow->>USDC: transferFrom(user, escrow, 0.10)
    USDC-->>Escrow: Transfer complete
    Escrow->>Escrow: Lock funds in escrow
    Escrow-->>Frontend: agreementId = 123
    
    Frontend->>DB: Store agreement<br/>{id, user, amount, status="pending"}
    
    Note over Frontend: Step 3: Generate execution token
    Frontend->>Frontend: Sign JWT with agreementId
    Frontend->>Backend: Execute tool with JWT token
    
    Backend->>Backend: Verify JWT signature
    Backend->>Chain: Execute blockchain action
    
    alt Action Successful
        Chain-->>Backend: Transaction confirmed
        Backend->>Escrow: executeAgreement(agreementId)<br/>with backend private key
        Escrow->>USDC: transfer(recipient, 0.10)
        Escrow->>Escrow: Mark agreement as executed
        Backend-->>Frontend: {success: true, result}
        Frontend->>DB: Update agreement status="executed"
        Frontend->>DB: Decrement AI quota
        Frontend->>User: ✅ Success! Transaction complete
    else Action Failed
        Chain-->>Backend: Transaction failed
        Backend->>Escrow: refundAgreement(agreementId)
        Escrow->>USDC: transfer(user, 0.10)
        Escrow->>Escrow: Mark agreement as refunded
        Backend-->>Frontend: {success: false, error}
        Frontend->>DB: Update agreement status="refunded"
        Frontend->>User: ❌ Failed. Funds refunded
    end
```

---

## 5. Workflow Builder Component Architecture

```mermaid
graph TB
    subgraph "Workflow Builder Page"
        WB[WorkflowBuilder Component]
        NL[Node Library]
        NC[Node Config Panel]
        CE[Custom Edge]
    end
    
    subgraph "Node Types"
        AN[Agent Node<br/>Start Point]
        TN[Tool Node<br/>Blockchain Actions]
    end
    
    subgraph "Available Tools"
        T1[🪙 Deploy Token]
        T2[🎨 Deploy NFT]
        T3[💸 Transfer Tokens]
        T4[🔄 Swap Tokens]
        T5[💰 Fetch Price]
        T6[📊 Wallet Analytics]
        T7[✈️ Airdrop]
        T8[🏛️ Create DAO]
        T9[📈 Yield Calculator]
        T10[🔍 Balance Check]
    end
    
    subgraph "State Management"
        RF[ReactFlow State]
        DB[Supabase Database]
    end
    
    WB --> AN
    WB --> TN
    NL --> T1 & T2 & T3 & T4 & T5
    NL --> T6 & T7 & T8 & T9 & T10
    
    AN -->|Drag & Drop| RF
    TN -->|Drag & Drop| RF
    
    RF -->|Configure| NC
    NC -->|Set Params| RF
    
    RF -->|Connect Nodes| CE
    CE -->|Visual Flow| RF
    
    WB -->|Save Agent| DB
    DB -->|Load Agent| WB
    
    style WB fill:#bbdefb
    style RF fill:#c8e6c9
    style DB fill:#ffccbc
```

---

## 6. Backend Service Routing Architecture

```mermaid
graph LR
    subgraph "Blockchain Backend (Express - Port 3000)"
        APP[app.js<br/>Main Server]
        
        subgraph "Routes"
            HR[/health]
            TR[/token]
            NR[/nft]
            XR[/transfer]
            PR[/price]
            NL[/nl-executor]
        end
        
        subgraph "Controllers"
            TC[tokenController]
            NC[nftController]
            XC[transferController]
            PC[priceController]
            NLC[nlExecutorController]
        end
        
        subgraph "Utils"
            BC[blockchain.js<br/>Web3 Connection]
            HE[helpers.js<br/>Data Formatting]
        end
        
        subgraph "Config"
            ABI[abis.js<br/>Contract ABIs]
            CON[constants.js<br/>Addresses & RPC]
        end
    end
    
    APP --> HR & TR & NR & XR & PR & NL
    
    TR --> TC
    NR --> NC
    XR --> XC
    PR --> PC
    NL --> NLC
    
    TC & NC & XC --> BC
    TC & NC & XC & PC --> HE
    
    BC --> ABI
    BC --> CON
    
    style APP fill:#81c784
    style BC fill:#64b5f6
    style TC fill:#ffb74d
    style NC fill:#ff8a65
```

---

## 7. AI Agent Backend Tool Execution Flow

```mermaid
flowchart TD
    START[🚀 Receive /agent/chat Request] --> PARSE[📝 Parse Request]
    
    PARSE --> EXTRACT[🔍 Extract:<br/>• tools<br/>• user_message<br/>• private_key]
    
    EXTRACT --> BUILD_PROMPT[🧠 Build Gemini Prompt]
    
    BUILD_PROMPT --> TOOL_LIST[📋 List Available Tools:<br/>• transfer<br/>• deploy_erc20<br/>• deploy_nft<br/>• swap<br/>• price<br/>• balance<br/>• airdrop<br/>• dao<br/>• yield<br/>• analytics]
    
    TOOL_LIST --> GEMINI[🤖 Send to Gemini 2.0 Flash]
    
    GEMINI --> AI_RESPONSE[💡 AI Response]
    
    AI_RESPONSE --> CHECK{Tool<br/>Required?}
    
    CHECK -->|No| RESPOND[💬 Return text response]
    
    CHECK -->|Yes| IDENTIFY[🎯 Identify Tool & Params]
    
    IDENTIFY --> ADD_KEY{Private Key<br/>Needed?}
    
    ADD_KEY -->|Yes| INSERT_KEY[🔑 Add private_key to params]
    ADD_KEY -->|No| PREPARE
    
    INSERT_KEY --> PREPARE[📦 Prepare API Call]
    
    PREPARE --> EXECUTE[⚡ Execute Tool]
    
    EXECUTE --> CALL_MAP{Tool Type}
    
    CALL_MAP -->|transfer| BE1[POST /transfer]
    CALL_MAP -->|deploy_erc20| BE2[POST /token/deploy]
    CALL_MAP -->|deploy_nft| BE3[POST /nft/deploy-collection]
    CALL_MAP -->|mint_nft| BE4[POST /nft/mint]
    CALL_MAP -->|swap| BE5[POST /swap]
    CALL_MAP -->|price| BE6[GET /price]
    CALL_MAP -->|balance| BE7[GET /transfer/balance]
    
    BE1 & BE2 & BE3 & BE4 & BE5 & BE6 & BE7 --> BACKEND[🔗 Blockchain Backend<br/>Port 3000]
    
    BACKEND --> RESULT{Success?}
    
    RESULT -->|Yes| FORMAT[✅ Format Success Response]
    RESULT -->|No| ERROR[❌ Format Error Response]
    
    FORMAT --> RESPOND
    ERROR --> RESPOND
    
    RESPOND --> END[📤 Return to Frontend]
    
    style START fill:#e1f5ff
    style GEMINI fill:#fff9c4
    style EXECUTE fill:#c8e6c9
    style BACKEND fill:#ffccbc
    style FORMAT fill:#a5d6a7
    style ERROR fill:#ef9a9a
```

---

## 8. Database Schema & Relationships

```mermaid
erDiagram
    USERS ||--o{ AGENTS : creates
    USERS ||--o{ CHAT_MESSAGES : sends
    USERS ||--o{ PAYMENT_AGREEMENTS : initiates
    AGENTS ||--o{ CHAT_MESSAGES : receives
    AGENTS ||--o{ AGENT_TOOLS : contains
    
    USERS {
        uuid id PK
        string privy_id UK
        string email
        string wallet_address
        string api_key UK
        string private_key
        int ai_quota_remaining
        timestamp created_at
    }
    
    AGENTS {
        uuid id PK
        uuid user_id FK
        string name
        string description
        string api_key UK
        jsonb workflow
        timestamp created_at
    }
    
    AGENT_TOOLS {
        uuid id PK
        uuid agent_id FK
        string tool_name
        string next_tool
        jsonb configuration
        int order
    }
    
    CHAT_MESSAGES {
        uuid id PK
        uuid agent_id FK
        uuid user_id FK
        string message
        string response
        jsonb metadata
        timestamp created_at
    }
    
    PAYMENT_AGREEMENTS {
        uuid id PK
        uuid user_id FK
        string agreement_id
        string recipient_address
        decimal amount_usdc
        string status
        string tx_hash
        timestamp created_at
        timestamp executed_at
    }
    
    AI_USAGE_LOGS {
        uuid id PK
        uuid user_id FK
        string action_type
        int tokens_used
        decimal cost_usdc
        timestamp created_at
    }
```

---

## 9. Smart Contract Deployment Architecture

```mermaid
graph TB
    subgraph "Stylus Contracts (Rust)"
        TFS[Token Factory Source<br/>token_factory/src/lib.rs]
        NFS[NFT Factory Source<br/>nft_factory/src/lib.rs]
    end
    
    subgraph "Build Process"
        CARGO[Cargo Build<br/>--release --target wasm32]
        WASM[WASM Binaries]
    end
    
    subgraph "Deployment"
        STYLUS[Stylus CLI<br/>cargo-stylus deploy]
    end
    
    subgraph "Arbitrum Sepolia"
        TFC[Token Factory Contract<br/>0x...]
        NFC[NFT Factory Contract<br/>0x...]
    end
    
    subgraph "Solidity Contracts"
        PES[PaymentEscrow.sol]
        HH[Hardhat Deployment]
    end
    
    subgraph "Payment Contract"
        PEC[Payment Escrow<br/>0x185eba222e50dedae23...]
    end
    
    TFS --> CARGO
    NFS --> CARGO
    CARGO --> WASM
    WASM --> STYLUS
    STYLUS --> TFC
    STYLUS --> NFC
    
    PES --> HH
    HH --> PEC
    
    TFC -->|Used by| BACKEND[Backend Token Operations]
    NFC -->|Used by| BACKEND
    PEC -->|Used by| PAYMENTS[Payment Operations]
    
    style TFS fill:#ff9800
    style NFS fill:#ff9800
    style TFC fill:#4caf50
    style NFC fill:#4caf50
    style PEC fill:#2196f3
```

---

## 10. Environment Configuration Flow

```mermaid
graph TB
    subgraph "Frontend .env"
        FE1[NEXT_PUBLIC_SUPABASE_URL]
        FE2[NEXT_PUBLIC_SUPABASE_ANON_KEY]
        FE3[NEXT_PUBLIC_PRIVY_APP_ID]
        FE4[NEXT_PUBLIC_RPC_URL<br/>Ethereum Sepolia]
        FE5[NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL]
        FE6[NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS]
        FE7[NEXT_PUBLIC_USDC_ADDRESS]
        FE8[PAYMENT_BACKEND_PRIVATE_KEY]
        FE9[JWT_SECRET]
    end
    
    subgraph "Backend .env"
        BE1[PORT=3000]
        BE2[TOKEN_FACTORY_ADDRESS]
        BE3[NFT_FACTORY_ADDRESS]
        BE4[RPC_URL<br/>Arbitrum Sepolia]
        BE5[ETHERSCAN_API_KEY]
    end
    
    subgraph "AI Agent .env"
        AI1[GEMINI_API_KEY]
        AI2[BACKEND_URL=http://localhost:3000]
    end
    
    subgraph "Services"
        FRONTEND[Frontend App]
        BACKEND[Blockchain Backend]
        AIAGENT[AI Agent Backend]
    end
    
    FE1 & FE2 & FE3 --> FRONTEND
    FE4 & FE5 & FE6 & FE7 --> FRONTEND
    FE8 & FE9 --> FRONTEND
    
    BE1 & BE2 & BE3 & BE4 & BE5 --> BACKEND
    
    AI1 & AI2 --> AIAGENT
    
    FRONTEND -->|API Calls| AIAGENT
    AIAGENT -->|Tool Execution| BACKEND
    FRONTEND -->|Blockchain Reads| BACKEND
    
    style FRONTEND fill:#2196f3
    style BACKEND fill:#4caf50
    style AIAGENT fill:#ff9800
```

---

## 11. Docker Compose Service Architecture

```mermaid
graph TB
    subgraph "Docker Compose Services"
        direction TB
        
        subgraph "Frontend Service"
            F[Next.js App<br/>Port: 3000<br/>Image: node:18]
        end
        
        subgraph "Backend Service"
            B[Express API<br/>Port: 3000<br/>Image: node:18]
        end
        
        subgraph "AI Agent Service"
            A[FastAPI<br/>Port: 8000<br/>Image: python:3.9]
        end
        
        subgraph "Workflow Gen Service"
            W[FastAPI<br/>Port: 8001<br/>Image: python:3.9]
        end
    end
    
    subgraph "External Services"
        S[Supabase Cloud<br/>PostgreSQL]
        P[Privy Auth]
        AR[Arbitrum Sepolia RPC]
        ES[Ethereum Sepolia RPC]
    end
    
    F -->|API Calls| A
    A -->|Tool Execution| B
    F -->|Workflow| W
    F <-->|Database| S
    F <-->|Auth| P
    B -->|Transactions| AR
    B -->|Price Data| ES
    
    style F fill:#2196f3
    style B fill:#4caf50
    style A fill:#ff9800
    style W fill:#9c27b0
    style S fill:#00bcd4
    style AR fill:#f44336
```

---

## 12. Complete API Endpoint Map

```mermaid
mindmap
  root((BlockOps API))
    Frontend
      Supabase
        User CRUD
        Agent CRUD
        Chat CRUD
        Payment CRUD
      Next.js API Routes
        /api/payments/create
        /api/payments/execute
        /api/payments/refund
    AI Agent Backend :8000:
      /agent/chat
        POST: Process NL message
      /generate/workflow
        POST: Generate from description
      /tools/list
        GET: Available tools
    Blockchain Backend :3000:
      /health
        GET: Health check
      /token
        POST /deploy: Deploy ERC20
        GET /info/:address: Token details
        GET /balance/:token/:owner
      /nft
        POST /deploy-collection
        POST /mint
        GET /info/:collection/:id
      /transfer
        POST: Transfer tokens
        GET /balance/:address
      /price
        GET /:symbol: Token price
      /nl-executor
        GET /discover/:address
        POST /execute
        POST /quick-execute
```

---

## 13. Security & Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Privy
    participant Supabase
    participant Backend
    
    Note over User,Backend: Initial Authentication
    User->>Frontend: Click "Login"
    Frontend->>Privy: Initiate OAuth
    Privy->>User: Show login options
    User->>Privy: Authenticate (Google/Email)
    Privy-->>Frontend: Return user session + JWT
    
    Frontend->>Supabase: Check if user exists
    alt New User
        Supabase-->>Frontend: User not found
        Frontend->>Frontend: Generate API key
        Frontend->>Frontend: Create agent wallet
        Frontend->>Supabase: Create user record
    else Existing User
        Supabase-->>Frontend: Return user data
    end
    
    Note over User,Backend: Agent Interaction
    User->>Frontend: Send agent command
    Frontend->>Supabase: Validate API key
    Supabase-->>Frontend: Return agent config
    
    Frontend->>Supabase: Get encrypted private key
    Supabase-->>Frontend: Private key
    
    Frontend->>Backend: Execute with private key
    Backend->>Backend: Validate request
    Backend->>Backend: Sign transaction
    Backend-->>Frontend: Transaction result
    
    Note over User,Backend: Payment Authentication
    User->>Frontend: Premium action
    Frontend->>Frontend: Generate JWT execution token<br/>with agreementId
    Frontend->>Backend: Send JWT + request
    Backend->>Backend: Verify JWT signature
    Backend->>Backend: Check agreementId exists
    Backend-->>Frontend: Execute if valid
```

---

## 14. Error Handling & Retry Logic

```mermaid
flowchart TD
    START[User Action] --> FRONTEND[Frontend Request]
    
    FRONTEND --> TRY1[Attempt 1]
    
    TRY1 --> CHECK1{Success?}
    
    CHECK1 -->|Yes| SUCCESS[✅ Complete]
    CHECK1 -->|No| ERROR1[⚠️ Error Type?]
    
    ERROR1 --> TYPE1{Error Category}
    
    TYPE1 -->|Network| RETRY1[Wait 1s + Retry]
    TYPE1 -->|Gas| GAS_FIX[Increase Gas Limit]
    TYPE1 -->|Nonce| NONCE_FIX[Refresh Nonce]
    TYPE1 -->|Insufficient Funds| FUND_ERROR[❌ Show Balance Error]
    TYPE1 -->|Contract Revert| CONTRACT_ERROR[❌ Show Revert Reason]
    
    RETRY1 --> TRY2[Attempt 2]
    GAS_FIX --> TRY2
    NONCE_FIX --> TRY2
    
    TRY2 --> CHECK2{Success?}
    
    CHECK2 -->|Yes| SUCCESS
    CHECK2 -->|No| ERROR2[⚠️ Still Failing]
    
    ERROR2 --> TYPE2{Retry Count}
    
    TYPE2 -->|< 3| RETRY2[Wait 2s + Retry]
    TYPE2 -->|>= 3| FAIL[❌ Final Failure]
    
    RETRY2 --> TRY3[Attempt 3]
    TRY3 --> CHECK3{Success?}
    
    CHECK3 -->|Yes| SUCCESS
    CHECK3 -->|No| FAIL
    
    FUND_ERROR --> LOG[📝 Log Error]
    CONTRACT_ERROR --> LOG
    FAIL --> LOG
    
    LOG --> REFUND{Payment<br/>Involved?}
    
    REFUND -->|Yes| AUTO_REFUND[♻️ Auto Refund via Escrow]
    REFUND -->|No| NOTIFY[📧 Notify User]
    
    AUTO_REFUND --> NOTIFY
    NOTIFY --> END[🏁 End]
    SUCCESS --> END
    
    style SUCCESS fill:#a5d6a7
    style FAIL fill:#ef9a9a
    style AUTO_REFUND fill:#fff59d
```

---

## 15. Development & Deployment Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV[👨‍💻 Local Development]
        TEST[🧪 Testing]
        GIT[📦 Git Commit]
    end
    
    subgraph "Version Control"
        GITHUB[GitHub Repository<br/>main branch]
    end
    
    subgraph "CI/CD"
        VERCEL[▲ Vercel<br/>Auto Deploy]
        DOCKER[🐳 Docker Build]
    end
    
    subgraph "Production"
        FRONT_PROD[🌐 Frontend<br/>Vercel Hosting]
        BACK_PROD[⚙️ Backend Services<br/>Docker Containers]
    end
    
    subgraph "Blockchain"
        CONTRACTS[📝 Smart Contracts<br/>Arbitrum Sepolia]
    end
    
    DEV --> TEST
    TEST --> GIT
    GIT --> GITHUB
    
    GITHUB -->|Push to main| VERCEL
    GITHUB -->|Manual deploy| DOCKER
    
    VERCEL --> FRONT_PROD
    DOCKER --> BACK_PROD
    
    FRONT_PROD <--> BACK_PROD
    BACK_PROD <--> CONTRACTS
    
    style DEV fill:#bbdefb
    style VERCEL fill:#00bcd4
    style FRONT_PROD fill:#4caf50
    style CONTRACTS fill:#f44336
```

---

## Summary

This comprehensive workflow diagram covers:

1. **High-Level Architecture** - Overall system components and connections
2. **User Journey** - Complete user interaction flow
3. **AI Processing** - How natural language is converted to blockchain actions
4. **Payment System** - x402 protocol payment flow
5. **Component Architecture** - Frontend builder structure
6. **Backend Routing** - API endpoint organization
7. **Tool Execution** - AI agent backend processing
8. **Database Schema** - Data relationships
9. **Smart Contracts** - Deployment and usage
10. **Configuration** - Environment variables
11. **Docker Services** - Container architecture
12. **API Endpoints** - Complete endpoint map
13. **Security** - Authentication and authorization
14. **Error Handling** - Retry logic and failure recovery
15. **Deployment** - Development to production pipeline

Each diagram can be rendered using any Mermaid-compatible tool or viewer.
