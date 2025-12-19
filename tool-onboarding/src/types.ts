/**
 * Type definitions for tool-onboarding
 */

// =============================================================================
// ACTION TYPES
// =============================================================================

export type ActionType = 'SYNC' | 'BACKPORT' | 'ACCEPT LOCALISATION' | 'MANUAL REVIEW';

export type RegionStatus = 'aligned' | 'differs' | 'missing' | 'inserted';

export type BlockStatus = 'aligned' | 'modified' | 'inserted' | 'inserted-i18n' | 'missing';

// =============================================================================
// CODE ANALYSIS
// =============================================================================

export interface CodeBlock {
  content: string;
  contentNormalized: string;
  language: string;
  startLine: number;
  endLine: number;
}

export interface BlockMapping {
  srcIdx: number | null;  // null = no source block (inserted in target)
  tgtIdx: number | null;  // null = no target block (missing from target)
  status: BlockStatus;
  sourceLines: number;
  targetLines: number;
  language: string;
  notes?: string[];
}

export interface CodeAnalysisResult {
  sourceBlocks: number;
  targetBlocks: number;
  aligned: number;
  modified: number;
  inserted: number;
  insertedI18n: number;
  missing: number;
  score: number;
  mappings: BlockMapping[];
}

// =============================================================================
// DECISIONS
// =============================================================================

export interface DecisionItem {
  id: string;                    // e.g., "section-2" or "code-block-1"
  region: string;                // e.g., "Section 2" or "Code Block 1"
  type: 'prose' | 'code';
  status: RegionStatus;
  startLine: number;             // Line number for document order sorting
  sourceHeading?: string;
  targetHeading?: string;
  sourceContent?: string;
  targetContent?: string;
  issue?: string;
  issueType?: string;            // For prose: TITLE, CONTENT, or TITLE, CONTENT
  recommendation?: ActionType;
  notes?: string[];              // General notes (used for code blocks)
  titleNotes?: string[];         // Title-specific notes (for prose)
  contentNotes?: string[];       // Content-specific notes (for prose)
  srcIdx?: number | null;        // Source block index (for code blocks)
  tgtIdx?: number | null;        // Target block index (for code blocks)
}

export interface FileDecisions {
  file: string;
  status: 'aligned' | 'review' | 'translate' | 'suggest' | 'error';
  sourceDate?: string;
  targetDate?: string;
  decisions: DecisionItem[];
  counts: {
    sync: number;
    backport: number;
    accept: number;
    manual: number;
    aligned: number;
  };
}

// =============================================================================
// FILE ANALYSIS
// =============================================================================

export interface FileResult {
  file: string;
  status: 'aligned' | 'review' | 'translate' | 'suggest' | 'error';
  sourceDate?: string;
  targetDate?: string;
  codeScore?: number;
  proseStatus?: 'aligned' | 'review';
  decisions?: FileDecisions;
  error?: string;
}

// =============================================================================
// CONFIG ANALYSIS
// =============================================================================

export interface ConfigAnalysis {
  file: string;
  sourceExists: boolean;
  targetExists: boolean;
  status: 'identical' | 'differs' | 'missing' | 'extra';
  differences?: string[];
  sourceEntries?: number;  // For _toc.yml: number of entries
  targetEntries?: number;
}

// =============================================================================
// THRESHOLDS
// =============================================================================

export interface Thresholds {
  code: {
    aligned: number;    // >= this = code aligned (default: 90)
    review: number;     // >= this = needs review, < this = manual (default: 70)
  };
  prose: {
    aligned: number;    // >= this = prose aligned (default: 90)
    review: number;     // >= this = needs review (default: 70)
  };
}

// =============================================================================
// CLI OPTIONS
// =============================================================================

export interface OnboardOptions {
  source: string;
  target: string;
  docsFolder: string;
  language: string;
  model: string;
  output?: string;
  file?: string;
  limit?: number;
  codeOnly?: boolean;
  checkConfig?: boolean;
  codeAligned?: number;
  codeReview?: number;
  proseAligned?: number;
  proseReview?: number;
  debug?: boolean;  // Save raw Claude responses for evaluation
}
