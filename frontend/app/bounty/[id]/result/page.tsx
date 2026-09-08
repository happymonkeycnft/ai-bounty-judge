"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ExternalLink, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AIBountyJudgeClient, Bounty, Review, Submission } from "@/lib/contracts/AIBountyJudge";
import { BRADBURY_EXPLORER, getContractAddress } from "@/lib/genlayer/client";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = new AIBountyJudgeClient();
    Promise.all([client.getBounty(Number(id)), client.getSubmission(Number(id))])
      .then(async ([nextBounty, nextSubmission]) => {
        setBounty(nextBounty);
        setSubmission(nextSubmission);
        try {
          const nextReview = await client.getReview(Number(id));
          if (nextReview.accepted && nextBounty.status === "REVIEWED") setReview(nextReview);
          else setError("No accepted Bradbury review is persisted for this bounty.");
        } catch {
          setError("No accepted Bradbury review is persisted for this bounty.");
        }
      })
      .catch(() => setError("Unable to read the bounty or submission from Bradbury."));
  }, [id]);

  if (error && bounty && submission) return <AppShell><main className="narrow"><div className="empty-state"><strong>Review unavailable</strong><p>{error}</p><p>The live submission is {submission.finalized ? "finalized" : "not finalized"}. No accepted result is stored on-chain.</p><a href={submission.primary_url} target="_blank" rel="noreferrer">{submission.primary_url} <ExternalLink size={14}/></a><p>{submission.notes}</p><code style={{ overflowWrap: "anywhere" }}>{getContractAddress()}</code><a href={BRADBURY_EXPLORER} target="_blank" rel="noreferrer">Open Bradbury explorer <ExternalLink size={14}/></a><Link href={`/bounty/${id}`} className="button secondary">Return to bounty</Link></div></main></AppShell>;
  if (error) return <AppShell><main className="narrow"><div className="empty-state"><strong>Bradbury read unavailable</strong><p>{error}</p><Link href={`/bounty/${id}`} className="button secondary">Return to bounty</Link></div></main></AppShell>;
  if (!bounty || !submission || !review) return <AppShell><main className="narrow"><div className="empty-state">Loading accepted review from Bradbury…</div></main></AppShell>;

  const hashStyle = { overflowWrap: "anywhere" as const, textAlign: "right" as const };
  return <AppShell><main className="detail"><div className="crumb"><Link href={`/bounty/${id}`}>Bounty #{id}</Link><span>/</span><span>Result</span></div><section className={`result-hero ${review.overall.toLowerCase()}`}><div className="result-icon"><Check/></div><div><span className="kicker">Accepted on-chain review</span><h1>{review.overall.replace("_"," ")}</h1><p>{review.summary}</p></div><div className="consensus-seal"><ShieldCheck/><span>Bradbury consensus</span><strong>Accepted</strong></div></section><div className="detail-grid result-grid"><section className="content-card"><div className="section-heading"><div><span className="kicker">Criterion verdicts</span><h2>Why this result was reached</h2></div><span className={`evidence ${review.evidence_status.toLowerCase()}`}>Evidence {review.evidence_status.toLowerCase()}</span></div><div className="review-list">{review.criteria.map((row,index)=><article key={row.criterion_id}><div className={`verdict ${row.result.toLowerCase()}`}>{row.result}</div><div><span>Criterion {index+1}</span><h3>{bounty.criteria[index]}</h3><p>{row.reason}</p></div></article>)}</div></section><aside><div className="action-card evidence-card"><span className="kicker">Submitted evidence</span><a href={submission.primary_url} target="_blank" rel="noreferrer">{submission.primary_url}<ExternalLink size={14}/></a>{submission.secondary_url&&<a href={submission.secondary_url} target="_blank" rel="noreferrer">{submission.secondary_url}<ExternalLink size={14}/></a>}<p>{submission.notes}</p><span className="kicker">Creator references</span>{bounty.reference_urls.map(url=><a href={url} key={url} target="_blank" rel="noreferrer">{url}<ExternalLink size={14}/></a>)}</div><div className="action-card tx-card"><span className="kicker">Evidence provenance</span><dl><div><dt>Participant evidence</dt><dd><code style={hashStyle}>{review.participant_evidence_hash}</code></dd></div><div><dt>Creator references</dt><dd><code style={hashStyle}>{review.reference_evidence_hash}</code></dd></div><div><dt>Combined input</dt><dd><code style={hashStyle}>{review.combined_review_input_hash}</code></dd></div></dl><p>The fingerprints anchor the bounded evidence used during adjudication. The live webpages may change after review.</p></div><div className="action-card tx-card"><span className="kicker">Transaction evidence</span><dl><div><dt>Network</dt><dd><span className="live-dot"/>Bradbury</dd></div><div><dt>Status</dt><dd>Accepted on-chain</dd></div><div><dt>Review model</dt><dd>Independent validators</dd></div></dl><a href={BRADBURY_EXPLORER} target="_blank" rel="noreferrer">Open Bradbury explorer <ExternalLink size={14}/></a></div></aside></div></main></AppShell>;
}
