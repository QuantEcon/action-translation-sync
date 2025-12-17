/**
 * Types for the alignment diagnostic tool
 */

// ============================================================================
// CLI OPTIONS
// ============================================================================

export interface DiagnoseOptions {
  source: string;           // Path to source repository
  target: string;           // Path to target repository
  output: string;           // Output file path (base name, suffixes added)
  format: 'markdown' | 'json' | 'both';
  docsFolder: string;       // Subdirectory containing docs (default: '.')
  report: 'all' | 'structure' | 'code' | 'quality';  // Which reports to generate
  maxDiffLines: number;     // Max lines to show in code diffs (default: 50)
  // Quality assessment options (Phase 2)
  apiKey?: string;          // Anthropic API key (required for quality report)
  targetLanguage?: string;  // Target language code (e.g., 'zh-cn')
  glossaryPath?: string;    // Path to glossary JSON file
  skipConfirmation?: boolean; // Skip cost confirmation prompt
  model?: string;           // Model for quality assessment (haiku3_5, haiku4_5, sonnet4_5)
}

// ============================================================================
// FILE ANALYSIS
// ============================================================================

export type FileType = 'markdown' | 'toc' | 'config' | 'environment';
export type AlignmentStatus = 'aligned' | 'likely-aligned' | 'needs-review' | 'diverged' | 'missing' | 'extra';
export type ConfigStatus = 'identical' | 'structure-match' | 'diverged' | 'missing' | 'extra';

// ============================================================================
// CODE BLOCK INTEGRITY (Phase 1b)
// ============================================================================

/**
 * Represents a code block extracted from a document
 */
export interface CodeBlock {
  index: number;              // Position in document (0-based)
  language: string;           // Language tag (e.g., 'python', 'javascript')
  content: string;            // Code content (without fence markers)
  contentNormalized: string;  // Content with comments stripped and normalized
  startLine: number;          // Line number where block starts
}

/**
 * Result of comparing a single code block pair
 */
export interface CodeBlockComparison {
  index: number;
  language: string;
  sourceContent: string;
  targetContent: string;
  sourceNormalized: string;   // Normalized source content
  targetNormalized: string;   // Normalized target content
  match: 'identical' | 'normalized-match' | 'modified' | 'missing' | 'extra';
  differences?: string[];     // Human-readable diff description
  diffLines?: DiffLine[];     // Structured diff for detailed report
}

/**
 * A single line in a diff
 */
export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

/**
 * Code integrity analysis for a file
 */
export interface CodeIntegrity {
  sourceBlocks: number;       // Total code blocks in source
  targetBlocks: number;       // Total code blocks in target
  matchedBlocks: number;      // Blocks that match exactly or normalized
  modifiedBlocks: number;     // Blocks with changes
  missingBlocks: number;      // Blocks in source but not in target
  extraBlocks: number;        // Blocks in target but not in source
  score: number;              // 0-100 integrity score
  comparisons: CodeBlockComparison[];
  issues: string[];
  localizationNote?: string;  // Note if localization patterns detected (e.g., font setup)
}

/**
 * Structural analysis of a markdown file
 */
export interface MarkdownAnalysis {
  file: string;
  fileType: 'markdown';
  source: {
    exists: boolean;
    sections: number;
    subsections: number;
    codeBlocks: number;
    mathBlocks: number;
    wordCount: number;
    headingHierarchy: HeadingInfo[];
  } | null;
  target: {
    exists: boolean;
    sections: number;
    subsections: number;
    codeBlocks: number;
    mathBlocks: number;
    charCount: number;
    headingHierarchy: HeadingInfo[];
    hasHeadingMap: boolean;
  } | null;
  comparison: {
    sectionMatch: boolean;
    subsectionMatch: boolean;
    structureScore: number;     // 0-100
    codeBlockMatch: boolean;
    mathBlockMatch: boolean;
  } | null;
  codeIntegrity: CodeIntegrity | null;  // Phase 1b: detailed code block comparison
  status: AlignmentStatus;
  issues: string[];
}

