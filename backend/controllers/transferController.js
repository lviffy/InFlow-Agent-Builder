const { Transaction } = require('@mysten/sui/transactions');
const { ACTIVE_NETWORK, NATIVE_TOKEN, USDO_COIN_TYPE, ONS_PACKAGE_ID } = require('../config/constants');
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
 * Resolve a .one ONS name to its wallet address.
 * Returns the original value unchanged if it is already a 0x address.
 */
async function resolveAddress(addressOrName) {
  const value = (addressOrName || '').trim();
  if (!value.includes('.')) return value; // plain 0x address — no resolution needed
  if (!ONS_PACKAGE_ID) return value;      // ONS not configured — pass through and let chain reject

  try {
    const client = getClient();
    const fullName = value.endsWith('.one') ? value : `${value}.one`;
    const { data } = await client.getOwnedObjects({
      owner: `${ONS_PACKAGE_ID}::ons::Registry`,
      filter: { StructType: `${ONS_PACKAGE_ID}::ons::NameRecord` },
      options: { showContent: true },
    }).catch(() => ({ data: [] }));
    const record = data.find(obj => obj?.data?.content?.fields?.name === fullName);
    const resolved = record?.data?.content?.fields?.target_address
      || record?.data?.content?.fields?.address
      || null;
    return resolved || value; // fall back to original if not found
  } catch {
    return value;
  }
}

/**
 * Transfer native OCT (server-side signing).
 * Body: { privateKey, toAddress, amount }  -- amount in OCT e.g. "1.5"
 */
async function transfer(req, res) {
  try {
    const { privateKey, amount } = req.body;
    let { toAddress } = req.body;
    const validationError = validateRequiredFields(req.body, ['privateKey', 'toAddress', 'amount']);
    if (validationError) return res.status(400).json(validationError);

    // Resolve ONS .one name → wallet address
    const originalName = toAddress;
    toAddress = await resolveAddress(toAddress);

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
      onsName: originalName !== toAddress ? originalName : undefined,
      amount: String(amount),
      amountMist: amountMist.toString(),
      currency: NATIVE_TOKEN,
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
    }));
  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(error.status || 500).json(errorResponse(error.message));
  }
}

/**
 * Transfer a Move object (Token/NFT) to a recipient.
 * Body: { privateKey, objectId, toAddress }
 */
async function transferToken(req, res) {
  try {
    const { privateKey, objectId } = req.body;
    let { toAddress } = req.body;
    const validationError = validateRequiredFields(req.body, ['privateKey', 'objectId', 'toAddress']);
    if (validationError) return res.status(400).json(validationError);

    // Resolve ONS .one name → wallet address
    toAddress = await resolveAddress(toAddress);

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
    return res.status(error.status || 500).json(errorResponse(error.message));
  }
}

/**
/**
 * Get OCT or any coin balance for an address.
 * GET /transfer/balance/:address
 * Optional query: ?coinType=<Move coin type string>
 */
async function getBalance(req, res) {
  try {
    const { address } = req.params;
    const { coinType } = req.query;

    if (coinType) {
      const client = getClient();
      const { data: coins } = await client.getCoins({ owner: address, coinType });
      const total = coins.reduce((sum, c) => sum + BigInt(c.balance), 0n);
      const ticker = coinType.split('::').pop() || coinType;
      const formatted = (Number(total) / 1e9).toFixed(9).replace(/\.?0+$/, '') + ' ' + ticker;
      return res.json(successResponse({
        address,
        balance: (Number(total) / 1e9).toString(),
        balanceUnits: total.toString(),
        formatted,
        currency: ticker,
        coinType,
        network: ACTIVE_NETWORK,
        explorerUrl: getAddressExplorerUrl(address),
      }));
    }

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
    return res.status(error.status || 500).json(errorResponse(error.message));
  }
}

/**
/**
 * Build a PTB for client-side signing — no private key needed.
 * Body: { fromAddress, toAddress, amount, coinType? }
 * Returns base64-encoded serialized transaction for OneWallet to sign.
 */
