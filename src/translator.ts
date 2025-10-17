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

import Anthropic from '@anthropic-ai/sdk';
import { Glossary, SectionTranslationRequest, SectionTranslationResult, FullDocumentTranslationRequest } from './types';
import * as core from '@actions/core';

export class TranslationService {
  private client: Anthropic;
  private model: string;
  private debug: boolean;

  constructor(apiKey: string, model: string = 'claude-sonnet-4.5-20241022', debug: boolean = false) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.debug = debug;
  }

  private log(message: string): void {
    if (this.debug) {
      core.info(`[Translator] ${message}`);
    }
  }

  /**
   * Translate a section (update or new)
   */
  async translateSection(request: SectionTranslationRequest): Promise<SectionTranslationResult> {
    try {
      if (request.mode === 'update') {
        return await this.translateSectionUpdate(request);
      } else {
        return await this.translateNewSection(request);
      }
    } catch (error) {
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
  private async translateSectionUpdate(request: SectionTranslationRequest): Promise<SectionTranslationResult> {
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
  private async translateNewSection(request: SectionTranslationRequest): Promise<SectionTranslationResult> {
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
  async translateFullDocument(request: FullDocumentTranslationRequest): Promise<SectionTranslationResult> {
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
  private formatGlossary(glossary: Glossary, targetLanguage: string): string {
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
