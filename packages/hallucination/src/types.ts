export type ClaimTrace = {
  claim: string;
  sourceFields: string[];
  verified: boolean;
  confidence: number; // 0..1
  explanation: string;
};

export type HallucinationTrace = {
  caseId: string;
  runId: string;
  traces: ClaimTrace[];
  summary: {
    totalClaims: number;
    unsupportedClaims: number;
    unsupportedRate: number;
    maxConfidenceUnsupported: number;
  };
};

