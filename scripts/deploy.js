const hre = require("hardhat");

async function main() {
  console.log("Deploying CertificateRegistry contract...");

  // Get the contract factory
  const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");

  // Deploy the contract
  console.log("Deploying...");
  const registry = await CertificateRegistry.deploy();
  
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  
  console.log("\n✅ CertificateRegistry deployed successfully!");
  console.log("📍 Contract address:", address);
  console.log("\n📋 Next steps:");
  console.log("1. Add this to .env.local:");
  console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log("\n2. View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
