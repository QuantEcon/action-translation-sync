/**
 * Types for the alignment diagnostic tool
 */

// ============================================================================
// CLI OPTIONS
// ============================================================================

export interface DiagnoseOptions {
  source: string;           // Path to source repository
  target: string;           // Path to target repository
  output: string;           // Output file path
  format: 'markdown' | 'json' | 'both';
  docsFolder: string;       // Subdirectory containing docs (default: '.')
}

// ============================================================================
// FILE ANALYSIS
// ============================================================================

export type FileType = 'markdown' | 'toc' | 'config' | 'environment';
export type AlignmentStatus = 'aligned' | 'likely-aligned' | 'needs-review' | 'diverged' | 'missing' | 'extra';
export type ConfigStatus = 'identical' | 'structure-match' | 'diverged' | 'missing' | 'extra';

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

export type FileAnalysis = MarkdownAnalysis | ConfigAnalysis;

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
// REUSE FROM MAIN PROJECT
// ============================================================================

// Re-export types from main project that we need
export { Section, ParsedSections, DocumentComponents } from '../../src/types';
