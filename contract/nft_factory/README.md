# ERC721 NFT Factory - Stylus

A complete, production-ready ERC721 NFT collection implementation built with [Arbitrum Stylus](https://arbitrum.io/stylus). This project enables users to easily deploy their own custom NFT collections with AI assistance.

## 🌟 Features

- ✅ **Full ERC721 Standard**: Complete implementation with all standard methods
- 🎨 **Customizable**: Set name, symbol, and base URI for metadata
- 🖼️ **NFT Support**: Mint, transfer, and burn NFTs with ease
- 🤖 **AI-Friendly**: Designed for easy integration with AI agents
- 🔒 **Secure**: Built with Rust for memory safety and performance
- ⚡ **Efficient**: Optimized for low gas costs on Arbitrum
- 🧪 **Tested**: Comprehensive unit tests included

## 📋 ERC721 Functions

### View Functions
- `name()` - Returns collection name
- `symbol()` - Returns collection symbol
- `baseUri()` - Returns base URI for metadata
- `tokenUri(tokenId)` - Returns metadata URI for a specific token
- `totalSupply()` - Returns total number of NFTs minted
- `balanceOf(owner)` - Returns number of NFTs owned by an address
- `ownerOf(tokenId)` - Returns owner of a specific token
- `getApproved(tokenId)` - Returns approved address for a token
- `isApprovedForAll(owner, operator)` - Checks if operator is approved for all tokens

### State-Changing Functions
- `initialize(name, symbol, baseUri)` - Initialize NFT collection (call once after deployment)
- `mint(to)` - Mint a new NFT to an address (returns token ID)
- `burn(tokenId)` - Burn (destroy) an NFT
- `transferFrom(from, to, tokenId)` - Transfer NFT from one address to another
- `safeTransferFrom(from, to, tokenId)` - Safely transfer NFT
- `approve(to, tokenId)` - Approve an address to transfer a specific token
- `setApprovalForAll(operator, approved)` - Set approval for all tokens

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
```

### Deploy

1. **Set up environment**:
```bash
cp .env.example .env
# Edit .env and add your PRIVATE_KEY
```

2. **Deploy using the script**:
```bash
chmod +x deploy.sh
./deploy.sh
```

Or manually:
```bash
cargo stylus deploy \
  --private-key=$PRIVATE_KEY \
  --endpoint=https://sepolia-rollup.arbitrum.io/rpc
```

3. **Initialize your NFT collection**:
```bash
cast send <CONTRACT_ADDRESS> \
  "initialize(string,string,string)" \
  "My NFT Collection" \
  "MNFT" \
  "https://api.example.com/metadata/" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

4. **Mint your first NFT**:
```bash
cast send <CONTRACT_ADDRESS> \
  "mint(address)" \
  <YOUR_ADDRESS> \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

## 💡 Usage Examples

### JavaScript/TypeScript (ethers.js)

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const nftAddress = '0x...'; // Your deployed contract
const abi = [
  "function initialize(string,string,string)",
  "function mint(address) returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenUri(uint256) view returns (string)"
];

const nft = new ethers.Contract(nftAddress, abi, wallet);

// Initialize collection
await nft.initialize("My NFTs", "MNFT", "https://api.example.com/");

// Mint an NFT
const tx = await nft.mint(wallet.address);
await tx.wait();

// Check balance
const balance = await nft.balanceOf(wallet.address);
console.log(`You own ${balance} NFTs`);
```

### Python (web3.py)

```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://sepolia-rollup.arbitrum.io/rpc'))
account = w3.eth.account.from_key(private_key)

nft = w3.eth.contract(address=contract_address, abi=abi)

# Initialize
tx = nft.functions.initialize(
    "My NFTs",
    "MNFT", 
    "https://api.example.com/"
).build_transaction({
    'from': account.address,
    'nonce': w3.eth.get_transaction_count(account.address),
})

signed = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
w3.eth.wait_for_transaction_receipt(tx_hash)

# Mint NFT
tx = nft.functions.mint(account.address).build_transaction({
    'from': account.address,
    'nonce': w3.eth.get_transaction_count(account.address),
})
signed = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
print(f"Minted NFT: {tx_hash.hex()}")
```

## 🖼️ NFT Metadata

For proper display on marketplaces like OpenSea, host metadata at `{baseUri}{tokenId}`:

```json
{
  "name": "My NFT #1",
  "description": "An awesome NFT",
  "image": "ipfs://QmXxxx.../1.png",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Rarity", 
      "value": "Rare"
    }
  ]
}
```

## 🧪 Testing

Run the test suite:

```bash
cargo test
```

Tests include:
- ✅ Initialization
- ✅ Minting NFTs
- ✅ Transferring NFTs
- ✅ Approvals
- ✅ Burning NFTs
- ✅ Error handling

## 📖 Documentation

- [Full Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Arbitrum Stylus Docs](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- [ERC721 Standard](https://eips.ethereum.org/EIPS/eip-721)

## 🔧 Development

### Project Structure

```
nft_factory/
├── src/
│   ├── lib.rs          # Main ERC721 implementation
│   └── main.rs         # Binary entry point
├── Cargo.toml          # Rust dependencies
├── deploy.sh           # Deployment script
├── DEPLOYMENT_GUIDE.md # Detailed deployment instructions
└── README.md           # This file
```

### Export ABI

```bash
cargo stylus export-abi
```

## 🌐 Network Support

- **Arbitrum Sepolia** (Testnet): `https://sepolia-rollup.arbitrum.io/rpc`
- **Arbitrum One** (Mainnet): `https://arb1.arbitrum.io/rpc`

Get testnet ETH from: [Arbitrum Faucet](https://faucet.arbitrum.io/)

## 📝 License

This project is licensed under MIT OR Apache-2.0.

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## ⚠️ Security

This code is provided as-is and has not been audited. Use at your own risk for production deployments.

## 🆘 Support

- [Arbitrum Discord](https://discord.gg/arbitrum)
- [Stylus Documentation](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- Open an issue in this repository

## 🎯 Example Use Cases

- **Digital Art**: Create and sell unique digital artworks
- **Gaming Assets**: In-game items, characters, and collectibles
- **Membership Passes**: Access tokens for exclusive communities
- **Event Tickets**: NFT-based ticketing systems
- **Certificates**: Verifiable credentials and achievements
- **Real Estate**: Tokenized property ownership
- **Music & Media**: Rights management and royalties

---

Built with ❤️ using [Arbitrum Stylus](https://arbitrum.io/stylus)
