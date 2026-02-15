# ERC20 Token Factory - Stylus

A complete, production-ready ERC20 token implementation built with [Arbitrum Stylus](https://arbitrum.io/stylus). This project enables users to easily deploy their own custom ERC20 tokens with AI assistance.

## 🌟 Features

- ✅ **Full ERC20 Standard**: Complete implementation with all standard methods
- 🎨 **Customizable**: Set name, symbol, decimals, and initial supply
- 🤖 **AI-Friendly**: Designed for easy integration with AI agents
- 🔒 **Secure**: Built with Rust for memory safety and performance
- ⚡ **Efficient**: Optimized for low gas costs on Arbitrum
- 🧪 **Tested**: Comprehensive unit tests included

## 📋 ERC20 Functions

### View Functions
- `name()` - Returns token name
- `symbol()` - Returns token symbol
- `decimals()` - Returns number of decimals
- `totalSupply()` - Returns total token supply
- `balanceOf(address)` - Returns balance of an address
- `allowance(owner, spender)` - Returns approved allowance

### State-Changing Functions
- `initialize(name, symbol, decimals, initialSupply)` - Initialize token (call once after deployment)
- `transfer(to, amount)` - Transfer tokens to another address
- `approve(spender, amount)` - Approve an address to spend tokens
- `transferFrom(from, to, amount)` - Transfer tokens on behalf of another address
- `increaseAllowance(spender, addedValue)` - Increase approval amount
- `decreaseAllowance(spender, subtractedValue)` - Decrease approval amount

## 🚀 Quick Start

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Stylus CLI tools
cargo install --force cargo-stylus cargo-stylus-check

# Add WASM target
rustup target add wasm32-unknown-unknown
```

### Build & Test

```bash
# Check if contract is valid
cargo stylus check

# Run tests
cargo test

# Build optimized WASM
cargo build --release --target wasm32-unknown-unknown

# Export ABI for frontend integration
cargo stylus export-abi
```

### Deploy

#### Option 1: Using the deployment script (Recommended)

```bash
# Set up environment
cp .env.example .env
# Edit .env and add your PRIVATE_KEY

# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The script will:
1. Build and check your contract
2. Deploy to Arbitrum Sepolia (testnet)
3. Prompt for token details
4. Initialize your token
5. Display contract address and explorer link

#### Option 2: Manual deployment

```bash
# 1. Deploy the contract
cargo stylus deploy \
  --private-key=<YOUR_PRIVATE_KEY> \
  --endpoint=https://sepolia-rollup.arbitrum.io/rpc

# 2. Initialize your token
cast send <CONTRACT_ADDRESS> \
  "initialize(string,string,uint8,uint256)" \
  "My Token" \
  "MTK" \
  18 \
  1000000000000000000000000 \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

## 🤖 AI Integration

This contract is designed to work seamlessly with AI agents. An AI can help users by:

1. **Gathering Requirements**: Ask about token name, symbol, supply
2. **Validating Input**: Ensure parameters are correct
3. **Deploying Contract**: Execute deployment commands
4. **Initializing Token**: Call initialize with user parameters
5. **Providing Information**: Share contract address and explorer links

### Example AI Conversation Flow

```
User: "I want to deploy a token called 'Super Token' with 1 million supply"

AI: "I'll help you deploy your ERC20 token! Let me confirm the details:
     - Name: Super Token
     - Symbol: What symbol would you like? (e.g., SUPER)
     - Decimals: 18 (standard)
     - Supply: 1,000,000 tokens
     
     Is this correct?"

User: "Yes, use SUPER as symbol"

AI: [Deploys contract and initializes]
    "✅ Your token has been deployed!
     - Contract: 0x1234...5678
     - Explorer: https://sepolia.arbiscan.io/address/0x1234...5678
     - Your balance: 1,000,000 SUPER"
```

### TypeScript Integration

See `examples/ai-deployment.ts` for a complete TypeScript integration example:

```typescript
import { deployTokenForUser } from './examples/ai-deployment';

const result = await deployTokenForUser({
  privateKey: 'YOUR_PRIVATE_KEY',
  deployedContractAddress: '0x...',
  tokenName: 'My Token',
  tokenSymbol: 'MTK',
  decimals: 18,
  initialSupply: '1000000'
});

console.log(`Token deployed at: ${result.contractAddress}`);
```

## 📖 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [Stylus Documentation](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- [Arbitrum Sepolia Faucet](https://faucet.arbitrum.io/)

## 🏗️ Project Structure

```
token_factory/
├── src/
│   ├── lib.rs          # Main ERC20 implementation
│   └── main.rs         # Binary entry point
├── examples/
│   ├── ai-deployment.ts # TypeScript integration example
│   └── counter.rs       # Example counter contract
├── deploy.sh            # Automated deployment script
├── DEPLOYMENT_GUIDE.md  # Comprehensive guide
├── Cargo.toml          # Rust dependencies
└── README.md           # This file
```

## 💡 Token Configuration Guide

### Name
- The full name of your token
- Examples: "Bitcoin", "Ethereum", "My Awesome Token"
- Can include spaces and special characters

### Symbol
- Short identifier for your token (ticker)
- Examples: "BTC", "ETH", "MAT"
- Typically 3-5 uppercase characters
- Should be unique and memorable

### Decimals
- Number of decimal places
- Standard: **18** (same as ETH)
- Stablecoins often use **6** (like USDC)
- Determines the smallest unit of your token
- Example: With 18 decimals, 1 token = 1,000,000,000,000,000,000 base units

### Initial Supply
- Total number of tokens to create
- Specified in whole tokens (before decimals)
- Examples:
  - 1,000,000 = one million tokens
  - 100,000,000 = one hundred million tokens
- All tokens are minted to the deployer's address

### Supply Calculation Example

For **1 million tokens** with **18 decimals**:
- Human-readable: `1,000,000`
- On-chain value: `1,000,000,000,000,000,000,000,000` (1M × 10¹⁸)

## 🔒 Security

- ✅ **Initialization Guard**: Token can only be initialized once
- ✅ **Zero Address Checks**: Prevents transfers to/from zero address
- ✅ **Overflow Protection**: Rust's type system prevents overflows
- ✅ **Allowance Checks**: Proper allowance validation in transferFrom
- ⚠️ **Not Audited**: This is template code - audit before mainnet use

## 🧪 Testing

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Test specific function
cargo test test_transfer
```

Tests include:
- Token initialization
- Balance tracking
- Transfer functionality
- Approval mechanism
- TransferFrom with allowances

## 🌐 Networks

### Arbitrum Sepolia (Testnet)
- RPC: `https://sepolia-rollup.arbitrum.io/rpc`
- Chain ID: 421614
- Explorer: https://sepolia.arbiscan.io
- Faucet: https://faucet.arbitrum.io

### Arbitrum One (Mainnet)
- RPC: `https://arb1.arbitrum.io/rpc`
- Chain ID: 42161
- Explorer: https://arbiscan.io

## 💰 Gas Costs

Stylus contracts are highly optimized:
- Deploy: ~0.001 ETH on testnet
- Initialize: ~0.0001 ETH
- Transfer: ~0.00005 ETH

*Costs are approximate and vary with network congestion*

## 🛠️ Troubleshooting

### "Insufficient balance" error
- Make sure you have testnet ETH from the faucet

### "Contract already initialized"
- The initialize function can only be called once
- Deploy a new contract if you need to change parameters

### Build errors
- Ensure Rust toolchain is up to date: `rustup update`
- Verify WASM target: `rustup target list | grep wasm32`

## 📚 Resources

- [Arbitrum Stylus Docs](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- [Stylus Rust SDK](https://github.com/OffchainLabs/stylus-sdk-rs)
- [Cargo Stylus CLI](https://github.com/OffchainLabs/cargo-stylus)
- [ERC20 Standard](https://eips.ethereum.org/EIPS/eip-20)

## 📄 License

This project is licensed under MIT OR Apache-2.0.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## ⚠️ Disclaimer

This code is provided as-is for educational and development purposes. It has not been audited. Use at your own risk, especially on mainnet. Always test thoroughly on testnet first.

---

Built with ❤️ using [Arbitrum Stylus](https://arbitrum.io/stylus)
