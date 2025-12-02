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
export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  'zh-cn': {
    code: 'zh-cn',
    name: 'Chinese (Simplified)',
    additionalRules: [
      'Use proper full-width Chinese punctuation marks (，：。！？) not ASCII punctuation (,.!?) in prose text',
    ],
  },
  // Future language configurations can be added here:
  // 'ja': {
  //   code: 'ja',
  //   name: 'Japanese',
  //   additionalRules: [
  //     'Use proper Japanese punctuation marks (、。「」)',
  //   ],
  // },
  // 'es': {
  //   code: 'es',
  //   name: 'Spanish',
  //   additionalRules: [
  //     'Use inverted punctuation marks (¿?) for questions and (¡!) for exclamations',
  //   ],
  // },
};

/**
 * Get language-specific configuration
 * Returns empty rules array if language not configured
 */
export function getLanguageConfig(languageCode: string): LanguageConfig {
  const normalized = languageCode.toLowerCase();
  return LANGUAGE_CONFIGS[normalized] || {
    code: languageCode,
    name: languageCode,
    additionalRules: [],
  };
}

/**
 * Format additional rules for inclusion in prompts
 * Returns empty string if no additional rules
 */
export function formatAdditionalRules(languageCode: string): string {
  const config = getLanguageConfig(languageCode);
  if (config.additionalRules.length === 0) {
    return '';
  }
  return config.additionalRules.map(rule => rule).join('\n');
}

/**
 * Get list of supported language codes
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_CONFIGS);
}

/**
 * Check if a language code is supported (has configuration)
 */
export function isLanguageSupported(languageCode: string): boolean {
  const normalized = languageCode.toLowerCase();
  return normalized in LANGUAGE_CONFIGS;
}

/**
 * Validate language code and throw descriptive error if not supported
 */
export function validateLanguageCode(languageCode: string): void {
  if (!isLanguageSupported(languageCode)) {
    const supported = getSupportedLanguages().join(', ');
    throw new Error(
      `Unsupported target language: '${languageCode}'. ` +
      `Supported languages: ${supported}. ` +
      `To add a new language, update LANGUAGE_CONFIGS in src/language-config.ts`
    );
  }
}
