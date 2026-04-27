import { z } from "zod";

// ── Artifact types ────────────────────────────────────────────────────────────
// Each represents one stage of the Nodalum pipeline output.
// Zod schemas serve double duty: structured output parsing + runtime validation.

export const CaseFileMapSchema = z.object({
  matterId: z.string(),
  parties: z.array(z.string()).min(1),
  jurisdiction: z.string().min(1),
  legalArea: z.string().min(1),
  keyDates: z.array(
    z.object({ date: z.string(), event: z.string() })
  ),
  coreFacts: z.array(z.string()).min(1),
  proceduralStage: z.string().min(1),
});

export const IssueMapSchema = z.object({
  matterId: z.string(),
  issues: z.array(
    z.object({
      issue: z.string(),
      legalStandard: z.string().min(1),
      burden: z.string(),
      strength: z.number().min(0).max(10),
    })
  ).min(1),
  primaryIssue: z.string().min(1),
});

export type CaseFileMap = z.infer<typeof CaseFileMapSchema>;
export type IssueMap = z.infer<typeof IssueMapSchema>;

// ── Wrapper stored in pipeline state ─────────────────────────────────────────

export type ArtifactType = "case_file_map" | "issue_map";

export interface LegalArtifact {
  artifactId: string;
  artifactType: ArtifactType;
  content: CaseFileMap | IssueMap;
  generatedAt: string;
  verified: boolean;
  verificationErrors: string[];
}

export interface AuditEntry {
  timestamp: string;
  node: string;
  action: string;
  artifactId?: string;
  details: Record<string, unknown>;
}
