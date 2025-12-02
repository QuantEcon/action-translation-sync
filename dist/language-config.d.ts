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
 * Language-specific configurations
 *
 * To add a new language:
 * 1. Add a new entry with the language code as the key
 * 2. Include any language-specific typography or punctuation rules
 * 3. The language will automatically be available for use
 */
export declare const LANGUAGE_CONFIGS: Record<string, LanguageConfig>;
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
/**
 * Get list of supported language codes
 */
export declare function getSupportedLanguages(): string[];
/**
 * Check if a language code is supported (has configuration)
 */
export declare function isLanguageSupported(languageCode: string): boolean;
/**
 * Validate language code and throw descriptive error if not supported
 */
export declare function validateLanguageCode(languageCode: string): void;
//# sourceMappingURL=language-config.d.ts.map