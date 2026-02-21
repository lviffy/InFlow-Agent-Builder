const express = require('express');
const router = express.Router();
const {
  executeNLCommand,
  previewNLCommand,
  getModuleFunctions,
} = require('../controllers/nlExecutorController');

/**
 * Natural Language Move Executor Routes
 *
 * AI-powered natural language → Move function call mapping on OneChain.
 * Uses getMoveModule (RPC) instead of Etherscan to discover functions.
 */

// Discover: list all exposed functions in a Move module
router.get('/module/:packageId/:moduleName', getModuleFunctions);

// Preview: AI maps command to function without executing
router.post('/preview', previewNLCommand);

// Execute: AI maps and executes the Move call
router.post('/execute', executeNLCommand);

module.exports = router;
