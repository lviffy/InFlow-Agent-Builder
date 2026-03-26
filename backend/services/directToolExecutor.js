const axios = require('axios');
const { PORT } = require('../config/constants');

const BASE_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const REDACTED_PRIVATE_KEY = '[REDACTED_PRIVATE_KEY]';

const TOOL_ENDPOINTS = {
  fetch_price: { method: 'POST', path: '/price/token' },
  get_balance: { method: 'GET', path: '/transfer/balance/{address}' },
  transfer: { method: 'POST', path: '/transfer' },
  deploy_token: { method: 'POST', path: '/token/deploy' },
  deploy_nft_collection: { method: 'POST', path: '/nft/deploy-collection' },
  mint_nft: { method: 'POST', path: '/nft/mint' },
  get_token_info: { method: 'GET', path: '/token/info/{tokenId}' },
  get_token_balance: { method: 'GET', path: '/token/balance/{tokenId}/{ownerAddress}' },
  get_nft_info: { method: 'GET', path: '/nft/info/{collectionAddress}/{tokenId}' },
  send_email: { method: 'POST', path: '/email/send' },
  calculate: { method: 'LOCAL' },
  condition_check: { method: 'LOCAL' },
  yes_no_answer: { method: 'LOCAL' },
  airdrop: { method: 'POST', path: '/transfer/airdrop' },
  wrap_oct: { method: 'LOCAL' },
  deposit_yield: { method: 'LOCAL' },
  send_webhook: { method: 'POST', path: '/webhook/send' },
  create_dao: { method: 'POST', path: '/governance/create-dao' },
  create_proposal: { method: 'POST', path: '/governance/proposal' },
  vote_on_proposal: { method: 'POST', path: '/governance/vote' },
  get_proposal: { method: 'GET', path: '/governance/proposal/{proposalId}' },
  // Wallet & transaction tools
  wallet_history: { method: 'GET', path: '/wallet/history/{address}' },
  tx_status: { method: 'GET', path: '/wallet/tx/{digest}' },
  token_metadata: { method: 'GET', path: '/token/info/{objectId}' },
  // Allowance tools
  approve_token: { method: 'POST', path: '/allowance/approve' },
  revoke_approval: { method: 'POST', path: '/allowance/revoke' },
  // swap (legacy alias → ONEDEX swap)
  swap: { method: 'POST', path: '/dex/swap' },
  // ONEDEX / OneChain ecosystem tools
  get_swap_quote: { method: 'POST', path: '/dex/quote' },
  swap_tokens: { method: 'POST', path: '/dex/swap' },
  get_dex_pools: { method: 'GET', path: '/dex/pools' },
  get_dex_price: { method: 'GET', path: '/dex/price/{token}' },
  cross_border_transfer: { method: 'POST', path: '/dex/cross-transfer' },
  check_oneid: { method: 'GET', path: '/dex/oneid/{address}' }
};

