const express = require('express');
const { PORT, NETWORK_NAME, TOKEN_FACTORY_PACKAGE_ID, NFT_FACTORY_PACKAGE_ID, ACTIVE_NETWORK } = require('./config/constants');

// Import routes
const tokenRoutes = require('./routes/tokenRoutes');
const nftRoutes = require('./routes/nftRoutes');
const transferRoutes = require('./routes/transferRoutes');
const healthRoutes = require('./routes/healthRoutes');
const priceRoutes = require('./routes/priceRoutes');
const nlExecutorRoutes = require('./routes/nlExecutorRoutes');
// orbitRoutes intentionally not imported — see comment below
const conversationRoutes = require('./routes/conversationRoutes');
const walletRoutes = require('./routes/walletRoutes');
const allowanceRoutes = require('./routes/allowanceRoutes');
const contractChatRoutes = require('./routes/contractChatRoutes');
const emailRoutes = require('./routes/emailRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const governanceRoutes = require('./routes/governanceRoutes');
const dexRoutes = require('./routes/dexRoutes');
// Note: orbitRoutes kept in repo but not mounted (Arbitrum Orbit L3 not applicable to OneChain)

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware - Enable for frontend integration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/token', tokenRoutes);
app.use('/nft', nftRoutes);
app.use('/transfer', transferRoutes);
app.use('/price', priceRoutes);
app.use('/nl-executor', nlExecutorRoutes);
app.use('/api', conversationRoutes);
app.use('/wallet', walletRoutes);
app.use('/allowance', allowanceRoutes);
app.use('/contract-chat', contractChatRoutes);
app.use('/email', emailRoutes);
app.use('/webhook', webhookRoutes);
app.use('/governance', governanceRoutes);
app.use('/dex', dexRoutes);
// app.use('/api/orbit', orbitRoutes); // Removed — Arbitrum Orbit L3 not applicable on OneChain
// Legacy / convenience routes
app.post('/deploy-token', require('./controllers/tokenController').deployToken);
app.post('/deploy-nft-collection', require('./controllers/nftController').deployNFTCollection);
app.post('/mint-nft', require('./controllers/nftController').mintNFT);
app.get('/balance/:address', require('./controllers/transferController').getBalance);
app.get('/token-info/:objectId', require('./controllers/tokenController').getTokenInfo);
app.get('/token-balance/:address', require('./controllers/tokenController').getTokenBalance);
app.get('/nft-info/:objectId', require('./controllers/nftController').getNFTInfo);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 InFlow Backend Server — OneChain');
  console.log('='.repeat(50));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Network: ${NETWORK_NAME} (${ACTIVE_NETWORK})`);
  console.log(`🏭 Token Factory Pkg: ${TOKEN_FACTORY_PACKAGE_ID || '(not deployed)'}`);
  console.log(`🎨 NFT Factory Pkg:   ${NFT_FACTORY_PACKAGE_ID || '(not deployed)'}`);
  console.log('\n📍 Endpoints:');
  console.log('  GET  /health');
  console.log('  POST /token/deploy                  Create Move token');
  console.log('  GET  /token/info/:objectId           Token object info');
  console.log('  GET  /token/balance/:address         OCT balance');
  console.log('  POST /nft/deploy-collection          Create NFT collection');
  console.log('  POST /nft/mint                       Mint NFT');
  console.log('  GET  /nft/info/:objectId             NFT object info');
  console.log('  POST /transfer                       Transfer OCT');
  console.log('  POST /transfer/object                Transfer Move object');
  console.log('  POST /transfer/prepare               Build PTB for wallet signing');
  console.log('  GET  /transfer/balance/:address      OCT balance');
  console.log('  GET  /wallet/info/:address           Wallet info');
  console.log('  GET  /wallet/objects/:address        Owned objects');
  console.log('  GET  /wallet/tx/:digest              Transaction status');
  console.log('  GET  /wallet/history/:address        Tx history');
  console.log('  GET  /nl-executor/module/:pkg/:mod   List Move functions');
  console.log('  POST /nl-executor/preview            AI command preview');
  console.log('  POST /nl-executor/execute            AI command execute');
  console.log('  POST /contract-chat/ask              AI contract analysis');
  console.log('  POST /email/send                     Send email');
  console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
