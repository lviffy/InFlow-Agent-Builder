from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq
import json
import requests
import uvicorn

load_dotenv()

app = FastAPI(title="AI Agent Builder - OneChain Edition")

# Add CORS middleware to allow requests from anywhere
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Configure API Keys
GROQ_API_KEYS = [
    os.getenv("GROQ_API_KEY1"),
    os.getenv("GROQ_API_KEY2"),
    os.getenv("GROQ_API_KEY3")
]
GROQ_API_KEYS = [key for key in GROQ_API_KEYS if key]  # Filter out None values

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize clients
groq_clients = []
if GROQ_API_KEYS:
    for i, key in enumerate(GROQ_API_KEYS, 1):
        groq_clients.append(Groq(api_key=key))
        print(f"✓ Groq client {i} initialized")
    print(f"✓ Total {len(groq_clients)} Groq client(s) initialized (Primary)")
else:
    print("⚠ No Groq API keys configured")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✓ Gemini configured (Fallback)")

if not GROQ_API_KEYS and not GEMINI_API_KEY:
    raise ValueError("At least one of GROQ_API_KEY1-3 or GEMINI_API_KEY must be set")

# Backend URL - configurable via environment or defaults to localhost
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")

# Tool Definitions
TOOL_DEFINITIONS = {
    "transfer": {
        "name": "transfer",
        "description": "Prepare a transfer transaction for the user to sign with their wallet (OneWallet). Use the user's connected wallet address as fromAddress. Requires fromAddress, toAddress, amount, and optionally coinType for Move coin transfers (omit for native OCT).",
        "parameters": {
            "type": "object",
            "properties": {
                "fromAddress": {"type": "string", "description": "Sender wallet address (user's connected wallet)"},
                "toAddress": {"type": "string", "description": "Recipient wallet address"},
                "amount": {"type": "string", "description": "Amount of tokens to transfer (in MIST for OCT)"},
                "coinType": {"type": "string", "description": "Move coin type (optional, for non-OCT transfers only, omit for native OCT)"}
            },
            "required": ["fromAddress", "toAddress", "amount"]
        },
        "endpoint": f"{BACKEND_URL}/transfer/prepare",
        "method": "POST",
        "requires_onewallet": True
    },
    "get_balance": {
        "name": "get_balance",
        "description": "Get OCT balance of a wallet address. If the user asks for 'my balance', use their connected wallet address. Otherwise, use the specified address.",
        "parameters": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Wallet address to check balance. Use the user's connected wallet address if they ask for 'my balance'."}
            },
            "required": ["address"]
        },
        "endpoint": f"{BACKEND_URL}/transfer/balance/{{address}}",
        "method": "GET"
    },
    "deploy_move_token": {
        "name": "deploy_move_token",
        "description": "Deploy a new Move fungible token via the Move TokenFactory module. Returns a packageId. Requires ownerAddress, name, symbol, and initialSupply. Optional: decimals (default 9).",
        "parameters": {
            "type": "object",
            "properties": {
                "ownerAddress": {"type": "string", "description": "Owner/deployer wallet address"},
                "name": {"type": "string", "description": "Token name"},
                "symbol": {"type": "string", "description": "Token symbol"},
                "initialSupply": {"type": "string", "description": "Initial token supply (in smallest unit)"},
                "decimals": {"type": "number", "description": "Token decimals (optional, default 9)"}
            },
            "required": ["ownerAddress", "name", "symbol", "initialSupply"]
        },
        "endpoint": f"{BACKEND_URL}/token/deploy",
        "method": "POST"
    },
    "deploy_move_nft": {
        "name": "deploy_move_nft",
        "description": "Deploy a new Move NFT collection via the Move NFTFactory module. Requires ownerAddress, name, symbol, and description.",
        "parameters": {
            "type": "object",
            "properties": {
                "ownerAddress": {"type": "string", "description": "Owner/deployer wallet address"},
                "name": {"type": "string", "description": "NFT collection name"},
                "symbol": {"type": "string", "description": "NFT collection symbol"},
                "description": {"type": "string", "description": "Collection description"}
            },
            "required": ["ownerAddress", "name", "symbol", "description"]
        },
        "endpoint": f"{BACKEND_URL}/nft/deploy-collection",
        "method": "POST"
    },
    "fetch_price": {
        "name": "fetch_price",
        "description": "Fetch the current price of any cryptocurrency. Supports queries like 'bitcoin', 'ethereum price', 'btc eth sol'. Returns real-time prices from CoinGecko API with 24h change, market cap, and volume data. If vsCurrency is not provided, it defaults to 'usd'.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Query string for cryptocurrency (e.g., 'bitcoin', 'ethereum price', 'btc eth sol')"},
                "vsCurrency": {"type": "string", "description": "Currency to show price in (e.g., 'usd', 'eur', 'inr'). Defaults to 'usd' if not provided."}
            },
            "required": ["query"]
        },
        "endpoint": f"{BACKEND_URL}/price/token",
        "method": "POST"
    },
    "get_token_info": {
        "name": "get_token_info",
        "description": "Get detailed information about a deployed token using its tokenId. Returns name, symbol, decimals, total supply, and creator.",
        "parameters": {
            "type": "object",
            "properties": {
                "tokenId": {"type": "string", "description": "The token ID returned from deployment"}
            },
            "required": ["tokenId"]
        },
        "endpoint": f"{BACKEND_URL}/token/info/{{tokenId}}",
        "method": "GET"
    },
    "get_token_balance": {
        "name": "get_token_balance",
        "description": "Get token balance for a specific address. Requires tokenId and ownerAddress.",
        "parameters": {
            "type": "object",
            "properties": {
                "tokenId": {"type": "string", "description": "The token ID"},
                "ownerAddress": {"type": "string", "description": "Wallet address to check balance"}
            },
            "required": ["tokenId", "ownerAddress"]
        },
        "endpoint": f"{BACKEND_URL}/token/balance/{{tokenId}}/{{ownerAddress}}",
        "method": "GET"
    },
    "mint_nft": {
        "name": "mint_nft",
        "description": "Mint a new NFT in an existing collection. Requires privateKey, collectionAddress, and toAddress.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the collection creator"},
                "collectionAddress": {"type": "string", "description": "NFT collection contract address"},
                "toAddress": {"type": "string", "description": "Recipient wallet address"}
            },
            "required": ["privateKey", "collectionAddress", "toAddress"]
        },
        "endpoint": f"{BACKEND_URL}/nft/mint",
        "method": "POST"
    },
    "get_nft_info": {
        "name": "get_nft_info",
        "description": "Get information about a specific NFT. Requires collectionAddress and tokenId.",
        "parameters": {
            "type": "object",
            "properties": {
                "collectionAddress": {"type": "string", "description": "NFT collection contract address"},
                "tokenId": {"type": "string", "description": "Token ID within the collection"}
            },
            "required": ["collectionAddress", "tokenId"]
        },
        "endpoint": f"{BACKEND_URL}/nft/info/{{collectionAddress}}/{{tokenId}}",
        "method": "GET"
    },
    "send_email": {
        "name": "send_email",
        "description": "Send an email to one or more recipients. You MUST use this tool (function call) to send emails — do NOT just compose JSON text. Extract the recipient from the user's message, generate a professional subject line and body, then call this function. The email will be sent via Gmail SMTP.",
        "parameters": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "Recipient email address(es), comma-separated for multiple"},
                "subject": {"type": "string", "description": "Email subject line — generate a clear, professional subject based on the user's intent"},
                "text": {"type": "string", "description": "Plain text email body — compose a professional, friendly message based on the user's request"},
                "html": {"type": "string", "description": "HTML email body (optional, use for rich formatting)"},
                "cc": {"type": "string", "description": "CC recipients (optional)"},
                "bcc": {"type": "string", "description": "BCC recipients (optional)"},
                "replyTo": {"type": "string", "description": "Reply-to address (optional)"}
            },
            "required": ["to", "subject", "text"]
        },
        "endpoint": f"{BACKEND_URL}/email/send",
        "method": "POST"
    },
    "calculate": {
        "name": "calculate",
        "description": "Perform mathematical calculations with support for variables. IMPORTANT: The variable names used in the 'expression' MUST exactly match the keys in the 'variables' parameter. For example, if the expression uses 'oct_price', the variables dict must include 'oct_price' (not 'onechain_price'). Common variable names: oct_balance, oct_price, token_price. Always include ALL variables referenced in the expression.",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "Math expression using variable names that EXACTLY match the keys in the 'variables' dict. Example: '(oct_balance * oct_price) / token_price'"},
                "variables": {"type": "object", "description": "A dictionary mapping EVERY variable name used in the expression to its numeric value. Keys MUST match the names in the expression exactly. Example: {'oct_balance': 0.1, 'oct_price': 2.50, 'token_price': 0.10}"},
                "description": {"type": "string", "description": "A brief description of what is being calculated"}
            },
            "required": ["expression"]
        },
        "endpoint": "local",
        "method": "LOCAL"
    }
}