/**
 * Information about a heading in the document
 */
export interface HeadingInfo {
  level: number;
  id: string;
  text: string;
  subsections: HeadingInfo[];
}

/**
 * Analysis of a config file (_toc.yml, _config.yml, environment.yml)
 */
export interface ConfigAnalysis {
  file: string;
  fileType: 'toc' | 'config' | 'environment';
  source: {
    exists: boolean;
    entries?: number;         // For _toc.yml: chapter count
    keys?: string[];          // For _config.yml: top-level keys
    packages?: number;        // For environment.yml: package count
  } | null;
  target: {
    exists: boolean;
    entries?: number;
    keys?: string[];
    packages?: number;
  } | null;
  comparison: {
    identical: boolean;
    structureMatch: boolean;
    differences: string[];
  } | null;
  status: ConfigStatus;
  issues: string[];
}

// ============================================================================
// DIAGNOSTIC REPORT
// ============================================================================

export interface DiagnosticReport {
  metadata: {
    sourcePath: string;
    targetPath: string;
    docsFolder: string;
    generatedAt: string;
    version: string;
  };
  summary: {
    totalFiles: number;
    markdownFiles: number;
    configFiles: number;
    aligned: number;
    likelyAligned: number;
    needsReview: number;
    diverged: number;
    missing: number;
    extra: number;
  };
  markdownAnalysis: MarkdownAnalysis[];
  configAnalysis: ConfigAnalysis[];
  recommendations: Recommendation[];
}

export interface Recommendation {
  file: string;
  status: AlignmentStatus | ConfigStatus;
  action: RecommendedAction;
  details: string;
}

export type RecommendedAction = 
  | 'ready-for-sync'
  | 'generate-heading-map'
  | 'review-structure'
  | 'manual-merge'
  | 'translate-file'
  | 'review-config'
  | 'update-config';

// ============================================================================
// QUALITY ASSESSMENT (Phase 2)
// ============================================================================

/**
 * Flags indicating specific quality issues found in a translation
 */
export type QualityFlag = 
  | 'inaccurate'      // Meaning changed or wrong
  | 'awkward'         // Unnatural phrasing
  | 'terminology'     // Wrong technical term
  | 'omission'        // Content missing
  | 'addition'        // Extra content added
  | 'formatting';     // MyST formatting issues

/**
 * Quality assessment for a single section
 */
export interface SectionQuality {
  sectionId: string;           // e.g., "introduction"
  heading: string;             // English heading
  translatedHeading: string;   // Target heading
  
  // Scores (0-100)
  accuracyScore: number;       // Meaning preserved?
  fluencyScore: number;        // Natural language?
  terminologyScore: number;    // Correct terms used?
  completenessScore: number;   // Nothing omitted?
  overallScore: number;        // Weighted average
  
  // Issues
  flags: QualityFlag[];        // Specific issues found
  notes: string;               // Assessor notes
}

/**
 * Quality assessment for a file
 */
export interface FileQualityAssessment {
  file: string;
  overallScore: number;        // 0-100 aggregate
  sectionCount: number;        // Total sections assessed
  flaggedCount: number;        // Sections with issues
  sections: SectionQuality[];
}

/**
 * Quality assessment for entire repository
 */
export interface QualityAssessment {
  model: string;               // Model used for assessment
  overallScore: number;        // 0-100 aggregate
  filesAssessed: number;       // Total files assessed
  filesSkipped: number;        // Files skipped (diverged/missing/etc)
  sectionCount: number;        // Total sections assessed
  flaggedCount: number;        // Sections with issues
  
  // Cost tracking
  cost: {
    inputTokens: number;
    outputTokens: number;
    totalUSD: number;
  };
  
  // Breakdown by category
  averageScores: {
    accuracy: number;
    fluency: number;
    terminology: number;
    completeness: number;
  };
  
  // Per-file assessments
  files: FileQualityAssessment[];
}

