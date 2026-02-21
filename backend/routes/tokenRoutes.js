const express = require('express');
const { deployToken, getTokenInfo, getTokenBalance } = require('../controllers/tokenController');

const router = express.Router();

// Token deployment
router.post('/deploy', deployToken);

// Token object info by on-chain object ID
router.get('/info/:objectId', getTokenInfo);

// OCT balance for an address
router.get('/balance/:address', getTokenBalance);

module.exports = router;
