const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Transaction } = require('@mysten/sui/transactions');
const {
  GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY,
  ACTIVE_NETWORK, NATIVE_TOKEN,
} = require('../config/constants');
const {
  getClient, getKeypair, getMoveModule, getMovePackage, executeTransaction,
} = require('../utils/blockchain');
const {
  successResponse, errorResponse, validateRequiredFields,
  getTxExplorerUrl, getPackageExplorerUrl, logTransaction,
} = require('../utils/helpers');

// ── AI clients ──────────────────────────────────────────────────────────────
let groqClient = null;
if (GROQ_API_KEY) {
  groqClient = new Groq({ apiKey: GROQ_API_KEY });
  console.log('✓ Groq client initialized (NL Executor)');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch and format functions from a Move module using the OneChain RPC.
 * Replaces the old Etherscan ABI fetch.
 */
async function fetchMoveModuleFunctions(packageId, moduleName) {
  const mod = await getMoveModule(packageId, moduleName);
  if (!mod) throw new Error(`Module ${moduleName} not found in package ${packageId}`);

  const exposed = mod.exposedFunctions ?? {};
  return Object.entries(exposed).map(([name, def], index) => ({
    index: index + 1,
    name,
    visibility: def.isEntry ? 'entry' : 'public',
    typeParameters: def.typeParameters ?? [],
    parameters: def.parameters ?? [],
    returns: def.return ?? [],
    signature: `${name}(${(def.parameters ?? []).join(', ')})`,
  }));
}

/**
 * Ask AI to map the user's natural language command to a Move function call.
 */
async function mapCommandToMoveCall(userCommand, functions, packageId, moduleName) {
  const fnList = functions.map(f =>
    `[${f.index}] ${f.signature}  [entry=${f.visibility === 'entry'}]`
  ).join('\n');

  const prompt = `You are a Move smart-contract assistant on the OneChain blockchain.
Given the public functions of the module "${moduleName}" in package "${packageId}", map the user's command to a function call.

Available functions:
${fnList}

User command: "${userCommand}"

Respond ONLY with a JSON object:
{
  "functionName": "exact_function_name",
  "reasoning": "brief explanation",
  "typeArguments": [],
  "arguments": [
    { "name": "param_name", "moveType": "move_type_string", "value": "string_value" }
  ]
}
Rules:
- value must always be a plain string
- For addresses use the full 0x... format
- For u64/u128 amounts include the raw integer string (no decimals)
- If info is missing set "error" key with explanation
Respond ONLY with the JSON.`;

  let aiResponse;

  if (groqClient) {
    try {
      const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });
      aiResponse = completion.choices[0].message.content;
    } catch (e) { console.warn('Groq failed:', e.message); }
  }

  if (!aiResponse && GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      aiResponse = (await result.response).text();
    } catch (e) { console.warn('Gemini failed:', e.message); }
  }

  if (!aiResponse && OPENAI_API_KEY) {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    aiResponse = completion.choices[0].message.content;
  }

  if (!aiResponse) throw new Error('No AI API key configured (GROQ_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY)');

  const match = aiResponse.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return valid JSON');
  const parsed = JSON.parse(match[0]);
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

/**
 * Build a PTB argument from an AI-returned argument object.
 */
