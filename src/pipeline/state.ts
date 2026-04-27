import { Annotation } from "@langchain/langgraph";
import { LegalArtifact, AuditEntry } from "./artifacts";

// Reducers for append-only fields — each node returns a slice,
// LangGraph merges it into the running state using these functions.

const appendReducer = <T>(current: T[], update: T[]): T[] => [
  ...current,
  ...update,
];

export const PipelineAnnotation = Annotation.Root({
  matterId:    Annotation<string>,
  tenantId:    Annotation<string>,
  rawInput:    Annotation<string>,

  // Append-only — nodes push new artifacts; they are never overwritten
  artifacts:  Annotation<LegalArtifact[]>({
    reducer:  appendReducer,
    default:  () => [],
  }),

  // Full audit trail — every node appends its own entry
  auditLog:   Annotation<AuditEntry[]>({
    reducer:  appendReducer,
    default:  () => [],
  }),

  // Verification errors from the last verifier run
  errors:     Annotation<string[]>({
    reducer:  (_, update) => update, // replace, not append
    default:  () => [],
  }),

  verified:   Annotation<boolean>({
    reducer:  (_, update) => update,
    default:  () => false,
  }),

  retryCount: Annotation<number>({
    reducer:  (_, update) => update,
    default:  () => 0,
  }),

  currentNode: Annotation<string>({
    reducer:  (_, update) => update,
    default:  () => "",
  }),
});

export type PipelineState = typeof PipelineAnnotation.State;
