"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const parser_1 = require("./parser");
/**
 * Translation Service using Claude Sonnet 4 (claude-sonnet-4-20250514)
 */
class TranslationService {
    constructor(apiKey) {
        this.client = new sdk_1.default({ apiKey });
        this.parser = new parser_1.MystParser();
    }
    /**
     * Translate content using Claude
     */
    async translate(request) {
        try {
            if (request.mode === 'diff') {
                return await this.translateDiff(request);
            }
            else {
                return await this.translateFull(request);
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
     * Translate only changed blocks (diff mode)
     */
    async translateDiff(request) {
        const { blocks, contextBefore, contextAfter } = request.content;
        if (!blocks || blocks.length === 0) {
            return {
                success: true,
                translatedContent: '',
            };
        }
        const glossary = request.glossary;
        const translatedBlocks = [];
        for (const changeBlock of blocks) {
            if (changeBlock.type === 'deleted') {
                continue; // Skip deleted blocks
            }
            const blockContent = changeBlock.newBlock?.content || '';
            const prompt = this.buildDiffPrompt(blockContent, contextBefore || '', contextAfter || '', request.sourceLanguage, request.targetLanguage, glossary);
            const response = await this.client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }],
            });
            const content = response.content[0];
            if (content.type === 'text') {
                translatedBlocks.push(content.text.trim());
            }
        }
        return {
            success: true,
            translatedContent: translatedBlocks.join('\n\n'),
            tokensUsed: undefined, // Could extract from response if needed
        };
    }
    /**
     * Translate entire document (full mode)
     */
    async translateFull(request) {
        const { fullContent } = request.content;
        if (!fullContent) {
            return {
                success: false,
                error: 'No content provided for full translation',
            };
        }
        const glossary = request.glossary;
        const prompt = this.buildFullPrompt(fullContent, request.sourceLanguage, request.targetLanguage, glossary);
        const response = await this.client.messages.create({
            model: 'claude-sonnet-4-20250514',
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
        return {
            success: true,
            translatedContent: content.text.trim(),
        };
    }
    /**
     * Build prompt for diff translation
     */
    buildDiffPrompt(blockContent, contextBefore, contextAfter, sourceLanguage, targetLanguage, glossary) {
        const glossarySection = glossary ? this.formatGlossary(glossary, targetLanguage) : '';
        return `You are translating changes from ${sourceLanguage} to ${targetLanguage} for technical documentation.

CRITICAL RULES:
1. ONLY translate the section marked as [CHANGED]
2. DO NOT modify sections marked as [CONTEXT]
3. Maintain exact MyST Markdown formatting
4. Preserve all code blocks, math equations, and directives unchanged
5. Use the provided glossary for consistent terminology
6. Do not include any explanations, only return the translated content

${glossarySection}

${contextBefore ? `[CONTEXT - for reference only]\n${contextBefore}\n[/CONTEXT]\n\n` : ''}[CHANGED - translate this section]
${blockContent}
[/CHANGED]
${contextAfter ? `\n\n[CONTEXT - for reference only]\n${contextAfter}\n[/CONTEXT]` : ''}

Provide ONLY the translated version of the [CHANGED] section. Do not include any markers or explanations.`;
    }
    /**
     * Build prompt for full document translation
     */
    buildFullPrompt(content, sourceLanguage, targetLanguage, glossary) {
        const glossarySection = glossary ? this.formatGlossary(glossary, targetLanguage) : '';
        return `You are translating a complete technical lecture from ${sourceLanguage} to ${targetLanguage}.

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