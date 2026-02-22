"""
Config builder: transforms collected conversation params into a complete PackageConfig.
"""
import logging
from typing import Optional

from models.orbit_config import PackageConfig, PackageType, NetworkType, TokenConfig
from models.conversation import ConversationSession
from utils.defaults import get_preset, DEFAULT_GAS_BUDGET

logger = logging.getLogger(__name__)


class ConfigBuilder:
    """Builds complete PackageConfig from collected conversation parameters."""

    def build_from_session(self, session: ConversationSession) -> Optional[PackageConfig]:
        """Build a complete PackageConfig from session collected_params."""
        params = session.collected_params
        if not params:
            return None

        use_case = params.get("use_case", "general")
        preset = get_preset(use_case)
        defaults = preset.get("defaults", {})

        # Package name
        package_name = params.get("package_name")
        if not package_name:
            package_name = f"my_{use_case}_package"

        # Network
        network_str = params.get("network", defaults.get("network", "testnet"))
        try:
            network = NetworkType(network_str)
        except ValueError:
            network = NetworkType.TESTNET

        # Package type
        pt_str = params.get("package_type", defaults.get("package_type", use_case))
        try:
            package_type = PackageType(pt_str)
        except ValueError:
            package_type = PackageType.GENERAL

        # Owner address
        owner = params.get("owner_address")
        if not owner:
            owner = session.wallet_address or "0x" + "0" * 64

        # Gas budget
        gas_budget = params.get("gas_budget", defaults.get("gas_budget", DEFAULT_GAS_BUDGET))

        # Token config (if it is a token package and user provided token details)
        token_config = None
        if package_type == PackageType.TOKEN:
            token_name = params.get("token_name", "MyToken")
            token_symbol = params.get("token_symbol", "MTK")
            token_decimals = params.get("token_decimals", defaults.get("token_decimals", 9))
            token_supply = params.get("token_initial_supply", defaults.get("token_initial_supply", 1_000_000_000))
            token_config = TokenConfig(
                name=token_name,
                symbol=token_symbol,
                decimals=token_decimals,
                initial_supply=token_supply,
            )

        try:
            config = PackageConfig(
                package_name=package_name,
                network=network,
                owner_address=owner,
                package_type=package_type,
                use_case=use_case,
                gas_budget=gas_budget,
                token_config=token_config,
            )
            return config
        except Exception as e:
            logger.error("Failed to build PackageConfig: %s", e)
            return None

    def format_config_summary(self, config: PackageConfig) -> str:
        """Format config as a human-readable summary string."""
        gas_oct = config.gas_budget / 1_000_000_000
        token_line = ""
        if config.token_config:
            tc = config.token_config
            token_line = f"\n  Token:         {tc.name} ({tc.symbol}), {tc.decimals} decimals"
        owner_short = f"{config.owner_address[:10]}...{config.owner_address[-6:]}"
        lines = [
            "Move Package Configuration",
            "------------------------",
            f"  Package Name:  {config.package_name}",
            f"  Package Type:  {config.package_type.value}",
            f"  Network:       {config.network.value}",
            f"  Gas Budget:    {config.gas_budget:,} MIST ({gas_oct:.3f} OCT)",
            f"  Owner:         {owner_short}" + token_line,
        ]
        return "\n".join(lines)

    def validate_config(self, config: PackageConfig) -> tuple:
        """Validate a config and return (is_valid, errors)."""
        errors = []
        if not config.package_name:
            errors.append("Package name is required")
        if not config.owner_address or len(config.owner_address) < 10:
            errors.append("Valid owner address is required")
        if config.gas_budget < 1_000_000:
            errors.append("Gas budget too low (minimum 1,000,000 MIST)")
        return (len(errors) == 0, errors)


_config_builder: Optional[ConfigBuilder] = None


def get_config_builder() -> ConfigBuilder:
    """Get or create the config builder singleton."""
    global _config_builder
    if _config_builder is None:
        _config_builder = ConfigBuilder()
    return _config_builder
