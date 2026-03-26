const { getClient, getKeypair, getBalance, executeTransaction, getObject, getOwnedObjects, resolveSharedObject, Inputs } = require('../utils/blockchain');
const { Transaction } = require('@mysten/sui/transactions');
const {
  TOKEN_FACTORY_PACKAGE_ID,
  TOKEN_FACTORY_OBJECT_ID,
  ACTIVE_NETWORK,
  NATIVE_TOKEN,
} = require('../config/constants');
const {
  successResponse,
  errorResponse,
  validateRequiredFields,
  getTxExplorerUrl,
  getAddressExplorerUrl,
  getObjectExplorerUrl,
  getPackageExplorerUrl,
  mistToOct,
  logTransaction,
} = require('../utils/helpers');

/**
 * Create a fungible Token via the OneChain token_factory Move package.
 *
 * The factory is a shared object stored on-chain.  The caller signs with
 * their private key so the Token and MintCap land in their wallet.
 */
async function deployToken(req, res) {
  try {
    const { privateKey, name, symbol, decimals = 9, initialSupply } = req.body;
    const factoryObjectId = req.body.factoryObjectId || TOKEN_FACTORY_OBJECT_ID;

    const validationError = validateRequiredFields(req.body, ['privateKey', 'name', 'symbol', 'initialSupply']);
    if (validationError) return res.status(400).json(validationError);

    if (!TOKEN_FACTORY_PACKAGE_ID || TOKEN_FACTORY_PACKAGE_ID === '0x0') {
      return res.status(500).json(
        errorResponse('TOKEN_FACTORY_PACKAGE_ID not configured. Deploy the Move package first.')
      );
    }
    if (!factoryObjectId) {
      return res.status(500).json(
        errorResponse('TOKEN_FACTORY_OBJECT_ID not configured. Set env var or pass factoryObjectId.')
      );
    }

    const keypair = getKeypair(privateKey);
    const senderAddress = keypair.toSuiAddress();
    logTransaction('Create Token', { name, symbol, decimals, initialSupply, sender: senderAddress });

    // Verify sender has enough OCT for gas
    const balanceInfo = await getBalance(senderAddress);
    if (BigInt(balanceInfo.totalBalance) === 0n) {
      return res.status(400).json(
        errorResponse('Insufficient OCT balance for gas fees', 'Get testnet OCT from https://faucet-testnet.onelabs.cc')
      );
    }

    // Build PTB
    const tx = new Transaction();
    const client = getClient();
    const factorySharedRef = await resolveSharedObject(factoryObjectId, client);
    const [token, mintCap] = tx.moveCall({
      target: `${TOKEN_FACTORY_PACKAGE_ID}::factory::create_token`,
      arguments: [
        tx.object(Inputs.SharedObjectRef(factorySharedRef)),
        tx.pure.vector('u8', Array.from(Buffer.from(name))),
        tx.pure.vector('u8', Array.from(Buffer.from(symbol))),
        tx.pure.u8(decimals),
        tx.pure.u64(BigInt(initialSupply)),
      ],
    });
    // Transfer Token and MintCap to sender (both are non-droppable resources)
    tx.transferObjects([token, mintCap], senderAddress);

    const result = await executeTransaction(tx, keypair);
    const digest = result.digest;

    // Pull new object IDs created by this transaction
    const createdObjects = result.objectChanges?.filter(c => c.type === 'created') ?? [];
    const tokenObj = createdObjects.find(o => o.objectType?.includes('::factory::Token'));
    const mintCapObj = createdObjects.find(o => o.objectType?.includes('::factory::MintCap'));

    return res.json(
      successResponse({
        message: 'Token created successfully on OneChain',
        transactionDigest: digest,
        sender: senderAddress,
        network: ACTIVE_NETWORK,
        nativeCurrency: NATIVE_TOKEN,
        tokenObjectId: tokenObj?.objectId,
        mintCapObjectId: mintCapObj?.objectId,
        tokenInfo: { name, symbol, decimals, initialSupply },
        explorerUrl: getTxExplorerUrl(digest),
        tokenExplorerUrl: tokenObj ? getObjectExplorerUrl(tokenObj.objectId) : null,
        packageExplorerUrl: getPackageExplorerUrl(TOKEN_FACTORY_PACKAGE_ID),
      })
    );
  } catch (error) {
    console.error('Create token error:', error);
    return res.status(error.status || 500).json(errorResponse(error.message));
  }
}

/**
 * Get token object info by object ID.
 */
async function getTokenInfo(req, res) {
  try {
    const { objectId } = req.params;
    const obj = await getObject(objectId);

    if (!obj?.data) {
      return res.status(404).json(errorResponse('Token object not found'));
    }

    const fields = obj.data.content?.fields ?? {};

    return res.json(
      successResponse({
        objectId,
        objectType: obj.data.type,
        name: fields.name,
        symbol: fields.symbol,
        decimals: fields.decimals,
        balance: fields.balance,
        creator: fields.creator,
        network: ACTIVE_NETWORK,
        explorerUrl: getObjectExplorerUrl(objectId),
      })
    );
  } catch (error) {
    return res.status(error.status || 500).json(errorResponse(error.message));
  }
}

/**
 * Get OCT balance (native coin) for an address.
 */
async function getTokenBalance(req, res) {
  try {
    const { address } = req.params;
    const balanceInfo = await getBalance(address);

    return res.json(
      successResponse({
        address,
        balance: balanceInfo.inOCT,
        balanceMist: balanceInfo.totalBalance,
        formatted: balanceInfo.formatted,
        currency: NATIVE_TOKEN,
        network: ACTIVE_NETWORK,
        explorerUrl: getAddressExplorerUrl(address),
      })
    );
  } catch (error) {
    return res.status(error.status || 500).json(errorResponse(error.message));
  }
}

module.exports = {
  deployToken,
  getTokenInfo,
  getTokenBalance,
};
