"""
Pydantic models for conversation state and session management.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ConversationPhase(str, Enum):
    """Phases of the configuration conversation."""
    GREETING = "greeting"
    DISCOVERY = "discovery"
    CONFIGURATION = "configuration"
    REVIEW = "review"
    DEPLOYING = "deploying"
    DEPLOYED = "deployed"


class ConfigStep(str, Enum):
    """Steps within the Move package configuration phase."""
    USE_CASE = "use_case"
    PACKAGE_NAME = "package_name"
    NETWORK = "network"
    OWNER_ADDRESS = "owner_address"
    GAS_BUDGET = "gas_budget"
    COMPLETE = "complete"


# Order of steps for iteration
CONFIG_STEP_ORDER = [
    ConfigStep.USE_CASE,
    ConfigStep.PACKAGE_NAME,
    ConfigStep.NETWORK,
    ConfigStep.OWNER_ADDRESS,
    ConfigStep.GAS_BUDGET,
    ConfigStep.COMPLETE,
]


class Message(BaseModel):
    """A single message in the conversation."""
    id: str
    role: str  # "user" | "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    quick_actions: Optional[list] = None


class ConfigProgress(BaseModel):
    """Progress through configuration steps."""
    completed: list = Field(default_factory=list)
    remaining: list = Field(default_factory=list)
    percentage: int = 0


class ConversationSession(BaseModel):
    """Full conversation session state."""
    session_id: str
    user_id: Optional[str] = None
    wallet_address: Optional[str] = None

    phase: ConversationPhase = ConversationPhase.GREETING
    current_step: ConfigStep = ConfigStep.USE_CASE

    messages: list = Field(default_factory=list)
    collected_params: dict = Field(default_factory=dict)
    config: Optional[dict] = None
    deployment_id: Optional[str] = None
    deployment_status: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def get_progress(self) -> ConfigProgress:
        """Calculate configuration progress."""
        completed = []
        remaining = []
        current_idx = CONFIG_STEP_ORDER.index(self.current_step)
        for i, step in enumerate(CONFIG_STEP_ORDER):
            if step == ConfigStep.COMPLETE:
                continue
            if i < current_idx:
                completed.append(step.value)
            else:
                remaining.append(step.value)
        total = len(CONFIG_STEP_ORDER) - 1
        pct = int((len(completed) / total) * 100) if total > 0 else 0
        return ConfigProgress(completed=completed, remaining=remaining, percentage=pct)

    def advance_step(self) -> bool:
        """Advance to the next configuration step."""
        try:
            idx = CONFIG_STEP_ORDER.index(self.current_step)
            if idx < len(CONFIG_STEP_ORDER) - 1:
                self.current_step = CONFIG_STEP_ORDER[idx + 1]
                self.updated_at = datetime.utcnow()
                return True
        except ValueError:
            pass
        return False

    def go_back_step(self) -> bool:
        """Go back to the previous step."""
        try:
            idx = CONFIG_STEP_ORDER.index(self.current_step)
            if idx > 0:
                self.current_step = CONFIG_STEP_ORDER[idx - 1]
                self.updated_at = datetime.utcnow()
                return True
        except ValueError:
            pass
        return False
