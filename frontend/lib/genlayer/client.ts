"use client";

export const GENLAYER_CHAIN_ID = 4221;
export const GENLAYER_CHAIN_ID_HEX = "0x107D";
export const BRADBURY_RPC = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://rpc-bradbury.genlayer.com";
export const BRADBURY_EXPLORER = "https://explorer-bradbury.genlayer.com";
export const BRADBURY_CONTRACT = "0xADA20BcEe58F5E9D984E14Baa5F1aD8af7C0197E";
export const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID_HEX,
  chainName: "GenLayer Bradbury",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: [BRADBURY_RPC],
  blockExplorerUrls: [BRADBURY_EXPLORER],
};

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}
declare global { interface Window { ethereum?: EthereumProvider } }

export function getEthereumProvider() { return typeof window === "undefined" ? null : window.ethereum || null; }
export function isMetaMaskInstalled() { return Boolean(getEthereumProvider()?.isMetaMask); }
export async function getAccounts(): Promise<string[]> { return (await getEthereumProvider()?.request({ method: "eth_accounts" })) || []; }
export async function getCurrentChainId(): Promise<string | null> { return (await getEthereumProvider()?.request({ method: "eth_chainId" })) || null; }
export async function isOnGenLayerNetwork() { const chain = await getCurrentChainId(); return chain ? Number.parseInt(chain, 16) === GENLAYER_CHAIN_ID : false; }
export async function addGenLayerNetwork() { const provider = getEthereumProvider(); if (!provider) throw new Error("MetaMask is not installed"); await provider.request({ method: "wallet_addEthereumChain", params: [GENLAYER_NETWORK] }); }
export async function switchToGenLayerNetwork() {
  const provider = getEthereumProvider(); if (!provider) throw new Error("MetaMask is not installed");
  try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: GENLAYER_CHAIN_ID_HEX }] }); }
  catch (error: any) { if (error?.code === 4902) await addGenLayerNetwork(); else throw error; }
}
export async function connectMetaMask() {
  const provider = getEthereumProvider(); if (!provider) throw new Error("MetaMask is not installed");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts?.[0]) throw new Error("No wallet account is available");
  if (!(await isOnGenLayerNetwork())) await switchToGenLayerNetwork();
  return accounts[0] as string;
}
export async function switchAccount() {
  const provider = getEthereumProvider(); if (!provider) throw new Error("MetaMask is not installed");
  await provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
  const accounts = await getAccounts(); if (!accounts[0]) throw new Error("No wallet account selected"); return accounts[0];
}
export function getContractAddress() { return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || BRADBURY_CONTRACT; }
