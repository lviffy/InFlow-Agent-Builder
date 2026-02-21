const { Transaction } = require('@mysten/sui/transactions');
const { ACTIVE_NETWORK, NATIVE_TOKEN } = require('../config/constants');
const { getClient, getKeypair, getBalance: getWalletBalance, executeTransaction } = require('../utils/blockchain');
const {
  successResponse,
  errorResponse,
  validateRequiredFields,
  getTxExplorerUrl,
  getAddressExplorerUrl,
  octToMist,
  logTransaction,
} = require('../utils/helpers');

/**
 * Transfer native OCT (server-side signing).
 * Body: { privateKey, toAddress, amount }  -- amount in OCT e.g. "1.5"
 */
async function transfer(req, res) {
  try {
    const { privateKey, toAddress, amount } = req.body;
    const validationError = validateRequiredFields(req.body, ['privateKey', 'toAddress', 'amount']);
    if (validationError) return res.status(400).json(validationError);

    const keypair = getKeypair(privateKey);
    const senderAddress = keypair.toSuiAddress();
    logTransaction('Transfer OCT', { toAddress, amount, sender: senderAddress });

    const balInfo = await getWalletBalance(senderAddress);
    const amountMist = octToMist(String(amount));
    if (BigInt(balInfo.totalBalance) < amountMist) {
      return res.status(400).json(errorResponse('Insufficient OCT balance', {
        balance: balInfo.formatted,
        required: amount + ' OCT',
      }));
    }

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
    tx.transferObjects([coin], tx.pure.address(toAddress));

    const result = await executeTransaction(tx, keypair);
    const digest = result.digest;

    return res.json(successResponse({
      type: 'native',
      transactionDigest: digest,
      from: senderAddress,
      to: toAddress,
      amount: String(amount),
      amountMist: amountMist.toString(),
      currency: NATIVE_TOKEN,
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
    }));
  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * Transfer a Move object (Token/NFT) to a recipient.
 * Body: { privateKey, objectId, toAddress }
 */
async function transferToken(req, res) {
  try {
    const { privateKey, objectId, toAddress } = req.body;
    const validationError = validateRequiredFields(req.body, ['privateKey', 'objectId', 'toAddress']);
    if (validationError) return res.status(400).json(validationError);

    const keypair = getKeypair(privateKey);
    const senderAddress = keypair.toSuiAddress();
    logTransaction('Transfer Object', { objectId, toAddress, sender: senderAddress });

    const tx = new Transaction();
    tx.transferObjects([tx.object(objectId)], tx.pure.address(toAddress));

    const result = await executeTransaction(tx, keypair);
    const digest = result.digest;

    return res.json(successResponse({
      type: 'object_transfer',
      transactionDigest: digest,
      from: senderAddress,
      to: toAddress,
      objectId,
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
    }));
  } catch (error) {
    console.error('Transfer object error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * Get OCT balance for an address.
 * GET /transfer/balance/:address
 */
async function getBalance(req, res) {
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
 * Build a PTB for client-side signing — no private key needed.
 * Body: { fromAddress, toAddress, amount }
 * Returns base64-encoded serialized transaction for OneWallet to sign.
 */
async function prepareTransfer(req, res) {
  try {
    const { fromAddress, toAddress, amount } = req.body;
    const validationError = validateRequiredFields(req.body, ['fromAddress', 'toAddress', 'amount']);
    if (validationError) return res.status(400).json(validationError);

    const amountMist = octToMist(String(amount));
    const tx = new Transaction();
    tx.setSender(fromAddress);
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
    tx.transferObjects([coin], tx.pure.address(toAddress));

    const client = getClient();
    const builtTx = await tx.build({ client });
    const txBase64 = Buffer.from(builtTx).toString('base64');

    return res.json(successResponse({
      type: 'native',
      requiresWallet: true,
      transaction: txBase64,
      details: {
        from: fromAddress,
        to: toAddress,
        amount: String(amount),
        amountMist: amountMist.toString(),
        currency: NATIVE_TOKEN,
      },
      network: ACTIVE_NETWORK,
    }));
  } catch (error) {
    console.error('Prepare transfer error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = { transfer, transferToken, getBalance, prepareTransfer };
