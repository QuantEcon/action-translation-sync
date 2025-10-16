"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProcessor = void 0;
const parser_1 = require("./parser");
const diff_detector_1 = require("./diff-detector");
const core = __importStar(require("@actions/core"));
/**
 * File Processor
 * Orchestrates the translation process for a single file
 */
class FileProcessor {
    constructor(translationService, debug = false) {
        this.parser = new parser_1.MystParser();
        this.diffDetector = new diff_detector_1.DiffDetector(debug);
        this.translator = translationService;
        this.debug = debug;
    }
    log(message) {
        if (this.debug) {
            core.info(`[FileProcessor] ${message}`);
        }
    }
    /**
     * Process a file in diff mode (existing file with changes)
     */
    async processDiff(oldContent, newContent, targetContent, filepath, sourceLanguage, targetLanguage, glossary) {
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
        const translations = [];
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
        this.log(`Applying ${translations.length} translations to ${targetBlocks.length} blocks`);
        // Create a mutable copy
        const updatedBlocks = [...targetBlocks];
        // Create a map of original blocks to their indices for fast lookup
        const blockIndexMap = new Map();
        targetBlocks.forEach((block, index) => {
            blockIndexMap.set(block, index);
        });
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
            }
            else if (mapping.replaceStrategy === 'insert' && mapping.insertAfter) {
                // Insert new block
                const insertAfterIndex = blockIndexMap.get(mapping.insertAfter);
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
                }
                else {
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
            }
            else if (mapping.replaceStrategy === 'delete' && mapping.targetBlock) {
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