// ─── TimeBank — Polygon Amoy Blockchain Integration ──────────────────────────
import { ethers } from "ethers";

// Polygon Amoy testnet configuration
const AMOY_CONFIG = {
  chainId: "0x13882", // 80002 in hex
  chainName: "Polygon Amoy Testnet",
  rpcUrls: ["https://rpc-amoy.polygon.technology/"],
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
    // Chain not added yet — add it
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
// Returns { provider, signer, address }
export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed. Please install it from metamask.io");
  }

  await ensureAmoyNetwork();

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { provider, signer, address };
}

// ─── Get Balance ─────────────────────────────────────────────────────────────
export async function getBalance(provider, address) {
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

// ─── Send Credits (micro-transfer as on-chain proof) ─────────────────────────
// Sends creditHours × 0.001 POL to the recipient as blockchain proof
export async function sendCredits(signer, toAddress, creditHours) {
  const polAmount = (parseFloat(CREDIT_TO_POL) * creditHours).toFixed(6);
  
  const tx = await signer.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(polAmount),
  });

  // Wait for transaction to be mined
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
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
