"""
Pydantic models for OneChain Move package configuration.
"""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re


class NetworkType(str, Enum):
    """Supported OneChain networks."""
    TESTNET = "testnet"
    MAINNET = "mainnet"
    DEVNET = "devnet"


class PackageType(str, Enum):
    """Type of Move package to deploy."""
    TOKEN = "token"
    NFT = "nft"
    DEFI = "defi"
    GAME = "game"
    GENERAL = "general"


class TokenConfig(BaseModel):
    """Token-specific configuration within a Move package."""
    name: str = "MyToken"
    symbol: str = "MTK"
    decimals: int = 9
    initial_supply: int = 1_000_000_000  # in base units


class PackageConfig(BaseModel):
    """Complete Move package deployment configuration."""
    package_name: str = Field(..., description="Move package name (underscore-friendly)")
    network: NetworkType = NetworkType.TESTNET
    owner_address: str = Field(..., description="Deployer / owner wallet address on OneChain")
    package_type: PackageType = PackageType.GENERAL
    use_case: Optional[str] = None
    gas_budget: int = Field(default=50_000_000, description="Gas budget in MIST")
    token_config: Optional[TokenConfig] = None

    @field_validator("owner_address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        if not v:
            raise ValueError("Owner address cannot be empty")
        if not re.match(r"^0x[a-fA-F0-9]{40,64}$", v):
            raise ValueError("Invalid OneChain address format (expected 0x + 40-64 hex chars)")
        return v.lower()

    @field_validator("package_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = re.sub(r"[^a-zA-Z0-9\s_]", "", v)
        clean = re.sub(r"[\s]+", "_", clean).lower().strip("_")
        if not clean:
            raise ValueError("Package name must contain alphanumeric characters")
        return clean

    def to_backend_format(self) -> dict:
        """Convert to format expected by the Node.js backend."""
        result: dict = {
            "packageName": self.package_name,
            "network": self.network.value,
            "ownerAddress": self.owner_address,
            "packageType": self.package_type.value,
            "gasBudget": self.gas_budget,
            "useCase": self.use_case or self.package_type.value,
        }
        if self.token_config:
            result["tokenConfig"] = {
                "name": self.token_config.name,
                "symbol": self.token_config.symbol,
                "decimals": self.token_config.decimals,
                "initialSupply": self.token_config.initial_supply,
            }
        return result


class PartialPackageConfig(BaseModel):
    """Partial config during conversation collection (all fields optional)."""
    package_name: Optional[str] = None
    network: Optional[str] = None
    owner_address: Optional[str] = None
    package_type: Optional[str] = None
    use_case: Optional[str] = None
    gas_budget: Optional[int] = None
    token_name: Optional[str] = None
    token_symbol: Optional[str] = None
    token_decimals: Optional[int] = None
    token_initial_supply: Optional[int] = None


# ---------------------------------------------------------------------------
# Backward-compat aliases
# ---------------------------------------------------------------------------
OrbitConfig = PackageConfig
PartialOrbitConfig = PartialPackageConfig