# Pydantic Models
class ToolConnection(BaseModel):
    tool: str
    next_tool: Optional[str] = None

class AgentRequest(BaseModel):
    tools: List[ToolConnection]
    user_message: str
    private_key: Optional[str] = None
    wallet_address: Optional[str] = None

class AgentResponse(BaseModel):
    agent_response: str
    tool_calls: List[Dict[str, Any]]
    results: List[Dict[str, Any]]

# Helper Functions
def convert_to_gemini_tools(tool_names: List[str]) -> List[Dict[str, Any]]:
    """Convert tool definitions to Gemini function declaration format"""
    function_declarations = []
    
    for tool_name in tool_names:
        if tool_name in TOOL_DEFINITIONS:
            tool_def = TOOL_DEFINITIONS[tool_name]
            
            # Deep copy to avoid modifying original
            import copy
            parameters = copy.deepcopy(tool_def["parameters"])
            
            # Convert types to uppercase for Gemini (STRING, NUMBER, OBJECT, etc.)
            if "type" in parameters:
                parameters["type"] = parameters["type"].upper()
            
            if "properties" in parameters:
                for prop_name, prop_def in parameters["properties"].items():
                    if "type" in prop_def:
                        prop_def["type"] = prop_def["type"].upper()
            
            function_declarations.append({
                "name": tool_def["name"],
                "description": tool_def["description"],
                "parameters": parameters
            })
            
    return function_declarations

