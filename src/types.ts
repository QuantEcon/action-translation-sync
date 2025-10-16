/**
 * Types and interfaces for the translation sync action
 */

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

export interface GlossaryTerm {
  en: string;
  context?: string;
  [key: string]: string | undefined; // Support for multiple target languages
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

export type BlockType = 
  | 'heading' 
  | 'paragraph' 
  | 'code' 
  | 'list' 
  | 'math' 
  | 'directive'
  | 'blockquote'
  | 'table'
  | 'thematic_break'
  | 'html';

export interface Block {
  type: BlockType;
  content: string;
  id?: string;              // For headings (anchor)
  parentHeading?: string;   // Structural context
  startLine: number;
  endLine: number;
  level?: number;           // For headings
  language?: string;        // For code blocks
  meta?: string;            // For code blocks metadata
  depth?: number;           // Nesting level
}

export interface ParsedDocument {
  blocks: Block[];
  metadata: {
    filepath: string;
    totalLines: number;
    hasDirectives: boolean;
    hasMath: boolean;
    hasCode: boolean;
  };
}

export type ChangeType = 'added' | 'modified' | 'deleted';

export interface ChangeBlock {
  type: ChangeType;
  oldBlock?: Block;
  newBlock?: Block;
  anchor?: string;          // Reference point in document
  position?: {
    afterId?: string;
    underHeading?: string;
    index?: number;
  };
}

export type ReplaceStrategy = 'exact-match' | 'insert' | 'delete';

export interface BlockMapping {
  change: ChangeBlock;
  targetBlock?: Block;
  insertAfter?: Block;
  replaceStrategy: ReplaceStrategy;
  confidence?: number;      // For fuzzy matching
}

export interface TranslatedBlock {
  mapping: BlockMapping;
  translatedContent: string | null; // null for deletions
}

export interface TranslationRequest {
  mode: 'diff' | 'full';
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Glossary;
  content: {
    // For diff mode
    blocks?: ChangeBlock[];
    existingTranslation?: string;
    contextBefore?: string;
    contextAfter?: string;
    // For full mode
    fullContent?: string;
  };
}

export interface TranslationResult {
  success: boolean;
  translatedContent?: string;
  error?: string;
  tokensUsed?: number;
}

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
