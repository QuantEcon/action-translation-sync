import { TranslationRequest, TranslationResult } from './types';
/**
 * Translation Service using Claude Sonnet 4 (claude-sonnet-4-20250514)
 */
export declare class TranslationService {
    private client;
    private parser;
    constructor(apiKey: string);
    /**
     * Translate content using Claude
     */
    translate(request: TranslationRequest): Promise<TranslationResult>;
    /**
     * Translate only changed blocks (diff mode)
     */
    private translateDiff;
    /**
     * Translate entire document (full mode)
     */
    private translateFull;
    /**
     * Build prompt for diff translation
     */
    private buildDiffPrompt;
    /**
     * Build prompt for full document translation
     */
    private buildFullPrompt;
    /**
     * Format glossary for inclusion in prompt
     */
    private formatGlossary;
}
//# sourceMappingURL=translator.d.ts.map