import { ChatAnthropic } from "@langchain/anthropic";
import { randomUUID } from "crypto";
import { PipelineState } from "../state";
import { CaseFileMapSchema, LegalArtifact, AuditEntry } from "../artifacts";

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5",
  maxTokens: 1024,
});

const structuredLlm = llm.withStructuredOutput(CaseFileMapSchema, {
  name: "extract_case_file_map",
});

export async function intakeNode(
  state: PipelineState
): Promise<Partial<PipelineState>> {
  const artifactId = randomUUID();

  const content = await structuredLlm.invoke([
    {
      role: "system",
      content:
        "You are a legal document intake specialist for Italian commercial litigation. " +
        "Extract structured case information from the provided text. " +
        "Be precise — output only what is explicitly stated in the text.",
    },
    {
      role: "user",
      content:
        `Extract the case file map for matter ID "${state.matterId}".\n\n` +
        `Case text:\n${state.rawInput}`,
    },
  ]);

  const artifact: LegalArtifact = {
    artifactId,
    artifactType: "case_file_map",
    content,
    generatedAt: new Date().toISOString(),
    verified: false,
    verificationErrors: [],
  };

  const auditEntry: AuditEntry = {
    timestamp: new Date().toISOString(),
    node: "intake",
    action: "case_file_map_generated",
    artifactId,
    details: { model: "claude-sonnet-4-5", matterId: state.matterId },
  };

  return {
    artifacts: [artifact],
    auditLog: [auditEntry],
    currentNode: "intake",
  };
}
