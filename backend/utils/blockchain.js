const { SuiJsonRpcClient } = require('@mysten/sui/jsonRpc');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction, Inputs } = require('@mysten/sui/transactions');
const { decodeSuiPrivateKey } = require('@mysten/sui/cryptography');
const { ONECHAIN_TESTNET_RPC, ONECHAIN_MAINNET_RPC, ACTIVE_NETWORK, MIST_PER_OCT } = require('../config/constants');

// OCT coin type (native gas token on OneChain)
const OCT_COIN_TYPE = '0x2::oct::OCT';
const REDACTED_PRIVATE_KEY = '[REDACTED_PRIVATE_KEY]';
const TRANSIENT_RPC_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_RPC_ERROR_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND']);
const RPC_RETRY_ATTEMPTS = 2;

function splitRpcUrls(value) {
  return [...new Set(
    String(value || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean)
  )];
}

function getRpcUrls() {
  const configuredUrls = ACTIVE_NETWORK === 'mainnet'
    ? splitRpcUrls(ONECHAIN_MAINNET_RPC)
    : splitRpcUrls(ONECHAIN_TESTNET_RPC);

  if (
    ACTIVE_NETWORK === 'mainnet' &&
    configuredUrls.includes('https://rpc-mainnet.onelabs.cc:443') &&
    !configuredUrls.includes('https://rpc.mainnet.onelabs.cc:443')
  ) {
    configuredUrls.push('https://rpc.mainnet.onelabs.cc:443');
  }

  return configuredUrls.length ? configuredUrls : [getRpcUrl()];
}

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
function getClient(url = getRpcUrl()) {
  return new SuiJsonRpcClient({ url });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableRpcError(error) {
  const status = error?.status ?? error?.response?.status;
  const code = error?.code;
  const message = String(error?.message || '').toLowerCase();

  return (
    TRANSIENT_RPC_STATUS_CODES.has(status) ||
    RETRYABLE_RPC_ERROR_CODES.has(code) ||
    message.includes('bad gateway') ||
    message.includes('gateway timeout') ||
    message.includes('temporarily unavailable') ||
    message.includes('fetch failed') ||
    message.includes('network error') ||
    message.includes('socket hang up')
  );
}

function createRpcUnavailableError(operationName, rpcUrls, error) {
  const details = error?.message || 'Unknown RPC error';
  const err = new Error(
    `OneChain RPC is temporarily unavailable while trying to ${operationName}. Tried: ${rpcUrls.join(', ')}. Last error: ${details}`
  );
  err.status = 503;
  err.isRpcUnavailable = true;
  err.cause = error;
  return err;
}

async function withRpcFallback(operationName, operation) {
  const rpcUrls = getRpcUrls();
  let lastError;

  for (const rpcUrl of rpcUrls) {
    const client = getClient(rpcUrl);

    for (let attempt = 1; attempt <= RPC_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await operation(client, rpcUrl);
      } catch (error) {
        lastError = error;
        if (!isRetryableRpcError(error)) {
          throw error;
        }
        if (attempt < RPC_RETRY_ATTEMPTS) {
          await sleep(250 * attempt);
        }
      }
    }
  }

  throw createRpcUnavailableError(operationName, rpcUrls, lastError);
}

async function getPreferredClient(operationName) {
  const rpcUrls = getRpcUrls();
  let lastError;

  for (const rpcUrl of rpcUrls) {
    const client = getClient(rpcUrl);

    try {
      await client.getLatestCheckpointSequenceNumber();
      return client;
    } catch (error) {
      lastError = error;
      if (!isRetryableRpcError(error)) {
        throw error;
      }
    }
  }

  throw createRpcUnavailableError(operationName, rpcUrls, lastError);
}

