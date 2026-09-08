# AI Bounty Judge

**A decentralized acceptance-testing workflow for real-world deliverables.**

AI Bounty Judge lets a creator publish natural-language acceptance criteria, a participant submit public web evidence, and independent GenLayer validators produce criterion-level verdicts. An accepted consensus result is persisted on-chain.

> **Bradbury status:** the steward-feedback revision is live at [`0xADA20BcEe58F5E9D984E14Baa5F1aD8af7C0197E`](https://explorer-bradbury.genlayer.com/address/0xADA20BcEe58F5E9D984E14Baa5F1aD8af7C0197E). Bounty 1 completed `ACCEPTED / AGREE / FINISHED_WITH_RETURN` with an on-chain `APPROVED` review, one `PASS` criterion, and all three evidence fingerprints persisted.

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
| `create_bounty(title, description, criteria, reference_urls)` | Write | Creates an immutable bounty with 1–5 ordered criteria and up to two creator-reference URLs used during adjudication. |
| `save_submission(bounty_id, primary_url, secondary_url, notes)` | Write | Creates or updates the participant's draft using one required and one optional public HTTPS URL. |
| `finalize_submission(bounty_id)` | Write | Locks the participant submission and moves the bounty from `OPEN` to `SUBMITTED`. |
| `review_submission(bounty_id)` | Write | Runs validator adjudication and, only after accepted consensus, persists the review and moves the bounty to `REVIEWED`. |
| `get_bounty(bounty_id)` | View | Returns the bounty definition, ordered criteria, references, status, and submission flag. |
| `get_submission(bounty_id)` | View | Returns participant, evidence URLs, notes, and finalization state. |
| `get_review(bounty_id)` | View | Returns the accepted outcome, ordered verdicts and rationale, plus participant, reference, and combined-input evidence fingerprints. |
| `get_bounty_count()` | View | Returns the number of created bounties. |

## Consensus design

For each validator node, the revised review path:

- deduplicates participant and creator-reference URLs and performs one web render per unique URL;
- bounds participant evidence to 3,000 characters per source and 5,000 combined, and creator-reference evidence to 1,800 per source and 3,000 combined;
- fingerprints the exact bounded participant evidence, reference evidence, and combined ordered adjudication input with SHA-256;
- performs one structured LLM call covering all ordered criteria;
- derives the overall outcome from the criterion verdicts;
- contains validator-side render, provider, JSON, and normalization exceptions as non-equivalence votes.

Validators execute independently. Consensus compares evidence availability, the derived overall outcome, ordered criterion IDs and verdicts, and all three evidence fingerprints. A validator that fetched materially different bounded content therefore disagrees. Free-form reason and summary wording are deliberately excluded, so harmless prose variation cannot create semantic disagreement.

## Steward-feedback improvements

### Evidence anchoring

Accepted reviews persist SHA-256 fingerprints of the exact bounded participant evidence and creator-reference evidence used in adjudication, plus a combined fingerprint covering the ordered criteria and both bounded evidence records. Hashing happens after rendering, outer-whitespace trimming, and truncation, inside the same validator execution that performs adjudication—not during a later fetch.

The contract anchors the exact bounded evidence content used in adjudication. It proves what accepted validators reviewed, even if the live source changes later.

### Provenance

The accepted review is keyed to an immutable finalized submission. Its participant address and submitted URLs remain available through `get_submission`; creator reference URLs and ordered criteria remain available through `get_bounty`; `get_review` exposes the accepted fingerprints. Complete webpage text is not stored on-chain.

### Creator references

Up to two creator-reference URLs now actively participate in the single structured adjudication call per validator. The prompt separates acceptance criteria, participant evidence, and creator-reference evidence. References may clarify expectations but cannot override explicit criteria. All fetched material is delimited as untrusted evidence, and embedded instructions, role changes, or output-format requests must be ignored.

### Validator consistency

Participant, reference, and combined-input fingerprints are material consensus fields. Validators cannot accept one verdict while relying on materially different fetched content. Ordered verdicts remain material; prose reasons and summaries remain non-material.

### Recovery

Failed or timed-out consensus commits no contract state. The bounty remains `SUBMITTED`, no accepted review exists, and `review_submission(bounty_id)` can be safely attempted again. Once consensus accepts a review, the bounty becomes `REVIEWED` and the accepted result cannot be overwritten. There is no admin override and no misleading on-chain failed-attempt counter.

### Mutable-source limitation

The original webpage can still change, disappear, or move after review, but the accepted evidence fingerprints preserve what was actually judged. This mechanism does **not** prove legal domain ownership, make an external webpage immutable, or guarantee permanent content availability.

## Security

- **Prompt injection:** participant and creator-reference content is separately delimited and treated only as untrusted evidence. Instructions, role changes, and requested outputs embedded in either source are not followed.
- **Public HTTPS only:** URL validation rejects non-HTTPS URLs, credentials, fragments, private hosts, and unsupported forms.
- **Bounded evidence:** per-source and combined evidence, LLM fields, criteria, notes, and other stored inputs have fixed limits.
- **Validator exception containment:** render, provider, malformed JSON, and normalization failures return controlled non-equivalence rather than escaping the validator closure.
- **Storage-to-memory handling:** storage-backed bounty and submission values are copied before crossing the nondeterministic boundary.
- **No arbitrary execution:** the contract renders public text and requests structured adjudication; it does not execute submitted scripts, commands, or downloadable artifacts.

## Testing

The locally validated steward-feedback revision has:

- 45 direct contract and consensus tests;
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
- **Contract:** [`0xADA20BcEe58F5E9D984E14Baa5F1aD8af7C0197E`](https://explorer-bradbury.genlayer.com/address/0xADA20BcEe58F5E9D984E14Baa5F1aD8af7C0197E)
- **Steward-revision source SHA-256:** `d7970b6b1788d5eec5b042555354b948f977f3cdb70c27ade76406031fe8c36c`

The controlled live validation successfully completed:

- deployment — 5/5 `AGREE`;
- `create_bounty` — 5/5 `AGREE`;
- `save_submission` — 5/5 `AGREE`;
- `finalize_submission` — 5/5 `AGREE`.

The resulting bounty is `REVIEWED` with a finalized Example Domain submission and an accepted review.

## Live Bradbury validation

- **Bounty:** `1`
- **Participant evidence:** [https://example.com](https://example.com)
- **Creator reference:** [https://www.iana.org/help/example-domains](https://www.iana.org/help/example-domains)
- **Criterion:** The submitted page is an example domain page intended for documentation use.
- **Final verdict:** `APPROVED` / `PASS`
- **Review EVM transaction:** `0x2001af9f7105ab31bb022a5c2d39bc2142babd727a7a40818d59072e6591ce91`
- **GenLayer transaction:** `0x63b5a88fc317582083d5cd39bb34005ae782f0fb4f3e526cc52e07630bec433c`
- **Execution hash:** `0x184c96f3aff48dd8fa977f2f8ec9e2c0a8f38940b8a9ee6db4e6a6d962548ba5`
- **Consensus:** `ACCEPTED / AGREE / FINISHED_WITH_RETURN`

Five validators committed and revealed votes in round 0. Three matching validators voted `AGREE`; two validators timed out. The three matching results reached accepted consensus, with no semantic disagreement or deterministic violation.

Persisted evidence fingerprints:

```text
participant: 91955c7a8bc7ff0826e1767bb5125691f618cd4d661585c51db04ef1bfe0d107
reference:   1126f174c199f4399f7d973f79ca132eed7e961b31c726d474ba7f9ac194473a
combined:    a967a16b104ef3e0bf247064cb6a65842dfcb6b71cd9236cfcf0f5ff40599b2b
```

## Frontend configuration

The frontend reads the live Bradbury contract by default:

```text
NEXT_PUBLIC_GENLAYER_RPC_URL=https://rpc-bradbury.genlayer.com
NEXT_PUBLIC_GENLAYER_CHAIN_ID=4221
NEXT_PUBLIC_CONTRACT_ADDRESS=0xADA20BcEe58F5E9D984E14Baa5F1aD8af7C0197E
```

The application does not synthesize an accepted Bradbury review. Accepted result pages display the three stored fingerprints and warn that live webpages may later change. While a bounty remains `SUBMITTED`, the same review action remains available because a failed consensus committed no accepted state.

## Limitations

- Evidence must be available at public, text-readable HTTPS URLs.
- Individual live validators may time out; accepted consensus requires a sufficient matching validator result.
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