function mapToolParams(tool, params = {}, fallbackMessage, defaults = {}) {
  const missing = [];
  let mapped = { ...params };
  const defaultWalletAddress = defaults.walletAddress || defaults.wallet_address;
  const defaultPrivateKey = defaults.privateKey || defaults.private_key;
  const resolvePrivateKey = () => {
    const explicitPrivateKey = params.privateKey || params.private_key;
    if (explicitPrivateKey && explicitPrivateKey !== REDACTED_PRIVATE_KEY) {
      return explicitPrivateKey;
    }
    return defaultPrivateKey;
  };

  switch (tool) {
    case 'fetch_price': {
      const query = params.query || params.token_name || params.symbol || fallbackMessage;
      const vsCurrency = params.vsCurrency || params.vs_currency || params.currency;
      mapped = { query };
      if (vsCurrency) mapped.vsCurrency = vsCurrency;
      if (!query) missing.push('query');
      break;
    }
    case 'get_balance': {
      const address = params.address || params.wallet_address || defaultWalletAddress;
      mapped = { address };
      if (!address) missing.push('address');
      break;
    }
    case 'transfer': {
      const privateKey = resolvePrivateKey();
      const toAddress = params.toAddress || params.to_address;
      const amount = params.amount;
      const tokenId = params.tokenId || params.token_id || params.tokenId;
      mapped = { privateKey, toAddress, amount };
      if (tokenId !== undefined) mapped.tokenId = tokenId;
      if (!privateKey) missing.push('privateKey');
      if (!toAddress) missing.push('toAddress');
      if (!amount) missing.push('amount');
      break;
    }
    case 'deploy_token': {
      const privateKey = resolvePrivateKey();
      const name = params.name;
      const symbol = params.symbol;
      const initialSupply = params.initialSupply || params.initial_supply;
      const decimals = params.decimals;
      mapped = { privateKey, name, symbol, initialSupply };
      if (decimals !== undefined) mapped.decimals = decimals;
      if (!privateKey) missing.push('privateKey');
      if (!name) missing.push('name');
      if (!symbol) missing.push('symbol');
      if (!initialSupply) missing.push('initialSupply');
      break;
    }
    case 'deploy_nft_collection': {
      const privateKey = resolvePrivateKey();
      const name = params.name;
      const symbol = params.symbol;
      const baseURI = params.baseURI || params.base_uri;
      mapped = { privateKey, name, symbol, baseURI };
      if (!privateKey) missing.push('privateKey');
      if (!name) missing.push('name');
      if (!symbol) missing.push('symbol');
      if (!baseURI) missing.push('baseURI');
      break;
    }
    case 'mint_nft': {
      const privateKey = resolvePrivateKey();
      const collectionAddress = params.collectionAddress || params.contract_address;
      const toAddress = params.toAddress || params.to_address;
      mapped = { privateKey, collectionAddress, toAddress };
      if (!privateKey) missing.push('privateKey');
      if (!collectionAddress) missing.push('collectionAddress');
      if (!toAddress) missing.push('toAddress');
      break;
    }
    case 'get_token_info': {
      const tokenId = params.tokenId || params.token_address;
      mapped = { tokenId };
      if (!tokenId) missing.push('tokenId');
      break;
    }
    case 'get_token_balance': {
      const tokenId = params.tokenId || params.token_address;
      const ownerAddress = params.ownerAddress || params.wallet_address;
      mapped = { tokenId, ownerAddress };
      if (!tokenId) missing.push('tokenId');
      if (!ownerAddress) missing.push('ownerAddress');
      break;
    }
    case 'get_nft_info': {
      const collectionAddress = params.collectionAddress || params.contract_address;
      const tokenId = params.tokenId || params.token_id;
      mapped = { collectionAddress, tokenId };
      if (!collectionAddress) missing.push('collectionAddress');
      if (!tokenId) missing.push('tokenId');
      break;
    }
    case 'send_email': {
      const to = params.to;
      const subject = params.subject;
      const text = params.text;
      const html = params.html;
      const cc = params.cc;
      const bcc = params.bcc;
      const replyTo = params.replyTo;
      mapped = { to, subject, text, html, cc, bcc, replyTo };
      if (!to) missing.push('to');
      if (!subject) missing.push('subject');
      if (!text && !html) missing.push('text');
      break;
    }
    case 'calculate': {
      const expression = params.expression;
      const variables = params.variables || params.values;
      const description = params.description;
      mapped = { expression, variables, description };
      if (!expression) missing.push('expression');
      break;
    }
    case 'condition_check': {
      const expression = params.expression || params.condition;
      const variables = params.variables || params.values || {};
      const description = params.description;
      mapped = { expression, variables, description };
      if (!expression) missing.push('expression');
      break;
    }
    case 'yes_no_answer': {
      const question = params.question;
      const answer = params.answer;
      mapped = { question, answer };
      if (!question) missing.push('question');
      if (!answer) missing.push('answer');
      break;
    }
    case 'airdrop': {
      const privateKey = resolvePrivateKey();
      const recipients = params.recipients || [];
      // Also handle flat arrays
      if (!recipients.length && params.addresses && params.amounts) {
        mapped = { privateKey, addresses: params.addresses, amounts: params.amounts };
      } else {
        mapped = { privateKey, recipients };
      }
      if (!privateKey) missing.push('privateKey');
      if (!recipients.length && !(params.addresses && params.amounts)) missing.push('recipients');
      break;
    }
    case 'wrap_oct': {
      const amount = params.amount;
      mapped = { amount };
      if (!amount) missing.push('amount');
      break;
    }
    case 'deposit_yield': {
      const amount = params.amount;
      const protocol = params.protocol || params.pool;
      mapped = { amount, protocol };
      if (!amount) missing.push('amount');
      break;
    }
    case 'send_webhook': {
      const url = params.url;
      const payload = params.payload || params.data || {};
      const method = params.method || 'POST';
      const headers = params.headers || {};
      const secret = params.secret;
      mapped = { url, payload, method, headers };
      if (secret) mapped.secret = secret;
      if (!url) missing.push('url');
      break;
    }
    case 'create_dao': {
      const name = params.name;
      const description = params.description;
      const walletAddress = params.walletAddress || params.wallet_address;
      const votingPeriodDays = params.votingPeriodDays || params.voting_period_days;
      const quorumPercent = params.quorumPercent || params.quorum_percent;
      mapped = { name, description, walletAddress };
      if (votingPeriodDays) mapped.votingPeriodDays = votingPeriodDays;
      if (quorumPercent) mapped.quorumPercent = quorumPercent;
      if (!name) missing.push('name');
      if (!walletAddress) missing.push('walletAddress');
      break;
    }
    case 'create_proposal': {
      const daoId = params.daoId || params.dao_id;
      const title = params.title;
      const description = params.description;
      const walletAddress = params.walletAddress || params.wallet_address;
      const actions = params.actions;
      mapped = { daoId, title, description, walletAddress };
      if (actions) mapped.actions = actions;
      if (!daoId) missing.push('daoId');
      if (!title) missing.push('title');
      if (!walletAddress) missing.push('walletAddress');
      break;
    }
    case 'vote_on_proposal': {
      const proposalId = params.proposalId || params.proposal_id;
      const vote = params.vote || params.answer;
      const walletAddress = params.walletAddress || params.wallet_address;
      mapped = { proposalId, vote, walletAddress };
      if (!proposalId) missing.push('proposalId');
      if (!vote) missing.push('vote');
      if (!walletAddress) missing.push('walletAddress');
      break;
    }
    case 'get_proposal': {
      const proposalId = params.proposalId || params.proposal_id;
      mapped = { proposalId };
      if (!proposalId) missing.push('proposalId');
      break;
    }
    case 'wallet_history': {
      const address = params.address || params.wallet_address || defaultWalletAddress;
      mapped = { address };
      if (!address) missing.push('address');
      break;
    }
    case 'tx_status': {
      const digest = params.digest || params.tx_hash || params.txHash || params.transaction_hash;
      mapped = { digest };
      if (!digest) missing.push('digest');
      break;
    }
    case 'token_metadata': {
      const objectId = params.objectId || params.object_id || params.tokenId || params.token_id || params.token_address;
      mapped = { objectId };
      if (!objectId) missing.push('objectId');
      break;
    }
    case 'approve_token': {
      const privateKey = resolvePrivateKey();
      const tokenAddress = params.tokenAddress || params.token_address;
      const spenderAddress = params.spenderAddress || params.spender_address || params.spender;
      const amount = params.amount;
      mapped = { privateKey, tokenAddress, spenderAddress, amount };
      if (!privateKey) missing.push('privateKey');
      if (!tokenAddress) missing.push('tokenAddress');
      if (!spenderAddress) missing.push('spenderAddress');
      if (!amount) missing.push('amount');
      break;
    }
    case 'revoke_approval': {
      const privateKey = resolvePrivateKey();
      const tokenAddress = params.tokenAddress || params.token_address;
      const spenderAddress = params.spenderAddress || params.spender_address || params.spender;
      mapped = { privateKey, tokenAddress, spenderAddress };
      if (!privateKey) missing.push('privateKey');
      if (!tokenAddress) missing.push('tokenAddress');
      if (!spenderAddress) missing.push('spenderAddress');
      break;
    }
    case 'swap': {
      // Legacy alias — same shape as swap_tokens
      const privateKey = resolvePrivateKey();
      const tokenIn = params.tokenIn || params.token_in || params.from_token;
      const tokenOut = params.tokenOut || params.token_out || params.to_token;
      const amountIn = params.amountIn || params.amount_in || params.amount;
      mapped = { privateKey, tokenIn, tokenOut, amountIn };
      if (!privateKey) missing.push('privateKey');
      if (!tokenIn) missing.push('tokenIn');
      if (!tokenOut) missing.push('tokenOut');
      if (!amountIn) missing.push('amountIn');
      break;
    }
    case 'get_swap_quote': {
      const tokenIn = params.tokenIn || params.token_in;
      const tokenOut = params.tokenOut || params.token_out;
      const amountIn = params.amountIn || params.amount_in || params.amount;
      mapped = { tokenIn, tokenOut, amountIn };
      if (!tokenIn) missing.push('tokenIn');
      if (!tokenOut) missing.push('tokenOut');
      if (!amountIn) missing.push('amountIn');
      break;
    }
    case 'swap_tokens': {
      const privateKey = resolvePrivateKey();
      const tokenIn = params.tokenIn || params.token_in;
      const tokenOut = params.tokenOut || params.token_out;
      const amountIn = params.amountIn || params.amount_in || params.amount;
      const minAmountOut = params.minAmountOut || params.min_amount_out;
      const poolId = params.poolId || params.pool_id;
      mapped = { privateKey, tokenIn, tokenOut, amountIn };
      if (minAmountOut) mapped.minAmountOut = minAmountOut;
      if (poolId) mapped.poolId = poolId;
      if (!privateKey) missing.push('privateKey');
      if (!tokenIn) missing.push('tokenIn');
      if (!tokenOut) missing.push('tokenOut');
      if (!amountIn) missing.push('amountIn');
      break;
    }
    case 'get_dex_pools': {
      mapped = {};
      break;
    }
    case 'get_dex_price': {
      const token = params.token || params.token_address || params.symbol;
      mapped = { token };
      if (!token) missing.push('token');
      break;
    }
    case 'cross_border_transfer': {
      const privateKey = resolvePrivateKey();
      const recipient = params.recipient || params.to_address || params.toAddress;
      const amount = params.amount;
      const currency = params.currency || params.token || 'OCT';
      const targetCurrency = params.targetCurrency || params.target_currency;
      mapped = { privateKey, recipient, amount, currency };
      if (targetCurrency) mapped.targetCurrency = targetCurrency;
      if (!privateKey) missing.push('privateKey');
      if (!recipient) missing.push('recipient');
      if (!amount) missing.push('amount');
      break;
    }
    case 'check_oneid': {
      const address = params.address || params.wallet_address || defaultWalletAddress;
      mapped = { address };
      if (!address) missing.push('address');
      break;
    }
    default:
      break;
  }

  return { mapped, missing };
}

