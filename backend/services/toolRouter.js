const { chatWithAI } = require('./aiService');

const ONECHAIN_ADDRESS_REGEX = /0x[a-fA-F0-9]{64}/g;
const ONECHAIN_ADDRESS_TEST_REGEX = /0x[a-fA-F0-9]{64}/;

/**
 * Available tools in the system
 */
const AVAILABLE_TOOLS = {
  fetch_price: {
    name: 'fetch_price',
    description: 'Fetches the current price of any cryptocurrency (e.g., Bitcoin, Ethereum, Solana, etc.)',
    parameters: ['token_name'],
    examples: ['What is the price of Bitcoin?', 'How much is Solana worth?', 'Get me ETH price']
  },
  get_balance: {
    name: 'get_balance',
    description: 'Gets the OCT balance of a wallet address on OneChain. Use get_token_balance for USDO or other Move coins. If the user asks for "my balance", the connected wallet address will be used automatically.',
    parameters: ['wallet_address (optional if user is asking for their own balance)'],
    examples: ['What is the balance of 0x123...?', 'Check my wallet balance', 'How much OCT do I have?']
  },
  transfer: {
    name: 'transfer',
    description: 'Transfers OCT or USDO (or any Move coin) from user\'s connected wallet to another wallet. Pass coinType for USDO or custom tokens — omit for native OCT. Accepts .one ONS names as the recipient (e.g. alice.one) — they are resolved automatically. The user\'s wallet address is used automatically.',
    parameters: ['to_address', 'amount', 'coin_type (optional — use USDO_COIN_TYPE for USDO)'],
    examples: ['Send 1 OCT to 0x123...', 'Transfer 50 USDO to Alice', 'Pay Bob 0.5 OCT', 'Send 10 USDO stablecoin to 0xabc...', 'Send 5 OCT to alice.one']
  },
  deploy_token: {
    name: 'deploy_token',
    description: 'Deploys a new fungible token (Move coin) on OneChain',
    parameters: ['name', 'symbol', 'decimals', 'initial_supply'],
    examples: ['Deploy a new token called MyToken', 'Create a Move coin', 'Launch a new cryptocurrency on OneChain']
  },
  deploy_nft_collection: {
    name: 'deploy_nft_collection',
    description: 'Deploys a new NFT collection (Move NFT) on OneChain',
    parameters: ['name', 'symbol', 'base_uri'],
    examples: ['Deploy an NFT collection', 'Create a new NFT project on OneChain', 'Launch an NFT collection']
  },
  mint_nft: {
    name: 'mint_nft',
    description: 'Mints a new NFT in an existing OneChain NFT collection',
    parameters: ['collection_address', 'to_address', 'token_uri'],
    examples: ['Mint an NFT', 'Create a new NFT in my collection', 'Mint a token']
  },
  get_token_info: {
    name: 'get_token_info',
    description: 'Gets information about a Move token/coin on OneChain (name, symbol, decimals, total supply)',
    parameters: ['token_id'],
    examples: ['Get info about token 0x123...', 'What is this token?', 'Token details']
  },
  get_token_balance: {
    name: 'get_token_balance',
    description: 'Gets the balance of a specific Move token for a wallet on OneChain',
    parameters: ['wallet_address', 'token_id'],
    examples: ['Check my token balance', 'Token balance for wallet']
  },
  get_nft_info: {
    name: 'get_nft_info',
    description: 'Gets information about an NFT collection or specific NFT',
    parameters: ['contract_address', 'token_id (optional)'],
    examples: ['Get NFT collection info', 'What is this NFT?', 'NFT details for token #5']
  },
  calculate: {
    name: 'calculate',
    description: 'Performs mathematical calculations or conversions',
    parameters: ['expression', 'values'],
    examples: ['How much can I buy with X ETH?', 'Calculate 100 / 83.92', 'Convert ETH to tokens']
  },
  send_email: {
    name: 'send_email',
    description: 'Sends an email to one or more recipients. Supports plain text, HTML, CC, BCC, reply-to, and attachments.',
    parameters: ['to', 'subject', 'text (optional)', 'html (optional)', 'cc (optional)', 'bcc (optional)', 'replyTo (optional)'],
    examples: ['Send an email to alice@example.com', 'Email Bob the transaction receipt', 'Notify team about the deployment']
  },
  condition_check: {
    name: 'condition_check',
    description: 'Evaluates a boolean condition expression and returns true or false. Useful for conditional branching in workflows (e.g., "is balance > 100?", "is price above threshold?").',
    parameters: ['expression', 'variables (optional)', 'description (optional)'],
    examples: ['Is my balance above 100 OCT?', 'Check if token price is below 1 USD', 'Is the wallet funded?', 'Evaluate balance > threshold']
  },
  yes_no_answer: {
    name: 'yes_no_answer',
    description: 'Records or evaluates a yes/no decision. Returns a boolean result (true for yes, false for no). Useful for governance votes, approval gates, and conditional logic in workflows.',
    parameters: ['question', 'answer (yes/no/true/false)'],
    examples: ['Vote yes on this proposal', 'Answer no to the governance question', 'Approve this transaction? Yes', 'Should we proceed? No']
  },
  send_webhook: {
    name: 'send_webhook',
    description: 'Sends an HTTP POST (or other method) to a webhook URL with a custom payload. Use for integrations, notifications, or workflow triggers to external services.',
    parameters: ['url', 'payload (object)', 'method (optional, default POST)', 'headers (optional)', 'secret (optional HMAC secret)'],
    examples: ['Send a webhook to https://hooks.example.com/notify', 'Trigger an n8n workflow via webhook', 'Post transaction data to my backend', 'Notify Slack via webhook']
  },
  create_dao: {
    name: 'create_dao',
    description: 'Creates a new on-chain DAO (Decentralized Autonomous Organization) with governance voting capabilities on OneChain.',
    parameters: ['name', 'description', 'walletAddress', 'votingPeriodDays (optional, default 7)', 'quorumPercent (optional, default 51)'],
    examples: ['Create a DAO called MyDAO', 'Launch a governance DAO for my project', 'Set up on-chain voting organization']
  },
  create_proposal: {
    name: 'create_proposal',
    description: 'Creates a new governance proposal in an existing DAO. Community members can then vote yes or no on the proposal.',
    parameters: ['daoId', 'title', 'description', 'walletAddress', 'actions (optional)'],
    examples: ['Create a proposal to fund development', 'Submit a governance proposal', 'Propose a parameter change in the DAO']
  },
  vote_on_proposal: {
    name: 'vote_on_proposal',
    description: 'Casts a yes, no, or abstain vote on an active governance proposal in a DAO.',
    parameters: ['proposalId', 'vote (yes/no/abstain)', 'walletAddress'],
    examples: ['Vote yes on proposal prop_123', 'Cast a no vote on the governance proposal', 'Abstain from voting', 'Vote on the funding proposal']
  },
  get_proposal: {
    name: 'get_proposal',
    description: 'Gets the details and current vote tally of a governance proposal.',
    parameters: ['proposalId'],
    examples: ['Get proposal details', 'Check vote tally for proposal', 'What is the status of proposal prop_123?']
  },
  // ─── Wallet & Transaction Tools ─────────────────────────────────────────────
  wallet_history: {
    name: 'wallet_history',
    description: 'Fetches the recent transaction history for a wallet address on OneChain.',
    parameters: ['address'],
    examples: ['Show my transaction history', 'Recent transactions for 0x123...', 'What did this wallet do recently?']
  },
  tx_status: {
    name: 'tx_status',
    description: 'Checks the status and details of a specific transaction by its digest/hash on OneChain.',
    parameters: ['digest'],
    examples: ['Check transaction status', 'Did my tx go through? Digest: 0xabc...', 'Get transaction details for digest 0x...']
  },
  token_metadata: {
    name: 'token_metadata',
    description: 'Gets metadata and details about a specific token or Move object by its object ID on OneChain.',
    parameters: ['objectId'],
    examples: ['Get token info for object 0x...', 'What is this token?', 'Token metadata for 0xabc...']
  },
  // ─── Airdrop / Batch Tools ───────────────────────────────────────────────
  airdrop: {
    name: 'airdrop',
    description: 'Sends OCT or USDO to multiple wallet addresses in a single on-chain transaction (batch transfer / airdrop). Much more efficient than individual transfers.',
    parameters: ['privateKey', 'recipients (array of {address, amount})', 'OR addresses[] + amounts[]', 'coinType (optional — use for USDO airdrops)'],
    examples: ['Airdrop 1 OCT each to these 5 wallets', 'Send tokens to multiple addresses', 'Batch transfer OCT to community members', 'Airdrop 5 USDO to each winner']
  },
  // ─── OneChain Ecosystem Tools ─────────────────────────────────────────────────
  get_swap_quote: {
    name: 'get_swap_quote',
    description: 'Gets a price quote for swapping one token to another on ONEDEX (OneChain native DEX). Does NOT execute a transaction.',
    parameters: ['tokenIn', 'tokenOut', 'amountIn'],
    examples: ['How much USDT will I get for 10 OCT?', 'Get swap quote for OCT to USDT', 'Quote for swapping 5 OCT to USDC']
  },
  swap_tokens: {
    name: 'swap_tokens',
    description: 'Executes a token swap on ONEDEX (OneChain native DEX). Requires private key to sign the transaction.',
    parameters: ['privateKey', 'tokenIn', 'tokenOut', 'amountIn', 'minAmountOut (optional)', 'poolId (optional)'],
    examples: ['Swap 10 OCT for USDT on ONEDEX', 'Exchange my OCT for USDC', 'Trade 5 OCT on the DEX']
  },
  get_dex_pools: {
    name: 'get_dex_pools',
    description: 'Lists all available liquidity pools on ONEDEX.',
    parameters: [],
    examples: ['Show me ONEDEX pools', 'What pools are available on ONEDEX?', 'List liquidity pools on OneChain DEX']
  },
  get_dex_price: {
    name: 'get_dex_price',
    description: 'Gets the current on-chain price of a token on ONEDEX.',
    parameters: ['token'],
    examples: ['What is the ONEDEX price of OCT?', 'Get on-chain price for this token', 'ONEDEX price of USDT']
  },
  cross_border_transfer: {
    name: 'cross_border_transfer',
    description: 'Sends a cross-border or fiat-to-crypto transfer using ONETRANSFER on OneChain.',
    parameters: ['privateKey', 'recipient', 'amount', 'currency', 'targetCurrency (optional)'],
    examples: ['Send $100 to 0x123... via ONETRANSFER', 'Cross-border transfer 50 USDT to recipient', 'International payment using ONETRANSFER']
  },
  check_oneid: {
    name: 'check_oneid',
    description: 'Checks whether a wallet address has a verified ONEID (OneChain identity/KYC credential).',
    parameters: ['address'],
    examples: ['Does 0x123... have a ONEID?', 'Check if my wallet is ONEID verified', 'Is this address KYC verified on OneChain?']
  },
  check_ons: {
    name: 'check_ons',
    description: 'Resolves a OneChain Name Service (.one) name to a wallet address, or looks up the .one name for a given address. ONS is the on-chain human-readable name system for OneChain (like ENS for Ethereum).',
    parameters: ['name (e.g. alice.one) OR address (for reverse lookup)'],
    examples: ['What address does alice.one resolve to?', 'Does 0x123... have an ONS name?', 'Look up the .one name for my wallet', 'Resolve bob.one to an address']
  }
};

