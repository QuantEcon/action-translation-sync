"use strict";
/**
 * Language-specific configuration for translation prompts
 *
 * Each target language can have specific instructions that are appended to the translation prompts.
 * This allows for language-specific typography, punctuation, and stylistic rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGE_CONFIGS = void 0;
exports.getLanguageConfig = getLanguageConfig;
exports.formatAdditionalRules = formatAdditionalRules;
exports.getSupportedLanguages = getSupportedLanguages;
exports.isLanguageSupported = isLanguageSupported;
exports.validateLanguageCode = validateLanguageCode;
/**
 * Language-specific configurations
 *
 * To add a new language:
 * 1. Add a new entry with the language code as the key
 * 2. Include any language-specific typography or punctuation rules
 * 3. The language will automatically be available for use
 */
exports.LANGUAGE_CONFIGS = {
    'zh-cn': {
        code: 'zh-cn',
        name: 'Chinese (Simplified)',
        additionalRules: [
            'Use proper full-width Chinese punctuation marks (，：。！？) not ASCII punctuation (,.!?) in prose text',
        ],
    },
    'fa': {
        code: 'fa',
        name: 'Persian (Farsi)',
        additionalRules: [
            'Use proper Persian punctuation marks (، ؛ ؟) without any RTL directionality markup',
            'Keep technical terms and code examples in English/Latin script',
            'Use formal/academic Persian style appropriate for educational content',
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
    return exports.LANGUAGE_CONFIGS[normalized] || {
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
/**
 * Get list of supported language codes
 */
function getSupportedLanguages() {
    return Object.keys(exports.LANGUAGE_CONFIGS);
}
/**
 * Check if a language code is supported (has configuration)
 */
function isLanguageSupported(languageCode) {
    const normalized = languageCode.toLowerCase();
    return normalized in exports.LANGUAGE_CONFIGS;
}
/**
 * Validate language code and throw descriptive error if not supported
 */
function validateLanguageCode(languageCode) {
    if (!isLanguageSupported(languageCode)) {
        const supported = getSupportedLanguages().join(', ');
        throw new Error(`Unsupported target language: '${languageCode}'. ` +
            `Supported languages: ${supported}. ` +
            `To add a new language, update LANGUAGE_CONFIGS in src/language-config.ts`);
    }
}
//# sourceMappingURL=language-config.js.map