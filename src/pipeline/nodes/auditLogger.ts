/**
 * Final node — compiles the complete audit trail.
 *
 * In production this would persist to an immutable audit_log table.
 * Every AI-assisted output in Nodalum must be fully traceable:
 * who requested it, which model generated it, which rules verified it,
 * and what action was taken on it.
 */

import { PipelineState } from "../state";
import { AuditEntry } from "../artifacts";

export function auditLoggerNode(
  state: PipelineState
): Partial<PipelineState> {
  const summary = {
    matterId:        state.matterId,
    tenantId:        state.tenantId,
    pipelineResult:  state.verified ? "PASSED" : "FAILED_MAX_RETRIES",
    artifactCount:   state.artifacts.length,
    verifiedCount:   state.artifacts.filter((a) => a.verified).length,
    totalRetries:    state.retryCount,
    auditEntries:    state.auditLog.length + 1, // +1 for this entry
    artifacts: state.artifacts.map((a) => ({
      id:       a.artifactId,
      type:     a.artifactType,
      verified: a.verified,
      errors:   a.verificationErrors,
    })),
  };

  // In production: INSERT INTO audit_log (tenant_id, matter_id, payload) VALUES (...)
  console.log("\n=== NODALUM AUDIT TRAIL ===");
  console.log(JSON.stringify(summary, null, 2));

  const finalEntry: AuditEntry = {
    timestamp:  new Date().toISOString(),
    node:       "audit_logger",
    action:     "pipeline_complete",
    details:    summary,
  };

  return {
    auditLog:    [finalEntry],
    currentNode: "audit_logger",
  };
}
