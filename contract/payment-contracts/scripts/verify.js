import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying PaymentEscrow Contract...\n");
  
  const contractAddress = process.env.PAYMENT_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.error("❌ PAYMENT_CONTRACT_ADDRESS not set in .env");
    console.log("Deploy the contract first using: npx hardhat run scripts/deploy.js --network InFlow");
    process.exit(1);
  }
  
  console.log("Contract Address:", contractAddress);
  
  // Attach to the deployed contract
  const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
  const escrow = PaymentEscrow.attach(contractAddress);
  
  try {
    // Check basic contract info
    const treasury = await escrow.treasury();
    const owner = await escrow.owner();
    const paused = await escrow.paused();
    
    console.log("\n📊 Contract Details:");
    console.log("===================");
    console.log("Treasury:", treasury);
    console.log("Owner:", owner);
    console.log("Paused:", paused);
    
    // Check USDC support
    const usdcAddress = process.env.USDC_ADDRESS;
    if (usdcAddress && usdcAddress !== "your_usdc_address_here") {
      const isSupported = await escrow.supportedTokens(usdcAddress);
      console.log("\n💰 Token Support:");
      console.log("USDC Address:", usdcAddress);
      console.log("USDC Supported:", isSupported);
    }
    
    console.log("\n✅ Contract is deployed and accessible!");
    
  } catch (error) {
    console.error("\n❌ Error verifying contract:");
    console.error(error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
