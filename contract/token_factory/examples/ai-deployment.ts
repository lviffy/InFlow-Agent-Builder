/**
 * ERC20 Token Deployment Helper for AI Integration
 * 
 * This script provides functions that an AI agent can use to help users
 * deploy their own ERC20 tokens on Arbitrum Stylus.
 */

import { ethers } from 'ethers';

// ERC20 Contract ABI (minimal interface)
const ERC20_ABI = [
  "function initialize(string name, string symbol, uint8 decimals, uint256 initialSupply)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string; // In human-readable units (e.g., "1000000" for 1M tokens)
}

export interface DeploymentResult {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: string;
  deployerBalance: string;
  transactionHash: string;
  explorerUrl: string;
}

export class TokenDeployer {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private network: 'mainnet' | 'sepolia';

  constructor(
    privateKey: string,
    network: 'mainnet' | 'sepolia' = 'sepolia'
  ) {
    this.network = network;
    const rpcUrl = network === 'mainnet' 
      ? 'https://arb1.arbitrum.io/rpc'
      : 'https://sepolia-rollup.arbitrum.io/rpc';
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Validates token configuration parameters
   */
  validateConfig(config: TokenConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!config.name || config.name.trim().length === 0) {
      errors.push("Token name cannot be empty");
    }
    if (config.name.length > 50) {
      errors.push("Token name is too long (max 50 characters)");
    }

    // Validate symbol
    if (!config.symbol || config.symbol.trim().length === 0) {
      errors.push("Token symbol cannot be empty");
    }
    if (config.symbol.length > 10) {
      errors.push("Token symbol is too long (max 10 characters)");
    }
    if (!/^[A-Z0-9]+$/.test(config.symbol)) {
      errors.push("Token symbol should only contain uppercase letters and numbers");
    }

    // Validate decimals
    if (config.decimals < 0 || config.decimals > 18) {
      errors.push("Decimals must be between 0 and 18");
    }

    // Validate initial supply
    try {
      const supply = BigInt(config.initialSupply);
      if (supply <= 0n) {
        errors.push("Initial supply must be greater than 0");
      }
    } catch {
      errors.push("Initial supply must be a valid number");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Initializes a deployed token contract
   * Note: The contract must be deployed first using cargo stylus deploy
   */
  async initializeToken(
    contractAddress: string,
    config: TokenConfig
  ): Promise<DeploymentResult> {
    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Connect to the contract
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, this.signer);

    // Calculate supply with decimals
    const supplyWithDecimals = ethers.parseUnits(config.initialSupply, config.decimals);

    console.log('Initializing token...');
    console.log(`Name: ${config.name}`);
    console.log(`Symbol: ${config.symbol}`);
    console.log(`Decimals: ${config.decimals}`);
    console.log(`Supply: ${config.initialSupply} ${config.symbol}`);

    // Initialize the token
    const tx = await contract.initialize(
      config.name,
      config.symbol,
      config.decimals,
      supplyWithDecimals
    );

    console.log(`Transaction sent: ${tx.hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();

    // Get token details
    const [name, symbol, decimals, totalSupply, deployerBalance] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply(),
      contract.balanceOf(await this.signer.getAddress())
    ]);

    const explorerUrl = this.network === 'mainnet'
      ? `https://arbiscan.io/address/${contractAddress}`
      : `https://sepolia.arbiscan.io/address/${contractAddress}`;

    return {
      contractAddress,
      tokenName: name,
      tokenSymbol: symbol,
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      deployerBalance: ethers.formatUnits(deployerBalance, decimals),
      transactionHash: receipt.hash,
      explorerUrl
    };
  }

  /**
   * Transfers tokens to a recipient
   */
  async transferTokens(
    contractAddress: string,
    recipientAddress: string,
    amount: string
  ): Promise<string> {
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, this.signer);
    const decimals = await contract.decimals();
    const amountWithDecimals = ethers.parseUnits(amount, decimals);

    const tx = await contract.transfer(recipientAddress, amountWithDecimals);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  /**
   * Gets token information
   */
  async getTokenInfo(contractAddress: string) {
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, this.provider);

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply()
    ]);

    return {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals)
    };
  }

  /**
   * Gets balance for an address
   */
  async getBalance(contractAddress: string, accountAddress: string): Promise<string> {
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, this.provider);
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(accountAddress);

    return ethers.formatUnits(balance, decimals);
  }
}

// Example usage for AI agent
export async function deployTokenForUser(
  userInput: {
    privateKey: string;
    deployedContractAddress: string; // Address from cargo stylus deploy
    tokenName: string;
    tokenSymbol: string;
    decimals?: number;
    initialSupply: string;
  },
  network: 'mainnet' | 'sepolia' = 'sepolia'
): Promise<DeploymentResult> {
  const deployer = new TokenDeployer(userInput.privateKey, network);

  const config: TokenConfig = {
    name: userInput.tokenName,
    symbol: userInput.tokenSymbol.toUpperCase(),
    decimals: userInput.decimals || 18,
    initialSupply: userInput.initialSupply
  };

  return await deployer.initializeToken(userInput.deployedContractAddress, config);
}

// Example: AI conversation flow
export const AI_CONVERSATION_EXAMPLE = {
  userMessage: "I want to deploy a token called 'Awesome Coin' with symbol 'AWC' and 1 million supply",
  
  aiResponse: {
    message: "I'll help you deploy your ERC20 token! Here's what I understand:",
    tokenDetails: {
      name: "Awesome Coin",
      symbol: "AWC",
      decimals: 18,
      initialSupply: "1000000"
    },
    nextSteps: [
      "Deploy the contract using: cargo stylus deploy",
      "Provide me with the deployed contract address",
      "I'll initialize your token with the specified parameters"
    ]
  },
  
  afterDeployment: async (contractAddress: string, privateKey: string) => {
    const result = await deployTokenForUser({
      privateKey,
      deployedContractAddress: contractAddress,
      tokenName: "Awesome Coin",
      tokenSymbol: "AWC",
      initialSupply: "1000000"
    });

    return {
      message: "🎉 Your token has been deployed successfully!",
      details: result,
      aiMessage: `Your token ${result.tokenName} (${result.tokenSymbol}) has been created with a total supply of ${result.totalSupply} tokens. You can view it at ${result.explorerUrl}`
    };
  }
};

export default TokenDeployer;
