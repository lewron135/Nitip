# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

JEJAK: an escrow contract for "jastip" (personal-shopping/proxy-buying) transactions on BNB Smart Chain
Testnet, built for the Indonesia Web3 Hackathon 2026 (Finance & Commerce track). The escrow is the
mechanism; the product is the byproduct — an on-chain, unfakeable, portable reputation record for
jastipers, derived entirely from public events so anyone can recompute it independently.

The full spec (problem statement, every design decision and its justification, the fund-path state
machine, the trust-score formula, the RPC gotchas) lives in **`docs/MASTERPLAN-JEJAK.md`** — it is the
source of truth, not this file. Code comments reference it by section (e.g. `§12.3 D-07`); when a
comment cites a section, read that section before changing the surrounding code. The doc is in
Indonesian.

Repo is still named `Nitip`; the product/contract is `JEJAK`/`JejakEscrow`.

## Repo layout — four independent packages, no workspace tool

There is no root `package.json`. Each of these is installed and run from its own directory:

- `contracts/` — Foundry project, `JejakEscrow.sol` (the only contract).
- `services/` — one Node/TypeScript package containing three roles: `indexer/` (reads chain events
  into SQLite), `verifier/` (Express API + AI receipt/photo verification, acts as the on-chain
  `verifier` role), `scoring/` (the `JEJAK-TRUST` formula, `trust.ts`).
- `web/` — Next.js frontend (App Router, wagmi/viem/RainbowKit). Currently just the `create-next-app`
  scaffold — no wallet UI, order pages, or components wired up yet.
- `verify-independent/` — a **Python** reimplementation of the trust score, deliberately zero
  dependency on `services/scoring/trust.ts` or any of our TypeScript. This is "Scenario C": proving in
  front of judges that the score is a public recomputation, not a claim, by running a script in a
  different language that gets an identical number. Never let this import our code.

All secrets/config in a single root `.env` (see `.env.example`). `services/shared/env.ts` always
resolves it from the repo root regardless of cwd, so `npm run <script>` from `services/` behaves the
same as from anywhere else.

### Generated files — do not hand-edit

`services/shared/deployment.ts` and `web/lib/deployment.ts` are generated from
`contracts/out/JejakEscrow.sol/JejakEscrow.json` and `contracts/deployments/*.json` via
`node scripts/export-abi.mjs`. Same for the ABI copies. Editing these by hand is called out in the
masterplan (§18.2) as the most common way to lose a day right before a deadline — always regenerate.
`contracts/deployments/*.json` (address, `deployBlock`, ABI) **is** committed on purpose: it's the
interface contract between the person who deploys and everyone else.

## Commands

**Contracts** (from `contracts/`):
```bash
forge build
forge test -vvv
forge test --gas-report
forge coverage                     # floor is 80% on fund paths, not a target
forge test --match-test test_D07   # run a single test
forge fmt

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BSC_TESTNET_RPC --private-key $DEPLOYER_PK \
  --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY -vvvv
```
After deploying, run `node scripts/export-abi.mjs` and `node scripts/record-deployment.mjs` to sync
the ABI/deployment files — don't edit them by hand.

**Services** (indexer / verifier API / scoring, from `services/`):
```bash
npm run indexer            # tail chain events into SQLite
npm run indexer:backfill   # backfill from DEPLOY_BLOCK — never from block 0 (RPC-3)
npm run verifier           # Express API, acts as the on-chain `verifier`
npm run dev                # verifier with watch mode
npm run seed:demo          # seed demo data
npm run crosscheck:emit    # emit cases consumed by verify-independent/
npm test                   # vitest run
npm run test:watch
npx vitest run scoring/trust.test.ts   # run a single test file
npm run typecheck
```

**Web** (from `web/`):
```bash
npm run dev
npm run build
npm run lint
```

**Independent verification** (from `verify-independent/`):
```bash
python -m venv .venv && source .venv/bin/activate
pip install web3 requests
python recompute.py 0xAlamatJastiper
```

**RPC sanity check** — run before touching indexer code, and again if the demo starts misbehaving:
```bash
cast logs --from-block $DEPLOY_BLOCK --to-block latest \
  --address $CONTRACT_ADDRESS --rpc-url $BSC_TESTNET_RPC
```
If this fails, the RPC endpoint is the problem — see "RPC gotcha" below before debugging anything else.

## Architecture

### Fund flow is a strict state machine, enforced in the contract

Every order sits in exactly one `Status` (`CREATED → ACCEPTED → PROOFED → CAPITAL_PAID → COMPLETED`,
with `DISPUTED`, `REFUNDED`, `ABANDONED`, `RESOLVED` as escape/final states). `JejakEscrow.sol`'s header
comment and `docs/MASTERPLAN-JEJAK.md` §11.3 draw the full diagram — read it before adding a new
transition. Every state-changing function checks status first; final states have no outgoing
transitions; `releaseCapital` can only fire once (guarded by state, not a separate flag).