function replacePathParams(path, params) {
  let result = path;
  const replacements = {
    '{address}': 'address',
    '{tokenId}': 'tokenId',
    '{ownerAddress}': 'ownerAddress',
    '{collectionAddress}': 'collectionAddress',
    '{proposalId}': 'proposalId',
    '{token}': 'token',
    '{digest}': 'digest',
    '{objectId}': 'objectId'
  };

  Object.entries(replacements).forEach(([placeholder, key]) => {
    if (result.includes(placeholder) && params[key]) {
      result = result.replace(placeholder, encodeURIComponent(params[key]));
    }
  });

  return result;
}

function safeCalculate(params) {
  try {
    const expression = params.expression || '';
    let variables = params.variables || {};

    // Ensure variables is an object (AI may send string)
    if (typeof variables === 'string') {
      try { variables = JSON.parse(variables); } catch { variables = {}; }
    }
    if (typeof variables !== 'object' || variables === null) variables = {};

    // Normalize whitespace in expression
    let resolved = expression.replace(/\s+/g, ' ').trim();
    
    // Build alias map so common variable name variants all resolve
    const aliasMap = {};
    for (const [varName, val] of Object.entries(variables)) {
      const vn = varName.toLowerCase();

      // Generic normalization for current_* and *_usd style naming variants.
      if (vn.startsWith('current_')) {
        const stripped = vn.replace(/^current_/, '');
        if (stripped && !(stripped in variables)) aliasMap[stripped] = val;
      } else {
        const currentAlias = `current_${vn}`;
        if (!(currentAlias in variables)) aliasMap[currentAlias] = val;
      }

      if (vn.endsWith('_usd')) {
        const noUsd = vn.replace(/_usd$/, '');
        if (noUsd && !(noUsd in variables)) aliasMap[noUsd] = val;
      }

      if (vn.includes('price')) {
        if (vn.includes('eth') || vn.includes('ethereum')) {
          for (const alias of ['eth_price', 'ethereum_price', 'eth_price_usd', 'price_eth', 'current_eth_price', 'current_ethereum_price']) aliasMap[alias] = val;
        } else if (vn.includes('btc') || vn.includes('bitcoin')) {
          for (const alias of ['btc_price', 'bitcoin_price', 'btc_price_usd', 'price_btc', 'current_btc_price', 'current_bitcoin_price']) aliasMap[alias] = val;
        } else if (vn.includes('sol') || vn.includes('solana')) {
          for (const alias of ['sol_price', 'solana_price', 'sol_price_usd', 'price_sol', 'current_sol_price', 'current_solana_price']) aliasMap[alias] = val;
        } else if (vn.includes('arb') || vn.includes('arbitrum')) {
          for (const alias of ['arb_price', 'arbitrum_price', 'arb_price_usd', 'token_price', 'token_price_usd', 'price_arb', 'current_arb_price', 'current_arbitrum_price']) aliasMap[alias] = val;
        } else if (vn.includes('token')) {
          for (const alias of ['token_price', 'token_price_usd', 'arb_price', 'sol_price', 'btc_price', 'target_price', 'current_token_price']) {
            if (!(alias in variables)) aliasMap[alias] = val;
          }
        }
      }
      if (vn.includes('balance')) {
        for (const alias of ['eth_balance', 'balance', 'wallet_balance', 'my_balance']) aliasMap[alias] = val;
      }
    }
    
    // Merge: explicit variables override aliases
    const mergedVars = { ...aliasMap, ...variables };

    // --- FALLBACK: extract balance from description when not in variables ---
    // The AI often mentions the balance in the description/context but forgets to include it in variables.
    if (!('eth_balance' in mergedVars) && !('balance' in mergedVars)) {
      const contextText = params.description || '';
      const balancePatterns = [
        /(\d+\.?\d*)\s*ETH/i,            // "0.1 ETH"
        /balance[:\s]+([\d.]+)/i,          // "balance: 0.1"
        /([\d.]+)\s*ether/i,               // "0.1 ether"
        /with\s+([\d.]+)\s*(?:ETH|eth)/i, // "with 0.1 ETH"
      ];
      for (const pattern of balancePatterns) {
        const m = contextText.match(pattern);
        if (m) {
          const extracted = parseFloat(m[1]);
          if (!isNaN(extracted)) {
            mergedVars.eth_balance = extracted;
            mergedVars.balance = extracted;
            mergedVars.wallet_balance = extracted;
            mergedVars.my_balance = extracted;
            console.log(`[Calculate] Auto-extracted balance ${extracted} ETH from description`);
            break;
          }
        }
      }
    }
    
    // Sort variable names by length (longest first) to avoid partial matches
    const sortedVars = Object.entries(mergedVars).sort((a, b) => b[0].length - a[0].length);
    
    sortedVars.forEach(([name, value]) => {
      // Convert value to number, stripping commas
      const numValue = parseFloat(String(value).replace(/,/g, ''));
      if (isNaN(numValue)) {
        throw new Error(`Variable '${name}' has non-numeric value: ${value}`);
      }
      const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      resolved = resolved.replace(pattern, String(numValue));
    });

    // Normalize whitespace again after substitution  
    resolved = resolved.replace(/\s+/g, ' ').trim();

    const allowedChars = /^[0-9+\-*/().eE\s]+$/;
    if (!allowedChars.test(resolved)) {
      const badChars = resolved.split('').filter(c => !/[0-9+\-*/().eE\s]/.test(c));
      return {
        success: false,
        tool: 'calculate',
        error: `Invalid characters in expression: [${badChars.join(', ')}]. Resolved: '${resolved}'. Only numbers and basic operators are allowed.`
      };
    }

    const result = Function(`"use strict"; return (${resolved});`)();
    return {
      success: true,
      tool: 'calculate',
      result: {
        original_expression: expression,
        variables: variables,
        resolved_expression: resolved,
        result: result,
        description: params.description || 'Calculation'
      }
    };
  } catch (error) {
    return {
      success: false,
      tool: 'calculate',
      error: `Calculation error: ${error.message}`
    };
  }
}

