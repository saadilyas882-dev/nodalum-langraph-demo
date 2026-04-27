/**
 * Deterministic verifier — zero AI calls.
 *
 * Every artifact produced by the pipeline passes through this node.
 * Rules are hard-coded logic, not heuristics. A passing artifact is
 * provably correct against these rules; a failing artifact is never
 * shown to the user and triggers a retry.
 *
 * This is the core of Nodalum's verification-first architecture:
 * AI generates, deterministic logic certifies.
 */

import { PipelineState } from "../state";
import { AuditEntry, CaseFileMap, IssueMap, LegalArtifact } from "../artifacts";
import { CaseFileMapSchema, IssueMapSchema } from "../artifacts";

const MAX_RETRIES = 2;

// ── Per-type verifiers ────────────────────────────────────────────────────────

function verifyCaseFileMap(content: unknown, matterId: string): string[] {
  const errors: string[] = [];
  const parsed = CaseFileMapSchema.safeParse(content);

  if (!parsed.success) {
    parsed.error.errors.forEach((e) =>
      errors.push(`case_file_map schema: ${e.path.join(".")} — ${e.message}`)
    );
    return errors;
  }

  const data = parsed.data as CaseFileMap;

  if (data.matterId !== matterId) {
    errors.push(`case_file_map: matterId mismatch — expected "${matterId}", got "${data.matterId}"`);
  }
  if (data.parties.length === 0) {
    errors.push("case_file_map: parties array is empty");
  }
  if (!data.jurisdiction.trim()) {
    errors.push("case_file_map: jurisdiction is blank");
  }
  if (data.coreFacts.length === 0) {
    errors.push("case_file_map: coreFacts array is empty");
  }

  return errors;
}

function verifyIssueMap(content: unknown, matterId: string): string[] {
  const errors: string[] = [];
  const parsed = IssueMapSchema.safeParse(content);

  if (!parsed.success) {
    parsed.error.errors.forEach((e) =>
      errors.push(`issue_map schema: ${e.path.join(".")} — ${e.message}`)
    );
    return errors;
  }

  const data = parsed.data as IssueMap;

  if (data.matterId !== matterId) {
    errors.push(`issue_map: matterId mismatch — expected "${matterId}", got "${data.matterId}"`);
  }
  if (data.issues.length === 0) {
    errors.push("issue_map: issues array is empty");
  }
  data.issues.forEach((issue, i) => {
    if (!issue.legalStandard.trim()) {
      errors.push(`issue_map: issue[${i}] "${issue.issue}" missing legalStandard`);
    }
  });
  if (!data.primaryIssue.trim()) {
    errors.push("issue_map: primaryIssue is blank");
  }

  return errors;
}

const VERIFIERS: Record<
  string,
  (content: unknown, matterId: string) => string[]
> = {
  case_file_map: verifyCaseFileMap,
  issue_map: verifyIssueMap,
};

// ── Node ─────────────────────────────────────────────────────────────────────

export function verifierNode(
  state: PipelineState
): Partial<PipelineState> {
  const allErrors: string[] = [];

  // Verify every unverified artifact
  const updatedArtifacts: LegalArtifact[] = state.artifacts.map((artifact) => {
    if (artifact.verified) return artifact; // already passed in a prior run

    const verify = VERIFIERS[artifact.artifactType];
    if (!verify) return artifact; // unknown type — pass through

    const errors = verify(artifact.content, state.matterId);
    allErrors.push(...errors);

    return { ...artifact, verified: errors.length === 0, verificationErrors: errors };
  });

  const verified = allErrors.length === 0;
  const newRetryCount = state.retryCount + (verified ? 0 : 1);

  const auditEntry: AuditEntry = {
    timestamp: new Date().toISOString(),
    node: "verifier",
    action: verified ? "verification_passed" : "verification_failed",
    details: {
      verified,
      errorCount: allErrors.length,
      errors: allErrors,
      retryCount: newRetryCount,
      willRetry: !verified && newRetryCount <= MAX_RETRIES,
    },
  };

  // Replace artifacts with updated verification state
  // We use a workaround: return the full updated array under a key the
  // reducer handles. Because artifacts uses an append reducer we need
  // to emit only the diff — but here we need to mutate existing entries.
  // Solution: clear and re-emit. The graph state is the source of truth.
  return {
    artifacts: updatedArtifacts,  // overwrite via a custom reducer set in graph
    verified,
    errors: allErrors,
    retryCount: newRetryCount,
    auditLog: [auditEntry],
    currentNode: "verifier",
  };
}

export { MAX_RETRIES };

// Exported for unit tests
export { verifyCaseFileMap, verifyIssueMap };
