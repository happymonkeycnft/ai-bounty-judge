# AI Bounty Judge

**A decentralized acceptance-testing workflow for real-world deliverables.**

AI Bounty Judge lets a creator publish natural-language acceptance criteria, a participant submit public web evidence, and independent GenLayer validators produce criterion-level verdicts. An accepted consensus result is persisted on-chain.

> **Bradbury status:** the contract is deployed and the deterministic lifecycle through submission finalization is live. The optimized live review ended in `VALIDATORS_TIMEOUT / TIMEOUT` (2 `AGREE`, 3 `TIMEOUT`), so no Bradbury review was accepted or persisted. The same review path completes successfully with five validators in GLSim.

## Problem

Creators and participants should not have to trust one centralized reviewer to decide whether a real-world deliverable satisfies a written specification. A single reviewer can be unavailable, inconsistent, biased, or opaque. AI Bounty Judge turns the acceptance decision into an inspectable workflow in which multiple validators independently evaluate the same public evidence against the same ordered criteria.

## How it works

```text
Creator defines criteria
        ↓
Participant submits public evidence
        ↓
GenLayer validators inspect the evidence
        ↓
Criterion-level PASS / FAIL / UNCLEAR verdicts
        ↓
Accepted result persists on-chain
```

Each bounty has one immutable definition and one participant submission in v1. The participant may edit the draft until finalization. Once finalized, the submission is immutable and can be reviewed permissionlessly.

## Why GenLayer

An ordinary deterministic smart contract can validate exact values and deterministic state transitions, but it cannot meaningfully inspect arbitrary webpage text and decide whether that evidence satisfies natural-language requirements. GenLayer provides the nondeterministic execution and validator-consensus layer needed for that semantic task while keeping bounty state, lifecycle rules, and accepted results on-chain.

## Architecture

```text
┌──────────────────┐     writes/reads      ┌──────────────────────────┐
│ Next.js frontend │ ────────────────────▶ │ AI Bounty Judge contract │
└──────────────────┘                       └────────────┬─────────────┘
                                                     │ review_submission
                                                     ▼
                                          ┌──────────────────────────┐
                                          │ GenLayer validator nodes │
                                          │ render → judge → compare │
                                          └────────────┬─────────────┘
                                                     │ accepted result
                                                     ▼
                                          ┌──────────────────────────┐
                                          │ Persisted bounty review  │
                                          └──────────────────────────┘
```

## Contract interface

The public interface contains eight methods:

| Method | Type | Purpose |
| --- | --- | --- |
| `create_bounty(title, description, criteria, reference_urls)` | Write | Creates an immutable bounty with 1–5 ordered criteria and up to two display-only reference URLs. |
| `save_submission(bounty_id, primary_url, secondary_url, notes)` | Write | Creates or updates the participant's draft using one required and one optional public HTTPS URL. |
| `finalize_submission(bounty_id)` | Write | Locks the participant submission and moves the bounty from `OPEN` to `SUBMITTED`. |
| `review_submission(bounty_id)` | Write | Runs validator adjudication and, only after accepted consensus, persists the review and moves the bounty to `REVIEWED`. |
| `get_bounty(bounty_id)` | View | Returns the bounty definition, ordered criteria, references, status, and submission flag. |
| `get_submission(bounty_id)` | View | Returns participant, evidence URLs, notes, and finalization state. |
| `get_review(bounty_id)` | View | Returns accepted evidence status, ordered criterion verdicts, rationale, summary, and overall outcome. |
| `get_bounty_count()` | View | Returns the number of created bounties. |

## Consensus design

For each validator node, the optimized review path:

- deduplicates deliverable URLs and performs one web render per unique URL;
- bounds and combines visible text evidence;
- performs one structured LLM call covering all ordered criteria;
- derives the overall outcome from the criterion verdicts;
- contains validator-side render, provider, JSON, and normalization exceptions as non-equivalence votes.

Validators execute independently. Consensus compares only material verdict fields: evidence availability, criterion count and ordered IDs, criterion verdicts, and the derived overall outcome. Free-form reason and summary wording are deliberately excluded from equivalence, so harmless prose variation cannot create semantic disagreement.

## Security

