/**
 * Types for Translation Quality Evaluation
 */

export interface PRPair {
  sourceNumber: number;
  targetNumber: number;
  sourceTitle: string;
  targetTitle: string;
  sourceBranch: string;
  targetBranch: string;
  sourceUrl: string;
  targetUrl: string;
  testScenario: string;
}

export interface FileDiff {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
  previousFilename?: string;
}

export interface TranslationContext {
  sourceEnglish: string;
  targetChinese: string;
}

export interface TranslationQualityResult {
  score: number; // 1-10
  accuracy: number; // 1-10: Does it accurately convey the English meaning?
  fluency: number; // 1-10: Does it read naturally in Chinese?
  terminology: number; // 1-10: Is technical terminology consistent?
  formatting: number; // 1-10: Is MyST/math/code preserved?
  issues: string[];
  strengths: string[];
  summary: string;
}

export interface DiffQualityResult {
  score: number; // 1-10
  scopeCorrect: boolean; // Only intended files changed?
  positionCorrect: boolean; // Changes in correct document locations?
  structurePreserved: boolean; // Document structure maintained?
  headingMapCorrect: boolean; // Heading-map properly updated?
  issues: string[];
  summary: string;
  scopeDetails: string;
  positionDetails: string;
  structureDetails: string;
}

export interface EvaluationResult {
  prPair: PRPair;
  timestamp: string;
  translationQuality: TranslationQualityResult;
  diffQuality: DiffQualityResult;
  overallScore: number;
  overallVerdict: 'PASS' | 'WARN' | 'FAIL';
  reviewComment: string;
}

export interface EvaluationReport {
  generatedAt: string;
  evaluator: string;
  sourceRepo: string;
  targetRepo: string;
  prPairsEvaluated: number;
  results: EvaluationResult[];
  summary: {
    passed: number;
    warned: number;
    failed: number;
    averageTranslationScore: number;
    averageDiffScore: number;
    commonIssues: string[];
  };
}

export interface EvaluationOptions {
  anthropicApiKey: string;
  githubToken: string;
  dryRun: boolean;
  prNumber?: number; // Specific source PR to evaluate, or all open if undefined
  postReviews: boolean; // Post review comments to PRs
  outputFile?: string; // Path for report output
}
