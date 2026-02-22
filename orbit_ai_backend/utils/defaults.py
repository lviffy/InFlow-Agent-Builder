"""
Smart defaults and use-case presets for OneChain Move package deployment.
"""
from typing import Any

# Default gas budget in MIST (1 OCT = 1_000_000_000 MIST)
DEFAULT_GAS_BUDGET = 50_000_000  # 0.05 OCT

# Use-case presets with recommended defaults for Move packages
USE_CASE_PRESETS = {
    "token": {
        "id": "token",
        "name": "Fungible Token",
        "description": "Deploy a fungible token (coin) on OneChain",
        "icon": "coin",
        "defaults": {
            "package_type": "token",
            "network": "testnet",
            "gas_budget": 50_000_000,
            "token_decimals": 9,
            "token_initial_supply": 1_000_000_000,
        },
    },
    "nft": {
        "id": "nft",
        "name": "NFT Collection",
        "description": "Deploy an NFT collection with mint and transfer logic",
        "icon": "nft",
        "defaults": {
            "package_type": "nft",
            "network": "testnet",
            "gas_budget": 80_000_000,
        },
    },
    "defi": {
        "id": "defi",
        "name": "DeFi Protocol",
        "description": "Deploy a DeFi smart contract (vault, lending, DEX)",
        "icon": "defi",
        "defaults": {
            "package_type": "defi",
            "network": "testnet",
            "gas_budget": 150_000_000,
        },
    },
    "game": {
        "id": "game",
        "name": "Game Contract",
        "description": "Deploy on-chain game logic (items, scores, rewards)",
        "icon": "game",
        "defaults": {
            "package_type": "game",
            "network": "testnet",
            "gas_budget": 100_000_000,
        },
    },
    "general": {
        "id": "general",
        "name": "General Purpose",
        "description": "Balanced configuration for any Move package",
        "icon": "general",
        "defaults": {
            "package_type": "general",
            "network": "testnet",
            "gas_budget": 50_000_000,
        },
    },
}


def get_preset(use_case: str) -> dict:
    """Get preset configuration for a use case."""
    use_case_lower = use_case.lower()
    if use_case_lower in USE_CASE_PRESETS:
        return USE_CASE_PRESETS[use_case_lower]
    keywords = {
        "token": ["coin", "currency", "fungible"],
        "nft": ["nft", "collectible", "art", "collection"],
        "defi": ["defi", "finance", "swap", "dex", "lending", "yield"],
        "game": ["game", "gaming", "play", "esport"],
    }
    for key, words in keywords.items():
        if any(w in use_case_lower for w in words):
            return USE_CASE_PRESETS[key]
    return USE_CASE_PRESETS["general"]


def get_all_presets() -> list:
    """Get all available presets."""
    return list(USE_CASE_PRESETS.values())


def get_default_value(use_case: str, field: str) -> Any:
    """Get a specific default value for a use case."""
    preset = get_preset(use_case)
    return preset["defaults"].get(field)


# OneChain network info
ONECHAIN_NETWORKS = {
    "testnet": {
        "name": "OneChain Testnet",
        "rpc": "https://rpc-testnet.onelabs.cc:443",
        "explorer": "https://explorer-testnet.onelabs.cc",
        "faucet": "https://faucet.onelabs.cc",
    },
    "mainnet": {
        "name": "OneChain Mainnet",
        "rpc": "https://rpc-mainnet.onelabs.cc:443",
        "explorer": "https://explorer.onelabs.cc",
        "faucet": None,
    },
    "devnet": {
        "name": "OneChain Devnet",
        "rpc": "https://rpc-devnet.onelabs.cc:443",
        "explorer": "https://explorer-devnet.onelabs.cc",
        "faucet": "https://faucet-devnet.onelabs.cc",
    },
}


def get_network_info(network: str) -> dict:
    """Get info about a OneChain network."""
    return ONECHAIN_NETWORKS.get(network, ONECHAIN_NETWORKS["testnet"])
