"""
Input validators for OneChain addresses, Move package names, and NLP helpers.
"""
import re
import random
from typing import Optional


# ---------------------------------------------------------------------------
# OneChain address validation
# ---------------------------------------------------------------------------

def is_valid_onechain_address(address: str) -> bool:
    """Validate a OneChain (Sui-style) address: 0x + 40-64 hex chars."""
    if not address:
        return False
    return bool(re.match(r"^0x[a-fA-F0-9]{40,64}$", address))


def normalize_onechain_address(address: str) -> str:
    """Normalize address to lowercase with 0x prefix."""
    if not address:
        raise ValueError("Address cannot be empty")
    if not address.startswith("0x"):
        address = "0x" + address
    if not is_valid_onechain_address(address):
        raise ValueError(f"Invalid OneChain address: {address}")
    return address.lower()


# Backward-compat aliases used by conversation.py
is_valid_eth_address = is_valid_onechain_address
normalize_eth_address = normalize_onechain_address


# ---------------------------------------------------------------------------
# Package name helpers
# ---------------------------------------------------------------------------

def extract_package_name_from_text(text: str) -> Optional[str]:
    """Try to extract a Move package name from user input."""
    patterns = [
        r"(?:called|named|name\s+is|name:)\s+[\"\']?([a-zA-Z0-9_\s]+)[\"\']?",
        r"^([a-zA-Z][a-zA-Z0-9_]+)$",
    ]
    for pattern in patterns:
        match = re.search(pattern, text.strip(), re.IGNORECASE)
        if match:
            raw = match.group(1).strip()
            if 2 <= len(raw) <= 50:
                clean = re.sub(r"[\s-]+", "_", raw).lower()
                clean = re.sub(r"[^a-z0-9_]", "", clean).strip("_")
                if clean:
                    return clean
    return None


# Alias used by conversation.py
extract_chain_name_from_text = extract_package_name_from_text


# ---------------------------------------------------------------------------
# Use-case / network / gas parsing
# ---------------------------------------------------------------------------

def parse_use_case_from_text(text: str) -> Optional[str]:
    """Detect a Move package use-case from natural language."""
    text = text.lower()
    use_cases = {
        "token": ["token", "coin", "currency", "fungible", "erc20"],
        "nft": ["nft", "collectible", "art", "collection", "non-fungible"],
        "defi": ["defi", "finance", "trading", "swap", "dex", "lending", "yield", "vault"],
        "game": ["game", "gaming", "play", "esport", "p2e", "play to earn"],
        "general": ["general", "basic", "simple", "misc"],
    }
    for use_case, keywords in use_cases.items():
        for kw in keywords:
            if kw in text:
                return use_case
    return None


def parse_network_from_text(text: str) -> Optional[str]:
    """Detect which OneChain network the user wants."""
    text = text.lower()
    if "mainnet" in text or "production" in text:
        return "mainnet"
    if "devnet" in text:
        return "devnet"
    if "test" in text:
        return "testnet"
    return None


def parse_gas_budget_from_text(text: str) -> Optional[int]:
    """Extract gas budget in MIST from natural language."""
    text_lower = text.lower()
    oct_match = re.search(r"(\d+(?:\.\d+)?)\s*oct", text_lower)
    if oct_match:
        return int(float(oct_match.group(1)) * 1_000_000_000)
    mist_match = re.search(r"(\d[\d_,]*)\s*mist", text_lower)
    if mist_match:
        raw = mist_match.group(1).replace(",", "").replace("_", "")
        try:
            return int(raw)
        except ValueError:
            pass
    if any(w in text_lower for w in ["default", "standard", "yes", "sure", "ok"]):
        return 50_000_000
    if any(w in text_lower for w in ["small", "low"]):
        return 30_000_000
    if any(w in text_lower for w in ["large", "big", "complex"]):
        return 150_000_000
    return None


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

def extract_wallet_intent(text: str) -> bool:
    """Check if user wants to use their connected wallet."""
    text = text.lower()
    phrases = ["my wallet", "connected wallet", "use my", "my address",
               "current wallet", "this wallet", "same wallet"]
    return any(phrase in text for phrase in phrases)


def generate_chain_id() -> int:
    """Kept for backward compat."""
    return random.randint(412000, 499999)


# Stubs kept for backward compat
def parse_validator_count_from_text(text: str) -> Optional[int]:
    return None


def parse_block_time_from_text(text: str) -> Optional[int]:
    return None
