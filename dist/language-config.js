"use strict";
/**
 * Language-specific configuration for translation prompts
 *
 * Each target language can have specific instructions that are appended to the translation prompts.
 * This allows for language-specific typography, punctuation, and stylistic rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageConfig = getLanguageConfig;
exports.formatAdditionalRules = formatAdditionalRules;
/**
 * Language-specific configurations
 */
const LANGUAGE_CONFIGS = {
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
function getLanguageConfig(languageCode) {
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
function formatAdditionalRules(languageCode) {
    const config = getLanguageConfig(languageCode);
    if (config.additionalRules.length === 0) {
        return '';
    }
    return config.additionalRules.map(rule => rule).join('\n');
}
//# sourceMappingURL=language-config.js.map