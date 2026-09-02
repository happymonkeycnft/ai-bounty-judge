# AI Bounty Judge frontend

Next.js interface for the AI Bounty Judge Intelligent Contract on GenLayer Bradbury.

## Configuration

The checked-in defaults point to the live Bradbury contract:

```text
NEXT_PUBLIC_GENLAYER_RPC_URL=https://rpc-bradbury.genlayer.com
NEXT_PUBLIC_GENLAYER_CHAIN_ID=4221
NEXT_PUBLIC_CONTRACT_ADDRESS=0x468DDaac3a2f88D2823549940B0Bbf4AC379A0CA
```

Copy `.env.example` to `.env.local` only when overriding these values.

## Development

From the repository root:

```shell
npm install
npm run dev
```

Type-check and build:

```shell
npm run lint
npm run build
```

All bounty, submission, and review screens read Bradbury state. The frontend does not substitute an accepted demo review when the live contract has no accepted review.
