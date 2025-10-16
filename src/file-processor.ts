import { MystParser } from './parser';
import { DiffDetector } from './diff-detector';
import { TranslationService } from './translator';
import { Block, BlockMapping, TranslatedBlock, Glossary } from './types';
import * as core from '@actions/core';

/**
 * File Processor
 * Orchestrates the translation process for a single file
 */
export class FileProcessor {
  private parser: MystParser;
  private diffDetector: DiffDetector;
  private translator: TranslationService;
  private debug: boolean;

  constructor(translationService: TranslationService, debug: boolean = false) {
    this.parser = new MystParser();
    this.diffDetector = new DiffDetector(debug);
    this.translator = translationService;
    this.debug = debug;
  }

  private log(message: string): void {
    if (this.debug) {
      core.info(`[FileProcessor] ${message}`);
    }
  }

  /**
   * Process a file in diff mode (existing file with changes)
   */
  async processDiff(
    oldContent: string,
    newContent: string,
    targetContent: string,
    filepath: string,
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Glossary
  ): Promise<string> {
    this.log(`Processing diff for ${filepath}`);
    
    // 1. Detect changes between old and new
    const changes = await this.diffDetector.detectChanges(oldContent, newContent, filepath);

    if (changes.length === 0) {
      // No changes, return target as-is
      this.log('No changes detected, returning target content unchanged');
      return targetContent;
    }

    this.log(`Detected ${changes.length} changes`);

    // 2. Map changes to target document
    const mappings = await this.diffDetector.mapToTarget(changes, targetContent, filepath);
    
    this.log(`Created ${mappings.length} mappings`);

    // 3. Translate changed blocks
    const translations: TranslatedBlock[] = [];
    const targetDoc = await this.parser.parse(targetContent, filepath);

    for (const mapping of mappings) {
      if (mapping.change.type === 'deleted') {
        this.log('Processing DELETED block - will be removed');
        translations.push({
          mapping,
          translatedContent: null, // Will be deleted
        });
        continue;
      }

      // Get context for better translation
      const context = mapping.targetBlock
        ? this.parser.getBlockContext(targetDoc.blocks, mapping.targetBlock, 2)
        : { before: '', after: '' };

      this.log(`Translating ${mapping.change.type} block...`);
      this.log(`Context before length: ${context.before.length}, after length: ${context.after.length}`);

      // Translate the block
      const result = await this.translator.translate({
        mode: 'diff',
        sourceLanguage,
        targetLanguage,
        glossary,
        content: {
          blocks: [mapping.change],
          contextBefore: context.before,
          contextAfter: context.after,
        },
      });

      if (!result.success) {
        throw new Error(`Translation failed: ${result.error}`);
      }

      this.log(`Translation result length: ${result.translatedContent?.length || 0}`);

      translations.push({
        mapping,
        translatedContent: result.translatedContent || '',
      });
    }

    // 4. Apply translations to target document
    this.log('Applying translations to target document...');
    return this.applyTranslations(targetDoc.blocks, translations);
  }

  /**
   * Process a file in full mode (new file)
   */
  async processFull(
    content: string,
    filepath: string,
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Glossary
  ): Promise<string> {
    const result = await this.translator.translate({
      mode: 'full',
      sourceLanguage,
      targetLanguage,
      glossary,
      content: {
        fullContent: content,
      },
    });

    if (!result.success) {
      throw new Error(`Full translation failed: ${result.error}`);
    }

    return result.translatedContent || '';
  }

  /**
   * Apply translated blocks to target document
   */
  private applyTranslations(targetBlocks: Block[], translations: TranslatedBlock[]): string {
    this.log(`Applying ${translations.length} translations to ${targetBlocks.length} blocks`);
    
    // Create a mutable copy
    const updatedBlocks = [...targetBlocks];

    // Create a map of original blocks to their indices for fast lookup
    const blockIndexMap = new Map<Block, number>();
    targetBlocks.forEach((block, index) => {
      blockIndexMap.set(block, index);
    });
    
    this.log(`Built blockIndexMap with ${blockIndexMap.size} entries`);

    // Sort translations to apply from end to start (to preserve indices)
    const sortedTranslations = [...translations].sort((a, b) => {
      const indexA = a.mapping.targetBlock
        ? blockIndexMap.get(a.mapping.targetBlock) ?? updatedBlocks.length
        : a.mapping.insertAfter
        ? blockIndexMap.get(a.mapping.insertAfter) ?? updatedBlocks.length
        : updatedBlocks.length;
      const indexB = b.mapping.targetBlock
        ? blockIndexMap.get(b.mapping.targetBlock) ?? updatedBlocks.length
        : b.mapping.insertAfter
        ? blockIndexMap.get(b.mapping.insertAfter) ?? updatedBlocks.length
        : updatedBlocks.length;
      return indexB - indexA;
    });

    for (const translation of sortedTranslations) {
      const { mapping, translatedContent } = translation;

      if (mapping.replaceStrategy === 'exact-match' && mapping.targetBlock) {
        // Replace existing block
        const index = blockIndexMap.get(mapping.targetBlock);
        if (index !== undefined && index >= 0 && translatedContent !== null) {
          this.log(`Replacing block at index ${index}`);
          updatedBlocks[index] = {
            ...updatedBlocks[index],
            content: translatedContent,
          };
        }
      } else if (mapping.replaceStrategy === 'insert' && mapping.insertAfter) {
        // Insert new block
        const insertAfterIndex = blockIndexMap.get(mapping.insertAfter);
        
        this.log(`Looking for insertAfter block, found index: ${insertAfterIndex}`);
        this.log(`insertAfter block content preview: ${mapping.insertAfter.content.substring(0, 50)}`);
        this.log(`Does blockIndexMap have this block? ${blockIndexMap.has(mapping.insertAfter)}`);
        
        if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && translatedContent !== null && mapping.change.newBlock) {
          this.log(`Inserting block after index ${insertAfterIndex}`);
          updatedBlocks.splice(insertAfterIndex + 1, 0, {
            type: mapping.change.newBlock.type,
            content: translatedContent,
            parentHeading: mapping.change.newBlock.parentHeading,
            startLine: 0,
            endLine: 0,
          });
          
          // Update the map for subsequent operations (indices have shifted)
          targetBlocks.forEach((block, origIndex) => {
            if (origIndex > insertAfterIndex) {
              const currentIndex = blockIndexMap.get(block);
              if (currentIndex !== undefined) {
                blockIndexMap.set(block, currentIndex + 1);
              }
            }
          });
        } else {
          this.log(`Warning: Could not find insertAfter block (index=${insertAfterIndex}), appending to end`);
          if (translatedContent !== null && mapping.change.newBlock) {
            updatedBlocks.push({
              type: mapping.change.newBlock.type,
              content: translatedContent,
              parentHeading: mapping.change.newBlock.parentHeading,
              startLine: 0,
              endLine: 0,
            });
          }
        }
      } else if (mapping.replaceStrategy === 'delete' && mapping.targetBlock) {
        // Remove block
        const deleteIndex = blockIndexMap.get(mapping.targetBlock);
        if (deleteIndex !== undefined && deleteIndex >= 0) {
          this.log(`Deleting block at index ${deleteIndex}`);
          updatedBlocks.splice(deleteIndex, 1);
        }
      }
    }

    this.log(`Final document has ${updatedBlocks.length} blocks`);
    
    // Reconstruct markdown
    return this.parser.reconstructMarkdown(updatedBlocks);
  }

  /**
   * Validate the translated content has valid MyST syntax
   */
  async validateMyST(content: string, filepath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.parser.parse(content, filepath);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }
}
