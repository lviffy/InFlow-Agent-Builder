const { ethers } = require('ethers');
const { ARBITRUM_SEPOLIA_RPC } = require('../config/constants');

/**
 * Get a provider instance for Arbitrum Sepolia
 * @returns {ethers.JsonRpcProvider} Provider instance
 */
function getProvider() {
  return new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
}

/**
 * Get a wallet instance from private key
 * @param {string} privateKey - Private key with 0x prefix
 * @param {ethers.JsonRpcProvider} provider - Provider instance (optional)
 * @returns {ethers.Wallet} Wallet instance
 */
function getWallet(privateKey, provider = null) {
  const _provider = provider || getProvider();
  return new ethers.Wallet(privateKey, _provider);
}

/**
 * Get contract instance
 * @param {string} address - Contract address
 * @param {Array} abi - Contract ABI
 * @param {ethers.Wallet|ethers.JsonRpcProvider} signerOrProvider - Signer or provider
 * @returns {ethers.Contract} Contract instance
 */
function getContract(address, abi, signerOrProvider) {
  return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * Check if wallet has sufficient balance
 * @param {string} address - Wallet address
 * @param {bigint} requiredAmount - Required amount in wei
 * @returns {Promise<boolean>} True if balance is sufficient
 */
async function hasSufficientBalance(address, requiredAmount) {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  return balance >= requiredAmount;
}

/**
 * Get gas estimate with buffer
 * @param {Function} contractMethod - Contract method to estimate
 * @param {Array} args - Method arguments
 * @param {number} bufferPercent - Buffer percentage (default 20%)
 * @returns {Promise<bigint>} Gas estimate with buffer
 */
async function getGasEstimateWithBuffer(contractMethod, args, bufferPercent = 20) {
  try {
    const estimate = await contractMethod.estimateGas(...args);
    const buffer = (estimate * BigInt(bufferPercent)) / 100n;
    return estimate + buffer;
  } catch (error) {
    console.warn('Gas estimation failed:', error.message);
    return null;
  }
}

/**
 * Parse event from transaction receipt
 * @param {Object} receipt - Transaction receipt
 * @param {ethers.Interface} contractInterface - Contract interface
 * @param {string} eventName - Event name to parse
 * @returns {Object|null} Parsed event or null
 */
function parseEventFromReceipt(receipt, contractInterface, eventName) {
  for (const log of receipt.logs) {
    try {
      const parsedLog = contractInterface.parseLog(log);
      if (parsedLog && parsedLog.name === eventName) {
        return parsedLog.args;
      }
    } catch (e) {
      // Not the event we're looking for
      continue;
    }
  }
  return null;
}

module.exports = {
  getProvider,
  getWallet,
  getContract,
  hasSufficientBalance,
  getGasEstimateWithBuffer,
  parseEventFromReceipt
};