function safeConditionCheck(params) {
  try {
    const expression = params.expression || '';
    let variables = params.variables || {};

    if (typeof variables === 'string') {
      try { variables = JSON.parse(variables); } catch { variables = {}; }
    }
    if (typeof variables !== 'object' || variables === null) variables = {};

    let resolved = expression.replace(/\s+/g, ' ').trim();

    const sortedVars = Object.entries(variables).sort((a, b) => b[0].length - a[0].length);
    sortedVars.forEach(([name, value]) => {
      const numValue = parseFloat(String(value).replace(/,/g, ''));
      if (!isNaN(numValue)) {
        const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        resolved = resolved.replace(pattern, String(numValue));
      }
    });

    const allowedChars = /^[0-9+\-*/().eE\s<>=!&|]+$/;
    if (!allowedChars.test(resolved)) {
      return {
        success: false,
        tool: 'condition_check',
        error: `Invalid characters in condition expression: '${resolved}'`
      };
    }

    const result = Function(`"use strict"; return !!(${resolved});`)();
    return {
      success: true,
      tool: 'condition_check',
      result: {
        expression,
        resolved_expression: resolved,
        result: result,
        value: result,
        description: params.description || 'Condition evaluation'
      }
    };
  } catch (error) {
    return {
      success: false,
      tool: 'condition_check',
      error: `Condition check error: ${error.message}`
    };
  }
}

