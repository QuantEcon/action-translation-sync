/**
 * Types and interfaces for the translation sync action
 *
 * This action uses a SECTION-BASED approach:
 * - Documents are parsed into sections based on ## headings
 * - Changes are detected at the section level
 * - Translations are performed on entire sections with full context
 * - Documents are reconstructed from translated sections
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
/**
 * A section represents a ## heading and all its content (including subsections)
 * until the next ## heading
 */
export interface Section {
    heading: string;
    level: number;
    id: string;
    content: string;
    startLine: number;
    endLine: number;
    parentId?: string;
    subsections: Section[];
}
export interface ParsedSections {
    sections: Section[];
    metadata: {
        filepath: string;
        totalLines: number;
        sectionCount: number;
    };
}
export type SectionChangeType = 'added' | 'modified' | 'deleted';
/**
 * Represents a change at the section level
 */
export interface SectionChange {
    type: SectionChangeType;
    oldSection?: Section;
    newSection?: Section;
    position?: {
        afterSectionId?: string;
        parentSectionId?: string;
        index?: number;
    };
}
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
    oldEnglish?: string;
    newEnglish?: string;
    currentTranslation?: string;
    englishSection?: string;
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
    sha?: string;
}
//# sourceMappingURL=types.d.ts.map