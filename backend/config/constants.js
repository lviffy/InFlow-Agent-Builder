// Network and Contract Configuration
require('dotenv').config();

module.exports = {
  // OneChain Network Configuration
  ONECHAIN_TESTNET_RPC: process.env.ONECHAIN_TESTNET_RPC || 'https://rpc-testnet.onelabs.cc:443',
  ONECHAIN_MAINNET_RPC: process.env.ONECHAIN_MAINNET_RPC || 'https://rpc-mainnet.onelabs.cc:443',
  ONECHAIN_DEVNET_RPC: process.env.ONECHAIN_DEVNET_RPC || 'https://rpc-devnet.onelabs.cc:443',
  NETWORK_NAME: process.env.ONECHAIN_NETWORK || 'OneChain Testnet',
  ACTIVE_NETWORK: process.env.ONECHAIN_ACTIVE_NETWORK || 'testnet',
  EXPLORER_BASE_URL: 'https://explorer-testnet.onelabs.cc',
  FAUCET_URL: 'https://faucet-testnet.onelabs.cc',
  NATIVE_TOKEN: 'OCT',
  // 1 OCT = 1,000,000,000 MIST (smallest unit)
  MIST_PER_OCT: 1_000_000_000n,

  // Move Package IDs (deployed on OneChain — update after publishing)
  TOKEN_FACTORY_PACKAGE_ID: process.env.TOKEN_FACTORY_PACKAGE_ID || '',
  NFT_FACTORY_PACKAGE_ID: process.env.NFT_FACTORY_PACKAGE_ID || '',
  PAYMENT_PACKAGE_ID: process.env.PAYMENT_PACKAGE_ID || '',

  // OneChain-native product package IDs
  ONEDEX_PACKAGE_ID: process.env.ONEDEX_PACKAGE_ID || '',
  ONEID_PACKAGE_ID: process.env.ONEID_PACKAGE_ID || '',
  ONETRANSFER_PACKAGE_ID: process.env.ONETRANSFER_PACKAGE_ID || '',

  // Server Configuration
  PORT: process.env.PORT || 3000,

  // API Keys
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  PINATA_API_KEY: process.env.PINATA_API_KEY || '',
  PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY || '',

  // Backend wallet (Ed25519 secret key for signing transactions)
  BACKEND_SECRET_KEY: process.env.BACKEND_WALLET_SECRET_KEY || '',
};