/**
 * Progress callback for quality assessment
 */
export type ProgressCallback = (current: number, total: number, fileName: string) => void;

/**
 * Options for quality assessment
 */
export interface QualityAssessmentOptions {
  apiKey: string;
  targetLanguage: string;
  glossaryPath?: string;
  skipConfirmation?: boolean;
  maxSections?: number;        // Limit for testing/cost control
  model?: string;              // Model for quality assessment (haiku3_5, haiku4_5, sonnet4_5)
  onProgress?: ProgressCallback; // Progress callback
}

// ============================================================================
// PHASE 3: FILE-CENTRIC DIAGNOSTICS
// ============================================================================

/**
 * Action recommendation for a file
 */
export type FileAction = 
  | 'ok'              // ✅ Ready for sync, no action needed
  | 'resync'          // 🔄 Can auto-sync with action-translation
  | 'review-code'     // 🔧 Code changes need verification
  | 'review-quality'  // 📝 Quality issues need review
  | 'retranslate'     // 🔴 Full retranslation needed
  | 'create'          // 📄 New translation needed (missing)
  | 'diverged';       // ⚠️ Manual structural alignment needed

/**
 * Priority level for triage sorting
 */
export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'ok';

/**
 * Consolidated analysis for a single file
 */
export interface FileDiagnostic {
  file: string;
  
  // Existence
  sourceExists: boolean;
  targetExists: boolean;
  
  // Structure dimension
  structure: {
    score: number;              // 0-100
    sectionMatch: boolean;
    subsectionMatch: boolean;
    sourceSections: number;
    targetSections: number;
    sourceSubsections: number;
    targetSubsections: number;
    hasHeadingMap: boolean;
    issues: string[];
  } | null;
  
  // Code dimension
  code: {
    score: number;              // 0-100
    sourceBlocks: number;
    targetBlocks: number;
    matchedBlocks: number;
    modifiedBlocks: number;
    missingBlocks: number;
    extraBlocks: number;
    hasLocalizationChanges: boolean;  // i18n patterns detected
    issues: string[];
  } | null;
  
  // Quality dimension (optional, only if assessed)
  quality?: {
    score: number;              // 0-100
    sectionCount: number;
    flaggedCount: number;
    issues: string[];
  };
  
  // Recommendation
  action: FileAction;
  priority: Priority;
  reason: string;               // Human-readable explanation
}

/**
 * Result of triaging a series
 */
export interface TriageResult {
  metadata: {
    sourceRepo: string;         // Repo name extracted from path
    sourcePath: string;         // Full source path
    targetPath: string;         // Full target path
    docsFolder: string;
    generatedAt: string;
    version: string;
  };
  
  summary: {
    totalFiles: number;
    ok: number;
    needsAttention: number;
    byAction: Record<FileAction, number>;
  };
  
  // Files sorted by priority
  files: FileDiagnostic[];
  
  // Only files needing attention (for default report)
  filesNeedingAttention: FileDiagnostic[];
}

/**
 * Options for triage command
 */
export interface TriageOptions {
  source: string;               // Path to source repository
  target: string;               // Path to target repository
  docsFolder: string;           // Subdirectory containing docs (default: '.')
  output: string;               // Output directory (default: './status')
  all: boolean;                 // Generate reports for ALL files (not just flagged)
}

/**
 * Options for file command
 */
export interface FileOptions {
  file: string;                 // Filename to diagnose
  source: string;               // Path to source repository
  target: string;               // Path to target repository
  docsFolder: string;           // Subdirectory containing docs (default: '.')
  output: string;               // Output directory (default: './status')
  glossaryPath?: string;        // Optional glossary for quality check
  targetLanguage?: string;      // Target language code
  apiKey?: string;              // API key for quality check
}

// ============================================================================
// REUSE FROM MAIN PROJECT
// ============================================================================

// Re-export types from main project that we need
export { Section, ParsedSections, DocumentComponents } from '../../src/types';
