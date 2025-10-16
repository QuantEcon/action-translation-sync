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
}
export interface GlossaryTerm {
    en: string;
    context?: string;
    [key: string]: string | undefined;
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
export type BlockType = 'heading' | 'paragraph' | 'code' | 'list' | 'math' | 'directive' | 'blockquote' | 'table' | 'thematic_break' | 'html';
export interface Block {
    type: BlockType;
    content: string;
    id?: string;
    parentHeading?: string;
    startLine: number;
    endLine: number;
    level?: number;
    language?: string;
    meta?: string;
    depth?: number;
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
    anchor?: string;
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
    confidence?: number;
}
export interface TranslatedBlock {
    mapping: BlockMapping;
    translatedContent: string | null;
}
export interface TranslationRequest {
    mode: 'diff' | 'full';
    sourceLanguage: string;
    targetLanguage: string;
    glossary?: Glossary;
    content: {
        blocks?: ChangeBlock[];
        existingTranslation?: string;
        contextBefore?: string;
        contextAfter?: string;
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
//# sourceMappingURL=types.d.ts.map