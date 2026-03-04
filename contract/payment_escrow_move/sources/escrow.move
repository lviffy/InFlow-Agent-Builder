/// InFlow Payment Escrow on OneChain
///
/// Accepts OCT payments and holds them in escrow until the InFlow backend
/// confirms a tool execution, after which funds are released to the provider.
/// Users can request a refund before execution if they change their mind.
module payment_escrow::escrow;

use one::{
    coin::{Self, Coin},
    dynamic_object_field as dof,
    event,
    object::{Self, UID, ID},
    oct::OCT,
    transfer,
    tx_context::{Self, TxContext},
};
use std::string::{Self, String};

// ===========================
// Objects
// ===========================

/// Global escrow registry (shared).
public struct EscrowRegistry has key {
    id: UID,
    owner: address,           // Backend-controlled admin address
    payment_count: u64,
    total_volume_mist: u64,
}

/// A single payment held in escrow.
/// The OCT coin is stored as a Dynamic Object Field so it's visible on-chain.
public struct Payment has key {
    id: UID,
    payment_index: u64,
    payer: address,
    provider: address,        // Who receives funds on execution
    amount_mist: u64,
    tool_name: String,
    status: u8,               // 0=pending, 1=executed, 2=refunded
}

/// Key used for the DOF that holds the escrowed Coin<OCT>.
public struct CoinKey has copy, drop, store {}

// ===========================
// Constants
// ===========================

const STATUS_PENDING: u8  = 0;
const STATUS_EXECUTED: u8 = 1;
const STATUS_REFUNDED: u8 = 2;

const E_NOT_PENDING: u64    = 0;
const E_NOT_PAYER: u64      = 1;
const E_NOT_ADMIN: u64      = 2;

// ===========================
// Events
// ===========================

public struct PaymentCreated has copy, drop {
    payment_id: ID,
    payment_index: u64,
    payer: address,
    provider: address,
    amount_mist: u64,
    tool_name: String,
}

public struct PaymentExecuted has copy, drop {
    payment_id: ID,
    payment_index: u64,
    provider: address,
    amount_mist: u64,
}

public struct PaymentRefunded has copy, drop {
    payment_id: ID,
    payment_index: u64,
    payer: address,
    amount_mist: u64,
}

// ===========================
// Init
// ===========================

fun init(ctx: &mut TxContext) {
    let registry = EscrowRegistry {
        id: object::new(ctx),
        owner: tx_context::sender(ctx),
        payment_count: 0,
        total_volume_mist: 0,
    };
    transfer::share_object(registry);
}

// ===========================
// Public functions
// ===========================

/// Create a new escrow payment.  The caller sends OCT which is locked
/// until the backend executes or the user refunds.
public fun create_payment(
    registry: &mut EscrowRegistry,
    payment: Coin<OCT>,
    provider: address,
    tool_name: vector<u8>,
    ctx: &mut TxContext,
): ID {
    let amount_mist = coin::value(&payment);
    let payer = tx_context::sender(ctx);
    let payment_index = registry.payment_count;

    registry.payment_count = registry.payment_count + 1;
    registry.total_volume_mist = registry.total_volume_mist + amount_mist;

    let tool_name_str = string::utf8(tool_name);

    let mut escrow = Payment {
        id: object::new(ctx),
        payment_index,
        payer,
        provider,
        amount_mist,
        tool_name: tool_name_str,
        status: STATUS_PENDING,
    };

    let payment_id = object::id(&escrow);

    // Store OCT coin as a DOF on the Payment object
    dof::add(&mut escrow.id, CoinKey {}, payment);

    event::emit(PaymentCreated {
        payment_id,
        payment_index,
        payer,
        provider,
        amount_mist,
        tool_name: tool_name_str,
    });

    transfer::share_object(escrow);
    payment_id
}

/// Backend executes a payment — releases OCT to the provider.
/// Only callable by the registry owner (backend wallet).
public fun execute_payment(
    registry: &EscrowRegistry,
    escrow: &mut Payment,
    ctx: &TxContext,
) {
    assert!(tx_context::sender(ctx) == registry.owner, E_NOT_ADMIN);
    assert!(escrow.status == STATUS_PENDING, E_NOT_PENDING);

    escrow.status = STATUS_EXECUTED;

    let coin: Coin<OCT> = dof::remove(&mut escrow.id, CoinKey {});
    let payment_id = object::id(escrow);

    event::emit(PaymentExecuted {
        payment_id,
        payment_index: escrow.payment_index,
        provider: escrow.provider,
        amount_mist: escrow.amount_mist,
    });

    transfer::public_transfer(coin, escrow.provider);
}

