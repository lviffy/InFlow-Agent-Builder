const { ACTIVE_NETWORK, NATIVE_TOKEN } = require('../config/constants');
const { getClient, getBalance: getWalletBalance, getOwnedObjects, getObject } = require('../utils/blockchain');
const {
  successResponse,
  errorResponse,
  validateRequiredFields,
  getTxExplorerUrl,
  getAddressExplorerUrl,
  getObjectExplorerUrl,
  mistToOct,
  logTransaction,
} = require('../utils/helpers');

/**
 * GET /wallet/balance/:address
 * Returns OCT balance for any address.
 */
async function getWalletInfo(req, res) {
  try {
    const { address } = req.params;
    const balInfo = await getWalletBalance(address);
    return res.json(successResponse({
      address,
      balance: balInfo.inOCT,
      balanceMist: balInfo.totalBalance,
      formatted: balInfo.formatted,
      currency: NATIVE_TOKEN,
      network: ACTIVE_NETWORK,
      explorerUrl: getAddressExplorerUrl(address),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /wallet/objects/:address
 * Lists all objects (tokens, NFTs, etc.) owned by an address.
 */
async function getOwnedObjectsList(req, res) {
  try {
    const { address } = req.params;
    const { cursor, limit = '20' } = req.query;
    const objects = await getOwnedObjects(address, cursor || null, parseInt(limit));

    const items = (objects.data ?? []).map(o => ({
      objectId: o.data?.objectId,
      objectType: o.data?.type,
      version: o.data?.version,
      digest: o.data?.digest,
      explorerUrl: getObjectExplorerUrl(o.data?.objectId),
    }));

    return res.json(successResponse({
      address,
      objects: items,
      nextCursor: objects.nextCursor,
      hasNextPage: objects.hasNextPage,
      network: ACTIVE_NETWORK,
      explorerUrl: getAddressExplorerUrl(address),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /wallet/tx/:digest
 * Returns status and details for a transaction by digest.
 */
async function getTransactionStatus(req, res) {
  try {
    const { digest } = req.params;
    const client = getClient();
    const tx = await client.getTransactionBlock({
      digest,
      options: { showEffects: true, showInput: true, showEvents: true },
    });

    if (!tx) return res.status(404).json(errorResponse('Transaction not found'));

    const effects = tx.effects ?? {};
    const status = effects.status?.status ?? 'unknown';

    return res.json(successResponse({
      digest,
      status,
      sender: tx.transaction?.data?.sender,
      checkpoint: tx.checkpoint,
      timestampMs: tx.timestampMs,
      gasUsed: effects.gasUsed,
      eventsCount: tx.events?.length ?? 0,
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /wallet/history/:address
 * Returns recent transactions sent by an address.
 */
async function getWalletHistory(req, res) {
  try {
    const { address } = req.params;
    const { limit = '20', cursor } = req.query;

    const client = getClient();
    const result = await client.queryTransactionBlocks({
      filter: { FromAddress: address },
      options: { showEffects: true, showInput: false },
      limit: parseInt(limit),
      cursor: cursor || undefined,
      order: 'descending',
    });

    const transactions = (result.data ?? []).map(tx => ({
      digest: tx.digest,
      status: tx.effects?.status?.status ?? 'unknown',
      timestampMs: tx.timestampMs,
      checkpoint: tx.checkpoint,
      explorerUrl: getTxExplorerUrl(tx.digest),
    }));

    return res.json(successResponse({
      address,
      transactions,
      nextCursor: result.nextCursor,
      hasNextPage: result.hasNextPage,
      network: ACTIVE_NETWORK,
      explorerUrl: getAddressExplorerUrl(address),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /wallet/object/:objectId
 * Returns full details of any on-chain object.
 */
async function getObjectInfo(req, res) {
  try {
    const { objectId } = req.params;
    const obj = await getObject(objectId);
    if (!obj?.data) return res.status(404).json(errorResponse('Object not found'));

    return res.json(successResponse({
      objectId,
      objectType: obj.data.type,
      version: obj.data.version,
      digest: obj.data.digest,
      owner: obj.data.owner,
      fields: obj.data.content?.fields ?? null,
      network: ACTIVE_NETWORK,
      explorerUrl: getObjectExplorerUrl(objectId),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = {
  getWalletInfo,
  getOwnedObjectsList,
  getTransactionStatus,
  getWalletHistory,
  getObjectInfo,
};
