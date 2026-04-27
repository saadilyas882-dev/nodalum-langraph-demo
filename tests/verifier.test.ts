/**
 * Unit tests for the deterministic verifier.
 *
 * These run with zero AI calls — pure logic.
 * They prove that the verifier correctly certifies valid artifacts
 * and catches every class of invalid artifact.
 */

import { verifyCaseFileMap, verifyIssueMap } from "../src/pipeline/nodes/verifier";

const MATTER_ID = "matter-test-001";

// ── CaseFileMap verifier ──────────────────────────────────────────────────────

describe("verifyCaseFileMap", () => {
  const valid = {
    matterId:        MATTER_ID,
    parties:         ["Marco Rossi", "Technovate S.r.l."],
    jurisdiction:    "Tribunale di Milano",
    legalArea:       "Commercial Law",
    keyDates:        [{ date: "2024-01-15", event: "Complaint filed" }],
    coreFacts:       ["Defendant failed to provide financial statements"],
    proceduralStage: "Preliminary hearing",
  };

  test("valid artifact passes with zero errors", () => {
    expect(verifyCaseFileMap(valid, MATTER_ID)).toHaveLength(0);
  });

  test("wrong matterId produces error", () => {
    const errors = verifyCaseFileMap({ ...valid, matterId: "wrong-id" }, MATTER_ID);
    expect(errors.some((e) => e.includes("matterId mismatch"))).toBe(true);
  });

  test("empty parties produces error", () => {
    const errors = verifyCaseFileMap({ ...valid, parties: [] }, MATTER_ID);
    expect(errors.some((e) => e.includes("parties"))).toBe(true);
  });

  test("blank jurisdiction produces error", () => {
    const errors = verifyCaseFileMap({ ...valid, jurisdiction: "" }, MATTER_ID);
    expect(errors.some((e) => e.includes("jurisdiction"))).toBe(true);
  });

  test("empty coreFacts produces error", () => {
    const errors = verifyCaseFileMap({ ...valid, coreFacts: [] }, MATTER_ID);
    expect(errors.some((e) => e.includes("coreFacts"))).toBe(true);
  });

  test("missing required field produces schema error", () => {
    const { proceduralStage, ...missing } = valid;
    const errors = verifyCaseFileMap(missing, MATTER_ID);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ── IssueMap verifier ─────────────────────────────────────────────────────────

describe("verifyIssueMap", () => {
  const valid = {
    matterId: MATTER_ID,
    issues: [
      {
        issue:         "Breach of shareholders agreement",
        legalStandard: "Italian Civil Code Art. 2467",
        burden:        "Plaintiff",
        strength:      7,
      },
    ],
    primaryIssue: "Breach of shareholders agreement — failure to provide financial statements",
  };

  test("valid artifact passes with zero errors", () => {
    expect(verifyIssueMap(valid, MATTER_ID)).toHaveLength(0);
  });

  test("wrong matterId produces error", () => {
    const errors = verifyIssueMap({ ...valid, matterId: "wrong" }, MATTER_ID);
    expect(errors.some((e) => e.includes("matterId mismatch"))).toBe(true);
  });

  test("empty issues array produces error", () => {
    const errors = verifyIssueMap({ ...valid, issues: [] }, MATTER_ID);
    expect(errors.some((e) => e.includes("issues"))).toBe(true);
  });

  test("issue with blank legalStandard produces error", () => {
    const errors = verifyIssueMap(
      {
        ...valid,
        issues: [{ ...valid.issues[0], legalStandard: "" }],
      },
      MATTER_ID
    );
    expect(errors.some((e) => e.includes("legalStandard"))).toBe(true);
  });

  test("blank primaryIssue produces error", () => {
    const errors = verifyIssueMap({ ...valid, primaryIssue: "" }, MATTER_ID);
    expect(errors.some((e) => e.includes("primaryIssue"))).toBe(true);
  });

  test("strength out of range (0-10) produces schema error", () => {
    const errors = verifyIssueMap(
      {
        ...valid,
        issues: [{ ...valid.issues[0], strength: 15 }],
      },
      MATTER_ID
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  test("multiple issues — all must have legalStandard", () => {
    const errors = verifyIssueMap(
      {
        ...valid,
        issues: [
          valid.issues[0],
          { issue: "Second issue", legalStandard: "", burden: "Defendant", strength: 4 },
        ],
      },
      MATTER_ID
    );
    expect(errors.some((e) => e.includes("legalStandard"))).toBe(true);
  });
});
