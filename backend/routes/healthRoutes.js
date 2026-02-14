const express = require('express');
const { NETWORK_NAME, ARBITRUM_SEPOLIA_RPC, FACTORY_ADDRESS, NFT_FACTORY_ADDRESS } = require('../config/constants');

const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    network: NETWORK_NAME,
    rpc: ARBITRUM_SEPOLIA_RPC,
    tokenFactory: FACTORY_ADDRESS,
    nftFactory: NFT_FACTORY_ADDRESS,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