def build_system_prompt(tool_connections: List[ToolConnection]) -> str:
    """Build a dynamic system prompt based on connected tools"""
    
    # Extract unique tools
    unique_tools = set()
    tool_flow = {}
    
    for conn in tool_connections:
        unique_tools.add(conn.tool)
        if conn.next_tool:
            unique_tools.add(conn.next_tool)
            tool_flow[conn.tool] = conn.next_tool
    
    # Check if sequential execution exists
    has_sequential = any(conn.next_tool for conn in tool_connections)
    
    system_prompt = """You are an intelligent blockchain automation agent for BlockOps - a no-code AI-powered platform built on OneChain. Your purpose is to help users execute blockchain operations seamlessly through natural language interactions.

CRITICAL BEHAVIOR — PROACTIVE TOOL USAGE:
- When a user asks a question that requires data (prices, balances, etc.), IMMEDIATELY call the appropriate tools. Do NOT ask the user for information that your tools can fetch.
- When a user says "calculate", "now calculate", "how much", "how many", etc., USE the data from your previous tool calls and conversation context to perform the calculation immediately.
- When a user mentions "this balance", "my balance", "that wallet", look at the conversation history for the relevant data.
- NEVER respond with "I need additional information" when the information is either in the conversation context or fetchable via tools.
- If a query requires multiple pieces of data (e.g., OCT price AND token price), fetch ALL of them before responding.
- Think step-by-step: What data do I need? → Which tools provide it? → Call them → Use results to answer.

PLATFORM CONTEXT:
- Network: OneChain (OCT token)
- Explorer: https://explorer-testnet.onelabs.cc
- Smart Contracts: Move language modules (object-based, composable)
- Your role: Execute blockchain operations efficiently and provide clear, actionable feedback

AVAILABLE TOOLS & CAPABILITIES:
"""
    
    for tool_name in unique_tools:
        if tool_name in TOOL_DEFINITIONS:
            tool_def = TOOL_DEFINITIONS[tool_name]
            system_prompt += f"\n{tool_name}:\n   {tool_def['description']}\n"
    
    system_prompt += """

═══════════════════════════════════════════════════════════════
CRITICAL MATH & QUESTION-HANDLING RULES
═══════════════════════════════════════════════════════════════

These rules apply to EVERY response, regardless of tool configuration.

⚠️⚠️⚠️ CRITICAL — READ BEFORE ANY CALCULATION ⚠️⚠️⚠️

RULE 0 — USE EXACT API PRICE VALUES (NO MODIFICATIONS)
───────────────────────────────────────────────────
When fetch_price returns a price, USE IT EXACTLY AS RETURNED.
  ✓ API returns {"price": 0.109626} → Use 0.109626 (about 11 cents)
  ❌ NEVER multiply by 100, move decimals, or "correct" the price
  ❌ NEVER assume the price "should be" different than what API returned

The price field is ALWAYS in USD. If OCT price is 0.109626, that means
$0.109626 per OCT token (about 11 cents), NOT $10.96!

───────────────────────────────────────────────────
RULE 1 — CURRENCY CONVERSION IS MANDATORY
───────────────────────────────────────────────────
You CANNOT divide one cryptocurrency amount by another cryptocurrency's USD price.
You MUST first convert to the SAME unit (USD) before comparing.

⚠️ WHEN USER HAS OCT BALANCE: You MUST call fetch_price for "onechain" first!
   OCT balance alone is NOT a USD value. You need OCT's USD price to convert.

───────────────────────────────────────────────────
RULE 2 — "HOW MANY [TOKEN] CAN I BUY WITH X OCT"
───────────────────────────────────────────────────
⚠️ THIS REQUIRES TWO PRICE FETCHES — NO EXCEPTIONS!

ALWAYS requires these steps:
  1. fetch_price for "onechain" → Get OCT price (e.g., {"price": 2.50})
  2. fetch_price for target token → Get token price (e.g., {"price": 0.109626})
  3. Convert OCT → USD:  usd_value = oct_amount × oct_price_usd
     Example: 100 OCT × $2.50 = $250 USD
  4. Divide by token price:  token_amount = usd_value / token_price_usd
     Example: $250 / $0.109626 = 2,280 tokens

  ✓  100 OCT × $2.50 = $250 → $250 / $0.11 = 2,272 tokens
  ❌  100 / $0.11 = 909 tokens  (CATASTROPHICALLY WRONG — treats 100 OCT as $100 directly!)

  THE FORMULA IS: (oct_amount × oct_price_usd) / token_price_usd
  NOT: oct_amount / token_price_usd

───────────────────────────────────────────────────
RULE 3 — "HOW MANY [TOKEN] CAN I BUY WITH MY OCT BALANCE"
───────────────────────────────────────────────────
⚠️ REQUIRES 3 TOOL CALLS MINIMUM:
  1. get_balance → Get OCT amount (e.g., 100 OCT)
  2. fetch_price for "onechain" → Get OCT/USD price (e.g., $2.50)
  3. fetch_price for target token → Get token/USD price (e.g., $0.109626)
  4. Calculate: (oct_balance × oct_price) / token_price
     Example: (100 × 2.50) / 0.109626 = 2,280 tokens

  ❌ WRONG: Skipping step 2 and doing 100 / 0.109626 = 912 tokens (ignores OCT/USD conversion)

───────────────────────────────────────────────────
RULE 4 — "WHAT IS MY OCT BALANCE WORTH IN USD"
───────────────────────────────────────────────────
  1. Call get_balance to get OCT amount
  2. Call fetch_price for "onechain" to get OCT/USD
  3. Multiply: portfolio_usd = oct_balance × oct_price_usd
  Example: 500 OCT × $2.50 = $1,250 USD

───────────────────────────────────────────────────
RULE 5 — "CONVERT X [TOKEN_A] TO [TOKEN_B]" / "HOW MUCH [B] IS X [A] WORTH"
───────────────────────────────────────────────────
  1. Fetch price of Token A
  2. Fetch price of Token B
  3. Convert A → USD:  usd_value = amount_A × price_A
  4. Convert USD → B:  amount_B = usd_value / price_B
  Example: "How much SOL is 1000 OCT worth?"
    → 1000 × $2.50 = $2500 USD → $2500 / $140 = 17.86 SOL

───────────────────────────────────────────────────
RULE 6 — "COMPARE PRICES" / "WHICH IS MORE EXPENSIVE"
───────────────────────────────────────────────────
  1. Fetch prices of all requested tokens
  2. Compare their USD prices directly
  3. Optionally show the ratio: price_A / price_B
  Example: "Is OCT or BTC more expensive?"
    → OCT $2.50, BTC $60000 → BTC is ~24,000× more expensive

───────────────────────────────────────────────────
RULE 7 — "SEND $X WORTH OF OCT" (USD-denominated transfer)
───────────────────────────────────────────────────
  1. Fetch OCT price
  2. Calculate OCT amount: oct_to_send = usd_amount / oct_price_usd
  3. Execute transfer with calculated amount
  Example: "Send $5 of OCT to 0x..."
    → $5 / $2.50 = 2 OCT → transfer 2 OCT

───────────────────────────────────────────────────
RULE 8 — "CAN I AFFORD X TOKENS" / "DO I HAVE ENOUGH"
───────────────────────────────────────────────────
  1. Get user balance (get_balance)
  2. Get OCT price + target token price
  3. Calculate how many tokens balance can buy (Rule 2)
  4. Compare to requested amount → "Yes, you can" or "No, you'd need X more"

───────────────────────────────────────────────────
RULE 9 — "PROFIT / LOSS" / "I BOUGHT AT $X, WHAT'S MY P&L"
───────────────────────────────────────────────────
  1. Fetch current price
  2. Calculate: pnl = (current_price - buy_price) × quantity
  3. Percentage: pnl_pct = ((current_price - buy_price) / buy_price) × 100
  4. Show both absolute $ and % gain/loss

───────────────────────────────────────────────────
RULE 10 — MULTI-TOKEN PRICE QUERIES ("price of BTC, OCT, SOL")
───────────────────────────────────────────────────
  Call fetch_price with all tokens in the query string (e.g., "btc oct sol").
  Present results in a clean list with 24h change.

───────────────────────────────────────────────────
RULE 11 — "IS OCT UP OR DOWN TODAY" / MARKET SENTIMENT
───────────────────────────────────────────────────
  1. Fetch price (includes 24h change)
  2. Report: current price, 24h change %, direction (up/down)
  3. Mention market cap and volume if available

───────────────────────────────────────────────────
RULE 12 — ALWAYS SHOW YOUR WORK
───────────────────────────────────────────────────
  For ANY calculation, show:
  • Each value fetched (with source)
  • Each arithmetic step
  • The final result clearly marked with **Result:**

═══════════════════════════════════════════════════════════════
"""

    if has_sequential:
        system_prompt += "\n\nSEQUENTIAL WORKFLOW DETECTED:\n"
        system_prompt += "This agent has tools connected in a specific execution order. You MUST follow the chain:\n"
        for tool, next_tool in tool_flow.items():
            system_prompt += f"   - {tool} → {next_tool}\n"
        
        system_prompt += """
SEQUENTIAL EXECUTION PROTOCOL (CRITICAL):
1. Execute ALL connected tools in the defined order within a SINGLE conversation turn
2. After completing one tool, IMMEDIATELY invoke the next tool in the chain
3. NEVER wait for user confirmation between sequential steps
4. Use output from previous tools as input for subsequent tools when applicable
5. Only provide a comprehensive summary after the ENTIRE chain completes
6. If ANY tool in the sequence fails, stop execution and report the failure clearly

CALCULATE TOOL USAGE:
- Use the 'variables' parameter to pass values from previous tool results
- CRITICAL: Always verify your expression makes mathematical sense before calling calculate
- Example: If fetch_price returned {"price": 2.50} for OCT and balance is 18.5:
  expression: "oct_balance * oct_price"
  variables: {"oct_balance": 18.5, "oct_price": 2.50}
  Result will be: 18.5 * 2.50 = 46.25 ✓
- WRONG: "oct_balance / oct_price" would give 7.4... which doesn't make sense ❌
- The tool will substitute variables automatically before evaluation

═══════════════════════════════════════════════════════════════
⛔ ABSOLUTELY NO HARDCODED/MOCK VALUES - USE REAL TOOL DATA ONLY ⛔
═══════════════════════════════════════════════════════════════

You MUST call the appropriate tools and use the ACTUAL returned values.
NEVER use placeholder, estimated, or hardcoded values like "2.50" for OCT price.

✓ CORRECT: Call fetch_price("ethereum") → Get {"price": 2387.42} → Use 2387.42
❌ WRONG: Assume ETH price is ~$2400 and use 2400.50 without calling fetch_price

Every numeric value in your calculations MUST come from:
  - A tool call response (fetch_price, get_balance, get_token_balance, etc.)
  - The user's explicit input (e.g., "I have 0.1 OCT")
  - A previous calculation result

If you need a price → CALL fetch_price
If you need a balance → CALL get_balance or get_token_balance
If you need token info → CALL get_token_info

═══════════════════════════════════════════════════════════════

FOR TOKEN PURCHASE CALCULATIONS (VERY IMPORTANT):
When user asks "how many [TOKEN] can I buy with [ETH_BALANCE]":

⚠️ CRITICAL: You MUST call fetch_price for BOTH "ethereum" AND the target token!
⚠️ CRITICAL: Use the EXACT price values returned from the API - NO hardcoded values!
⚠️ CRITICAL: Do NOT assume or estimate any prices - ALWAYS fetch them!

REQUIRED TOOL CALLS (in order):
1. get_balance (if user says "my balance" or "this balance")
   → Returns: {"balance": "0.05", "balanceInEth": "0.05"} → Use 0.05

2. fetch_price with query "ethereum" (MANDATORY - do NOT skip!)
   → Returns: {"prices": [{"price": 2387.42, ...}]} → Use 2387.42

3. fetch_price with query for target token (e.g., "onechain" or "bitcoin")
   → Returns: {"prices": [{"price": 0.109626, ...}]} → Use 0.109626

4. calculate with ONLY values from above tool calls:
   expression: "(oct_balance * oct_price) / token_price"
   variables: {"oct_balance": 0.05, "oct_price": 2.50, "token_price": 0.109626}
   → All three values MUST come from tool responses, not made up!

❌ WRONG - Using hardcoded OCT price:
   You called fetch_price("onechain") but NOT fetch_price for OCT price
   Then used oct_price: 2.50 ← WHERE DID THIS COME FROM? Not from any tool!

❌ WRONG - Skipping OCT price fetch:
   Only fetched target token price, then divided OCT amount by token price directly

✓ CORRECT - All values from real tool calls:
   1. get_balance → 0.05 OCT
   2. fetch_price("onechain") → 2.50 (OCT/USD price)
   3. fetch_price("bitcoin") → 60000
   4. calculate: (0.05 * 2.50) / 60000 = 0.00000208 BTC

PARAMETER FLOW:
- Automatically pass relevant outputs (e.g., tokenAddress, collectionAddress) to next tools
- If the next tool requires data from the previous tool, extract and use it automatically
- For calculate tool: Pass numeric values via the 'variables' parameter
- Maintain context throughout the execution chain
"""
    else:
        system_prompt += """
EXECUTION MODE: Independent tool execution
- Tools can be executed based on user requests
- Each operation is standalone and completes independently
- Provide results immediately after execution
- You CAN and SHOULD call multiple tools in sequence when the user's question requires it
  (e.g., fetching ETH price AND token price to compute a conversion)
- For any "how many tokens can I buy" question, you MUST call fetch_price for BOTH
  Ethereum AND the target token, then do the math (see CRITICAL MATH RULES above)

PROACTIVE MULTI-TOOL CHAINING (CRITICAL):
When the user's query IMPLICITLY requires multiple tools, call them ALL without asking:
- "How much BTC can I buy with this balance?" → get_balance + fetch_price(onechain) + fetch_price(bitcoin) + calculate
- "What's my balance worth?" → get_balance + fetch_price(ethereum) + calculate
- "Calculate" (after previous data was fetched) → use conversation context data + calculate
- "Now calculate" → same as above, use previously fetched data
- "Compare ETH and BTC" → fetch_price(ethereum) + fetch_price(bitcoin) + present comparison

DO NOT ask the user for data that your tools can fetch. If you need a price, CALL fetch_price.
If you need a balance, CALL get_balance. Act autonomously and proactively.
"""
    
    system_prompt += """

EMAIL TOOL RULES (when send_email is available):
- When the user asks to send, compose, or email someone, you MUST use the send_email function call.
- Do NOT just write out the email as text. You MUST invoke the send_email tool so it actually gets sent.
- Compose a professional subject and body based on the user's intent.
- After the tool returns successfully, confirm to the user that the email was sent with the recipient and subject.
- Do NOT echo the raw JSON payload in your response.
- Keep your final response short and conversational, e.g.: "Done! I've sent a good morning email to contact.rohan.here@gmail.com."

EXECUTION GUIDELINES:

1. PARAMETER HANDLING:
   - If ALL required parameters are available (from user message or context), execute IMMEDIATELY
   - DO NOT ask for confirmation when all parameters are present
   - ONLY ask for missing or ambiguous parameters
   - Use privateKey from context automatically when available
   - Validate addresses and amounts before execution

2. SMART CONTRACT OPERATIONS:
   - All fungible tokens are deployed via the Move TokenFactory module
   - All NFTs are deployed via the Move NFTFactory module
   - Token amounts use the token's decimal precision (default: 9 decimals for OCT)
   - Always wait for transaction confirmation before proceeding

3. RESPONSE FORMATTING (CRITICAL):
   - ALWAYS show your work! When performing calculations or multi-step operations, show each step clearly
   - Format responses with clear sections using bullet points or numbered steps
   - For price/balance queries, show: the fetched values → the calculation → the final result
   - ALL LINKS MUST BE FORMATTED AS MARKDOWN HYPERLINKS: [link text](url)
   
   IMPORTANT — TOKEN PURCHASE CALCULATIONS:
   Follow the CRITICAL MATH RULES defined above. Always fetch BOTH OCT price and target token price.
   Never divide raw OCT amount by a token's USD price — convert ETH to USD first.
   
   ALL VALUES MUST COME FROM ACTUAL TOOL CALLS - NO HARDCODED/MOCK DATA!
   USE EXACT API PRICES: If API returns {"price": 0.109626}, use $0.109626 (NOT $10.96!)
   
   RESPONSE FORMAT - Natural Conversational Tone:
   Write responses in a natural, conversational tone like a real AI assistant. Integrate the data
   seamlessly into the explanation rather than using rigid templates or bullet points. Show the
   calculation flow naturally within the narrative.
   
   GOOD EXAMPLE (Natural, Conversational):
   "Based on your current wallet balance of 100 OCT, I can tell you exactly how many tokens you
   can purchase. Let me break down the math for you.
   
   Your wallet holds 100 OCT, and at the current market price of $2.50 per OCT, that's worth about
   $250 in USD. A token is currently trading at $0.109678 per unit, so dividing your USD value by the
   token price gives us roughly 2,280 tokens that you can purchase with your balance.
   
   Keep in mind that this calculation uses current market prices and doesn't account for trading fees
   or slippage that might occur during an actual swap. The actual amount could vary slightly depending
   on liquidity and exchange conditions."
   
   BAD EXAMPLE (Rigid, Template-like):
   "Here's how I calculated that:
   Data fetched from APIs:
   - OCT Balance: 100 OCT
   - OCT Price: $2.50
   - Token Price: $0.109678
   Step-by-Step Calculation:
   1. Convert OCT to USD: 100 OCT x $2.50 = $250 USD
   2. Calculate tokens: $250 / $0.109678 = 2,280 tokens"
   
   KEY PRINCIPLES FOR NATURAL RESPONSES:
   - Write in first person as an AI agent ("I fetched", "I calculated", "I can see")
   - Use conversational language and natural sentence structure
   - Integrate numbers and calculations into the narrative flow
   - Explain what the numbers mean in practical terms
   - Mention important caveats naturally (fees, slippage, etc.)
   - Use bold for final results and key numbers only where it helps readability
   - Keep paragraphs concise and readable
   - Show your work naturally without making it feel like a math worksheet
   - For blockchain operations, confirm success clearly and provide links naturally
   - Provide transaction hashes with explorer links presented conversationally
   - Format links naturally in text: "You can view the transaction at [this link](url)"
   - Keep responses concise but informative
   - No code blocks, no hypothetical examples, no emojis, no excessive formatting

4. ERROR HANDLING:
   - If a transaction fails, explain why in clear terms
   - Suggest corrective actions (e.g., insufficient funds, invalid address)
   - For sequential workflows, stop at the failed step and report clearly
   - Never proceed with subsequent tools if a prerequisite tool fails

5. USER EXPERIENCE:
   - Be conversational, helpful, and proactive
   - Explain what you're doing in simple terms
   - Provide context about OneChain operations when relevant
   - Keep responses clear and professional
   - Confirm successful operations with clear success messages

6. SECURITY & BEST PRACTICES:
   - Never expose full private keys in responses
   - Validate all addresses before executing transfers
   - Confirm token deployments were successful before attempting transfers
   - For large transfers, mention the amount clearly for user awareness

7. BLOCKCHAIN SPECIFICS:
   - OneChain uses OCT for gas fees (1 OCT = 1,000,000,000 MIST)
   - Block time: ~400ms
   - Move contracts use the object model for safety and composability
   - All transactions are final after confirmation (no rollbacks)

CRITICAL DON'T DO:
- DO NOT ask "Do you want to proceed?" if all parameters are available
- DO NOT wait between sequential tool calls - execute the entire chain
- DO NOT make assumptions about missing critical parameters (ask user)
- DO NOT proceed if a transaction fails in a sequential workflow
- DO NOT provide outdated or cached blockchain data

SUCCESS CRITERIA:
- Clear confirmation of operation completion
- Transaction hash provided with explorer link
- Next steps or available actions mentioned
- Any relevant addresses (token, NFT, wallet) clearly displayed
- Estimated or actual gas costs mentioned when significant
"""
    
    return system_prompt

