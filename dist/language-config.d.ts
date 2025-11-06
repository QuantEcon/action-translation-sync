/**
 * Language-specific configuration for translation prompts
 *
 * Each target language can have specific instructions that are appended to the translation prompts.
 * This allows for language-specific typography, punctuation, and stylistic rules.
 */
export interface LanguageConfig {
    /** Language code (e.g., 'zh-cn', 'ja', 'es') */
    code: string;
    /** Language name in English */
    name: string;
    /** Additional rules to append to translation prompts */
    additionalRules: string[];
}
/**
 * Get language-specific configuration
 * Returns empty rules array if language not configured
 */
export declare function getLanguageConfig(languageCode: string): LanguageConfig;
/**
 * Format additional rules for inclusion in prompts
 * Returns empty string if no additional rules
 */
export declare function formatAdditionalRules(languageCode: string): string;
//# sourceMappingURL=language-config.d.ts.map