function safeYesNoAnswer(params) {
  const question = params.question || 'Question';
  const raw = String(params.answer || '').toLowerCase().trim();
  const isYes = raw === 'yes' || raw === 'true' || raw === 'y' || raw === '1';
  const isNo = raw === 'no' || raw === 'false' || raw === 'n' || raw === '0';

  if (!isYes && !isNo) {
    return {
      success: false,
      tool: 'yes_no_answer',
      error: `Invalid answer '${params.answer}'. Must be yes/no/true/false.`
    };
  }

  return {
    success: true,
    tool: 'yes_no_answer',
    result: {
      question,
      answer: isYes ? 'yes' : 'no',
      value: isYes,
      bool: isYes
    }
  };
}

async function executeToolStep(step, fallbackMessage, defaults = {}) {
  const { tool, parameters } = step;
  const mapping = mapToolParams(tool, parameters, fallbackMessage, defaults);

  if (mapping.missing.length > 0) {
    return {
      tool_call: { tool, parameters: mapping.mapped },
      result: {
        success: false,
        tool,
        error: `Missing required parameters: ${mapping.missing.join(', ')}`
      }
    };
  }

  const config = TOOL_ENDPOINTS[tool];
  if (!config) {
    return {
      tool_call: { tool, parameters: mapping.mapped },
      result: { success: false, tool, error: 'Tool not supported for direct execution' }
    };
  }

  if (config.method === 'LOCAL' && tool === 'calculate') {
    return {
      tool_call: { tool, parameters: mapping.mapped },
      result: safeCalculate(mapping.mapped)
    };
  }

  if (config.method === 'LOCAL' && tool === 'condition_check') {
    return {
      tool_call: { tool, parameters: mapping.mapped },
      result: safeConditionCheck(mapping.mapped)
    };
  }

  if (config.method === 'LOCAL' && tool === 'yes_no_answer') {
    return {
      tool_call: { tool, parameters: mapping.mapped },
      result: safeYesNoAnswer(mapping.mapped)
    };
  }

  if (config.method === 'LOCAL' && tool === 'wrap_oct') {
    return {
      tool_call: { tool, parameters: mapping.mapped },
      result: {
        success: false,
        message: 'wrap_oct is not yet available on OneChain. OCT is the native gas token and does not currently have a wrapped on-chain version. Check back as the OneChain DeFi ecosystem grows, or use ONEDEX to swap OCT for other tokens.',
        suggestion: 'Use swap_tokens or get_swap_quote to trade OCT on ONEDEX instead.'
      }
    };
  }

  if (config.method === 'LOCAL' && tool === 'deposit_yield') {
    return {
      tool_call: { tool, parameters: mapping.mapped },
      result: {
        success: false,
        message: 'deposit_yield is not yet available on OneChain. Native yield/lending protocols on OneChain are still emerging. Check ONEDEX for liquidity provision opportunities.',
        suggestion: 'Swap tokens on ONEDEX or check get_dex_pools for liquidity pool opportunities.'
      }
    };
  }

  const url = `${BASE_URL}${replacePathParams(config.path, mapping.mapped)}`;
  const requestParams = { ...mapping.mapped };

  Object.keys(requestParams).forEach(key => {
    if (config.path.includes(`{${key}}`)) {
      delete requestParams[key];
    }
  });

  try {
    let response;
    if (config.method === 'POST') {
      response = await axios.post(url, requestParams, { timeout: 30000 });
    } else if (config.method === 'GET') {
      response = await axios.get(url, { timeout: 30000 });
    } else {
      throw new Error(`Unsupported method: ${config.method}`);
    }

    return {
      tool_call: { tool, parameters: mapping.mapped },
      result: { success: true, tool, result: response.data }
    };
  } catch (error) {
    const status = error.response?.status;
    const backendError =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.response?.data?.details ||
      error.message;

    return {
      tool_call: { tool, parameters: mapping.mapped },
      result: {
        success: false,
        tool,
        error: status ? `${backendError} (HTTP ${status})` : backendError
      }
    };
  }
}