async function getAllCoins(client, owner, coinType) {
  let cursor = null;
  const allCoins = [];

  do {
    const page = await client.getCoins({ owner, coinType, cursor });
    allCoins.push(...(page.data || []));
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return allCoins;
}

function formatMistToOct(totalMist) {
  const whole = totalMist / MIST_PER_OCT;
  const remainder = totalMist % MIST_PER_OCT;

  if (remainder === 0n) {
    return whole.toString();
  }

  return `${whole}.${remainder.toString().padStart(9, '0').replace(/0+$/, '')}`;
}

function decodeBase64SecretKey(secretKey) {
  try {
    const normalized = String(secretKey || '').trim();
    const keyBytes = Buffer.from(normalized, 'base64');

    if (!keyBytes.length) {
      throw new Error('Decoded secret key is empty');
    }

    return keyBytes;
  } catch (error) {
    throw new Error(`Invalid base64 private key: ${error.message}`);
  }
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
  if (secretKey === REDACTED_PRIVATE_KEY) {
    throw new Error('Private key placeholder was passed to the backend instead of the real secret key');
  }
  if (secretKey.startsWith('suiprivkey')) {
    const { secretKey: keyBytes } = decodeSuiPrivateKey(secretKey);
    return Ed25519Keypair.fromSecretKey(keyBytes);
  }
  if (secretKey.startsWith('0x')) {
    return Ed25519Keypair.fromSecretKey(Buffer.from(secretKey.slice(2), 'hex'));
  }
  return Ed25519Keypair.fromSecretKey(decodeBase64SecretKey(secretKey));
}

/**
 * Get OCT balance for an address (returns object with totalBalance in MIST)
 * @param {string} address - OneChain address (0x...)
 * @returns {Promise<{totalBalance: string, inOCT: string}>}
 */
async function getBalance(address) {
  return withRpcFallback('fetch OCT balance', async (client) => {
    const coins = await getAllCoins(client, address, OCT_COIN_TYPE);
    const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    const inOCT = formatMistToOct(totalBalance);

    return {
      totalBalance: totalBalance.toString(),
      inOCT,
      formatted: `${inOCT} OCT`,
    };
  });
}

/**
 * Check if an address has sufficient OCT balance
 * @param {string} address - OneChain address
 * @param {bigint} requiredMist - Required amount in MIST
 * @returns {Promise<boolean>}
 */
async function hasSufficientBalance(address, requiredMist) {
  const balance = await getBalance(address);
  return BigInt(balance.totalBalance) >= requiredMist;
}

/**
 * Get all objects owned by an address
 * @param {string} address - OneChain address
 * @returns {Promise<Array>} List of owned objects
 */
async function getOwnedObjects(address) {
  return withRpcFallback('fetch owned objects', async (client) => {
    const { data } = await client.getOwnedObjects({ owner: address });
    return data;
  });
}

/**
 * Get a specific object by ID
 * @param {string} objectId - Object ID
 * @returns {Promise<Object>} Object data
 */
async function getObject(objectId) {
  return withRpcFallback('fetch object details', async (client) =>
    client.getObject({ id: objectId, options: { showContent: true, showType: true } })
  );
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

  const loadSharedRef = async (rpcClient) => {
    const resp = await rpcClient.getObject({ id: objectId, options: { showOwner: true } });
    const ver = resp.data?.owner?.Shared?.initial_shared_version;
    if (ver == null) throw new Error(`Object ${objectId} is not a shared object`);

    const ref = { objectId, initialSharedVersion: ver, mutable: true };
    _sharedVersionCache.set(objectId, ref);
    return ref;
  };

  if (client) {
    try {
      return await loadSharedRef(client);
    } catch (error) {
      if (!isRetryableRpcError(error)) {
        throw error;
      }
    }
  }

  return withRpcFallback('resolve shared object', loadSharedRef);
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
  const client = await getPreferredClient('submit transaction');
  const senderAddress = keypair.toSuiAddress();

  tx.setSender(senderAddress);

  // Gas price
  const gasPrice = await withRpcFallback('fetch reference gas price', async (rpcClient) =>
    rpcClient.getReferenceGasPrice()
  );
  tx.setGasPrice(Number(gasPrice));

  // Gas budget (estimate or fallback)
  tx.setGasBudget(100_000_000); // 0.1 OCT — safe default; over-estimated is fine

  // Gas payment coins
  const coinsResp = await withRpcFallback('fetch OCT gas coins', async (rpcClient) =>
    rpcClient.getCoins({ owner: senderAddress, coinType: OCT_COIN_TYPE })
  );
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

  await withRpcFallback('confirm transaction', async (rpcClient) =>
    rpcClient.waitForTransaction({ digest: result.digest })
  );
  return result;
}

/**
 * Get normalized Move module info
 * @param {string} packageId - Move package ID
 * @param {string} moduleName - Module name
 */
async function getMoveModule(packageId, moduleName) {
  return withRpcFallback('fetch Move module', async (client) =>
    client.getNormalizedMoveModule({ package: packageId, module: moduleName })
  );
}

/**
 * Get all modules in a Move package
 * @param {string} packageId - Move package ID
 */
async function getMovePackage(packageId) {
  return withRpcFallback('fetch Move package', async (client) =>
    client.getNormalizedMoveModulesByPackage({ package: packageId })
  );
}

module.exports = {
  getClient,
  getKeypair,
  getRpcUrl,
  getRpcUrls,
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