function buildTxArg(tx, arg) {
  const t = (arg.moveType ?? '').toLowerCase();
  const v = arg.value;

  if (t === 'address') return tx.pure.address(v);
  if (t === 'bool') return tx.pure.bool(v === 'true' || v === true);
  if (t === 'u8') return tx.pure.u8(Number(v));
  if (t === 'u16') return tx.pure.u16(Number(v));
  if (t === 'u32') return tx.pure.u32(Number(v));
  if (t === 'u64') return tx.pure.u64(BigInt(v));
  if (t === 'u128') return tx.pure.u128(BigInt(v));
  if (t === 'u256') return tx.pure.u256(BigInt(v));
  if (t === 'vector<u8>') return tx.pure.vector('u8', Array.from(Buffer.from(v)));
  if (t === 'string' || t === '0x1::string::string') return tx.pure.vector('u8', Array.from(Buffer.from(v)));
  // Default: treat as object reference
  return tx.object(v);
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * POST /nl-executor/execute
 * Body: { privateKey, packageId, moduleName, userCommand, sharedObjects? }
 *
 * sharedObjects: optional map { "objectId": "mutable_ref|immutable_ref" }
 * to provide shared-object references that can't be inferred from args alone.
 */
async function executeNLCommand(req, res) {
  try {
    const { privateKey, packageId, moduleName, userCommand, sharedObjects = {} } = req.body;
    const validationError = validateRequiredFields(req.body, ['privateKey', 'packageId', 'moduleName', 'userCommand']);
    if (validationError) return res.status(400).json(validationError);

    logTransaction('NL Execute', { packageId, moduleName, userCommand });

    const keypair = getKeypair(privateKey);
    const senderAddress = keypair.toSuiAddress();

    // 1. Fetch module functions
    const functions = await fetchMoveModuleFunctions(packageId, moduleName);
    if (functions.length === 0)
      return res.status(400).json(errorResponse(`No public functions found in ${moduleName}`));

    // 2. AI mapping
    const mapping = await mapCommandToMoveCall(userCommand, functions, packageId, moduleName);

    // 3. Build PTB
    const tx = new Transaction();
    const args = (mapping.arguments ?? []).map(arg => buildTxArg(tx, arg));

    tx.moveCall({
      target: `${packageId}::${moduleName}::${mapping.functionName}`,
      typeArguments: mapping.typeArguments ?? [],
      arguments: args,
    });

    // 4. Execute
    const result = await executeTransaction(tx, keypair);
    const digest = result.digest;

    return res.json(successResponse({
      message: 'Command executed successfully',
      userCommand,
      functionCalled: `${packageId}::${moduleName}::${mapping.functionName}`,
      reasoning: mapping.reasoning,
      argumentsUsed: mapping.arguments,
      transactionDigest: digest,
      sender: senderAddress,
      network: ACTIVE_NETWORK,
      explorerUrl: getTxExplorerUrl(digest),
      packageExplorerUrl: getPackageExplorerUrl(packageId),
    }));
  } catch (error) {
    console.error('NL Execute error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * POST /nl-executor/preview
 * Same as execute but dry-runs (no keypair needed) — returns AI mapping only.
 * Body: { packageId, moduleName, userCommand }
 */
async function previewNLCommand(req, res) {
  try {
    const { packageId, moduleName, userCommand } = req.body;
    const validationError = validateRequiredFields(req.body, ['packageId', 'moduleName', 'userCommand']);
    if (validationError) return res.status(400).json(validationError);

    const functions = await fetchMoveModuleFunctions(packageId, moduleName);
    const mapping = await mapCommandToMoveCall(userCommand, functions, packageId, moduleName);

    return res.json(successResponse({
      userCommand,
      packageId,
      moduleName,
      availableFunctions: functions,
      aiMapping: mapping,
      wouldCall: `${packageId}::${moduleName}::${mapping.functionName}`,
      network: ACTIVE_NETWORK,
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

/**
 * GET /nl-executor/module/:packageId/:moduleName
 * Returns all exposed functions of a Move module (replaces old ABI fetch).
 */
async function getModuleFunctions(req, res) {
  try {
    const { packageId, moduleName } = req.params;
    const functions = await fetchMoveModuleFunctions(packageId, moduleName);

    return res.json(successResponse({
      packageId,
      moduleName,
      functions,
      network: ACTIVE_NETWORK,
      packageExplorerUrl: getPackageExplorerUrl(packageId),
    }));
  } catch (error) {
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = { executeNLCommand, previewNLCommand, getModuleFunctions };
