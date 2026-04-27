import { ChatAnthropic } from "@langchain/anthropic";
import { randomUUID } from "crypto";
import { PipelineState } from "../state";
import { IssueMapSchema, IssueMap, LegalArtifact, AuditEntry, CaseFileMap } from "../artifacts";

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5",
  maxTokens: 1024,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const structuredLlm = llm.withStructuredOutput(IssueMapSchema as any, {
  name: "extract_issue_map",
});

export async function analysisNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const artifactId = randomUUID();

  const caseFileArtifact = state.artifacts.find(
    (a) => a.artifactType === "case_file_map"
  );

  if (!caseFileArtifact) {
    return {
      errors: ["analysis: no case_file_map found in state"],
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          node: "analysis",
          action: "error_no_case_file_map",
          details: {},
        },
      ],
    };
  }

  const caseFile = caseFileArtifact.content as CaseFileMap;

  const content = (await structuredLlm.invoke([
    {
      role: "system",
      content:
        "You are a senior Italian commercial litigation specialist. " +
        "Given a structured case file, identify the key legal issues, " +
        "map each to the applicable Italian legal standard (Civil Code article, " +
        "Legislative Decree, or established case law), and assess the strength " +
        "of each issue on a 0-10 scale.",
    },
    {
      role: "user",
      content:
        `Identify legal issues for matter ID "${state.matterId}".\n\n` +
        `Case File:\n${JSON.stringify(caseFile, null, 2)}`,
    },
  ])) as IssueMap;

  const artifact: LegalArtifact = {
    artifactId,
    artifactType: "issue_map",
    content,
    generatedAt: new Date().toISOString(),
    verified: false,
    verificationErrors: [],
  };

  const auditEntry: AuditEntry = {
    timestamp: new Date().toISOString(),
    node: "analysis",
    action: "issue_map_generated",
    artifactId,
    details: {
      model: "claude-sonnet-4-5",
      issueCount: content.issues.length,
      retryCount: state.retryCount,
    },
  };

  return {
    artifacts: [artifact],
    auditLog: [auditEntry],
    currentNode: "analysis",
  };
}