- **Prompt injection:** webpage content is delimited and treated only as untrusted evidence. Instructions, role changes, and requested outputs embedded in a page are not followed.
- **Public HTTPS only:** URL validation rejects non-HTTPS URLs, credentials, fragments, private hosts, and unsupported forms.
- **Bounded evidence:** per-source and combined evidence, LLM fields, criteria, notes, and other stored inputs have fixed limits.
- **Validator exception containment:** render, provider, malformed JSON, and normalization failures return controlled non-equivalence rather than escaping the validator closure.
- **Storage-to-memory handling:** storage-backed bounty and submission values are copied before crossing the nondeterministic boundary.
- **No arbitrary execution:** the contract renders public text and requests structured adjudication; it does not execute submitted scripts, commands, or downloadable artifacts.

## Testing

The validated optimized source has:

- 40 direct contract and consensus tests;
- 2 integration tests;
- a five-validator GLSim happy-path review that returns `PASS / PASS / PASS / APPROVED`;
- GenVM lint coverage;
- semantic and public-interface validation;
- frontend TypeScript checking and a production build.

Run the local checks with Python 3.12+ and Node.js 20+:

```shell
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest tests/direct -q
.venv/bin/genvm-lint check contracts/ai_bounty_judge.py
npm install
npm run lint
npm run build
```

The integration suite requires a local five-validator GLSim instance:

```shell
.venv/bin/glsim --port 4000 --validators 5 --no-browser
.venv/bin/gltest tests/integration/test_lifecycle_smoke.py -v -s
```

## Bradbury deployment

- **Network:** GenLayer Bradbury (`chainId 4221`)
- **Contract:** [`0x468DDaac3a2f88D2823549940B0Bbf4AC379A0CA`](https://explorer-bradbury.genlayer.com/address/0x468DDaac3a2f88D2823549940B0Bbf4AC379A0CA)
- **Optimized source SHA-256:** `c9c3f0c3342242ec3b7dbcd8e3b922796adf716ed88268e9016a23c1fbf262b9`

The controlled live validation successfully completed:

- deployment — 5/5 `AGREE`;
- `create_bounty` — 5/5 `AGREE`;
- `save_submission` — 5/5 `AGREE`;
- `finalize_submission` — 5/5 `AGREE`.

The resulting bounty is `SUBMITTED` with a finalized Example Domain submission.

## Bradbury review status

The single optimized live review reached:

```text
VALIDATORS_TIMEOUT / TIMEOUT
```

Validator outcome:

```text
2 AGREE
3 TIMEOUT
```

The validator executions that completed agreed; no semantic disagreement or deterministic violation was reported. Because consensus timed out, **no accepted review was persisted on Bradbury** and the project does not claim a successful live Bradbury adjudication. The equivalent five-validator GLSim review completes successfully with all three criteria passing and an `APPROVED` outcome. Current evidence therefore points to a Bradbury validator-runtime limitation for this live nondeterministic path, rather than a disagreement over the material verdict.

## Frontend configuration

The frontend reads the live Bradbury contract by default:

```text
NEXT_PUBLIC_GENLAYER_RPC_URL=https://rpc-bradbury.genlayer.com
NEXT_PUBLIC_GENLAYER_CHAIN_ID=4221
NEXT_PUBLIC_CONTRACT_ADDRESS=0x468DDaac3a2f88D2823549940B0Bbf4AC379A0CA
```

The application does not synthesize an accepted Bradbury review. A result page is available only when `get_review` returns an accepted on-chain result.

## Limitations

- Evidence must be available at public, text-readable HTTPS URLs.
- The current Bradbury validator runtime timed out on the optimized live nondeterministic review path.
- v1 supports one participant submission and no resubmission after finalization.
- Escrow and payments are not implemented.

## Future milestones

- revision and resubmission workflows;
- multiple participant submissions;
- escrow and settlement;
- appeals and review escalation;
- bounded GitHub repository inspection.

## Project structure

```text
contracts/ai_bounty_judge.py       Intelligent Contract
tests/direct/                      Direct contract and consensus tests
tests/integration/                 GLSim lifecycle tests
frontend/app/                      Next.js application routes
frontend/lib/contracts/            GenLayerJS contract adapter
deploy/deployScript.ts             Deployment entry point
```

## License

MIT. See [LICENSE](LICENSE).