async function prepareTransfer(req, res) {
  try {
    const { fromAddress, amount, coinType } = req.body;
    let { toAddress } = req.body;
    const validationError = validateRequiredFields(req.body, ['fromAddress', 'toAddress', 'amount']);
    if (validationError) return res.status(400).json(validationError);

    // Resolve ONS .one name → wallet address
    toAddress = await resolveAddress(toAddress);

    const tx = new Transaction();
    tx.setSender(fromAddress);

    if (coinType) {
      // Non-native coin transfer (e.g. USDO): use coin objects from the wallet
      const client = getClient();
      const { data: coins } = await client.getCoins({ owner: fromAddress, coinType });
      if (!coins || coins.length === 0) {
        const ticker = coinType.split('::').pop() || coinType;
        return res.status(400).json(errorResponse(`No ${ticker} coins found in wallet`));
      }
      // Merge into first coin if the wallet has multiple coin objects of this type
      if (coins.length > 1) {
        tx.mergeCoins(
          tx.object(coins[0].coinObjectId),
          coins.slice(1).map(c => tx.object(c.coinObjectId))
        );
      }
      // Assumes 9 decimals (OneChain convention)
      const amountUnits = BigInt(Math.round(parseFloat(amount) * 1e9));
      const [splitCoin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [tx.pure.u64(amountUnits)]);
      tx.transferObjects([splitCoin], tx.pure.address(toAddress));

      const builtTx = await tx.build({ client });
      const txBase64 = Buffer.from(builtTx).toString('base64');
      const ticker = coinType.split('::').pop() || coinType;

      return res.json(successResponse({
        type: 'coin',
        requiresWallet: true,
        transaction: txBase64,
        details: {
          from: fromAddress,
          to: toAddress,
          amount: String(amount),
          amountUnits: amountUnits.toString(),
          currency: ticker,
          coinType,
        },
        network: ACTIVE_NETWORK,
      }));
    }

    // Native OCT transfer
    const amountMist = octToMist(String(amount));
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
    return res.status(error.status || 500).json(errorResponse(error.message));
  }
}

/**
 * Airdrop OCT to multiple recipients in a single PTB.
 * Body: { privateKey, recipients: [{address, amount}] }
 * Optionally: { privateKey, addresses: ['0x...'], amounts: [1, 2] }
 */
async function airdrop(req, res) {
  try {
    let { privateKey, recipients, addresses, amounts } = req.body;

    // Support both formats: recipients array or parallel addresses/amounts arrays
    if (!recipients && addresses && amounts) {
      recipients = addresses.map((addr, i) => ({ address: addr, amount: amounts[i] }));
    }

    if (!privateKey) return res.status(400).json(errorResponse('privateKey is required'));
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json(errorResponse('recipients array is required (e.g. [{address, amount}])'));
    }

    const keypair = getKeypair(privateKey);
    const senderAddress = keypair.toSuiAddress();
    logTransaction('Airdrop OCT', { recipientCount: recipients.length, sender: senderAddress });

    const total = recipients.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const balInfo = await getWalletBalance(senderAddress);
    const totalMist = octToMist(String(total));
    if (BigInt(balInfo.totalBalance) < totalMist) {
      return res.status(400).json(errorResponse('Insufficient OCT balance for airdrop', {
        balance: balInfo.formatted,
        required: total + ' OCT',
      }));
    }

    const tx = new Transaction();
    // Split all amounts in one call — much cheaper than individual transactions
    const splitAmounts = recipients.map(r => tx.pure.u64(octToMist(String(r.amount))));
    const coins = tx.splitCoins(tx.gas, splitAmounts);
    recipients.forEach((r, i) => {
      tx.transferObjects([coins[i]], tx.pure.address(r.address));
    });

    const result = await executeTransaction(tx, keypair);
    const digest = result.digest;

    return res.json(successResponse({
      type: 'airdrop',
      transactionDigest: digest,
      from: senderAddress,
      recipientCount: recipients.length,
      totalAmount: String(total),
      currency: NATIVE_TOKEN,
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
      recipients: recipients.map(r => ({ address: r.address, amount: String(r.amount) })),
    }));
  } catch (error) {
    console.error('Airdrop error:', error);
    return res.status(error.status || 500).json(errorResponse(error.message));
  }
}

module.exports = { transfer, transferToken, getBalance, prepareTransfer, airdrop };
