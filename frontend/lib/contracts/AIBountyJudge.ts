"use client";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { getContractAddress, getEthereumProvider } from "@/lib/genlayer/client";

export type Bounty = { id:number; creator:string; title:string; description:string; criteria:string[]; reference_urls:string[]; status:"OPEN"|"SUBMITTED"|"REVIEWED"; submission_exists:boolean };
export type Submission = { bounty_id:number; participant:string; primary_url:string; secondary_url:string; notes:string; finalized:boolean };
export type Review = { bounty_id:number; evidence_status:"AVAILABLE"|"PARTIAL"|"UNAVAILABLE"; overall:"APPROVED"|"REJECTED"|"NEEDS_REVISION"; summary:string; accepted:boolean; criteria:Array<{criterion_id:number;result:"PASS"|"FAIL"|"UNCLEAR";reason:string}> };

function plain(value:any):any { if (value instanceof Map) return Object.fromEntries([...value].map(([k,v])=>[k,plain(v)])); if(Array.isArray(value)) return value.map(plain); if(typeof value==="bigint") return Number(value); if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,plain(v)])); return value; }

export class AIBountyJudgeClient {
  readonly address=getContractAddress() as `0x${string}`; private read:any; private write:any;
  constructor(account?:string|null){ this.read=createClient({chain:testnetBradbury}); const provider=getEthereumProvider(); this.write=account&&provider?createClient({chain:testnetBradbury,account:account as `0x${string}`,provider:provider as any}):null; }
  get configured(){return Boolean(this.address)}
  private ensureWrite(){if(!this.address)throw new Error("Contract address is not configured yet.");if(!this.write)throw new Error("Connect a wallet before sending a transaction.");return this.write}
  private async writeAndWait(functionName:string,args:unknown[]){const client=this.ensureWrite();await client.connect("testnetBradbury");const hash=await client.writeContract({address:this.address,functionName,args,value:0n});const receipt=await this.read.waitForTransactionReceipt({hash,status:TransactionStatus.ACCEPTED,retries:120,interval:5000});if(receipt.txExecutionResultName&&receipt.txExecutionResultName!=="FINISHED_WITH_RETURN")throw new Error("Consensus completed but contract execution failed.");return {hash,receipt}}
  async getBountyCount(){if(!this.address)return 0;return Number(await this.read.readContract({address:this.address,functionName:"get_bounty_count",args:[]}))}
  async getBounty(id:number):Promise<Bounty>{return plain(await this.read.readContract({address:this.address,functionName:"get_bounty",args:[id]}))}
  async getSubmission(id:number):Promise<Submission>{return plain(await this.read.readContract({address:this.address,functionName:"get_submission",args:[id]}))}
  async getReview(id:number):Promise<Review>{return plain(await this.read.readContract({address:this.address,functionName:"get_review",args:[id]}))}
  createBounty(title:string,description:string,criteria:string[],references:string[]){return this.writeAndWait("create_bounty",[title,description,criteria,references])}
  saveSubmission(id:number,primary:string,secondary:string,notes:string){return this.writeAndWait("save_submission",[id,primary,secondary,notes])}
  finalizeSubmission(id:number){return this.writeAndWait("finalize_submission",[id])}
  reviewSubmission(id:number){return this.writeAndWait("review_submission",[id])}
}
