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
 */
const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
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
