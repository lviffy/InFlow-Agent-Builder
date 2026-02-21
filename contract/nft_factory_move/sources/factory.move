/// BlockOps NFT Factory on OneChain
///
/// A shared factory that mints NFT collections on behalf of users.
/// Each NFT is a Move object with metadata and follows the OneChain
/// Display standard so wallets can render them correctly.
module nft_factory::factory;

use one::{
    display,
    event,
    object::{Self, UID, ID},
    package,
    transfer,
    tx_context::{Self, TxContext},
};
use std::string::{Self, String};

// ===========================
// One-time Witness (for Display)
// ===========================

/// OTW — used once at publish time to claim the Publisher object.
public struct FACTORY has drop {}

// ===========================
// Objects
// ===========================

/// Shared factory registry.
public struct NftFactory has key {
    id: UID,
    owner: address,
    collection_count: u64,
    nft_count: u64,
}

/// A single NFT.
public struct Nft has key, store {
    id: UID,
    collection_id: ID,
    token_id: u64,
    name: String,
    description: String,
    image_url: String,
    creator: address,
    attributes: vector<Attribute>,
}

/// Key-value attribute pair attached to an NFT.
public struct Attribute has copy, drop, store {
    key: String,
    value: String,
}

/// On-chain collection metadata (shared object).
public struct Collection has key {
    id: UID,
    name: String,
    symbol: String,
    base_url: String,
    creator: address,
    total_supply: u64,
    mint_count: u64,
}

// ===========================
// Events
// ===========================

public struct CollectionCreated has copy, drop {
    collection_id: ID,
    name: String,
    symbol: String,
    creator: address,
}

public struct NftMinted has copy, drop {
    nft_id: ID,
    collection_id: ID,
    token_id: u64,
    name: String,
    recipient: address,
}

public struct NftBurned has copy, drop {
    nft_id: ID,
    collection_id: ID,
    token_id: u64,
}

// ===========================
// Init — sets up Display standard
// ===========================

fun init(otw: FACTORY, ctx: &mut TxContext) {
    // Claim Publisher for Display
    let publisher = package::claim(otw, ctx);

    // Define how wallets render our NFTs
    let mut nft_display = display::new<Nft>(&publisher, ctx);
    nft_display.add(string::utf8(b"name"), string::utf8(b"{name}"));
    nft_display.add(string::utf8(b"description"), string::utf8(b"{description}"));
    nft_display.add(string::utf8(b"image_url"), string::utf8(b"{image_url}"));
    nft_display.add(string::utf8(b"creator"), string::utf8(b"{creator}"));
    nft_display.update_version();

    let factory = NftFactory {
        id: object::new(ctx),
        owner: tx_context::sender(ctx),
        collection_count: 0,
        nft_count: 0,
    };

    transfer::public_transfer(publisher, tx_context::sender(ctx));
    transfer::public_transfer(nft_display, tx_context::sender(ctx));
    transfer::share_object(factory);
}

// ===========================
// Public functions
// ===========================

/// Create a new NFT collection.  Returns the `Collection` object which
/// is shared on-chain so anyone can query it.
public fun create_collection(
    factory: &mut NftFactory,
    name: vector<u8>,
    symbol: vector<u8>,
    base_url: vector<u8>,
    total_supply: u64,
    ctx: &mut TxContext,
): ID {
    factory.collection_count = factory.collection_count + 1;
    let creator = tx_context::sender(ctx);
    let name_str = string::utf8(name);
    let symbol_str = string::utf8(symbol);

    let collection = Collection {
        id: object::new(ctx),
        name: name_str,
        symbol: symbol_str,
        base_url: string::utf8(base_url),
        creator,
        total_supply,
        mint_count: 0,
    };

    let collection_id = object::id(&collection);

    event::emit(CollectionCreated {
        collection_id,
        name: name_str,
        symbol: symbol_str,
        creator,
    });

    transfer::share_object(collection);
    collection_id
}

/// Mint an NFT from a collection to a recipient.
public fun mint_nft(
    factory: &mut NftFactory,
    collection: &mut Collection,
    name: vector<u8>,
    description: vector<u8>,
    image_url: vector<u8>,
    attributes: vector<Attribute>,
    recipient: address,
    ctx: &mut TxContext,
): ID {
    assert!(collection.mint_count < collection.total_supply || collection.total_supply == 0, 0);

    let token_id = collection.mint_count;
    collection.mint_count = collection.mint_count + 1;
    factory.nft_count = factory.nft_count + 1;

    let name_str = string::utf8(name);
    let collection_id = object::id(collection);

    let nft = Nft {
        id: object::new(ctx),
        collection_id,
        token_id,
        name: name_str,
        description: string::utf8(description),
        image_url: string::utf8(image_url),
        creator: tx_context::sender(ctx),
        attributes,
    };

    let nft_id = object::id(&nft);

    event::emit(NftMinted {
        nft_id,
        collection_id,
        token_id,
        name: name_str,
        recipient,
    });

    transfer::public_transfer(nft, recipient);
    nft_id
}

/// Burn (destroy) an NFT the caller owns.
public fun burn_nft(nft: Nft) {
    let Nft { id, collection_id, token_id, name: _, description: _, image_url: _, creator: _, attributes: _ } = nft;
    event::emit(NftBurned { nft_id: object::uid_to_inner(&id), collection_id, token_id });
    object::delete(id);
}

/// Helper: build an Attribute pair.
public fun new_attribute(key: vector<u8>, value: vector<u8>): Attribute {
    Attribute { key: string::utf8(key), value: string::utf8(value) }
}

// ===========================
// Read-only helpers
// ===========================

public fun collection_name(c: &Collection): String { c.name }
public fun collection_symbol(c: &Collection): String { c.symbol }
public fun collection_mint_count(c: &Collection): u64 { c.mint_count }
public fun collection_total_supply(c: &Collection): u64 { c.total_supply }
public fun nft_name(n: &Nft): String { n.name }
public fun nft_token_id(n: &Nft): u64 { n.token_id }
public fun nft_image_url(n: &Nft): String { n.image_url }
public fun factory_nft_count(f: &NftFactory): u64 { f.nft_count }

// ===========================
// Tests
// ===========================

#[test_only]
use one::test_scenario::{Self as ts};

#[test]
fun test_create_collection_and_mint() {
    let admin = @0xCA;
    let user = @0xFE;

    let mut scenario = ts::begin(admin);
    {
        init(FACTORY {}, scenario.ctx());
    };

    scenario.next_tx(admin);
    {
        let mut factory = scenario.take_shared<NftFactory>();
        let _cid = create_collection(
            &mut factory,
            b"CryptoKnights",
            b"CKN",
            b"https://api.blockops.xyz/ckn/",
            100,
            scenario.ctx(),
        );
        ts::return_shared(factory);
    };

    scenario.next_tx(admin);
    {
        let mut factory = scenario.take_shared<NftFactory>();
        let mut collection = scenario.take_shared<Collection>();
        let _nft_id = mint_nft(
            &mut factory,
            &mut collection,
            b"Knight #0",
            b"The first CryptoKnight",
            b"https://api.blockops.xyz/ckn/0.png",
            vector[new_attribute(b"rarity", b"legendary")],
            user,
            scenario.ctx(),
        );
        assert!(collection_mint_count(&collection) == 1, 0);
        ts::return_shared(factory);
        ts::return_shared(collection);
    };

    scenario.end();
}
