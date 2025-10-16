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
exports.DiffDetector = void 0;
const parser_1 = require("./parser");
const core = __importStar(require("@actions/core"));
/**
 * Diff Detection Engine
 * Detects and tracks changes between two versions of a MyST document
 */
class DiffDetector {
    constructor(debug = false) {
        this.parser = new parser_1.MystParser();
        this.debug = debug;
    }
    log(message) {
        if (this.debug) {
            core.info(`[DiffDetector] ${message}`);
        }
    }
    /**
     * Detect changes between old and new versions
     */
    async detectChanges(oldContent, newContent, filepath) {
        this.log(`Detecting changes in ${filepath}`);
        const oldDoc = await this.parser.parse(oldContent, filepath);
        const newDoc = await this.parser.parse(newContent, filepath);
        this.log(`Old document: ${oldDoc.blocks.length} blocks`);
        this.log(`New document: ${newDoc.blocks.length} blocks`);
        const changes = [];
        // Build maps for quick lookup
        const oldBlocksMap = this.buildBlockMap(oldDoc.blocks);
        const newBlocksMap = this.buildBlockMap(newDoc.blocks);
        const processedOldBlocks = new Set();
        // Check for added and modified blocks
        for (let i = 0; i < newDoc.blocks.length; i++) {
            const newBlock = newDoc.blocks[i];
            const blockKey = this.getBlockKey(newBlock, i);
            const correspondingOldBlock = this.findCorrespondingBlock(newBlock, oldDoc.blocks, i);
            if (!correspondingOldBlock) {
                // New block added
                this.log(`ADDED: Block at index ${i}, type=${newBlock.type}, content preview: ${newBlock.content.substring(0, 50)}...`);
                changes.push({
                    type: 'added',
                    newBlock,
                    position: this.findInsertionPoint(newBlock, oldDoc.blocks, i),
                });
            }
            else {
                processedOldBlocks.add(this.getBlockKey(correspondingOldBlock, oldDoc.blocks.indexOf(correspondingOldBlock)));
                // Check if content changed
                if (!this.blocksEqual(correspondingOldBlock, newBlock)) {
                    this.log(`MODIFIED: Block at index ${i}, type=${newBlock.type}`);
                    changes.push({
                        type: 'modified',
                        oldBlock: correspondingOldBlock,
                        newBlock,
                        anchor: newBlock.parentHeading || newBlock.id,
                    });
                }
            }
        }
        // Check for deleted blocks
        for (let i = 0; i < oldDoc.blocks.length; i++) {
            const oldBlock = oldDoc.blocks[i];
            const blockKey = this.getBlockKey(oldBlock, i);
            if (!processedOldBlocks.has(blockKey)) {
                this.log(`DELETED: Block at index ${i}, type=${oldBlock.type}`);
                changes.push({
                    type: 'deleted',
                    oldBlock,
                    anchor: oldBlock.parentHeading || oldBlock.id,
                });
            }
        }
        this.log(`Total changes detected: ${changes.length} (added: ${changes.filter(c => c.type === 'added').length}, modified: ${changes.filter(c => c.type === 'modified').length}, deleted: ${changes.filter(c => c.type === 'deleted').length})`);
        return changes;
    }
    /**
     * Map changes to corresponding blocks in target document
     */
    async mapToTarget(changes, targetContent, filepath) {
        this.log(`Mapping ${changes.length} changes to target document`);
        const targetDoc = await this.parser.parse(targetContent, filepath);
        this.log(`Target document: ${targetDoc.blocks.length} blocks`);
        const mappings = [];
        for (const change of changes) {
            let mapping;
            if (change.type === 'modified' && change.oldBlock) {
                // Find corresponding block in target
                const targetBlock = this.findCorrespondingBlock(change.oldBlock, targetDoc.blocks, -1 // Index not relevant for target
                );
                this.log(`MODIFIED block mapping: found=${!!targetBlock}`);
                mapping = {
                    change,
                    targetBlock,
                    replaceStrategy: 'exact-match',
                    confidence: targetBlock ? 1.0 : 0.0,
                };
            }
            else if (change.type === 'added' && change.newBlock) {
                // Find insertion point in target
                const insertAfter = this.findInsertionBlockInTarget(change, targetDoc.blocks);
                this.log(`ADDED block mapping: insertAfter=${insertAfter ? insertAfter.content.substring(0, 30) : 'null'}`);
                mapping = {
                    change,
                    insertAfter,
                    replaceStrategy: 'insert',
                    confidence: insertAfter ? 0.9 : 0.5,
                };
            }
            else if (change.type === 'deleted' && change.oldBlock) {
                // Find block to delete in target
                const targetBlock = this.findCorrespondingBlock(change.oldBlock, targetDoc.blocks, -1);
                this.log(`DELETED block mapping: found=${!!targetBlock}`);
                mapping = {
                    change,
                    targetBlock,
                    replaceStrategy: 'delete',
                    confidence: targetBlock ? 1.0 : 0.0,
                };
            }
            else {
                continue;
            }
            mappings.push(mapping);
        }
        this.log(`Created ${mappings.length} mappings`);
        return mappings;
    }
    /**
     * Find corresponding block between two versions
     */
    findCorrespondingBlock(block, blocks, approximateIndex) {
        // Strategy 1: Exact match by ID (for headings)
        if (block.id) {
            const match = blocks.find(b => b.id === block.id && b.type === block.type);
            if (match)
                return match;
        }
        // Strategy 2: Match by parent heading and type
        if (block.parentHeading) {
            const candidates = blocks.filter(b => b.parentHeading === block.parentHeading && b.type === block.type);
            if (candidates.length === 1) {
                return candidates[0];
            }
            // If multiple candidates, try content similarity
            if (candidates.length > 1) {
                return this.findBestMatchByContent(block, candidates);
            }
        }
        // Strategy 3: Match by position (for blocks without clear anchors)
        if (approximateIndex >= 0 && approximateIndex < blocks.length) {
            const candidate = blocks[approximateIndex];
            if (candidate.type === block.type) {
                return candidate;
            }
        }
        // Strategy 4: Fuzzy match by content similarity
        return this.findBestMatchByContent(block, blocks.filter(b => b.type === block.type));
    }
    /**
     * Find best matching block by content similarity
     */
    findBestMatchByContent(block, candidates) {
        if (candidates.length === 0)
            return undefined;
        let bestMatch = undefined;
        let bestScore = 0;
        for (const candidate of candidates) {
            const score = this.calculateSimilarity(block.content, candidate.content);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = candidate;
            }
        }
        // Only return if similarity is high enough
        return bestScore > 0.7 ? bestMatch : undefined;
    }
    /**
     * Calculate similarity between two strings (simple Jaccard similarity)
     */
    calculateSimilarity(str1, str2) {
        const words1 = new Set(str1.toLowerCase().split(/\s+/));
        const words2 = new Set(str2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    /**
     * Check if two blocks are equal
     */
    blocksEqual(block1, block2) {
        return (block1.type === block2.type &&
            block1.content.trim() === block2.content.trim());
    }
    /**
     * Find insertion point for a new block
     */
    findInsertionPoint(newBlock, oldBlocks, newBlockIndex) {
        // If block has a parent heading, insert under that heading
        if (newBlock.parentHeading) {
            return {
                underHeading: newBlock.parentHeading,
                index: newBlockIndex,
            };
        }
        // Otherwise, use index-based positioning
        return {
            index: newBlockIndex,
        };
    }
    /**
     * Find where to insert a new block in the target document
     */
    findInsertionBlockInTarget(change, targetBlocks) {
        if (!change.position || !change.newBlock)
            return undefined;
        // Try to find the heading to insert under
        if (change.position.underHeading) {
            const heading = targetBlocks.find(b => b.id === change.position.underHeading && b.type === 'heading');
            if (heading) {
                // Find the last block under this heading
                const blocksUnderHeading = targetBlocks.filter(b => b.parentHeading === heading.id);
                return blocksUnderHeading.length > 0
                    ? blocksUnderHeading[blocksUnderHeading.length - 1]
                    : heading;
            }
        }
        // Fallback to index-based
        if (change.position.index !== undefined && change.position.index > 0) {
            return targetBlocks[Math.min(change.position.index - 1, targetBlocks.length - 1)];
        }
        return undefined;
    }
    /**
     * Build a map of blocks for quick lookup
     */
    buildBlockMap(blocks) {
        const map = new Map();
        blocks.forEach((block, index) => {
            const key = this.getBlockKey(block, index);
            map.set(key, block);
        });
        return map;
    }
    /**
     * Get a unique key for a block
     */
    getBlockKey(block, index) {
        if (block.id) {
            return `${block.type}-${block.id}`;
        }
        if (block.parentHeading) {
            return `${block.type}-${block.parentHeading}-${index}`;
        }
        return `${block.type}-${index}`;
    }
}
exports.DiffDetector = DiffDetector;
//# sourceMappingURL=diff-detector.js.map