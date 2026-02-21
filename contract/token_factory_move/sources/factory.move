/// BlockOps Token Factory on OneChain
///
/// A shared factory that lets the BlockOps backend create and manage
/// fungible tokens on behalf of users.  Each token type is tracked inside
/// the factory via dynamic fields, and individual balances live as owned
/// `Token` objects in users' wallets.
module token_factory::factory;

use one::{
    dynamic_field as df,
    event,
    object::{Self, UID},
    transfer,
    tx_context::{Self, TxContext},
};
use std::string::{Self, String};

// ===========================
// Objects
// ===========================

/// Shared factory — one per deployment.
public struct TokenFactory has key {
    id: UID,
    owner: address,
    token_count: u64,
}

/// Metadata stored inside the factory for each token type.
public struct TokenInfo has copy, drop, store {
    name: String,
    symbol: String,
    decimals: u8,
    total_supply: u64,
    creator: address,
}

/// An owned fungible-token balance in a user's wallet.
public struct Token has key, store {
    id: UID,
    factory_id: address,
    token_id: u64,
    amount: u64,
    symbol: String,
    name: String,
}

/// Capability that lets the holder mint more of a specific token type.
public struct MintCap has key, store {
    id: UID,
    factory_id: address,
    token_id: u64,
}

// ===========================
// Events
// ===========================

public struct TokenCreated has copy, drop {
    token_id: u64,
    name: String,
    symbol: String,
    decimals: u8,
    initial_supply: u64,
    creator: address,
}

public struct TokenMinted has copy, drop {
    token_id: u64,
    amount: u64,
    recipient: address,
}

public struct TokenTransferred has copy, drop {
    token_id: u64,
    amount: u64,
    from: address,
    to: address,
}

// ===========================
// Init
// ===========================

fun init(ctx: &mut TxContext) {
    let factory = TokenFactory {
        id: object::new(ctx),
        owner: tx_context::sender(ctx),
        token_count: 0,
    };
    transfer::share_object(factory);
}

// ===========================
// Public functions
// ===========================

/// Create a new token type.  Returns the initial supply as a `Token`
/// object plus a `MintCap` so the creator can mint more later.
public fun create_token(
    factory: &mut TokenFactory,
    name: vector<u8>,
    symbol: vector<u8>,
    decimals: u8,
    initial_supply: u64,
    ctx: &mut TxContext,
): (Token, MintCap) {
    let token_id = factory.token_count;
    let creator = tx_context::sender(ctx);
    let name_str = string::utf8(name);
    let symbol_str = string::utf8(symbol);

    df::add(&mut factory.id, token_id, TokenInfo {
        name: name_str,
        symbol: symbol_str,
        decimals,
        total_supply: initial_supply,
        creator,
    });

    factory.token_count = factory.token_count + 1;

    event::emit(TokenCreated {
        token_id,
        name: name_str,
        symbol: symbol_str,
        decimals,
        initial_supply,
        creator,
    });

    let token = Token {
        id: object::new(ctx),
        factory_id: object::id_address(factory),
        token_id,
        amount: initial_supply,
        symbol: symbol_str,
        name: name_str,
    };

    let mint_cap = MintCap {
        id: object::new(ctx),
        factory_id: object::id_address(factory),
        token_id,
    };

    (token, mint_cap)
}

/// Mint additional tokens using a MintCap.
public fun mint(
    factory: &mut TokenFactory,
    cap: &MintCap,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    let info: &mut TokenInfo = df::borrow_mut(&mut factory.id, cap.token_id);
    info.total_supply = info.total_supply + amount;

    let symbol = info.symbol;
    let name = info.name;

    event::emit(TokenMinted {
        token_id: cap.token_id,
        amount,
        recipient,
    });

    let token = Token {
        id: object::new(ctx),
        factory_id: cap.factory_id,
        token_id: cap.token_id,
        amount,
        symbol,
        name,
    };

    transfer::public_transfer(token, recipient);
}

/// Transfer a Token balance to another address.
public fun transfer_token(
    token: Token,
    recipient: address,
    ctx: &TxContext,
) {
    event::emit(TokenTransferred {
        token_id: token.token_id,
        amount: token.amount,
        from: tx_context::sender(ctx),
        to: recipient,
    });
    transfer::public_transfer(token, recipient);
}

/// Split a Token into two: one with `amount` and the remainder.
public fun split(
    token: &mut Token,
    amount: u64,
    ctx: &mut TxContext,
): Token {
    assert!(token.amount >= amount, 0);
    token.amount = token.amount - amount;
    Token {
        id: object::new(ctx),
        factory_id: token.factory_id,
        token_id: token.token_id,
        amount,
        symbol: token.symbol,
        name: token.name,
    }
}

/// Merge `other` into `token`.
public fun merge(token: &mut Token, other: Token) {
    assert!(token.token_id == other.token_id, 1);
    let Token { id, amount, factory_id: _, token_id: _, symbol: _, name: _ } = other;
    object::delete(id);
    token.amount = token.amount + amount;
}

// ===========================
// Read-only helpers
// ===========================

public fun get_token_info(factory: &TokenFactory, token_id: u64): &TokenInfo {
    df::borrow(&factory.id, token_id)
}

public fun token_count(factory: &TokenFactory): u64 { factory.token_count }
public fun token_amount(token: &Token): u64 { token.amount }
public fun token_symbol(token: &Token): String { token.symbol }
public fun token_name(token: &Token): String { token.name }
public fun token_id(token: &Token): u64 { token.token_id }

// ===========================
// Tests
// ===========================

#[test_only]
use one::test_scenario::{Self as ts};

#[test]
fun test_create_and_mint() {
    let admin = @0xAD;

    let mut scenario = ts::begin(admin);
    {
        init(scenario.ctx());
    };

    scenario.next_tx(admin);
    {
        let mut factory = scenario.take_shared<TokenFactory>();
        let (token, cap) = create_token(
            &mut factory,
            b"BlockOps Coin",
            b"BOPS",
            9,
            1_000_000_000,
            scenario.ctx(),
        );

        assert!(token_amount(&token) == 1_000_000_000, 0);
        assert!(token_symbol(&token) == string::utf8(b"BOPS"), 1);
        assert!(token_count(&factory) == 1, 2);

        ts::return_to_sender(&scenario, token);
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(factory);
    };

    scenario.end();
}