/**
 * Use AI to intelligently determine which tools to call and in what order
 * @param {string} userMessage - The user's natural language request
 * @param {Array} conversationHistory - Recent conversation messages for context
 * @returns {Promise<Object>} Tool execution plan with tools, order, and parameters
 */
async function intelligentToolRouting(userMessage, conversationHistory = []) {
  // Quick regex-based off-topic detection
  const offTopicPatterns = [
    /\b(prime minister|president|politician|government|election|politics)\b/i,
    /\b(weather|temperature|forecast|rain|sunny)\b/i,
    /\b(movie|film|actor|actress|celebrity|entertainment)\b/i,
    /\b(recipe|cooking|food|restaurant|cuisine)\b(?!.*token|contract)/i,
    /\b(sport|football|basketball|soccer|cricket|tennis)\b/i,
    /\b(health|medical|doctor|disease|medicine)\b/i,
    /\bwho is\b.*\b(minister|president|ceo|founder)\b(?!.*(vitalik|satoshi|blockchain|crypto))/i
  ];
  
  // Check if message matches off-topic patterns
  const isOffTopic = offTopicPatterns.some(pattern => pattern.test(userMessage));
  
  if (isOffTopic) {
    return {
      analysis: 'User query is not related to blockchain operations',
      is_off_topic: true,
      requires_tools: false,
      execution_plan: { type: 'none', steps: [] },
      missing_info: [],
      complexity: 'simple'
    };
  }
  
  const toolsList = Object.values(AVAILABLE_TOOLS)
    .map(tool => `- ${tool.name}: ${tool.description}\n  Parameters: ${tool.parameters.join(', ')}\n  Examples: ${tool.examples.join('; ')}`)
    .join('\n\n');

  // Build rich conversation context with extracted entities
  let conversationContext = '';
  if (conversationHistory.length > 0) {
    const recentMessages = conversationHistory.slice(-10);
    
    // Extract key entities from conversation history 
    const extractedEntities = [];
    for (const msg of recentMessages) {
      const content = msg.content || '';
      // Extract wallet addresses
      const addresses = content.match(ONECHAIN_ADDRESS_REGEX);
      if (addresses) extractedEntities.push(`Wallet addresses mentioned: ${addresses.join(', ')}`);
      // Extract ETH balances
      const balanceMatch = content.match(/(\d+\.?\d*)\s*ETH/i);
      if (balanceMatch) extractedEntities.push(`ETH balance found: ${balanceMatch[1]} ETH`);
      // Extract prices
      const priceMatches = content.match(/([A-Z]{2,10}):\s*([\d,.]+)\s*USD/gi);
      if (priceMatches) extractedEntities.push(`Prices found: ${priceMatches.join(', ')}`);
      // Extract tool results
      if (content.includes('Balance for')) extractedEntities.push(`Previous result: ${content}`);
      if (content.includes('Current prices:')) extractedEntities.push(`Previous result: ${content}`);
    }
    
    const entitySummary = extractedEntities.length > 0
      ? `\n\nKEY DATA FROM CONVERSATION (reuse this, do NOT ask user again):\n${[...new Set(extractedEntities)].join('\n')}`
      : '';
    
    conversationContext = `\n\nRecent conversation (last ${recentMessages.length} messages):\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}${entitySummary}`;
  }

  const prompt = `You are an intelligent tool routing system for a blockchain assistant. Your PRIMARY job is to create COMPLETE execution plans that resolve the user's request in a single pass, WITHOUT asking the user for information that your tools can fetch.

## Your Responsibilities:
1. Determine if the request is blockchain/crypto-related
2. Create a COMPLETE multi-step tool execution plan
3. Extract context from conversation history (addresses, balances, previous results)
4. Auto-resolve dependencies by chaining tools — NEVER ask the user for data a tool can provide
5. Only put truly user-dependent info in missing_info (private keys, destination addresses NOT in context)

## CRITICAL RULE — RESOLVE, DON'T ASK:
If the user's question requires data that a tool can fetch, ADD THAT TOOL TO THE PLAN.
- Need a price? → Add fetch_price step. Do NOT put "current ETH price" in missing_info.
- Need a balance? → Add get_balance step. Do NOT put "wallet balance" in missing_info.
- Need token info? → Add get_token_info step.
- "missing_info" is ONLY for things NO tool can resolve: private keys, unknown wallet addresses, ambiguous token names.

## CRITICAL RULE — USE CONVERSATION CONTEXT:
The conversation history contains previously fetched data. EXTRACT and REUSE it:
- If a wallet address was mentioned earlier, use it (don't ask again)
- If a balance was fetched, reference it in calculations
- If the user says "this balance" or "my balance", look for the address/balance in recent messages
- Pronouns like "it", "this", "that" refer to the most recent relevant entity

IMPORTANT: Off-topic detection — If the user's request is NOT related to blockchain operations or email notifications (e.g., general knowledge, weather, entertainment, politics), flag it as off-topic.

Available Tools:
${toolsList}

User Request: "${userMessage}"${conversationContext}

Analyze the request and respond with a JSON object following this structure:

{
  "analysis": "Brief explanation of what the user wants to accomplish",
  "is_off_topic": true/false,
  "requires_tools": true/false,
  "extracted_context": {
    "wallet_address": "address from conversation or null",
    "eth_balance": "balance from conversation or null",
    "referenced_tokens": ["tokens mentioned or implied"]
  },
  "execution_plan": {
    "type": "sequential" or "parallel",
    "steps": [
      {
        "tool": "tool_name",
        "reason": "why this tool is needed",
        "parameters": {
          "param_name": "extracted_value or null if needs to be provided by user"
        },
        "depends_on": ["tool_name"] or []
      }
    ]
  },
  "missing_info": ["ONLY info that NO tool can resolve AND is not in conversation context"],
  "complexity": "simple" or "moderate" or "complex"
}

## MANDATORY MULTI-STEP PATTERNS (follow these EXACTLY):

### "How many [TOKEN] can I buy with [X] ETH / my balance / this balance":
Steps (sequential):
1. get_balance (if balance not already known from context) with wallet address from context
2. fetch_price for "ethereum" (ALWAYS needed to convert ETH → USD)
3. fetch_price for the target token
4. calculate: (eth_balance * eth_price) / token_price
missing_info: [] (EMPTY — all data comes from tools)

### "What is my balance worth in USD":
1. get_balance (if not known)
2. fetch_price for "ethereum"
3. calculate: eth_balance * eth_price

### "Convert X [TOKEN_A] to [TOKEN_B]" / comparison:
1. fetch_price for token_a
2. fetch_price for token_b
3. calculate: (amount * price_a) / price_b

### "Send $X worth of ETH to [address]":
1. fetch_price for "ethereum"
2. calculate: usd_amount / eth_price
3. transfer with calculated amount

### Price query: Direct fetch_price call
### Balance query: Direct get_balance call

## KEY RULES:
1. Multi-part requests → create steps for ALL parts
2. Use "sequential" when one tool's output feeds another
3. Use "parallel" when tools are independent
4. Extract parameters from BOTH the current message AND conversation history
5. For ANY calculation involving prices/balances → add fetch_price + calculate steps
6. OneChain addresses are 66 chars (0x + 64 hex) — Sui/Move style
7. Network: OneChain Testnet (RPC: https://rpc-testnet.onelabs.cc:443)
8. When the user says "calculate" or "now calculate" after previous data was fetched, create a calculate step using the data from conversation context
9. If the user says generic words like "this balance" or "my balance", look for the wallet address and balance in recent conversation messages
10. NEVER put prices, balances, or token info in missing_info — those are fetchable by tools

Respond ONLY with valid JSON, no other text.`;

  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a JSON-only tool routing expert. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await chatWithAI(messages, 'moonshotai/kimi-k2-instruct-0905', {
      temperature: 0.2, // Low temperature for more consistent routing
      maxTokens: 2000
    });

    // Extract JSON from response - try multiple patterns
    let jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) {
      jsonMatch = response.match(/\{[\s\S]*\}/);
    }
    
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const routingPlan = JSON.parse(jsonStr.trim());

    // POST-PROCESS: Enforce get_balance when a calculate step references balance variables
    // This prevents the AI from skipping get_balance and leaving eth_balance unresolved.
    const steps = routingPlan.execution_plan?.steps || [];
    const calcStep = steps.find(s => s.tool === 'calculate');
    if (calcStep) {
      const calcBlob = JSON.stringify(calcStep.parameters || '').toLowerCase();
      const needsBalance = /eth_balance|wallet_balance|my_balance\b/.test(calcBlob);
      const hasGetBalance = steps.some(s => s.tool === 'get_balance');
      if (needsBalance && !hasGetBalance) {
        // Try to extract wallet address from conversation history
        const historyStr = (conversationHistory || []).map(m => m.content || '').join(' ');
        const addrMatch = historyStr.match(ONECHAIN_ADDRESS_TEST_REGEX);
        const walletAddress = addrMatch ? addrMatch[0] : null;
        const balanceStep = {
          tool: 'get_balance',
          reason: 'Wallet balance is required for this calculation',
          parameters: { address: walletAddress },
          depends_on: []
        };
        steps.unshift(balanceStep);
        routingPlan.execution_plan.steps = steps;
        routingPlan.execution_plan.type = 'sequential';
        console.log('[Tool Router] Auto-injected get_balance step — eth_balance needed for calculate');
      }
    }

    console.log('[Tool Router] AI Routing Plan:', JSON.stringify(routingPlan, null, 2));
    
    return routingPlan;
  } catch (error) {
    console.error('[Tool Router] Error:', error.message);
    
    // Fallback to simple routing
    return {
      analysis: 'Fallback routing due to AI error',
      is_off_topic: false,
      requires_tools: true,
      execution_plan: {
        type: 'parallel',
        steps: detectToolsWithRegex(userMessage)
      },
      missing_info: [],
      complexity: 'simple'
    };
  }
}