function interpolateParameters(params, previousResults) {
  if (!params || !previousResults || previousResults.length === 0) {
    return params;
  }

  const interpolated = { ...params };
  
  // Collect all successful results
  const resultsByTool = {};
  for (const result of previousResults) {
    if (result?.success && result?.result) {
      resultsByTool[result.tool] = result.result;
    }
  }

  // Helper to extract numeric price from fetch_price result
  const extractPrice = (result) => {
    if (result.prices && Array.isArray(result.prices) && result.prices.length > 0) {
      return result.prices[0].price;
    }
    return null;
  };

  // Helper to extract balance
  const extractBalance = (result) => {
    if (result.balance) return parseFloat(result.balance);
    if (result.balanceInEth) return parseFloat(result.balanceInEth);
    return null;
  };

  // Helper to format price data for display
  const formatPriceData = (result) => {
    if (result.prices && Array.isArray(result.prices) && result.prices.length > 0) {
      const price = result.prices[0];
      const currency = (price.currency || 'USD').toUpperCase();
      const value = typeof price.price === 'number' ? price.price.toFixed(2) : price.price;
      const change = price.change_24h !== undefined && price.change_24h !== null
        ? ` (24h change: ${price.change_24h > 0 ? '+' : ''}${price.change_24h.toFixed(2)}%)`
        : '';
      return `${value} ${currency}${change}`;
    }
    return null;
  };

  // Auto-populate calculate tool variables from previous results
  // Always merge — even if params.variables exists, fill in gaps from tool results
  if (params.expression) {
    const autoVariables = {};
    
    // Extract prices from all fetch_price results
    const priceResults = previousResults.filter(r => r?.success && r?.tool === 'fetch_price');
    for (const pr of priceResults) {
      const price = extractPrice(pr.result);
      if (price !== null) {
        const coin = pr.result.prices?.[0]?.coin?.toLowerCase() || '';
        if (coin.includes('ethereum') || coin.includes('eth')) {
          autoVariables.eth_price = price;
          autoVariables.eth_price_usd = price;
          autoVariables.ethereum_price = price;
          autoVariables.current_eth_price = price;
          autoVariables.current_ethereum_price = price;
        } else {
          autoVariables.token_price = price;
          autoVariables.token_price_usd = price;
          autoVariables[`${coin}_price`] = price;
          autoVariables[`current_${coin}_price`] = price;
        }
      }
    }
    
    // Extract balance from get_balance results
    const balanceResults = previousResults.filter(r => r?.success && r?.tool === 'get_balance');
    for (const br of balanceResults) {
      const balance = extractBalance(br.result);
      if (balance !== null) {
        autoVariables.eth_balance = balance;
        autoVariables.balance = balance;
      }
    }
    
    if (Object.keys(autoVariables).length > 0) {
      // Merge: explicit params.variables override auto-populated ones
      interpolated.variables = { ...autoVariables, ...(params.variables || {}) };
    }
  }

  // Replace placeholders in string parameters
  Object.keys(interpolated).forEach(key => {
    if (typeof interpolated[key] === 'string') {
      let value = interpolated[key];
      
      // Replace price-related placeholders
      for (const result of previousResults) {
        if (!result?.success) continue;
        
        if (result.tool === 'fetch_price') {
          const priceData = formatPriceData(result.result);
          if (priceData) {
            value = value.replace(/\[Price (?:will be inserted )?from fetch_price result\]/gi, priceData);
            value = value.replace(/\[Price from [\w_]+ result\]/gi, priceData);
            value = value.replace(/\[Current Price\]/gi, priceData);
            value = value.replace(/\{price\}/gi, priceData);
          }
        }
        
        if (result.tool === 'get_balance' && result.result?.balance) {
          value = value.replace(/\[Balance from get_balance result\]/gi, result.result.balance);
          value = value.replace(/\{balance\}/gi, result.result.balance);
        }
      }
      
      interpolated[key] = value;
    }
  });

  return interpolated;
}