/// Payer requests a refund before execution.
public fun refund_payment(
    escrow: &mut Payment,
    ctx: &TxContext,
) {
    assert!(tx_context::sender(ctx) == escrow.payer, E_NOT_PAYER);
    assert!(escrow.status == STATUS_PENDING, E_NOT_PENDING);

    escrow.status = STATUS_REFUNDED;

    let coin: Coin<OCT> = dof::remove(&mut escrow.id, CoinKey {});
    let payment_id = object::id(escrow);

    event::emit(PaymentRefunded {
        payment_id,
        payment_index: escrow.payment_index,
        payer: escrow.payer,
        amount_mist: escrow.amount_mist,
    });

    transfer::public_transfer(coin, escrow.payer);
}

/// Admin override refund (e.g. stuck payments).
public fun admin_refund(
    registry: &EscrowRegistry,
    escrow: &mut Payment,
    ctx: &TxContext,
) {
    assert!(tx_context::sender(ctx) == registry.owner, E_NOT_ADMIN);
    assert!(escrow.status == STATUS_PENDING, E_NOT_PENDING);

    escrow.status = STATUS_REFUNDED;

    let coin: Coin<OCT> = dof::remove(&mut escrow.id, CoinKey {});
    transfer::public_transfer(coin, escrow.payer);
}

// ===========================
// Read-only helpers
// ===========================

public fun payment_status(p: &Payment): u8 { p.status }
public fun payment_amount(p: &Payment): u64 { p.amount_mist }
public fun payment_payer(p: &Payment): address { p.payer }
public fun payment_provider(p: &Payment): address { p.provider }
public fun payment_tool(p: &Payment): String { p.tool_name }
public fun is_pending(p: &Payment): bool { p.status == STATUS_PENDING }
public fun registry_count(r: &EscrowRegistry): u64 { r.payment_count }
public fun registry_volume(r: &EscrowRegistry): u64 { r.total_volume_mist }

// ===========================
// Tests
// ===========================

#[test_only]
use one::{coin as test_coin, test_scenario::{Self as ts}};

#[test]
fun test_create_execute_refund() {
    let admin    = @0xAD;
    let user     = @0xCA;
    let provider = @0xFE;

    let mut scenario = ts::begin(admin);
    { init(scenario.ctx()); };

    // User creates a payment of 1 OCT
    scenario.next_tx(user);
    {
        let mut registry = scenario.take_shared<EscrowRegistry>();
        let oct = test_coin::mint_for_testing<OCT>(1_000_000_000, scenario.ctx());
        let _pid = create_payment(
            &mut registry,
            oct,
            provider,
            b"deploy_token",
            scenario.ctx(),
        );
        assert!(registry_count(&registry) == 1, 0);
        ts::return_shared(registry);
    };

    // Admin executes the payment
    scenario.next_tx(admin);
    {
        let registry = scenario.take_shared<EscrowRegistry>();
        let mut escrow = scenario.take_shared<Payment>();
        assert!(is_pending(&escrow), 1);
        execute_payment(&registry, &mut escrow, scenario.ctx());
        assert!(payment_status(&escrow) == STATUS_EXECUTED, 2);
        ts::return_shared(registry);
        ts::return_shared(escrow);
    };

    scenario.end();
}

#[test]
fun test_user_refund() {
    let admin    = @0xAD;
    let user     = @0xCA;
    let provider = @0xFE;

    let mut scenario = ts::begin(admin);
    { init(scenario.ctx()); };

    scenario.next_tx(user);
    {
        let mut registry = scenario.take_shared<EscrowRegistry>();
        let oct = test_coin::mint_for_testing<OCT>(500_000_000, scenario.ctx());
        let _pid = create_payment(&mut registry, oct, provider, b"query_price", scenario.ctx());
        ts::return_shared(registry);
    };

    scenario.next_tx(user);
    {
        let mut escrow = scenario.take_shared<Payment>();
        refund_payment(&mut escrow, scenario.ctx());
        assert!(payment_status(&escrow) == STATUS_REFUNDED, 0);
        ts::return_shared(escrow);
    };

    scenario.end();
}
