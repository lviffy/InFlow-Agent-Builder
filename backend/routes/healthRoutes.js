const express = require('express');
const { NETWORK_NAME, ONECHAIN_TESTNET_RPC, ACTIVE_NETWORK, TOKEN_FACTORY_PACKAGE_ID, NFT_FACTORY_PACKAGE_ID } = require('../config/constants');
const { getRpcUrl } = require('../utils/blockchain');

const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    chain: 'OneChain',
    network: NETWORK_NAME,
    activeNetwork: ACTIVE_NETWORK,
    rpc: getRpcUrl(),
    tokenFactoryPackage: TOKEN_FACTORY_PACKAGE_ID || 'not configured',
    nftFactoryPackage: NFT_FACTORY_PACKAGE_ID || 'not configured',
    nativeCurrency: 'OCT',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
