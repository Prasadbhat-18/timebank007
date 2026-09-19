// ─── server/deployContract.js ───────────────────────────────────────────────
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getProvider, EXPLORER_BASE } from "./relayerService.js";
import { TimeCreditArtifact } from "../contracts/TimeCreditArtifact.js";

let currentFile = "";
try {
  if (typeof import.meta !== "undefined" && import.meta?.url) {
    currentFile = fileURLToPath(import.meta.url);
  }
} catch {}
const __filename = currentFile || "";
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
const envPath = path.join(__dirname, "..", ".env");

export async function deployTimeCreditContract(privateKey = null) {
  const provider = await getProvider();
  if (!provider) {
    throw new Error("Unable to connect to Polygon Amoy RPC nodes.");
  }

  const keyToUse =
    privateKey ||
    process.env.RELAYER_PRIVATE_KEY ||
    (ethers.Wallet.createRandom ? ethers.Wallet.createRandom().privateKey : "0x0000000000000000000000000000000000000000000000000000000000000001");

  const signer = new ethers.Wallet(keyToUse, provider);
  const balance = await provider.getBalance(signer.address);
  console.log(`[Deployer] Deployer address: ${signer.address}`);
  console.log(`[Deployer] Balance: ${ethers.formatEther(balance)} POL`);

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits("35", "gwei");

  // Create Contract Factory
  const factory = new ethers.ContractFactory(
    TimeCreditArtifact.abi,
    TimeCreditArtifact.bytecode,
    signer
  );

  console.log("[Deployer] Deploying TimeCredit (TBC) contract to Polygon Amoy...");
  const relayerAddress = signer.address;
  const contract = await factory.deploy(relayerAddress, {
    gasLimit: 3000000n,
    gasPrice,
  });

  console.log(`[Deployer] Deployment transaction broadcast! Hash: ${contract.deploymentTransaction().hash}`);
  console.log(`[Deployer] Explorer: ${EXPLORER_BASE}tx/${contract.deploymentTransaction().hash}`);
  console.log("[Deployer] Waiting for block confirmation...");

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log(`\n🎉 [Deployer] TimeCredit successfully deployed!`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Token Tracker: ${EXPLORER_BASE}token/${contractAddress}`);

  // Persist to .env if file exists
  try {
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8");
      if (envContent.includes("TIMECREDIT_CONTRACT_ADDRESS=")) {
        envContent = envContent.replace(
          /TIMECREDIT_CONTRACT_ADDRESS=.*/g,
          `TIMECREDIT_CONTRACT_ADDRESS=${contractAddress}`
        );
      } else {
        envContent += `\nTIMECREDIT_CONTRACT_ADDRESS=${contractAddress}\n`;
      }
      fs.writeFileSync(envPath, envContent, "utf8");
      process.env.TIMECREDIT_CONTRACT_ADDRESS = contractAddress;
      console.log(`[Deployer] Updated .env with TIMECREDIT_CONTRACT_ADDRESS=${contractAddress}`);
    }
  } catch (err) {
    console.warn("[Deployer] Note: Failed to update .env automatically:", err.message);
  }

  return {
    contractAddress,
    txHash: contract.deploymentTransaction().hash,
    explorerUrl: `${EXPLORER_BASE}token/${contractAddress}`,
    deployer: signer.address,
  };
}

// Allow direct CLI execution: node server/deployContract.js [privateKey]
if (currentFile && process.argv && process.argv[1] === currentFile) {
  const argKey = process.argv[2] || null;
  deployTimeCreditContract(argKey)
    .then((res) => {
      console.log("Deployment complete:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Deployment failed:", err);
      process.exit(1);
    });
}
