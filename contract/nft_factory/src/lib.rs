#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

extern crate alloc;

use alloc::{string::{String, ToString}, vec, vec::Vec};
use stylus_sdk::{
    alloy_primitives::{Address, U256, B256},
    alloy_sol_types::{sol, SolError, SolCall},
    call::RawCall,
    prelude::*,
};

// Common definitions
sol! {
    event CollectionCreated(address indexed creator, address indexed collection_address, string name, string symbol, string base_uri, uint256 collection_id);
    event ImplementationUpdated(address indexed old_implementation, address indexed new_implementation);
    
    event Transfer(address indexed from, address indexed to, uint256 indexed token_id);
    event Approval(address indexed owner, address indexed approved, uint256 indexed token_id);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    error InvalidTokenId(uint256 token_id);
    error NotOwnerOrApproved(address caller, uint256 token_id);
    error InvalidRecipient(address to);
    error TokenAlreadyMinted(uint256 token_id);
    error NotOwner(address caller, uint256 token_id);
    error MintToZeroAddress();
    error TransferToZeroAddress();
    error CollectionAlreadyExists(address creator);
    error InvalidCollectionAddress(address collection);
    error AlreadyInitialized();
    error DeploymentFailed();
    error InvalidImplementation();
}

#[cfg(feature = "erc721")]
pub mod erc721;

#[cfg(feature = "factory")]
pub mod factory;
