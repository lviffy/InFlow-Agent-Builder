/**
 * Allowance Controller — OneChain / Move
 *
 * ERC-20 style approve/allowance does NOT exist on Move-based chains.
 * Move uses an object-capability model: you either own an object or you don't.
 * To grant another address permission to spend your tokens you transfer the
 * object (or a MintCap / AdminCap) directly to them.
 *
 * These endpoints return informative 410 Gone responses pointing users to the
 * correct Move equivalents.
 */
const { successResponse, errorResponse } = require('../utils/helpers');
const { ACTIVE_NETWORK } = require('../config/constants');

const MOVE_EXPLANATION = {
  note: 'ERC-20 allowances do not exist on OneChain (Move-based blockchain).',
  moveAlternative: 'Use object transfers: send a MintCap or Token object directly to the delegated address.',
  docs: 'https://docs.onelabs.cc',
  network: ACTIVE_NETWORK,
};

async function approveAllowance(req, res) {
  return res.status(410).json(errorResponse(
    'approveAllowance is not supported on OneChain.',
    MOVE_EXPLANATION,
  ));
}

async function revokeAllowance(req, res) {
  return res.status(410).json(errorResponse(
    'revokeAllowance is not supported on OneChain.',
    MOVE_EXPLANATION,
  ));
}

async function getAllowance(req, res) {
  return res.status(410).json(errorResponse(
    'getAllowance is not supported on OneChain.',
    MOVE_EXPLANATION,
  ));
}

module.exports = { approveAllowance, revokeAllowance, getAllowance };
