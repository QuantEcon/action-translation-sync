/**
 * Section-Based File Processor
 *
 * Orchestrates the translation process for a single file using section-based approach.
 *
 * Key operations:
 * 1. Detect section-level changes between old and new English documents
 * 2. Match sections to target document (by position)
 * 3. Translate changed sections (update mode for modified, new mode for added)
 * 4. Reconstruct target document with translated sections
 *
 * This is much simpler than the old block-based approach!
 */
import { TranslationService } from './translator';
import { Glossary } from './types';
export declare class FileProcessor {
    private parser;
    private diffDetector;
    private translator;
    private debug;
    constructor(translationService: TranslationService, debug?: boolean);
    private log;
    /**
     * Process a file using component-based approach
     * Always reconstructs complete document: CONFIG + TITLE + INTRO + SECTIONS
     * This ensures no components get lost during translation updates
     */
    processSectionBased(oldContent: string, newContent: string, targetContent: string, filepath: string, sourceLanguage: string, targetLanguage: string, glossary?: Glossary): Promise<string>;
    /**
     * Helper: Translate a new section
     */
    private translateNewSection;
    /**
     * Reconstruct document from components: CONFIG + TITLE + INTRO + SECTIONS
     * This ensures we always produce a complete, valid document
     */
    private reconstructFromComponents;
    /**
     * Process a full document (for new files)
     */
    processFull(content: string, filepath: string, sourceLanguage: string, targetLanguage: string, glossary?: Glossary): Promise<string>;
    /**
     * Parse translated content to extract subsections
     * This ensures subsections are properly populated in the heading-map
     */
    private parseTranslatedSubsections;
    /**
     * Find target section using heading map (preferred) or ID fallback
     * Returns the actual section object or undefined if not found
     */
    private findTargetSectionByHeadingMap;
    /**
     * Helper to find the index of a section in the NEW source sections
     * Used for position-based fallback
     */
    private findSourceSectionIndex;
    /**
     * Find target section index using heading map (preferred) or position fallback
     *
     * Strategy:
     * 1. Look up translated heading in heading map
     * 2. Search for that heading in target sections
     * 3. If not found, fall back to position-based matching
     *
     * @deprecated Use findTargetSectionByHeadingMap instead - this version has position tracking bugs
     */
    private findTargetSectionIndex;
    /**
     * Find matching section index in target document
     * Match by section ID (heading ID like "economic-models", "introduction", etc.)
     *
     * @deprecated Use findTargetSectionIndex with heading map instead
     */
    private findMatchingSectionIndex;
    /**
     * Serialize a section with all its subsections into markdown text
     * This ensures subsections are included when translating
     */
    private serializeSection;
    /**
     * Validate the translated content has valid MyST syntax
     */
    validateMyST(content: string, filepath: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=file-processor.d.ts.map