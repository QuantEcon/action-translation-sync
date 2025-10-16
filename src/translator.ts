import Anthropic from '@anthropic-ai/sdk';
import { Glossary, TranslationRequest, TranslationResult, ChangeBlock } from './types';
import { MystParser } from './parser';
import * as core from '@actions/core';

/**
 * Translation Service using Claude (configurable model)
 */
export class TranslationService {
  private client: Anthropic;
  private parser: MystParser;
  private model: string;
  private debug: boolean;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514', debug: boolean = false) {
    this.client = new Anthropic({ apiKey });
    this.parser = new MystParser();
    this.model = model;
    this.debug = debug;
  }

  private log(message: string): void {
    if (this.debug) {
      core.info(`[Translator] ${message}`);
    }
  }

  /**
   * Translate content using Claude
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    try {
      if (request.mode === 'diff') {
        return await this.translateDiff(request);
      } else {
        return await this.translateFull(request);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown translation error',
      };
    }
  }

  /**
   * Translate only changed blocks (diff mode)
   */
  private async translateDiff(request: TranslationRequest): Promise<TranslationResult> {
    const { blocks, contextBefore, contextAfter } = request.content;
    
    if (!blocks || blocks.length === 0) {
      return {
        success: true,
        translatedContent: '',
      };
    }

    const glossary = request.glossary;
    const translatedBlocks: string[] = [];

    for (const changeBlock of blocks) {
      if (changeBlock.type === 'deleted') {
        continue; // Skip deleted blocks
      }

      const blockContent = changeBlock.newBlock?.content || '';
      
      this.log(`Translating block type=${changeBlock.type}, content length=${blockContent.length}`);
      this.log(`Block content preview: ${blockContent.substring(0, 100)}...`);
      
      const prompt = this.buildDiffPrompt(
        blockContent,
        contextBefore || '',
        contextAfter || '',
        request.sourceLanguage,
        request.targetLanguage,
        glossary
      );

      this.log(`Prompt length: ${prompt.length}`);
      this.log(`Full prompt:\n${prompt}\n--- END PROMPT ---`);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        this.log(`Claude response length: ${content.text.length}`);
        this.log(`Claude response:\n${content.text}\n--- END RESPONSE ---`);
        translatedBlocks.push(content.text.trim());
      }
    }

    const finalResult = translatedBlocks.join('\n\n');
    this.log(`Final combined translation length: ${finalResult.length}`);

    return {
      success: true,
      translatedContent: finalResult,
      tokensUsed: undefined, // Could extract from response if needed
    };
  }

  /**
   * Translate entire document (full mode)
   */
  private async translateFull(request: TranslationRequest): Promise<TranslationResult> {
    const { fullContent } = request.content;
    
    if (!fullContent) {
      return {
        success: false,
        error: 'No content provided for full translation',
      };
    }

    const glossary = request.glossary;
    const prompt = this.buildFullPrompt(
      fullContent,
      request.sourceLanguage,
      request.targetLanguage,
      glossary
    );

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

    return {
      success: true,
      translatedContent: content.text.trim(),
    };
  }

  /**
   * Build prompt for diff translation
   */
  private buildDiffPrompt(
    blockContent: string,
    contextBefore: string,
    contextAfter: string,
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Glossary
  ): string {
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
  private buildFullPrompt(
    content: string,
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Glossary
  ): string {
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
