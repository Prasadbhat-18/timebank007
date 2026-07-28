// ─── TimeBank — Polygon Amoy Blockchain Integration ──────────────────────────
import { ethers } from "ethers";

// Polygon Amoy testnet configuration
const AMOY_CONFIG = {
  chainId: "0x13882", // 80002 in hex
  chainName: "Polygon Amoy Testnet",
  rpcUrls: [
    "https://polygon-amoy-bor-rpc.publicnode.com",
    "https://rpc-amoy.polygon.technology/",
    "https://rpc.ankr.com/polygon_amoy",
    "https://polygon-amoy.drpc.org"
  ],
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  blockExplorerUrls: ["https://amoy.polygonscan.com/"],
};

// Credit-to-POL conversion: 1 credit-hour = 0.001 POL (micro-transfer as proof)
const CREDIT_TO_POL = "0.001";

export const EXPLORER_URL = AMOY_CONFIG.blockExplorerUrls[0];

// ─── Check if MetaMask is available ──────────────────────────────────────────
export function isMetaMaskInstalled() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

// ─── Switch/Add Polygon Amoy network ─────────────────────────────────────────
async function ensureAmoyNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AMOY_CONFIG.chainId }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [AMOY_CONFIG],
      });
    } else {
      throw switchError;
    }
  }
}

// ─── Connect Wallet ──────────────────────────────────────────────────────────
// Returns { provider, signer, address, isInbuilt }
export async function connectWallet(email = "default") {
  if (isMetaMaskInstalled()) {
    try {
      await ensureAmoyNetwork();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      return { provider, signer, address, isInbuilt: false };
    } catch (e) {
      console.warn("MetaMask connection failed, falling back to inbuilt wallet:", e);
    }
  }

  // Inbuilt Wallet Mode (Real on-chain transaction via Fallback RPC endpoints)
  let provider = null;
  let errorMsg = "";
  
  // Try all defined RPC endpoints until one resolves
  for (const url of AMOY_CONFIG.rpcUrls) {
    try {
      const tempProvider = new ethers.JsonRpcProvider(url, { chainId: 80002, name: "amoy" }, { staticNetwork: true });
      await tempProvider.getBlockNumber(); // Probe endpoint connectivity
      provider = tempProvider;
      break;
    } catch (e) {
      errorMsg = e.message || e.toString();
      console.warn(`RPC endpoint ${url} is unreachable, trying fallback...`, e);
    }
  }
  
  if (!provider) {
    throw new Error(`All Polygon Amoy RPC endpoints are offline. Please check your internet connection. (Error: ${errorMsg})`);
  }

  const keyName = `timebank_inbuilt_private_key_${email.toLowerCase()}`;
  let privateKey = localStorage.getItem(keyName);
  let wallet;
  
  if (!privateKey) {
    wallet = ethers.Wallet.createRandom();
    localStorage.setItem(keyName, wallet.privateKey);
  } else {
    wallet = new ethers.Wallet(privateKey);
  }
  
  const connectedWallet = wallet.connect(provider);
  
  return {
    provider,
    signer: connectedWallet,
    address: wallet.address,
    isInbuilt: true,
  };
}

// ─── Get Balance ─────────────────────────────────────────────────────────────
export async function getBalance(provider, address) {
  try {
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (e) {
    console.warn("Failed to fetch balance from blockchain node:", e);
    return "0.0";
  }
}

// ─── Send Credits (micro-transfer as on-chain proof) ─────────────────────────
// Sends creditHours × 0.001 POL.
export async function sendCredits(signer, toAddress, creditHours, isInbuilt = false) {
  const polAmount = (parseFloat(CREDIT_TO_POL) * creditHours).toFixed(6);
  
  try {
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(polAmount),
    });
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      isMocked: false,
    };
  } catch (e) {
    console.error("On-chain transaction signature failed:", e);
    const msg = e.message || "";
    if (msg.includes("insufficient funds") || msg.includes("gas required exceeds allowance")) {
      throw new Error(`Insufficient funds: Inbuilt wallet needs POL testnet gas. Add funds to ${signer.address} or connect MetaMask.`);
    }
    throw new Error(msg || "Blockchain transaction failed.");
  }
}

// ─── Get Transaction Receipt ─────────────────────────────────────────────────
export async function getTxReceipt(provider, txHash) {
  return await provider.getTransactionReceipt(txHash);
}

// ─── Format Address ──────────────────────────────────────────────────────────
export function formatAddress(addr) {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Get Polygonscan link ────────────────────────────────────────────────────
export function txLink(txHash) {
  return `${EXPLORER_URL}tx/${txHash}`;
}

export function addressLink(addr) {
  return `${EXPLORER_URL}address/${addr}`;
}
