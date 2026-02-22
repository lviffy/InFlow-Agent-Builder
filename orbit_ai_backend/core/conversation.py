"""
Conversation state machine for OneChain Move package deployer.
"""
import uuid
import time
import re
import logging
from datetime import datetime
from typing import Optional

from models.conversation import (
    ConversationSession,
    ConversationPhase,
    ConfigStep,
    Message,
    CONFIG_STEP_ORDER,
)
from utils.validators import (
    parse_use_case_from_text,
    parse_network_from_text,
    parse_gas_budget_from_text,
    extract_package_name_from_text,
    extract_wallet_intent,
    is_valid_onechain_address,
    normalize_onechain_address,
    is_valid_eth_address,
    normalize_eth_address,
)
from utils.defaults import get_preset, DEFAULT_GAS_BUDGET
from .ai_engine import get_ai_engine
from .prompts import get_step_question

logger = logging.getLogger(__name__)


class ConversationManager:
    """Manages conversation sessions with TTL expiration."""

    def __init__(self, ttl_seconds: int = 7200):
        self.sessions: dict = {}
        self.session_timestamps: dict = {}
        self.ttl_seconds = ttl_seconds

    def create_session(self, session_id=None, user_id=None, wallet_address=None):
        self._cleanup_expired()
        if session_id is None:
            session_id = str(uuid.uuid4())
        if session_id in self.sessions:
            return self.sessions[session_id]
        session = ConversationSession(
            session_id=session_id,
            user_id=user_id,
            wallet_address=wallet_address,
        )
        greeting = get_ai_engine().get_greeting()
        session.messages.append(Message(id=str(uuid.uuid4()), role="assistant", content=greeting))
        self.sessions[session_id] = session
        self.session_timestamps[session_id] = time.time()
        return session

    def get_session(self, session_id: str):
        self._cleanup_expired()
        if session_id in self.sessions:
            self.session_timestamps[session_id] = time.time()
            return self.sessions[session_id]
        return None

    def reset_session(self, session_id: str):
        if session_id in self.sessions:
            old = self.sessions[session_id]
            del self.sessions[session_id]
            return self.create_session(
                session_id=session_id,
                user_id=old.user_id,
                wallet_address=old.wallet_address,
            )
        return self.create_session(session_id=session_id)

    async def process_message(self, session_id, user_message, wallet_address=None):
        session = self.get_session(session_id)
        if not session:
            session = self.create_session(session_id, wallet_address=wallet_address)
        if wallet_address:
            session.wallet_address = wallet_address

        session.messages.append(Message(
            id=str(uuid.uuid4()), role="user", content=user_message
        ))

        lower_msg = user_message.lower().strip()

        # Go-back
        if lower_msg in ["go back", "back", "previous", "undo"]:
            if session.go_back_step():
                reply = (
                    "No problem! Let us go back.\n\n"
                    + get_step_question(session.current_step.value, session.collected_params)
                )
            else:
                reply = "We are already at the first step."
            session.messages.append(Message(id=str(uuid.uuid4()), role="assistant", content=reply))
            return session

        # Cross-step detection
        target = self._detect_intent_step(session, user_message)
        if target and target != session.current_step:
            saved = session.current_step
            session.current_step = target
            val = self._extract_value(session, user_message)
            if val is not None:
                session.collected_params[target.value] = val
            session.current_step = saved
        else:
            val = self._extract_value(session, user_message)
            if val is not None:
                session.collected_params[session.current_step.value] = val
                logger.info("Extracted for %s: %s", session.current_step.value, val)
                if session.phase == ConversationPhase.GREETING:
                    session.phase = ConversationPhase.CONFIGURATION
                session.advance_step()
                if session.current_step == ConfigStep.COMPLETE:
                    session.phase = ConversationPhase.REVIEW

        ai_engine = get_ai_engine()
        msg_history = [{"role": m.role, "content": m.content} for m in session.messages[-10:]]
        ai_response = await ai_engine.generate_response(
            user_message=user_message,
            phase=session.phase.value,
            current_step=session.current_step.value,
            collected_params=session.collected_params,
            message_history=msg_history,
        )
        session.messages.append(Message(id=str(uuid.uuid4()), role="assistant", content=ai_response))
        session.updated_at = datetime.utcnow()
        return session

    def _detect_intent_step(self, session, message):
        if self._is_casual_message(message):
            return None
        msg_lower = message.lower()
        signals = {
            ConfigStep.NETWORK: ["mainnet", "testnet", "devnet", "production"],
            ConfigStep.OWNER_ADDRESS: ["0x", "my wallet", "connected wallet", "my address"],
            ConfigStep.GAS_BUDGET: ["oct", "mist", "gas budget"],
        }
        for step, kws in signals.items():
            if step == session.current_step:
                continue
            if any(kw in msg_lower for kw in kws):
                return step
        return None

    def _is_casual_message(self, message: str) -> bool:
        msg = message.lower().strip()
        casual = {"hi","hello","hey","hola","sup","yo","thanks","thank you","ok","hmm","test","help"}
        return msg in casual or len(msg) <= 2

    def _extract_value(self, session, message):
        step = session.current_step
        msg_lower = message.lower().strip()

        if self._is_casual_message(message):
            return None

        if step == ConfigStep.USE_CASE:
            use_case = parse_use_case_from_text(message)
            if use_case:
                preset = get_preset(use_case)
                session.collected_params["_preset"] = preset
                defaults = preset.get("defaults", {})
                default_keys = []
                for key in ("network", "gas_budget"):
                    v = defaults.get(key)
                    if v is not None and key not in session.collected_params:
                        session.collected_params[key] = v
                        default_keys.append(key)
                session.collected_params["_defaults"] = default_keys
                return use_case
            if any(kw in msg_lower for kw in ["app","package","project","build","create","general"]):
                return "general"
            return None

        elif step == ConfigStep.PACKAGE_NAME:
            skip = ["mainnet","testnet","devnet","0x","oct","mist","wallet","address"]
            if any(kw in msg_lower for kw in skip):
                return None
            name = extract_package_name_from_text(message)
            if name:
                return name
            words = message.strip().split()
            if 1 <= len(words) <= 4 and 2 <= len(message) <= 50:
                clean = re.sub(r"[\s-]+", "_", message.strip()).lower()
                clean = re.sub(r"[^a-z0-9_]", "", clean).strip("_")
                if clean:
                    return clean
            return None

        elif step == ConfigStep.NETWORK:
            network = parse_network_from_text(message)
            if network:
                return network
            if msg_lower in ["yes","yeah","ok","sure","sounds good","yep","default"]:
                return "testnet"
            return None

        elif step == ConfigStep.OWNER_ADDRESS:
            if extract_wallet_intent(message):
                if session.wallet_address and is_valid_eth_address(session.wallet_address):
                    return normalize_eth_address(session.wallet_address)
                return None
            match = re.search(r"0x[a-fA-F0-9]{40,64}", message)
            if match:
                try:
                    return normalize_eth_address(match.group())
                except ValueError:
                    pass
            return None

        elif step == ConfigStep.GAS_BUDGET:
            budget = parse_gas_budget_from_text(message)
            if budget is not None:
                return budget
            if msg_lower in ["yes","yeah","ok","sure","sounds good","yep","default","standard"]:
                preset = session.collected_params.get("_preset", {})
                return preset.get("defaults", {}).get("gas_budget", DEFAULT_GAS_BUDGET)
            return None

        return None

    def _cleanup_expired(self):
        now = time.time()
        expired = [sid for sid, ts in self.session_timestamps.items() if now - ts > self.ttl_seconds]
        for sid in expired:
            del self.sessions[sid]
            del self.session_timestamps[sid]
        if expired:
            logger.info("Cleaned up %d expired sessions", len(expired))


_conversation_manager = None


def get_conversation_manager() -> ConversationManager:
    global _conversation_manager
    if _conversation_manager is None:
        import os
        ttl = int(os.getenv("SESSION_TTL_SECONDS", "7200"))
        _conversation_manager = ConversationManager(ttl_seconds=ttl)
    return _conversation_manager