async function executeToolsDirectly(routingPlan, fallbackMessage, defaults = {}) {
  if (!routingPlan?.execution_plan?.steps?.length) {
    return { tool_calls: [], results: [] };
  }

  const { steps, type } = routingPlan.execution_plan;

  if (type === 'parallel') {
    const results = await Promise.all(steps.map(step => executeToolStep(step, fallbackMessage, defaults)));
    return {
      tool_calls: results.map(item => item.tool_call),
      results: results.map(item => item.result)
    };
  }

  const toolCalls = [];
  const toolResults = [];
  for (const step of steps) {
    // Interpolate parameters based on previous results
    const interpolatedStep = {
      ...step,
      parameters: interpolateParameters(step.parameters, toolResults)
    };
    
    const { tool_call, result } = await executeToolStep(interpolatedStep, fallbackMessage, defaults);
    toolCalls.push(tool_call);
    toolResults.push(result);
    if (!result.success) {
      break;
    }
  }

  return { tool_calls: toolCalls, results: toolResults };
}

function formatToolResponse(toolResults) {
  if (!toolResults?.tool_calls?.length) {
    return 'No tool calls were executed.';
  }

  const messages = toolResults.results.map((result, index) => {
    const tool = toolResults.tool_calls[index]?.tool;
    const payload = result.result || {};
    
    // Native token responses come back as success=true from the updated priceController,
    // but guard here anyway: if there's a native_tokens payload, show it.
    if (!result?.success) {
      if (tool === 'fetch_price' && payload.native_tokens?.length) {
        // fall through to switch so native token message is shown
      } else {
        return `${tool}: ${result?.error || 'Failed to execute tool.'}`;
      }
    }

    switch (tool) {
      case 'fetch_price': {
        // Handle native/unlisted tokens (e.g. OCT)
        if (payload.native_tokens && payload.native_tokens.length > 0) {
          return payload.message || payload.native_tokens.map(t => `**${t.name}**: ${t.note}`).join('\n\n');
        }
        const prices = payload.prices || [];
        if (!prices.length) {
          return 'Price data not available for this token.';
        }
        const formatted = prices.map(price => {
          const currency = (price.currency || '').toUpperCase();
          const value = typeof price.price === 'number' ? price.price.toFixed(4) : price.price;
          const change = price.change_24h !== undefined && price.change_24h !== null
            ? ` (24h ${price.change_24h.toFixed(2)}%)`
            : '';
          return `${price.coin.toUpperCase()}: ${value} ${currency}${change}`;
        }).join(', ');
        return `Current prices: ${formatted}.`;
      }
      case 'get_balance': {
        return `Balance for ${payload.address}: ${payload.balance} OCT.`;
      }
      case 'transfer': {
        return `Transfer completed. Tx: ${payload.transactionDigest || payload.transactionHash || 'unknown'}.`;
      }
      case 'deploy_token': {
        return `Token deployed. Token ID: ${payload.tokenObjectId || payload.tokenId || 'unknown'}. Tx: ${payload.transactionDigest || payload.transactionHash || 'unknown'}.`;
      }
      case 'deploy_nft_collection': {
        return `NFT collection deployed. Address: ${payload.collectionObjectId || payload.collectionAddress || 'unknown'}. Tx: ${payload.transactionDigest || payload.transactionHash || 'unknown'}.`;
      }
      case 'mint_nft': {
        return `NFT minted. Token ID: ${payload.nftObjectId || payload.tokenId || 'unknown'}. Tx: ${payload.transactionDigest || payload.transactionHash || 'unknown'}.`;
      }
      case 'get_token_info': {
        return `Token info: ${payload.name || 'unknown'} (${payload.symbol || 'unknown'}), supply ${payload.totalSupply || 'unknown'}.`;
      }
      case 'get_token_balance': {
        return `Token balance for ${payload.ownerAddress || 'unknown'}: ${payload.balance || 'unknown'}.`;
      }
      case 'get_nft_info': {
        return `NFT ${payload.tokenId || 'unknown'} owner: ${payload.owner || 'unknown'}.`;
      }
      case 'send_email': {
        return `Email sent successfully.`;
      }
      case 'calculate': {
        return `Calculation result: ${payload.result}.`;
      }
      case 'condition_check': {
        return `Condition "${payload.expression}": ${payload.value === true ? 'TRUE ✓' : 'FALSE ✗'}.`;
      }
      case 'yes_no_answer': {
        return `Question: "${payload.question}" — Answer: ${payload.answer.toUpperCase()} (${payload.bool}).`;
      }
      case 'send_webhook': {
        return `Webhook sent to ${payload.url} — status ${payload.responseStatus}.`;
      }
      case 'create_dao': {
        return `DAO "${payload.dao?.name || 'unknown'}" created. ID: ${payload.dao?.daoId || 'unknown'}.`;
      }
      case 'create_proposal': {
        return `Proposal "${payload.proposal?.title || 'unknown'}" created. ID: ${payload.proposal?.proposalId || 'unknown'}. Voting ends ${payload.proposal?.endsAt || 'unknown'}.`;
      }
      case 'vote_on_proposal': {
        return `Vote "${payload.vote?.toUpperCase() || 'unknown'}" cast on proposal ${payload.proposalId}. Tally: Yes ${payload.tally?.yes || 0}, No ${payload.tally?.no || 0}.`;
      }
      case 'get_proposal': {
        return `Proposal "${payload.proposal?.title || 'unknown'}" — Status: ${payload.proposal?.status || 'unknown'}. Tally: Yes ${payload.proposal?.votes?.yes || 0}, No ${payload.proposal?.votes?.no || 0} (${payload.stats?.yesPercent || '0%'} yes).`;
      }
      default:
        return `Executed ${tool}.`;
    }
  });

  return messages.join('\n');
}

module.exports = {
  executeToolsDirectly,
  formatToolResponse
};
