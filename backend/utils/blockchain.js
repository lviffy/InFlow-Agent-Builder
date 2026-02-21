const { SuiClient } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction } = require('@mysten/sui/transactions');
const { fromB64 } = require('@mysten/sui/utils');
const { ONECHAIN_TESTNET_RPC, ONECHAIN_MAINNET_RPC, ACTIVE_NETWORK, MIST_PER_OCT } = require('../config/constants');

/**
 * Get the active RPC URL based on ACTIVE_NETWORK env variable
 * @returns {string} RPC URL
 */
function getRpcUrl() {
  return ACTIVE_NETWORK === 'mainnet' ? ONECHAIN_MAINNET_RPC : ONECHAIN_TESTNET_RPC;
}

/**
 * Get a SuiClient instance connected to OneChain
 * @returns {SuiClient} Client instance
 */
function getClient() {
  return new SuiClient({ url: getRpcUrl() });
}

/**
 * Get a keypair from a base64-encoded secret key or hex private key
 * @param {string} secretKey - Base64 secret key (from `one keytool export`) or 0x hex private key
 * @returns {Ed25519Keypair} Keypair instance
 */
function getKeypair(secretKey) {
  if (!secretKey) throw new Error('Secret key is required');
  // Support both base64 (from OneChain CLI keystore) and raw hex
  if (secretKey.startsWith('0x')) {
    const hex = secretKey.slice(2);
    return Ed25519Keypair.fromSecretKey(Buffer.from(hex, 'hex'));
  }
  // Assume base64
  return Ed25519Keypair.fromSecretKey(fromB64(secretKey));
}

/**
 * Get OCT balance for an address (returns object with totalBalance in MIST)
 * @param {string} address - OneChain address (0x...)
 * @returns {Promise<{totalBalance: string, inOCT: string}>}
 */
async function getBalance(address) {
  const client = getClient();
  const balance = await client.getBalance({ owner: address });
  const inOCT = (BigInt(balance.totalBalance) / MIST_PER_OCT).toString();
  return {
    totalBalance: balance.totalBalance,  // in MIST
    inOCT,
    formatted: `${inOCT} OCT`,
  };
}

/**
 * Check if an address has sufficient OCT balance
 * @param {string} address - OneChain address
 * @param {bigint} requiredMist - Required amount in MIST
 * @returns {Promise<boolean>}
 */
async function hasSufficientBalance(address, requiredMist) {
  const client = getClient();
  const balance = await client.getBalance({ owner: address });
  return BigInt(balance.totalBalance) >= requiredMist;
}

/**
 * Get all objects owned by an address
 * @param {string} address - OneChain address
 * @returns {Promise<Array>} List of owned objects
 */
async function getOwnedObjects(address) {
  const client = getClient();
  const { data } = await client.getOwnedObjects({ owner: address });
  return data;
}

/**
 * Get a specific object by ID
 * @param {string} objectId - Object ID
 * @returns {Promise<Object>} Object data
 */
async function getObject(objectId) {
  const client = getClient();
  return client.getObject({ id: objectId, options: { showContent: true, showType: true } });
}

/**
 * Execute a signed transaction
 * @param {Transaction} tx - Transaction to execute
 * @param {Ed25519Keypair} keypair - Signer keypair
 * @returns {Promise<Object>} Transaction result
 */
async function executeTransaction(tx, keypair) {
  const client = getClient();
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true, showObjectChanges: true },
  });
  // Wait for finalization
  await client.waitForTransaction({ digest: result.digest });
  return result;
}

/**
 * Get normalized Move module info (replaces Etherscan ABI lookup)
 * @param {string} packageId - Move package ID
 * @param {string} moduleName - Module name
 * @returns {Promise<Object>} Module info with functions and structs
 */
async function getMoveModule(packageId, moduleName) {
  const client = getClient();
  return client.getNormalizedMoveModule({ package: packageId, module: moduleName });
}

/**
 * Get all modules in a Move package
 * @param {string} packageId - Move package ID
 * @returns {Promise<Object>} All module info
 */
async function getMovePackage(packageId) {
  const client = getClient();
  return client.getNormalizedMoveModulesByPackage({ package: packageId });
}

module.exports = {
  getClient,
  getKeypair,
  getRpcUrl,
  getBalance,
  hasSufficientBalance,
  getOwnedObjects,
  getObject,
  executeTransaction,
  getMoveModule,
  getMovePackage,
  // Re-export Transaction for convenience in controllers
  Transaction,
};