/**
 * Fallback: Simple regex-based tool detection (old method)
 * @param {string} message - User message
 * @returns {Array} List of tool steps
 */
function detectToolsWithRegex(message) {
  const tools = [];
  
  if (/\b(price|fetch.*price|get.*price|check.*price|what.*price|how.*much|cost)\b/i.test(message)) {
    tools.push({ 
      tool: 'fetch_price', 
      reason: 'User mentioned price',
      parameters: {},
      depends_on: [] 
    });
  }
  
  if (/\b(balance|wallet|check.*balance|get.*balance|how.*much.*have|account)\b/i.test(message)) {
    tools.push({ 
      tool: 'get_balance', 
      reason: 'User mentioned balance or wallet',
      parameters: {},
      depends_on: [] 
    });
  }
  
  if (/\b(transfer|send|pay|move)\b/i.test(message)) {
    tools.push({ 
      tool: 'transfer', 
      reason: 'User wants to transfer',
      parameters: {},
      depends_on: [] 
    });
  }
  
  if (/\b(deploy.*erc20|deploy.*token|create.*token|new.*token|move.*coin|fungible.*token)\b/i.test(message)) {
    tools.push({ 
      tool: 'deploy_token', 
      reason: 'User wants to deploy a Move fungible token',
      parameters: {},
      depends_on: [] 
    });
  }
  
  if (/\b(deploy.*erc721|deploy.*nft|create.*nft|new.*nft|nft.*collection|move.*nft)\b/i.test(message)) {
    tools.push({ 
      tool: 'deploy_nft_collection', 
      reason: 'User wants to deploy a Move NFT collection',
      parameters: {},
      depends_on: [] 
    });
  }

  if (/\b(email|send.*email|mail|notify|notification)\b/i.test(message)) {
    tools.push({ 
      tool: 'send_email', 
      reason: 'User wants to send an email',
      parameters: {},
      depends_on: [] 
    });
  }
  
  return tools;
}

/**
 * Convert routing plan to format expected by agent backend
 * @param {Object} routingPlan - The routing plan from intelligentToolRouting
 * @returns {Array} Tools array for agent backend
 */
function convertToAgentFormat(routingPlan) {
  if (!routingPlan.requires_tools || !routingPlan.execution_plan) {
    return [];
  }

  const { steps, type } = routingPlan.execution_plan;
  
  return steps.map((step, index) => {
    const nextTool = type === 'sequential' && index < steps.length - 1 
      ? steps[index + 1].tool 
      : null;

    return {
      tool: step.tool,
      next_tool: nextTool,
      parameters: step.parameters || {},
      reason: step.reason
    };
  });
}

module.exports = {
  intelligentToolRouting,
  convertToAgentFormat,
  AVAILABLE_TOOLS
};
