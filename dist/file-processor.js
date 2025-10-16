"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProcessor = void 0;
const parser_1 = require("./parser");
const diff_detector_1 = require("./diff-detector");
/**
 * File Processor
 * Orchestrates the translation process for a single file
 */
class FileProcessor {
    constructor(translationService) {
        this.parser = new parser_1.MystParser();
        this.diffDetector = new diff_detector_1.DiffDetector();
        this.translator = translationService;
    }
    /**
     * Process a file in diff mode (existing file with changes)
     */
    async processDiff(oldContent, newContent, targetContent, filepath, sourceLanguage, targetLanguage, glossary) {
        // 1. Detect changes between old and new
        const changes = await this.diffDetector.detectChanges(oldContent, newContent, filepath);
        if (changes.length === 0) {
            // No changes, return target as-is
            return targetContent;
        }
        // 2. Map changes to target document
        const mappings = await this.diffDetector.mapToTarget(changes, targetContent, filepath);
        // 3. Translate changed blocks
        const translations = [];
        const targetDoc = await this.parser.parse(targetContent, filepath);
        for (const mapping of mappings) {
            if (mapping.change.type === 'deleted') {
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
            translations.push({
                mapping,
                translatedContent: result.translatedContent || '',
            });
        }
        // 4. Apply translations to target document
        return this.applyTranslations(targetDoc.blocks, translations);
    }
    /**
     * Process a file in full mode (new file)
     */
    async processFull(content, filepath, sourceLanguage, targetLanguage, glossary) {
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
    applyTranslations(targetBlocks, translations) {
        // Create a mutable copy
        const updatedBlocks = [...targetBlocks];
        // Sort translations to apply from end to start (to preserve indices)
        const sortedTranslations = [...translations].sort((a, b) => {
            const indexA = a.mapping.targetBlock
                ? updatedBlocks.indexOf(a.mapping.targetBlock)
                : updatedBlocks.length;
            const indexB = b.mapping.targetBlock
                ? updatedBlocks.indexOf(b.mapping.targetBlock)
                : updatedBlocks.length;
            return indexB - indexA;
        });
        for (const translation of sortedTranslations) {
            const { mapping, translatedContent } = translation;
            if (mapping.replaceStrategy === 'exact-match' && mapping.targetBlock) {
                // Replace existing block
                const index = updatedBlocks.indexOf(mapping.targetBlock);
                if (index >= 0 && translatedContent !== null) {
                    updatedBlocks[index] = {
                        ...updatedBlocks[index],
                        content: translatedContent,
                    };
                }
            }
            else if (mapping.replaceStrategy === 'insert' && mapping.insertAfter) {
                // Insert new block
                const insertIndex = updatedBlocks.indexOf(mapping.insertAfter);
                if (insertIndex >= 0 && translatedContent !== null && mapping.change.newBlock) {
                    updatedBlocks.splice(insertIndex + 1, 0, {
                        type: mapping.change.newBlock.type,
                        content: translatedContent,
                        parentHeading: mapping.change.newBlock.parentHeading,
                        startLine: 0,
                        endLine: 0,
                    });
                }
            }
            else if (mapping.replaceStrategy === 'delete' && mapping.targetBlock) {
                // Remove block
                const deleteIndex = updatedBlocks.indexOf(mapping.targetBlock);
                if (deleteIndex >= 0) {
                    updatedBlocks.splice(deleteIndex, 1);
                }
            }
        }
        // Reconstruct markdown
        return this.parser.reconstructMarkdown(updatedBlocks);
    }
    /**
     * Validate the translated content has valid MyST syntax
     */
    async validateMyST(content, filepath) {
        try {
            await this.parser.parse(content, filepath);
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown validation error',
            };
        }
    }
}
exports.FileProcessor = FileProcessor;
//# sourceMappingURL=file-processor.js.map