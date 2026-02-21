const { Transaction } = require('@mysten/sui/transactions');
const { NFT_FACTORY_PACKAGE_ID, ACTIVE_NETWORK, NATIVE_TOKEN } = require('../config/constants');
const { getKeypair, getBalance, executeTransaction, getObject } = require('../utils/blockchain');
const {
  successResponse, errorResponse, validateRequiredFields,
  getTxExplorerUrl, getObjectExplorerUrl, getPackageExplorerUrl, logTransaction,
} = require('../utils/helpers');

async function deployNFTCollection(req, res) {
  try {
    const { privateKey, name, symbol, baseUrl = '', totalSupply = 0, factoryObjectId } = req.body;
    const validationError = validateRequiredFields(req.body, ['privateKey', 'name', 'symbol', 'factoryObjectId']);
    if (validationError) return res.status(400).json(validationError);
    if (!NFT_FACTORY_PACKAGE_ID || NFT_FACTORY_PACKAGE_ID === '0x0')
      return res.status(500).json(errorResponse('NFT_FACTORY_PACKAGE_ID not configured'));
    const keypair = getKeypair(privateKey);
    const senderAddress = keypair.toSuiAddress();
    logTransaction('Create NFT Collection', { name, symbol, sender: senderAddress });
    const balanceInfo = await getBalance(senderAddress);
    if (BigInt(balanceInfo.totalBalance) === 0n)
      return res.status(400).json(errorResponse('No OCT for gas. Get testnet OCT from https://faucet-testnet.onelabs.cc'));
    const tx = new Transaction();
    tx.moveCall({
      target: `${NFT_FACTORY_PACKAGE_ID}::factory::create_collection`,
      arguments: [
        tx.object(factoryObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(name))),
        tx.pure.vector('u8', Array.from(Buffer.from(symbol))),
        tx.pure.vector('u8', Array.from(Buffer.from(baseUrl))),
        tx.pure.u64(BigInt(totalSupply)),
      ],
    });
    const result = await executeTransaction(tx, keypair);
    const digest = result.digest;
    const created = result.objectChanges?.filter(c => c.type === 'created') ?? [];
    const collectionObj = created.find(o => o.objectType?.includes('::factory::Collection'));
    return res.json(successResponse({
      message: 'NFT Collection created on OneChain',
      transactionDigest: digest, sender: senderAddress,
      collectionObjectId: collectionObj?.objectId,
      collectionInfo: { name, symbol, baseUrl, totalSupply },
      network: ACTIVE_NETWORK, nativeCurrency: NATIVE_TOKEN,
      explorerUrl: getTxExplorerUrl(digest),
      collectionExplorerUrl: collectionObj ? getObjectExplorerUrl(collectionObj.objectId) : null,
      packageExplorerUrl: getPackageExplorerUrl(NFT_FACTORY_PACKAGE_ID),
    }));
  } catch (error) {
    console.error('Create NFT collection error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

async function mintNFT(req, res) {
  try {
    const { privateKey, factoryObjectId, collectionObjectId, name, description = '', imageUrl = '', recipient, attributes = [] } = req.body;
    const validationError = validateRequiredFields(req.body, ['privateKey', 'factoryObjectId', 'collectionObjectId', 'name', 'recipient']);
    if (validationError) return res.status(400).json(validationError);
    const keypair = getKeypair(privateKey);
    const senderAddress = keypair.toSuiAddress();
    logTransaction('Mint NFT', { name, collectionObjectId, recipient });
    const attrKeys = attributes.map(a => Array.from(Buffer.from(String(a.key ?? ''))));
    const attrVals = attributes.map(a => Array.from(Buffer.from(String(a.value ?? ''))));
    const tx = new Transaction();
    const attrObjs = attributes.map((_, i) => tx.moveCall({
      target: `${NFT_FACTORY_PACKAGE_ID}::factory::new_attribute`,
      arguments: [tx.pure.vector('u8', attrKeys[i]), tx.pure.vector('u8', attrVals[i])],
    }));
    tx.moveCall({
      target: `${NFT_FACTORY_PACKAGE_ID}::factory::mint_nft`,
      arguments: [
        tx.object(factoryObjectId), tx.object(collectionObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(name))),
        tx.pure.vector('u8', Array.from(Buffer.from(description))),
        tx.pure.vector('u8', Array.from(Buffer.from(imageUrl))),
        tx.makeMoveVec({ type: `${NFT_FACTORY_PACKAGE_ID}::factory::Attribute`, elements: attrObjs }),
        tx.pure.address(recipient),
      ],
    });
    const result = await executeTransaction(tx, keypair);
    const digest = result.digest;
    const created = result.objectChanges?.filter(c => c.type === 'created') ?? [];
    const nftObj = created.find(o => o.objectType?.includes('::factory::Nft'));
    return res.json(successResponse({
      message: 'NFT minted successfully',
      transactionDigest: digest, sender: senderAddress, recipient,
      nftObjectId: nftObj?.objectId, collectionObjectId,
      nftInfo: { name, description, imageUrl },
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
      nftExplorerUrl: nftObj ? getObjectExplorerUrl(nftObj.objectId) : null,
    }));
  } catch (error) {
    console.error('Mint NFT error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

async function getNFTInfo(req, res) {
  try {
    const { objectId } = req.params;
    const obj = await getObject(objectId);
    if (!obj?.data) return res.status(404).json(errorResponse('NFT object not found'));
    const fields = obj.data.content?.fields ?? {};
    return res.json(successResponse({
      objectId, objectType: obj.data.type,
      name: fields.name, description: fields.description,
      imageUrl: fields.image_url, creator: fields.creator,
      tokenId: fields.token_id, collectionId: fields.collection_id,
      attributes: fields.attributes, network: ACTIVE_NETWORK,
      explorerUrl: getObjectExplorerUrl(objectId),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = { deployNFTCollection, mintNFT, getNFTInfo };
