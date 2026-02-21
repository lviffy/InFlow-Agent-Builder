const express = require('express');
const router = express.Router();
const {
  getWalletInfo,
  getOwnedObjectsList,
  getTransactionStatus,
  getWalletHistory,
  getObjectInfo,
} = require('../controllers/walletController');

// OCT balance + basic info for an address
router.get('/info/:address', getWalletInfo);

// All objects (tokens, NFTs) owned by an address
router.get('/objects/:address', getOwnedObjectsList);

// Transaction status by digest
router.get('/tx/:digest', getTransactionStatus);

// Recent transaction history for an address
router.get('/history/:address', getWalletHistory);

// Fetch any on-chain object by ID
router.get('/object/:objectId', getObjectInfo);

module.exports = router;
