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
     * Process a file using section-based approach
     * This is the main method for handling existing files with changes
     */
    processSectionBased(oldContent: string, newContent: string, targetContent: string, filepath: string, sourceLanguage: string, targetLanguage: string, glossary?: Glossary): Promise<string>;
    /**
     * Process a full document (for new files)
     */
    processFull(content: string, filepath: string, sourceLanguage: string, targetLanguage: string, glossary?: Glossary): Promise<string>;
    /**
     * Find matching section index in target document
     * Match by section ID (heading ID like "economic-models", "introduction", etc.)
     */
    private findMatchingSectionIndex;
    /**
     * Reconstruct markdown document from sections
     */
    private reconstructFromSections;
    /**
     * Validate the translated content has valid MyST syntax
     */
    validateMyST(content: string, filepath: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=file-processor.d.ts.map