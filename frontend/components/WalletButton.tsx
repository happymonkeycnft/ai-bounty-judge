"use client";
import { useWallet } from "@/lib/genlayer/wallet";
import { switchToGenLayerNetwork } from "@/lib/genlayer/client";
const short=(address:string)=>`${address.slice(0,6)}…${address.slice(-4)}`;
export function WalletButton(){const wallet=useWallet();if(wallet.isConnected&&!wallet.isOnCorrectNetwork)return <button className="wallet wrong" onClick={()=>switchToGenLayerNetwork()}>Switch to Bradbury</button>;if(wallet.isConnected&&wallet.address)return <button className="wallet" onClick={wallet.disconnectWallet}><span className="live-dot"/>{short(wallet.address)}</button>;return <button className="wallet" disabled={wallet.isLoading} onClick={()=>wallet.connectWallet()}>{wallet.isLoading?"Checking wallet…":"Connect wallet"}</button>}
