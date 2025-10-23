/**
 * Types and interfaces for the translation sync action
 * 
 * This action uses a SECTION-BASED approach:
 * - Documents are parsed into sections based on ## headings
 * - Changes are detected at the section level
 * - Translations are performed on entire sections with full context
 * - Documents are reconstructed from translated sections
 */

// ============================================================================
// ACTION CONFIGURATION
// ============================================================================

export interface ActionInputs {
  targetRepo: string;
  targetLanguage: string;
  docsFolder: string;
  sourceLanguage: string;
  glossaryPath: string;
  tocFile: string;
  anthropicApiKey: string;
  claudeModel: string;
  githubToken: string;
  prLabels: string[];
  prReviewers: string[];
  prTeamReviewers: string[];
}

// ============================================================================
// GLOSSARY
// ============================================================================

export interface GlossaryTerm {
  en: string;
  context?: string;
  [key: string]: string | undefined; // Support for multiple target languages (zh-cn, ja, etc.)
}

export interface Glossary {
  version: string;
  terms: GlossaryTerm[];
  style_guide?: {
    preserve_code_blocks?: boolean;
    preserve_math?: boolean;
    preserve_citations?: boolean;
    preserve_myst_directives?: boolean;
  };
}

// ============================================================================
// SECTION-BASED PARSING
// ============================================================================

/**
 * A section represents a ## heading and all its content (including subsections)
 * until the next ## heading
 */
export interface Section {
  heading: string;          // Full heading text: "## Economic Models"
  level: number;            // Heading level: 2 (for ##)
  id: string;               // Anchor/slug: "economic-models"
  content: string;          // Full markdown content of section (including subsections)
  startLine: number;        // Starting line in original document
  endLine: number;          // Ending line in original document
  parentId?: string;        // ID of parent section (for nested sections)
  subsections: Section[];   // Nested subsections (### headings)
}

export interface ParsedSections {
  sections: Section[];
  frontmatter?: string;     // YAML frontmatter (if present)
  preamble?: string;        // Content before first ## heading (title, intro, etc.)
  metadata: {
    filepath: string;
    totalLines: number;
    sectionCount: number;
  };
}

/**
 * Document broken into explicit components
 * Every valid document has: CONFIG + TITLE + INTRO + SECTIONS
 * - INTRO and SECTIONS can be empty
 */
export interface DocumentComponents {
  config: string;           // YAML frontmatter (always present, even if empty)
  title: string;            // The # heading line (e.g., "# Introduction to Economics")
  titleText: string;        // Just the heading text (e.g., "Introduction to Economics")
  intro: string;            // Content between # title and first ## (can be empty)
  sections: Section[];      // All ## level sections (can be empty array)
  metadata: {
    filepath: string;
    totalLines: number;
    sectionCount: number;
  };
}

// ============================================================================
// SECTION-BASED DIFF DETECTION
// ============================================================================

export type SectionChangeType = 'added' | 'modified' | 'deleted';

/**
 * Represents a change at the section level
 */
export interface SectionChange {
  type: SectionChangeType;
  oldSection?: Section;     // For modified/deleted
  newSection?: Section;     // For modified/added
  position?: {              // For added sections
    afterSectionId?: string;
    parentSectionId?: string;
    index?: number;         // Position among siblings
  };
}

// ============================================================================
// SECTION-BASED TRANSLATION
// ============================================================================

/**
 * Request to translate a section
 * - 'update' mode: Claude sees old/new English + current translation → produces updated translation
 * - 'new' mode: Claude sees new English → produces new translation
 */
export interface SectionTranslationRequest {
  mode: 'update' | 'new';
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Glossary;
  // For update mode
  oldEnglish?: string;      // Current English section
  newEnglish?: string;      // Updated English section
  currentTranslation?: string;  // Current translation (generalized from currentChinese)
  // For new mode
  englishSection?: string;  // New English section to translate
}

export interface SectionTranslationResult {
  success: boolean;
  translatedSection?: string;
  error?: string;
  tokensUsed?: number;
}

/**
 * Request to translate a full document (for new files)
 */
export interface FullDocumentTranslationRequest {
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Glossary;
  content: string;
}

// ============================================================================
// FILE PROCESSING & GITHUB
// ============================================================================

export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface SyncResult {
  success: boolean;
  filesProcessed: number;
  prUrl?: string;
  errors: string[];
}

export interface TranslatedFile {
  path: string;
  content: string;
  sha?: string; // SHA of existing file (for updates)
}
