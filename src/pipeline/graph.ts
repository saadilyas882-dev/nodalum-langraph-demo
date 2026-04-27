import { StateGraph, START, END } from "@langchain/langgraph";
import { PipelineAnnotation, PipelineState } from "./state";
import { intakeNode }      from "./nodes/intake";
import { analysisNode }    from "./nodes/analysis";
import { verifierNode, MAX_RETRIES } from "./nodes/verifier";
import { auditLoggerNode } from "./nodes/auditLogger";

/**
 * Routing logic after verification.
 *
 * verified       → proceed to audit_logger
 * not verified, retries remain → back to analysis (retry)
 * not verified, retries exhausted → audit_logger (fail-audited)
 *
 * Fail-audited means: the pipeline records the failure with full
 * traceability rather than silently dropping or returning bad output.
 */
function routeAfterVerify(state: PipelineState): "audit_logger" | "analysis" {
  if (state.verified) return "audit_logger";
  if (state.retryCount > MAX_RETRIES) return "audit_logger";
  return "analysis";
}

export function buildPipeline() {
  const graph = new StateGraph(PipelineAnnotation)
    .addNode("intake",       intakeNode)
    .addNode("analysis",     analysisNode)
    .addNode("verifier",     verifierNode)
    .addNode("audit_logger", auditLoggerNode)
    .addEdge(START,      "intake")
    .addEdge("intake",   "analysis")
    .addEdge("analysis", "verifier")
    .addConditionalEdges("verifier", routeAfterVerify, {
      audit_logger: "audit_logger",
      analysis:     "analysis",
    })
    .addEdge("audit_logger", END);

  return graph.compile();
}
