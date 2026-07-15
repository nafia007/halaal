import { ethers, network, run } from "hardhat";

/**
 * Deploys HalaalCertification and (optionally) verifies on PolygonScan.
 *
 * Usage:
 *   AMOY_RPC_URL=... RELAYER_PRIVATE_KEY=... POLYGONSCAN_API_KEY=... \
 *     npx hardhat run scripts/deploy.ts --network amoy
 */
async function main() {
  const bodyName = process.env.CERT_BODY_NAME ?? "SANHA";
  const bodyUrl = process.env.CERT_BODY_URL ?? "https://www.sanha.org.za";

  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);

  const Factory = await ethers.getContractFactory("HalaalCertification");
  const contract = await Factory.deploy(bodyName, bodyUrl);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`HalaalCertification deployed to: ${address}`);

  // Verify on block explorers (skip on local networks).
  if (network.name !== "hardhat" && network.name !== "localhost" && process.env.POLYGONSCAN_API_KEY) {
    console.log("Waiting for confirmations before verification...");
    await contract.deploymentTransaction()?.wait(5);
    try {
      await run("verify:verify", { address, constructorArguments: [bodyName, bodyUrl] });
      console.log("Verified on PolygonScan.");
    } catch (err) {
      console.warn("Verification failed (may already be verified):", err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
