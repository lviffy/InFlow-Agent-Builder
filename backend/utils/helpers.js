const { EXPLORER_BASE_URL } = require('../config/constants');

/**
 * Generate transaction (digest) explorer URL
 * @param {string} digest - Transaction digest
 * @returns {string} Explorer URL
 */
function getTxExplorerUrl(digest) {
  return `${EXPLORER_BASE_URL}/txblock/${digest}`;
}

/**
 * Generate address explorer URL
 * @param {string} address - OneChain address
 * @returns {string} Explorer URL
 */
function getAddressExplorerUrl(address) {
  return `${EXPLORER_BASE_URL}/address/${address}`;
}

/**
 * Generate object explorer URL
 * @param {string} objectId - Move object ID
 * @returns {string} Explorer URL
 */
function getObjectExplorerUrl(objectId) {
  return `${EXPLORER_BASE_URL}/object/${objectId}`;
}

/**
 * Generate package explorer URL
 * @param {string} packageId - Move package ID
 * @returns {string} Explorer URL
 */
function getPackageExplorerUrl(packageId) {
  return `${EXPLORER_BASE_URL}/object/${packageId}`;
}

/**
 * Convert OCT to MIST (smallest unit, 1 OCT = 1_000_000_000 MIST)
 * @param {number|string} oct - Amount in OCT
 * @returns {bigint} Amount in MIST
 */
function octToMist(oct) {
  return BigInt(Math.round(parseFloat(oct) * 1_000_000_000));
}

/**
 * Convert MIST to OCT
 * @param {bigint|string} mist - Amount in MIST
 * @returns {string} Amount in OCT (formatted)
 */
function mistToOct(mist) {
  return (Number(BigInt(mist)) / 1_000_000_000).toFixed(9).replace(/\.?0+$/, '');
}

/**
 * Format success response
 * @param {Object} data - Response data
 * @returns {Object} Formatted response
 */
function successResponse(data) {
  return {
    success: true,
    ...data
  };
}

/**
 * Format error response
 * @param {string} error - Error message
 * @param {string} details - Additional error details (optional)
 * @returns {Object} Formatted error response
 */
function errorResponse(error, details = null) {
  const response = {
    success: false,
    error: error
  };
  
  if (details) {
    response.details = details;
  }
  
  return response;
}

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object|null} Error response or null if valid
 */
function validateRequiredFields(body, requiredFields) {
  const missing = requiredFields.filter(field => !body[field]);
  
  if (missing.length > 0) {
    return errorResponse(
      `Missing required fields: ${missing.join(', ')}`
    );
  }
  
  return null;
}

/**
 * Log transaction details
 * @param {string} action - Action being performed
 * @param {Object} details - Transaction details
 */
function logTransaction(action, details) {
  console.log(`\n[${new Date().toISOString()}] ${action}`);
  console.log('Details:', JSON.stringify(details, null, 2));
}

module.exports = {
  getTxExplorerUrl,
  getAddressExplorerUrl,
  getObjectExplorerUrl,
  getPackageExplorerUrl,
  octToMist,
  mistToOct,
  successResponse,
  errorResponse,
  validateRequiredFields,
  logTransaction
};
