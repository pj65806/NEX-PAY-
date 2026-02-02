import hre from "hardhat";

async function main() {
  console.log("Deploying NexPaySettlement contract to Sepolia...");

  const NexPaySettlement = await hre.ethers.getContractFactory("NexPaySettlement");
  const contract = await NexPaySettlement.deploy();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("NexPaySettlement deployed to:", contractAddress);

  // Save contract address to .env
  console.log(`\nAdd this to your .env file:`);
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);

  // Verify on Etherscan
  console.log("\nTo verify on Etherscan, run:");
  console.log(`npx hardhat verify --network sepolia ${contractAddress}`);

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
