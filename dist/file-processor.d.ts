import { TranslationService } from './translator';
import { Glossary } from './types';
/**
 * File Processor
 * Orchestrates the translation process for a single file
 */
export declare class FileProcessor {
    private parser;
    private diffDetector;
    private translator;
    constructor(translationService: TranslationService);
    /**
     * Process a file in diff mode (existing file with changes)
     */
    processDiff(oldContent: string, newContent: string, targetContent: string, filepath: string, sourceLanguage: string, targetLanguage: string, glossary?: Glossary): Promise<string>;
    /**
     * Process a file in full mode (new file)
     */
    processFull(content: string, filepath: string, sourceLanguage: string, targetLanguage: string, glossary?: Glossary): Promise<string>;
    /**
     * Apply translated blocks to target document
     */
    private applyTranslations;
    /**
     * Validate the translated content has valid MyST syntax
     */
    validateMyST(content: string, filepath: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=file-processor.d.ts.map