Payout is **two-stage**, modeling how jastip actually works economically: capital (what the jastiper
fronted) releases as soon as AI verifies the receipt, before the item ships; the fee releases only
after the buyer confirms receipt or a 72h dispute window lapses. This is the central product insight
(§6.6) — don't collapse it into a single payout without understanding why it's split.

### Invariants enforced in the contract, not just tested

- **Pull-payment only.** The contract never pushes BNB mid-flow; funds land in `pendingWithdrawals` and
  the recipient calls `withdraw()`. This is what makes the contract immune to reentrancy and to a
  recipient contract that reverts on receive.
- **`owner` cannot touch funds** — the only owner powers are rotating the `verifier` and `arbiter`
  addresses. No emergency withdraw, no pause, no proxy, no selfdestruct (tested explicitly in
  `AccessControl.t.sol`).
- **AI (the `verifier` role) can only withhold, never loosen.** `releaseCapital` rejects any amount
  above the buyer-set cap regardless of what the backend sends — so a fully compromised verifier
  backend can cause at most `capWei` of loss, not unlimited loss. This is proven with fuzz tests
  (`test_INV2_verifiedNeverExceedsCap`), not just asserted.
- **Permissionless liveness.** `expireUnaccepted`, `abandonByTimeout`, `escalateStaleVerification`,
  `autoReleaseFee`, and `withdraw` take no `onlyX` modifier — anyone can call them. Funds must never
  depend on the JEJAK team/backend staying alive to be unstuck.
- **Reputation-gated order caps.** `mapping(address => uint32) completedCount` / `abandonedCount` are
  raw event counters (not a score) that `acceptOrder` uses to cap the order value a jastiper is allowed
  to accept (tier T0–T3, §6.7 / §11.4). This turns reputation into a credit limit, not a cosmetic badge.
- **Arbiter powers are narrow.** `resolveDispute` can only move funds within that order's remaining
  balance, can't touch non-`DISPUTED` orders, can't change `capWei`/`feeWei`/parties, can't call
  `releaseCapital`, and can't raise anyone's tier. Every ruling emits `DisputeResolved`, so the
  arbiter's own track record is publicly auditable too.

### Reputation is never stored — only recomputed

The trust score is **not** contract state. It's derived entirely from emitted events
(`OrderCreated`, `CapitalReleased`, `OrderCompleted`, `DisputeResolved`, etc. — the full schema is
`docs/MASTERPLAN-JEJAK.md` §12.5, which the indexer and frontend both treat as their interface
contract). `services/scoring/trust.ts` is the reference implementation of `JEJAK-TRUST v1.0` (§13);
`verify-independent/recompute.py` is an intentionally independent second implementation in a different
language, reading the same public events with zero code sharing, precisely so the "recompute it
yourself" claim can be demonstrated live. When changing the score formula, change both and re-verify
they agree (`npm run crosscheck:emit` feeds the cases `recompute.py` checks against).

### Currency: everything in the contract is wei of tBNB

Orders are quoted to users in IDR, receipts get read in JPY/foreign currency, but the contract only
ever does arithmetic in wei. FX conversion happens in the backend (`services/verifier/fx.ts`) using an
exchange-rate snapshot taken at `createOrder` time — the snapshot is stored on-chain purely as an audit
note, never used in contract math. Don't add FX logic to the Solidity side.

### RPC gotcha (the masterplan calls this "risk #1")

BSC's official public RPC endpoint has `eth_getLogs` disabled, and this entire project is an event
reader (indexer, scoring, independent verification all depend on it). Always use a third-party RPC
(`BSC_TESTNET_RPC` / `BSC_TESTNET_RPC_BACKUP` in `.env`, both required), and paginate `eth_getLogs`
calls at ≤4,500 blocks per request (the public limit errors above ~5,000 with `-32005`).
`services/shared/chain.ts` wires viem's `fallback()` between primary and backup RPC — extend that
pattern rather than hardcoding a single endpoint anywhere new.

### AI verifier has a mock mode

If `AI_API_KEY` is unset, `services/verifier` runs in mock mode against fixtures
(`services/verifier/fixtures`) so the full flow works with zero network calls — useful for demoing or
testing without burning API credits. `DEMO_MODE=true` in `.env` is the equivalent switch for cached AI
responses end-to-end.

## Test naming convention (contracts)

Tests are named to mirror the masterplan's numbered spec sections, so `forge test` output reads as a
checklist against the doc:
- `contracts/test/FundPaths.t.sol` — one test per fund path, `test_D0N_<description>` matching §12.3
  D-01…D-09.
- `contracts/test/Invariants.t.sol` — fuzz/invariant tests, `test_INVN_<description>` matching the five
  invariants in §12.3.
- `contracts/test/AccessControl.t.sol` — owner/verifier/arbiter permission boundaries.
- `contracts/test/Base.t.sol` — shared fixtures only, deliberately contains zero `test_*` functions so
  `forge test` output only ever lists real spec-mapped cases.

When adding a new fund path or invariant, add it to the masterplan table first, then name the test
after that ID — don't invent ad hoc test names for contract behavior that's supposed to be spec'd.
