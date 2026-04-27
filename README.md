# LangGraph Legal AI Pipeline — Verification-First Demo

Staged agent pipeline built with LangGraph (TypeScript). Produces structured legal artifacts, runs every output through a deterministic verifier before it leaves the pipeline, and maintains a full audit trail throughout.

---

## Pipeline

```
intake → analysis → verifier ──(pass)──→ audit_logger
             ↑          │
             └──(fail)──┘  retries up to 2x, then audits the failure
```

| Node | Type | What it does |
|---|---|---|
| `intake` | AI | Extracts structured `CaseFileMap` from raw case text |
| `analysis` | AI | Maps legal issues to applicable law → `IssueMap` |
| `verifier` | **Deterministic** | Validates every artifact against hard rules — zero AI calls |
| `audit_logger` | Deterministic | Compiles full trace: nodes run, artifacts produced, errors, retries |

---

## Stack

- TypeScript / Node.js
- LangGraph (`@langchain/langgraph`)
- Claude (`claude-sonnet-4-5`) via `@langchain/anthropic`
- Zod for structured output schemas and runtime validation
- Jest for verifier unit tests

---

## Setup

```bash
npm install
cp .env.example .env    # add ANTHROPIC_API_KEY
```

Run the full pipeline against a sample Italian commercial litigation matter:

```bash
npm start
```

Run verifier unit tests (no API key required):

```bash
npm test
```

---

## What the verifier enforces

Every artifact must pass before the pipeline continues. Rules are deterministic — no AI involved:

- Required fields all present and non-empty
- `matterId` matches the matter being processed (no hallucinated IDs)
- Every legal issue has a `legalStandard` mapped (e.g. `Art. 1218 Civil Code`)
- Strength scores within valid range
- Schema validated via Zod

If an artifact fails, the pipeline retries the AI node. After 2 retries, the failure is audited and the pipeline exits cleanly — bad output is never returned to the caller.

---

## Audit trail

Every node appends a timestamped entry. The final audit record includes:

- Which artifacts were generated and by which node
- Verified / failed status per artifact
- Any validation errors
- Number of retries
- Pipeline result: `PASSED` or `FAILED_MAX_RETRIES`
