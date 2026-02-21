const express = require('express');
const router = express.Router();
const { approveAllowance, revokeAllowance, getAllowance } = require('../controllers/allowanceController');

// Not supported on OneChain (Move object-capability model — no ERC-20 allowances)
router.post('/approve', approveAllowance);
router.post('/revoke', revokeAllowance);
router.get('/check/:tokenAddress/:ownerAddress/:spenderAddress', getAllowance);

module.exports = router;
