const { SuiJsonRpcClient } = require('@mysten/sui/jsonRpc');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction, Inputs } = require('@mysten/sui/transactions');
const { fromB64 } = require('@mysten/sui/utils');
const { decodeSuiPrivateKey } = require('@mysten/sui/cryptography');
const { ONECHAIN_TESTNET_RPC, ONECHAIN_MAINNET_RPC, ACTIVE_NETWORK, MIST_PER_OCT } = require('../config/constants');

// OCT coin type (native gas token on OneChain)
const OCT_COIN_TYPE = '0x2::oct::OCT';

/**
 * Get the active RPC URL based on ACTIVE_NETWORK env variable
 * @returns {string} RPC URL
 */
function getRpcUrl() {
  return ACTIVE_NETWORK === 'mainnet' ? ONECHAIN_MAINNET_RPC : ONECHAIN_TESTNET_RPC;
}

/**
 * Get a SuiJsonRpcClient instance connected to OneChain
 * @returns {SuiJsonRpcClient}
 */
function getClient() {
  return new SuiJsonRpcClient({ url: getRpcUrl() });
}

/**
 * Get a keypair from various key formats:
 *   - suiprivkey1... (Bech32, from `one keytool export`)
 *   - 0x{hex}       (raw 32-byte hex private key)
 *   - base64         (legacy base64-encoded 32-byte key)
 * @param {string} secretKey
 * @returns {Ed25519Keypair}
 */
function getKeypair(secretKey) {
  if (!secretKey) throw new Error('Secret key is required');
  if (secretKey.startsWith('suiprivkey')) {
    const { secretKey: keyBytes } = decodeSuiPrivateKey(secretKey);
    return Ed25519Keypair.fromSecretKey(keyBytes);
  }
  if (secretKey.startsWith('0x')) {
    return Ed25519Keypair.fromSecretKey(Buffer.from(secretKey.slice(2), 'hex'));
  }
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
    totalBalance: balance.totalBalance,
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
 * Resolve a shared object ID → SharedObjectRef with initialSharedVersion.
 * Uses a cached in-memory map to avoid redundant RPC calls within one session.
 * @param {string} objectId
 * @param {SuiJsonRpcClient} client
 * @returns {Promise<{objectId: string, initialSharedVersion: number|string, mutable: boolean}>}
 */
const _sharedVersionCache = new Map();
async function resolveSharedObject(objectId, client) {
  if (_sharedVersionCache.has(objectId)) {
    return _sharedVersionCache.get(objectId);
  }
  const resp = await client.getObject({ id: objectId, options: { showOwner: true } });
  const ver = resp.data?.owner?.Shared?.initial_shared_version;
  if (ver == null) throw new Error(`Object ${objectId} is not a shared object`);
  const ref = { objectId, initialSharedVersion: ver, mutable: true };
  _sharedVersionCache.set(objectId, ref);
  return ref;
}

/**
 * Execute a PTB on OneChain.
 *
 * Internally: resolves gas price + gas coins via JSON-RPC, builds the
 * full transaction bytes offline, signs and submits.
 *
 * Callers must ensure all shared objects in the PTB are passed using
 * tx.object(Inputs.SharedObjectRef({...})) — use buildSharedObjectArg() helper
 * if needed, or call prepareSharedObjectRef() to resolve initialSharedVersion.
 *
 * @param {Transaction} tx - PTB with all arguments already set
 * @param {Ed25519Keypair} keypair - Signer keypair
 * @returns {Promise<Object>} Transaction result with digest and objectChanges
 */
async function executeTransaction(tx, keypair) {
  const client = getClient();
  const senderAddress = keypair.toSuiAddress();

  tx.setSender(senderAddress);

  // Gas price
  const gasPrice = await client.getReferenceGasPrice();
  tx.setGasPrice(Number(gasPrice));

  // Gas budget (estimate or fallback)
  tx.setGasBudget(100_000_000); // 0.1 OCT — safe default; over-estimated is fine

  // Gas payment coins
  const coinsResp = await client.getCoins({ owner: senderAddress, coinType: OCT_COIN_TYPE });
  if (!coinsResp.data.length) {
    throw new Error('No OCT gas coins found. Get testnet OCT from https://faucet-testnet.onelabs.cc');
  }
  tx.setGasPayment(coinsResp.data.map(c => ({
    objectId: c.coinObjectId,
    version: c.version,
    digest: c.digest,
  })));

  // Build, sign, execute
  const txBytes = await tx.build({ onlyTransactionKind: false });
  const { signature, bytes } = await keypair.signTransaction(txBytes);

  const result = await client.executeTransactionBlock({
    transactionBlock: bytes,   // already base64 string from signTransaction
    signature: [signature],
    options: { showEffects: true, showObjectChanges: true },
  });

  await client.waitForTransaction({ digest: result.digest });
  return result;
}

/**
 * Get normalized Move module info
 * @param {string} packageId - Move package ID
 * @param {string} moduleName - Module name
 */
async function getMoveModule(packageId, moduleName) {
  const client = getClient();
  return client.getNormalizedMoveModule({ package: packageId, module: moduleName });
}

/**
 * Get all modules in a Move package
 * @param {string} packageId - Move package ID
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
  resolveSharedObject,
  Inputs,
  Transaction,
};
