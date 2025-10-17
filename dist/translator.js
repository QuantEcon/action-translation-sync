"use strict";
/**
 * Section-Based Translation Service
 *
 * Uses Claude Sonnet 4.5 to translate sections of MyST Markdown documents.
 *
 * Two modes:
 * 1. UPDATE: Claude sees old English, new English, current translation → produces updated translation
 * 2. NEW: Claude sees new English → produces new translation
 *
 * For full documents (new files), translates the entire content in one pass.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const core = __importStar(require("@actions/core"));
class TranslationService {
    constructor(apiKey, model = 'claude-sonnet-4.5-20241022', debug = false) {
        this.client = new sdk_1.default({ apiKey });
        this.model = model;
        this.debug = debug;
    }
    log(message) {
        if (this.debug) {
            core.info(`[Translator] ${message}`);
        }
    }
    /**
     * Translate a section (update or new)
     */
    async translateSection(request) {
        try {
            if (request.mode === 'update') {
                return await this.translateSectionUpdate(request);
            }
            else {
                return await this.translateNewSection(request);
            }
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown translation error',
            };
        }
    }
    /**
     * Update existing section (mode='update')
     * Claude sees: old English, new English, current translation → produces updated translation
     */
    async translateSectionUpdate(request) {
        const { oldEnglish, newEnglish, currentTranslation, sourceLanguage, targetLanguage, glossary } = request;
        if (!oldEnglish || !newEnglish || !currentTranslation) {
            return {
                success: false,
                error: 'Update mode requires oldEnglish, newEnglish, and currentTranslation',
            };
        }
        const glossarySection = glossary ? this.formatGlossary(glossary, targetLanguage) : '';
        const prompt = `You are updating a translation of a technical document section from ${sourceLanguage} to ${targetLanguage}.

TASK: The ${sourceLanguage} section has been modified. Update the existing ${targetLanguage} translation to reflect these changes.

CRITICAL RULES:
1. Compare the OLD and NEW ${sourceLanguage} versions to understand what changed
2. Update the CURRENT ${targetLanguage} translation to reflect these changes
3. Maintain consistency with the existing ${targetLanguage} style and terminology
4. Preserve all MyST Markdown formatting, code blocks, math equations, and directives
5. DO NOT translate code, math, URLs, or technical identifiers
6. Use the glossary for consistent terminology
7. Return ONLY the updated ${targetLanguage} section, no explanations

${glossarySection}

[OLD ${sourceLanguage} VERSION]
${oldEnglish}
[/OLD ${sourceLanguage} VERSION]

[NEW ${sourceLanguage} VERSION]
${newEnglish}
[/NEW ${sourceLanguage} VERSION]

[CURRENT ${targetLanguage} TRANSLATION]
${currentTranslation}
[/CURRENT ${targetLanguage} TRANSLATION]

Provide ONLY the updated ${targetLanguage} translation. Do not include any markers, explanations, or comments.`;
        this.log(`Translating section update, mode=update`);
        this.log(`Old ${sourceLanguage} length: ${oldEnglish.length}`);
        this.log(`New ${sourceLanguage} length: ${newEnglish.length}`);
        this.log(`Current ${targetLanguage} length: ${currentTranslation.length}`);
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }],
        });
        const content = response.content[0];
        if (content.type !== 'text') {
            return {
                success: false,
                error: 'Unexpected response format from Claude',
            };
        }
        this.log(`Translated section length: ${content.text.length}`);
        return {
            success: true,
            translatedSection: content.text.trim(),
            tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        };
    }
    /**
     * Translate new section (mode='new')
     * Claude sees: English section → produces translation
     */
    async translateNewSection(request) {
        const { englishSection, sourceLanguage, targetLanguage, glossary } = request;
        if (!englishSection) {
            return {
                success: false,
                error: 'New mode requires englishSection',
            };
        }
        const glossarySection = glossary ? this.formatGlossary(glossary, targetLanguage) : '';
        const prompt = `You are translating a new section of technical documentation from ${sourceLanguage} to ${targetLanguage}.

RULES:
1. Translate all prose content accurately
2. Preserve all MyST Markdown formatting, structure, and directives
3. DO NOT translate code blocks (keep code as-is)
4. DO NOT translate mathematical equations (keep LaTeX as-is)
5. DO NOT translate URLs, file paths, or technical identifiers
6. Use the glossary for consistent terminology
7. Maintain heading structure and levels
8. Return ONLY the translated section, no explanations

${glossarySection}

[${sourceLanguage} SECTION TO TRANSLATE]
${englishSection}
[/END SECTION]

Provide ONLY the ${targetLanguage} translation. Do not include any markers, explanations, or comments.`;
        this.log(`Translating new section, mode=new`);
        this.log(`${sourceLanguage} section length: ${englishSection.length}`);
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }],
        });
        const content = response.content[0];
        if (content.type !== 'text') {
            return {
                success: false,
                error: 'Unexpected response format from Claude',
            };
        }
        this.log(`Translated section length: ${content.text.length}`);
        return {
            success: true,
            translatedSection: content.text.trim(),
            tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        };
    }
    /**
     * Translate full document (for new files)
     */
    async translateFullDocument(request) {
        const { content, sourceLanguage, targetLanguage, glossary } = request;
        const glossarySection = glossary ? this.formatGlossary(glossary, targetLanguage) : '';
        const prompt = `You are translating a complete technical lecture from ${sourceLanguage} to ${targetLanguage}.

RULES:
1. Translate all prose content
2. Preserve all MyST Markdown directives and structure exactly
3. DO NOT translate code blocks (keep code as-is)
4. DO NOT translate mathematical equations (keep LaTeX as-is)
5. DO NOT translate URLs, file paths, or technical identifiers
6. Use the provided glossary for consistent terminology
7. Maintain the exact same heading structure and anchors

${glossarySection}

CONTENT:
${content}

Provide the complete translated document maintaining exact MyST structure.`;
        this.log(`Translating full document`);
        this.log(`Content length: ${content.length}`);
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }],
        });
        const result = response.content[0];
        if (result.type !== 'text') {
            return {
                success: false,
                error: 'Unexpected response format from Claude',
            };
        }
        return {
            success: true,
            translatedSection: result.text.trim(),
            tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        };
    }
    /**
     * Format glossary for inclusion in prompt
     */
    formatGlossary(glossary, targetLanguage) {
        if (!glossary.terms || glossary.terms.length === 0) {
            return '';
        }
        const terms = glossary.terms
            .map((term) => {
            const translation = term[targetLanguage];
            const context = term.context ? ` (${term.context})` : '';
            return `  - "${term.en}" → "${translation}"${context}`;
        })
            .join('\n');
        return `GLOSSARY:
${terms}
`;
    }
}
exports.TranslationService = TranslationService;
//# sourceMappingURL=translator.js.map