def execute_tool(tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool by calling its API endpoint"""
    
    if tool_name not in TOOL_DEFINITIONS:
        raise ValueError(f"Unknown tool: {tool_name}")
    
    tool_def = TOOL_DEFINITIONS[tool_name]
    endpoint = tool_def["endpoint"]
    method = tool_def["method"]
    
    # Handle local tools (like calculate)
    if method == "LOCAL":
        if tool_name == "calculate":
            try:
                expression = parameters.get("expression", "")
                variables = parameters.get("variables", {})
                description = parameters.get("description", "Calculation")
                
                import re
                
                # Ensure variables is a dict (AI may send string or other types)
                if isinstance(variables, str):
                    try:
                        variables = json.loads(variables)
                    except (json.JSONDecodeError, TypeError):
                        variables = {}
                if not isinstance(variables, dict):
                    variables = {}
                
                # Normalize ALL whitespace (newlines, tabs, etc.) to single spaces
                resolved_expression = ' '.join(expression.split())
                
                # Build alias map: common variable name variants → canonical provided name
                # This fixes the AI using e.g. "arb_price" in expression but providing "arbitrum_price"
                alias_map = {}
                for var_name in list(variables.keys()):
                    val = variables[var_name]
                    vn = var_name.lower()
                    # Price aliases
                    if 'price' in vn:
                        # eth_price → also register as ethereum_price and vice versa
                        if 'eth' in vn:
                            for alias in ['eth_price', 'ethereum_price', 'eth_price_usd', 'price_eth']:
                                alias_map[alias] = val
                        elif 'btc' in vn or 'bitcoin' in vn:
                            for alias in ['btc_price', 'bitcoin_price', 'btc_price_usd', 'price_btc']:
                                alias_map[alias] = val
                        elif 'sol' in vn or 'solana' in vn:
                            for alias in ['sol_price', 'solana_price', 'sol_price_usd', 'price_sol']:
                                alias_map[alias] = val
                        elif 'arb' in vn or 'arbitrum' in vn or 'oct' in vn or 'onechain' in vn:
                            for alias in ['arb_price', 'arbitrum_price', 'arb_price_usd', 'oct_price', 'onechain_price', 'token_price', 'token_price_usd', 'price_arb', 'price_oct']:
                                alias_map[alias] = val
                        elif 'token' in vn:
                            # token_price → also register short coin names
                            for alias in ['token_price', 'token_price_usd', 'arb_price', 'sol_price', 'btc_price', 'target_price']:
                                if alias not in variables:  # don't override explicit vars
                                    alias_map[alias] = val
                    # Balance aliases
                    if 'balance' in vn:
                        for alias in ['oct_balance', 'eth_balance', 'balance', 'wallet_balance', 'my_balance']:
                            alias_map[alias] = val
                
                # Merge aliases into variables (don't override explicitly provided vars)
                merged_variables = {**alias_map, **variables}
                
                # --- FALLBACK: extract balance/amounts from description & expression context ---
                # The AI often writes the balance value in the description but forgets to put it in variables.
                # e.g. description="Calculate how many ARB with 0.1 ETH" or user_message has "0.1 OCT"
                # Scan for patterns like "0.1 OCT", "balance: 0.1", "X OCT balance"
                context_text = description
                if 'eth_balance' not in merged_variables and 'balance' not in merged_variables:
                    balance_patterns = [
                        r'ETH Balance:\s*([\d.]+)',                      # "ETH Balance: 0.1"
                        r'Balance for 0x[a-fA-F0-9]+:\s*([\d.]+)',      # "Balance for 0x...: 0.1"
                        r'balance[:\s]+([\d.]+)',                        # "balance: 0.1"
                        r'with\s+([\d.]+)\s*(?:ETH|ether)',             # "with 0.1 ETH"
                        r'has\s+([\d.]+)\s*(?:ETH|ether)',              # "has 0.1 ETH"
                        r'\b(0\.\d+)\s*ETH\b',                          # "0.1 ETH" (< 1 ETH)
                        r'(\d+\.?\d*)\s*ether',                         # "0.1 ether"
                    ]
                    for pattern in balance_patterns:
                        m = re.search(pattern, context_text, re.IGNORECASE)
                        if m:
                            try:
                                extracted = float(m.group(1))
                                # Values > 1000 are almost certainly prices, not balances
                                if 0 < extracted < 1000:
                                    merged_variables['eth_balance'] = extracted
                                    merged_variables['balance'] = extracted
                                    merged_variables['wallet_balance'] = extracted
                                    merged_variables['my_balance'] = extracted
                                    print(f"[Calculate] Auto-extracted balance {extracted} ETH from description")
                                    break
                            except (ValueError, TypeError):
                                pass
                
                # Substitute variables (sort by name length desc to avoid partial matches)
                if merged_variables:
                    sorted_vars = sorted(merged_variables.items(), key=lambda x: len(str(x[0])), reverse=True)
                    for var_name, var_value in sorted_vars:
                        # Convert value to float, stripping commas and whitespace
                        try:
                            numeric_value = float(str(var_value).replace(',', '').strip())
                        except (ValueError, TypeError):
                            return {
                                "success": False,
                                "tool": tool_name,
                                "error": f"Variable '{var_name}' has non-numeric value: {var_value}"
                            }
                        resolved_expression = re.sub(
                            r'\b' + re.escape(str(var_name)) + r'\b',
                            str(numeric_value),
                            resolved_expression
                        )
                
                # Normalize whitespace again after substitution
                resolved_expression = ' '.join(resolved_expression.split())
                
                # Check if there are still unresolved variable names
                variable_pattern = r'[a-zA-Z_][a-zA-Z0-9_]*'
                found_variables = re.findall(variable_pattern, resolved_expression)
                # Filter out 'e' which is valid for scientific notation like 1e10
                found_variables = [v for v in found_variables if v.lower() != 'e']
                
                if found_variables:
                    return {
                        "success": False,
                        "tool": tool_name,
                        "error": f"Unresolved variables in expression: {', '.join(found_variables)}. Resolved so far: '{resolved_expression}'. Available variables were: {list(merged_variables.keys())}. Please ensure expression variable names match the provided variables."
                    }
                
                # Safely evaluate the expression (only allow basic math)
                allowed_chars = set("0123456789+-*/().e ")
                if not all(c in allowed_chars for c in resolved_expression.lower()):
                    bad_chars = [c for c in resolved_expression if c.lower() not in allowed_chars]
                    return {
                        "success": False,
                        "tool": tool_name,
                        "error": f"Invalid characters in expression: {bad_chars}. Resolved expression: '{resolved_expression}'. Only numbers and basic operators are allowed."
                    }
                    
                result = eval(resolved_expression)
                return {
                    "success": True,
                    "tool": tool_name,
                    "result": {
                        "original_expression": expression,
                        "variables": variables,
                        "resolved_expression": resolved_expression,
                        "result": result,
                        "description": description
                    }
                }
            except Exception as e:
                return {
                    "success": False,
                    "tool": tool_name,
                    "error": f"Calculation error: {str(e)}. Expression: '{parameters.get('expression', '')}', Variables: {parameters.get('variables', {})}"
                }
    
    # Handle URL parameters for GET requests
    url_params_to_replace = {
        "{address}": "address",
        "{tokenId}": "tokenId",
        "{ownerAddress}": "ownerAddress",
        "{collectionAddress}": "collectionAddress"
    }
    
    params_for_request = parameters.copy()
    
    # Replace URL parameters
    for placeholder, param_name in url_params_to_replace.items():
        if placeholder in endpoint and param_name in params_for_request:
            endpoint = endpoint.replace(placeholder, str(params_for_request[param_name]))
            del params_for_request[param_name]
    
    # Prepare headers - check if Bearer token is needed
    headers = {}
    if "api.subgraph.onelabs.cc" in endpoint or "onechain-subgraph" in endpoint:
        bearer_token = os.getenv("ONECHAIN_BEARER_TOKEN")
        if bearer_token:
            headers["Authorization"] = f"Bearer {bearer_token}"
    
    try:
        if method == "POST":
            response = requests.post(endpoint, json=params_for_request, headers=headers, timeout=60)
        elif method == "GET":
            response = requests.get(endpoint, headers=headers, timeout=60)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return {
            "success": True,
            "tool": tool_name,
            "result": response.json()
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "tool": tool_name,
            "error": str(e)
        }

def get_openai_tools(tool_names: List[str]) -> List[Dict[str, Any]]:
    """Convert tool definitions to OpenAI function calling format"""
    tools = []
    for tool_name in tool_names:
        if tool_name in TOOL_DEFINITIONS:
            tool_def = TOOL_DEFINITIONS[tool_name]
            tools.append({
                "type": "function",
                "function": {
                    "name": tool_def["name"],
                    "description": tool_def["description"],
                    "parameters": tool_def["parameters"]
                }
            })
    
    return tools


def enrich_calculate_args(function_args: Dict[str, Any], all_tool_results: List[Dict[str, Any]], context_text: str = "") -> Dict[str, Any]:
    """
    Before executing a calculate tool call, auto-inject missing numeric variables
    from previous tool results (get_balance, fetch_price) so the AI doesn't have to
    manually include every value in the variables dict.
    Also scans context_text (user_message) for balance values like '0.1 ETH'.
    """
    if not function_args.get("expression"):
        return function_args

    variables = function_args.get("variables", {})
    if not isinstance(variables, dict):
        variables = {}

    # Scan all previous successful results
    for tr in all_tool_results:
        if not tr.get("success") or not tr.get("result"):
            continue
        tool = tr.get("tool", "")
        result = tr["result"]

        if tool == "get_balance":
            balance_val = result.get("balance") or result.get("balanceInEth")
            if balance_val is not None:
                try:
                    b = float(str(balance_val))
                    # Only inject if not already explicitly set
                    for key in ["eth_balance", "balance", "wallet_balance", "my_balance"]:
                        if key not in variables:
                            variables[key] = b
                except (ValueError, TypeError):
                    pass

        if tool == "fetch_price":
            prices = result.get("prices", [])
            if prices and isinstance(prices, list):
                price_val = prices[0].get("price")
                coin = (prices[0].get("coin") or "").lower()
                if price_val is not None:
                    try:
                        p = float(price_val)
                        if "eth" in coin or "ethereum" in coin:
                            for key in ["eth_price", "eth_price_usd", "ethereum_price"]:
                                if key not in variables:
                                    variables[key] = p
                        elif "btc" in coin or "bitcoin" in coin:
                            for key in ["btc_price", "bitcoin_price"]:
                                if key not in variables:
                                    variables[key] = p
                        elif "sol" in coin or "solana" in coin:
                            for key in ["sol_price", "solana_price"]:
                                if key not in variables:
                                    variables[key] = p
                        else:
                            # Generic token — register under the coin name and common aliases
                            for key in [f"{coin}_price", "token_price", "token_price_usd",
                                        "arb_price", "sol_price", "target_price"]:
                                if key not in variables:
                                    variables[key] = p
                    except (ValueError, TypeError):
                        pass

    function_args = dict(function_args)
    function_args["variables"] = variables

    # Also scan context_text (user_message) for a balance value as last resort.
    # The conversationController.js embeds e.g. "ETH Balance: 0.1 ETH" in user_message.
    # We only inject if the value looks like a wallet balance (< 100 ETH), not a price.
    if context_text and not any(k in variables for k in ["eth_balance", "balance", "wallet_balance"]):
        import re as _re
        balance_patterns = [
            # Most specific patterns first to avoid false matches
            r'ETH Balance:\s*([\d.]+)',                      # "ETH Balance: 0.1"
            r'Balance for 0x[a-fA-F0-9]+:\s*([\d.]+)',      # "Balance for 0x...: 0.1 ETH"
            r'balanceInEth["\s:>]+([\d.]+)',                 # JSON key
            r'(?:wallet\s*)?balance[:\s]+([\d.]+)\s*(?:ETH)?',  # "balance: 0.1" / "wallet balance: 0.1"
            r'with\s+([\d.]+)\s*ETH\b',                     # "with 0.1 ETH"
            r'has\s+([\d.]+)\s*ETH\b',                      # "has 0.1 ETH"
            r'holding\s+([\d.]+)\s*ETH\b',                  # "holding 0.5 ETH"
            r'\b(0\.\d+)\s*ETH\b',                          # "0.1 ETH" — only values < 1 ETH
            r'\b([1-9]\d*\.\d+)\s*ETH\b(?!.*price)',        # "1.5 ETH" but not near the word "price"
        ]
        for pattern in balance_patterns:
            m = _re.search(pattern, context_text, _re.IGNORECASE)
            if m:
                try:
                    b = float(m.group(1))
                    # Sanity check: a wallet balance is typically < 1000 ETH;
                    # values > 1000 are almost certainly prices, not balances.
                    if 0 < b < 1000:
                        for key in ["eth_balance", "balance", "wallet_balance", "my_balance"]:
                            if key not in variables:
                                variables[key] = b
                        print(f"[Calculate] Auto-extracted balance {b} ETH from context_text (pattern: {pattern})")
                        break
                except (ValueError, TypeError):
                    pass

    return function_args

def process_agent_conversation(
    system_prompt: str,
    user_message: str,
    available_tools: List[str],
    tool_flow: Dict[str, str],
    private_key: Optional[str] = None,
    wallet_address: Optional[str] = None,
    max_iterations: int = 10
) -> Dict[str, Any]:
    """
    Process the conversation with the AI agent
    Primary: Groq (moonshotai/kimi-k2-instruct-0905) with tool use
    Fallback: Google Gemini
    """
    
    # Add wallet context if available (preferred over private key)
    if wallet_address:
        system_prompt += f"\n\nCONTEXT: User's connected wallet address is: {wallet_address}. Use this as the fromAddress for transfers."
    elif private_key:
        system_prompt += f"\n\nCONTEXT: User's private key is available: {private_key}"
    
    all_tool_calls = []
    all_tool_results = []
    iteration = 0
    
    # Build OpenAI-compatible tools for Groq
    openai_tools = get_openai_tools(available_tools)
    
    # Try all Groq clients (Primary)
    if groq_clients:
        for client_idx, groq_client in enumerate(groq_clients, 1):
            try:
                print(f"Attempting Groq API key {client_idx}/{len(groq_clients)}...")
                
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ]
                
                iteration = 0
                all_tool_calls = []
                all_tool_results = []
                
                while iteration < max_iterations:
                    iteration += 1
                    
                    for tool_call in response_message.tool_calls:
                        function_name = tool_call.function.name
                        function_args = json.loads(tool_call.function.arguments)
                        
                        # Add private key if needed and available
                        if private_key and function_name in TOOL_DEFINITIONS:
                            tool_params = TOOL_DEFINITIONS[function_name]["parameters"]["properties"]
                            if "privateKey" in tool_params and "privateKey" not in function_args:
                                function_args["privateKey"] = private_key
                        
                        # Auto-inject missing variables for calculate from prior tool results
                        if function_name == "calculate":
                            function_args = enrich_calculate_args(function_args, all_tool_results, user_message)
                        
                        all_tool_calls.append({
                            "tool": function_name,
                            "parameters": function_args
                        })
                        
                        # Execute the tool
                        result = execute_tool(function_name, function_args)
                        all_tool_results.append(result)
                        
                        # Add tool result to messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(result)
                        })
                        
                        for tool_call in response_message.tool_calls:
                            function_name = tool_call.function.name
                            function_args = json.loads(tool_call.function.arguments)
                            
                            # Add wallet address for transfer tool if available and needed
                            if wallet_address and function_name == "transfer":
                                if "fromAddress" not in function_args:
                                    function_args["fromAddress"] = wallet_address
                            # Add wallet address for get_balance if asking for "my balance"
                            elif wallet_address and function_name == "get_balance":
                                if "address" not in function_args or not function_args["address"]:
                                    function_args["address"] = wallet_address
                            # Fallback to private key if needed and available
                            elif private_key and function_name in TOOL_DEFINITIONS:
                                tool_params = TOOL_DEFINITIONS[function_name]["parameters"]["properties"]
                                if "privateKey" in tool_params and "privateKey" not in function_args:
                                    function_args["privateKey"] = private_key
                            
                            all_tool_calls.append({
                                "tool": function_name,
                                "parameters": function_args
                            })
                            
                            # Execute the tool
                            result = execute_tool(function_name, function_args)
                            all_tool_results.append(result)
                            
                            # Add tool result to messages
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "content": json.dumps(result)
                            })
                            
                            # Check if we need to continue with sequential tools
                            if function_name in tool_flow:
                                next_tool = tool_flow[function_name]
                                messages.append({
                                    "role": "user",
                                    "content": f"Now immediately call the {next_tool} tool as it is next in the sequential flow."
                                })
                    else:
                        # No tool calls, return final response
                        print(f"✓ Groq API key {client_idx} succeeded")
                        return {
                            "agent_response": response_message.content,
                            "tool_calls": all_tool_calls,
                            "results": all_tool_results,
                            "conversation_history": [],
                            "provider": f"Groq key {client_idx} (moonshotai/kimi-k2-instruct-0905)"
                        }
                
                # Max iterations reached with this Groq client
                print(f"✓ Groq API key {client_idx} completed (max iterations)")
                return {
                    "agent_response": "Maximum iterations reached. Please try again with a simpler request.",
                    "tool_calls": all_tool_calls,
                    "results": all_tool_results,
                    "conversation_history": [],
                    "provider": f"Groq key {client_idx} (moonshotai/kimi-k2-instruct-0905)"
                }
                
            except Exception as groq_error:
                error_msg = str(groq_error)
                
                # Enhanced rate limit detection
                is_rate_limit = (
                    "rate_limit" in error_msg.lower() or 
                    "429" in error_msg or
                    "rate limit" in error_msg.lower() or
                    hasattr(groq_error, 'status_code') and groq_error.status_code == 429 or
                    hasattr(groq_error, 'status') and groq_error.status == 429
                )
                
                # Enhanced invalid key detection  
                is_invalid_key = (
                    "invalid_api_key" in error_msg.lower() or
                    "invalid api key" in error_msg.lower() or
                    "authentication" in error_msg.lower() or
                    hasattr(groq_error, 'status_code') and groq_error.status_code == 401 or
                    hasattr(groq_error, 'status') and groq_error.status == 401
                )
                
                if is_rate_limit:
                    print(f"⚠️ Groq key {client_idx} rate limited - trying next key or fallback...")
                    continue
                elif is_invalid_key:
                    print(f"⚠️ Groq key {client_idx} is invalid - trying next key...")
                    continue
                else:
                    print(f"⚠️ Groq API key {client_idx} failed: {error_msg}")
                    continue
            
            # Reset iteration counter for next client
            all_tool_calls = []
            all_tool_results = []
            iteration = 0
    
    # Fallback to Gemini
    if GEMINI_API_KEY:
        print("Attempting Gemini API (Fallback)...")
        
        # Build function declarations for Gemini
        function_declarations = convert_to_gemini_tools(available_tools)

        # Initialize Gemini model with fallback chain
        model_names = [
            'gemini-2.0-flash',
            'gemini-1.5-flash-002',
            'gemini-1.5-flash-001',
            'gemini-1.5-flash'
        ]
        model = None
        chat = None
        last_error = None

        tools_configuration = [{"function_declarations": function_declarations}] if function_declarations else None

        for name in model_names:
            try:
                print(f"Attempting to initialize Gemini model: {name}")
                model = genai.GenerativeModel(
                    model_name=name,
                    tools=tools_configuration,
                    generation_config={
                        "temperature": 0.7,
                        "top_p": 0.8,
                        "top_k": 40,
                    }
                )
                chat = model.start_chat(history=[])
                print(f"Successfully initialized Gemini model: {name}")
                break
            except Exception as e:
                print(f"Failed to initialize {name}: {str(e)}")
                last_error = e
                continue
        
        if not model:
            try:
                print("All Flash models failed. Falling back to Gemini 1.5 Pro...")
                model = genai.GenerativeModel(
                    model_name='gemini-1.5-pro',
                    tools=tools_configuration,
                    generation_config={
                        "temperature": 0.7,
                        "top_p": 0.8,
                        "top_k": 40,
                    }
                )
                chat = model.start_chat(history=[])
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"All AI providers failed. Last error: {str(last_error)}")
        
        full_prompt = f"{system_prompt}\n\nUser: {user_message}"
        
        while iteration < max_iterations:
            iteration += 1
            
            try:
                response = chat.send_message(full_prompt)
            except Exception as e:
                if "429" in str(e):
                    return {
                        "agent_response": "Rate limit exceeded. Please try again in a few moments.",
                        "tool_calls": all_tool_calls,
                        "results": all_tool_results,
                        "conversation_history": [],
                        "provider": "Gemini (rate limited)"
                    }
                raise e
            
            function_calls = []
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        function_calls.append(part.function_call)
            
            if not function_calls:
                return {
                    "agent_response": response.text,
                    "tool_calls": all_tool_calls,
                    "results": all_tool_results,
                    "conversation_history": [],
                    "provider": "Gemini (fallback)"
                }
            
            for function_call in function_calls:
                function_name = function_call.name
                function_args = dict(function_call.args)
                
                # Add wallet address for transfer tool if available and needed
                if wallet_address and function_name == "transfer":
                    if "fromAddress" not in function_args:
                        function_args["fromAddress"] = wallet_address
                # Add wallet address for get_balance if asking for "my balance"
                elif wallet_address and function_name == "get_balance":
                    if "address" not in function_args or not function_args["address"]:
                        function_args["address"] = wallet_address
                # Fallback to private key if needed and available
                elif private_key and function_name in TOOL_DEFINITIONS:
                    tool_params = TOOL_DEFINITIONS[function_name]["parameters"]["properties"]
                    if "privateKey" in tool_params and "privateKey" not in function_args:
                        function_args["privateKey"] = private_key
                
                # Auto-inject missing variables for calculate from prior tool results
                if function_name == "calculate":
                    function_args = enrich_calculate_args(function_args, all_tool_results, user_message)
                
                all_tool_calls.append({
                    "tool": function_name,
                    "parameters": function_args
                })
                
                result = execute_tool(function_name, function_args)
                all_tool_results.append(result)
                
                full_prompt = f"Function {function_name} returned: {json.dumps(result)}"
            
            if all_tool_calls:
                last_tool_executed = all_tool_calls[-1]["tool"]
                if last_tool_executed in tool_flow:
                    next_tool = tool_flow[last_tool_executed]
                    full_prompt += f"\n\nIMPORTANT: You must now immediately call the {next_tool} tool as it is next in the sequential flow."
        
        return {
            "agent_response": "Maximum iterations reached. Please try again with a simpler request.",
            "tool_calls": all_tool_calls,
            "results": all_tool_results,
            "conversation_history": [],
            "provider": "Gemini (fallback)"
        }
    
    raise HTTPException(status_code=500, detail="No AI provider available")

# API Endpoints
@app.post("/agent/chat", response_model=AgentResponse)
async def chat_with_agent(request: AgentRequest):
    """
    Main endpoint to interact with the AI agent.
    Dynamically configures the agent based on tool connections.
    """
    
    try:
        # Extract unique tools and build flow map
        unique_tools = set()
        tool_flow = {}
        
        for conn in request.tools:
            unique_tools.add(conn.tool)
            if conn.next_tool:
                unique_tools.add(conn.next_tool)
                tool_flow[conn.tool] = conn.next_tool
        
        available_tools = list(unique_tools)
        
        # Validate tools
        for tool in available_tools:
            if tool not in TOOL_DEFINITIONS:
                raise HTTPException(status_code=400, detail=f"Unknown tool: {tool}")
        
        # Build system prompt
        system_prompt = build_system_prompt(request.tools)
        
        # Process conversation with sequential support
        result = process_agent_conversation(
            system_prompt=system_prompt,
            user_message=request.user_message,
            available_tools=available_tools,
            tool_flow=tool_flow,
            private_key=request.private_key,
            wallet_address=request.wallet_address
        )
        
        return AgentResponse(
            agent_response=result["agent_response"],
            tool_calls=result["tool_calls"],
            results=result["results"]
        )
    
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(f"ERROR in /agent/chat: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))

class WorkflowRequest(BaseModel):
    prompt: str

class AITool(BaseModel):
    id: str
    type: str
    name: str
    next_tools: List[str]

class WorkflowResponse(BaseModel):
    agent_id: str
    tools: List[AITool]
    has_sequential_execution: bool
    description: str
    raw_response: Optional[str] = None

@app.post("/create-workflow", response_model=WorkflowResponse)
async def create_workflow(request: WorkflowRequest):
    """
    Generate a workflow configuration from a natural language query.
    This endpoint analyzes the user's request and returns a structured workflow with tools.
    """
    
    try:
        # System prompt for workflow generation
        workflow_system_prompt = """You are an AI workflow designer for OneChain blockchain operations.
Your task is to analyze the user's request and create a structured workflow with the appropriate blockchain tools.

AVAILABLE TOOLS:
- transfer: Transfer OCT or Move coins from one address to another
- get_balance: Get the OCT balance of a wallet address
- deploy_move_token: Deploy a new Move fungible token on OneChain
- deploy_move_nft: Deploy a new Move NFT collection on OneChain
- mint_nft: Mint an NFT from a deployed Move NFT collection
- fetch_token_price: Get the current price of any token
- send_email: Send email notifications to recipients
- airdrop: Send tokens to multiple addresses at once
- swap: Swap one token for another
- deposit_yield: Deposit tokens to earn yield
- wrap_oct: Wrap OCT tokens
- get_token_info: Get information about a deployed token (name, symbol, supply)
- get_token_balance: Get token balance for a specific wallet
- get_nft_info: Get information about an NFT collection or specific NFT
- condition_check: Evaluate a boolean condition (e.g. balance > 100)
- yes_no_answer: Record a yes/no decision or governance vote
- send_webhook: Send an HTTP POST to an external webhook URL
- create_dao: Create an on-chain DAO with governance voting
- create_proposal: Create a governance proposal in a DAO
- vote_on_proposal: Cast a yes/no/abstain vote on a DAO proposal
- get_proposal: Fetch details and vote tally of a governance proposal
- approve_token: Grant token spending approval to a contract
- revoke_approval: Revoke a token spending approval
- tx_status: Check confirmation status of a transaction
- wallet_history: Fetch recent transaction history for a wallet

RESPONSE FORMAT:
You must respond with a valid JSON object containing:
{
  "tools": [
    {
      "type": "tool_name",
      "name": "Descriptive Name",
      "next_tools": ["next_tool_type"] or []
    }
  ],
  "description": "Brief description of what this workflow does",
  "has_sequential_execution": true/false
}

RULES:
1. Identify which tool(s) are needed based on the user's request
2. If multiple operations need to happen in sequence, set has_sequential_execution to true
3. Use next_tools array to link sequential operations
4. Keep the description clear and concise
5. Only include tools that are needed for the request
6. Return ONLY the JSON object, no additional text

EXAMPLES:

User: "Deploy a new token called MYTOKEN with 1000000 supply"
Response:
{
  "tools": [{"type": "deploy_move_token", "name": "Deploy MYTOKEN", "next_tools": []}],
  "description": "Deploy Move fungible token MYTOKEN with 1,000,000 initial supply",
  "has_sequential_execution": false
}

User: "Deploy an NFT collection and mint the first NFT"
Response:
{
  "tools": [
    {"type": "deploy_move_nft", "name": "Deploy NFT Collection", "next_tools": ["mint_nft"]},
    {"type": "mint_nft", "name": "Mint First NFT", "next_tools": []}
  ],
  "description": "Deploy a Move NFT collection and mint the first NFT",
  "has_sequential_execution": true
}

User: "Check my wallet balance"
Response:
{
  "tools": [{"type": "get_balance", "name": "Check Balance", "next_tools": []}],
  "description": "Check the OCT balance of your wallet",
  "has_sequential_execution": false
}
"""

        # Use Groq for workflow generation - try all keys
        if groq_clients:
            for client_idx, groq_client in enumerate(groq_clients, 1):
                try:
                    print(f"Attempting workflow generation with Groq key {client_idx}/{len(groq_clients)}")
                    
                    completion = groq_client.chat.completions.create(
                        model="moonshotai/kimi-k2-instruct-0905",
                        messages=[
                            {"role": "system", "content": workflow_system_prompt},
                            {"role": "user", "content": request.prompt}
                        ],
                        temperature=0.5,
                        max_tokens=2048,
                    )
                    
                    response_text = completion.choices[0].message.content.strip()
                    
                    # Parse the JSON response
                    # Remove markdown code blocks if present
                    if response_text.startswith("```json"):
                        response_text = response_text[7:]
                    if response_text.startswith("```"):
                        response_text = response_text[3:]
                    if response_text.endswith("```"):
                        response_text = response_text[:-3]
                    
                    response_text = response_text.strip()
                    workflow_data = json.loads(response_text)
                    
                    # Generate tool IDs and structure
                    tools = []
                    for idx, tool in enumerate(workflow_data.get("tools", [])):
                        tools.append(AITool(
                            id=f"tool_{idx + 1}",
                            type=tool.get("type", ""),
                            name=tool.get("name", ""),
                            next_tools=tool.get("next_tools", [])
                        ))
                    
                    print(f"✓ Groq key {client_idx} succeeded for workflow generation")
                    return WorkflowResponse(
                        agent_id=f"workflow_{int(os.urandom(4).hex(), 16)}",
                        tools=tools,
                        has_sequential_execution=workflow_data.get("has_sequential_execution", False),
                        description=workflow_data.get("description", "Generated workflow"),
                        raw_response=response_text
                    )
                    
                except Exception as groq_error:
                    error_msg = str(groq_error)
                    
                    # Enhanced rate limit detection
                    is_rate_limit = (
                        "rate_limit" in error_msg.lower() or 
                        "429" in error_msg or
                        "rate limit" in error_msg.lower() or
                        hasattr(groq_error, 'status_code') and groq_error.status_code == 429 or
                        hasattr(groq_error, 'status') and groq_error.status == 429
                    )
                    
                    if is_rate_limit:
                        print(f"⚠️ Groq key {client_idx} rate limited - trying next key or fallback...")
                        continue
                    else:
                        print(f"⚠️ Groq key {client_idx} workflow generation failed: {error_msg}")
                        if client_idx < len(groq_clients):
                            continue
                        else:
                            print("All Groq keys failed, falling back to Gemini...")
                            break
        
        # Fallback to Gemini
        if GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel(
                    model_name='gemini-2.0-flash',
                    generation_config={
                        "temperature": 0.5,
                        "top_p": 0.8,
                    }
                )
                
                prompt = f"{workflow_system_prompt}\n\nUser Query: {request.prompt}"
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                # Parse the JSON response
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                response_text = response_text.strip()
                workflow_data = json.loads(response_text)
                
                # Generate tool IDs and structure
                tools = []
                for idx, tool in enumerate(workflow_data.get("tools", [])):
                    tools.append(AITool(
                        id=f"tool_{idx + 1}",
                        type=tool.get("type", ""),
                        name=tool.get("name", ""),
                        next_tools=tool.get("next_tools", [])
                    ))
                
                return WorkflowResponse(
                    agent_id=f"workflow_{int(os.urandom(4).hex(), 16)}",
                    tools=tools,
                    has_sequential_execution=workflow_data.get("has_sequential_execution", False),
                    description=workflow_data.get("description", "Generated workflow"),
                    raw_response=response_text
                )
                
            except Exception as gemini_error:
                raise HTTPException(status_code=500, detail=f"Gemini workflow generation failed: {str(gemini_error)}")
        
        raise HTTPException(status_code=500, detail="No AI providers available")
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(f"ERROR in /create-workflow: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI Agent Builder",
        "blockchain": "OneChain",
        "ai_providers": {
            "primary": "Groq (moonshotai/kimi-k2-instruct-0905)" if GROQ_API_KEYS else "Not configured",
            "fallback": "Google Gemini 2.0 Flash" if GEMINI_API_KEY else "Not configured"
        },
        "backend_url": BACKEND_URL
    }

@app.get("/tools")
async def list_tools():
    """List all available tools"""
    return {
        "tools": list(TOOL_DEFINITIONS.keys()),
        "details": TOOL_DEFINITIONS
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)