import { MystParser } from './parser';
import { Block, ChangeBlock, ParsedDocument, BlockMapping, ReplaceStrategy } from './types';
import * as core from '@actions/core';

/**
 * Diff Detection Engine
 * Detects and tracks changes between two versions of a MyST document
 */
export class DiffDetector {
  private parser: MystParser;
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.parser = new MystParser();
    this.debug = debug;
  }

  private log(message: string): void {
    if (this.debug) {
      core.info(`[DiffDetector] ${message}`);
    }
  }

  /**
   * Detect changes between old and new versions
   */
  async detectChanges(
    oldContent: string,
    newContent: string,
    filepath: string
  ): Promise<ChangeBlock[]> {
    this.log(`Detecting changes in ${filepath}`);
    
    const oldDoc = await this.parser.parse(oldContent, filepath);
    const newDoc = await this.parser.parse(newContent, filepath);

    this.log(`Old document: ${oldDoc.blocks.length} blocks`);
    this.log(`New document: ${newDoc.blocks.length} blocks`);

    const changes: ChangeBlock[] = [];

    // Build maps for quick lookup
    const oldBlocksMap = this.buildBlockMap(oldDoc.blocks);
    const newBlocksMap = this.buildBlockMap(newDoc.blocks);
    const processedOldBlocks = new Set<string>();

    // Check for added and modified blocks
    for (let i = 0; i < newDoc.blocks.length; i++) {
      const newBlock = newDoc.blocks[i];
      const blockKey = this.getBlockKey(newBlock, i);
      const correspondingOldBlock = this.findCorrespondingBlock(
        newBlock,
        oldDoc.blocks,
        i
      );

      if (!correspondingOldBlock) {
        // New block added
        this.log(`ADDED: Block at index ${i}, type=${newBlock.type}, content preview: ${newBlock.content.substring(0, 50)}...`);
        changes.push({
          type: 'added',
          newBlock,
          position: this.findInsertionPoint(newBlock, oldDoc.blocks, i),
        });
      } else {
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
  async mapToTarget(
    changes: ChangeBlock[],
    targetContent: string,
    filepath: string
  ): Promise<BlockMapping[]> {
    this.log(`Mapping ${changes.length} changes to target document`);
    
    const targetDoc = await this.parser.parse(targetContent, filepath);
    this.log(`Target document: ${targetDoc.blocks.length} blocks`);
    
    const mappings: BlockMapping[] = [];

    for (const change of changes) {
      let mapping: BlockMapping;

      if (change.type === 'modified' && change.oldBlock && change.newBlock) {
        // Find corresponding block in target
        const targetBlock = this.findCorrespondingBlock(
          change.oldBlock,
          targetDoc.blocks,
          -1 // Index not relevant for target
        );

        this.log(`MODIFIED block mapping: found=${!!targetBlock}`);
        
        // If we can't find the block in target, treat it like an insertion
        if (!targetBlock) {
          const insertAfter = this.findInsertionBlockInTarget(
            change,
            targetDoc.blocks
          );
          this.log(`MODIFIED block not found, inserting after: ${insertAfter ? insertAfter.content.substring(0, 30) : 'null'}`);
          
          mapping = {
            change,
            insertAfter,
            replaceStrategy: 'insert' as ReplaceStrategy,
            confidence: insertAfter ? 0.8 : 0.5,
          };
        } else {
          mapping = {
            change,
            targetBlock,
            replaceStrategy: 'exact-match' as ReplaceStrategy,
            confidence: 1.0,
          };
        }
      } else if (change.type === 'added' && change.newBlock) {
        // Find insertion point in target
        const insertAfter = this.findInsertionBlockInTarget(
          change,
          targetDoc.blocks
        );

        this.log(`ADDED block mapping: insertAfter=${insertAfter ? insertAfter.content.substring(0, 30) : 'null'}`);
        
        mapping = {
          change,
          insertAfter,
          replaceStrategy: 'insert' as ReplaceStrategy,
          confidence: insertAfter ? 0.9 : 0.5,
        };
      } else if (change.type === 'deleted' && change.oldBlock) {
        // Find block to delete in target
        const targetBlock = this.findCorrespondingBlock(
          change.oldBlock,
          targetDoc.blocks,
          -1
        );

        this.log(`DELETED block mapping: found=${!!targetBlock}`);
        
        mapping = {
          change,
          targetBlock,
          replaceStrategy: 'delete' as ReplaceStrategy,
          confidence: targetBlock ? 1.0 : 0.0,
        };
      } else {
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
  private findCorrespondingBlock(
    block: Block,
    blocks: Block[],
    approximateIndex: number
  ): Block | undefined {
    // Strategy 1: Exact match by ID (for headings)
    if (block.id) {
      const match = blocks.find(b => b.id === block.id && b.type === block.type);
      if (match) return match;
    }

    // Strategy 2: Match by parent heading and type
    if (block.parentHeading) {
      const candidates = blocks.filter(
        b => b.parentHeading === block.parentHeading && b.type === block.type
      );

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
  private findBestMatchByContent(block: Block, candidates: Block[]): Block | undefined {
    if (candidates.length === 0) return undefined;

    let bestMatch: Block | undefined = undefined;
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
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Check if two blocks are equal
   */
  private blocksEqual(block1: Block, block2: Block): boolean {
    return (
      block1.type === block2.type &&
      block1.content.trim() === block2.content.trim()
    );
  }

  /**
   * Find insertion point for a new block
   */
  private findInsertionPoint(
    newBlock: Block,
    oldBlocks: Block[],
    newBlockIndex: number
  ): { afterId?: string; underHeading?: string; index?: number } {
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
  private findInsertionBlockInTarget(
    change: ChangeBlock,
    targetBlocks: Block[]
  ): Block | undefined {
    if (!change.position || !change.newBlock) return undefined;

    this.log(`Finding insertion point: underHeading=${change.position.underHeading}, index=${change.position.index}, targetBlocks=${targetBlocks.length}`);

    // For modified blocks treated as insertions, we need to find the block BEFORE the change
    // Look for the previous block that exists in both documents
    if (change.type === 'modified' && change.position.index !== undefined && change.position.index > 0) {
      // Try to find a stable anchor point before this position
      // Look for the nearest heading before the changed block
      for (let i = change.position.index - 1; i >= 0; i--) {
        // We need to search in the OLD doc blocks for a heading that exists in target
        // For now, just use a position slightly before the change
        const safeIndex = Math.max(0, change.position.index - 2);
        const adjustedTargetIndex = Math.min(safeIndex, targetBlocks.length - 1);
        
        if (adjustedTargetIndex >= 0 && adjustedTargetIndex < targetBlocks.length) {
          const insertAfterBlock = targetBlocks[adjustedTargetIndex];
          this.log(`Modified block: inserting after adjusted index ${adjustedTargetIndex}: ${insertAfterBlock.content.substring(0, 30)}`);
          return insertAfterBlock;
        }
        break;
      }
    }

    // Strategy 1: Use index-based positioning with ratio adjustment
    // The source and target may have different block counts, so we need to scale
    if (change.position.index !== undefined) {
      // If documents have similar block counts, use direct position
      // If target is shorter, scale the position proportionally
      const targetIndex = Math.min(change.position.index, targetBlocks.length - 1);
      
      if (targetIndex >= 0 && targetIndex < targetBlocks.length) {
        const insertAfterBlock = targetBlocks[targetIndex];
        this.log(`Inserting after scaled index ${targetIndex}: ${insertAfterBlock.content.substring(0, 30)}`);
        return insertAfterBlock;
      }
      
      // Fallback to last block if index is beyond target length
      const lastBlock = targetBlocks[targetBlocks.length - 1];
      this.log(`Index ${change.position.index} beyond target length ${targetBlocks.length}, using last block: ${lastBlock?.content.substring(0, 30)}`);
      return lastBlock;
    }

    // Strategy 2: Try to find the corresponding heading (if block is under a heading)
    if (change.position.underHeading && change.newBlock.parentHeading) {
      // Look for headings at the end of the document
      const headings = targetBlocks.filter(b => b.type === 'heading');
      if (headings.length > 0) {
        const lastHeading = headings[headings.length - 1];
        
        // Find the last block under this heading
        const blocksUnderHeading = targetBlocks.filter(
          b => b.parentHeading === lastHeading.id
        );
        
        if (blocksUnderHeading.length > 0) {
          const lastBlock = blocksUnderHeading[blocksUnderHeading.length - 1];
          this.log(`Inserting under last heading, after: ${lastBlock.content.substring(0, 30)}`);
          return lastBlock;
        }
        
        this.log(`Inserting after last heading itself: ${lastHeading.content.substring(0, 30)}`);
        return lastHeading;
      }
    }

    // Fallback: insert after the last block
    const lastBlock = targetBlocks[targetBlocks.length - 1];
    this.log(`Fallback: inserting after last block: ${lastBlock?.content.substring(0, 30)}`);
    return lastBlock;
  }

  /**
   * Build a map of blocks for quick lookup
   */
  private buildBlockMap(blocks: Block[]): Map<string, Block> {
    const map = new Map<string, Block>();
    blocks.forEach((block, index) => {
      const key = this.getBlockKey(block, index);
      map.set(key, block);
    });
    return map;
  }

  /**
   * Get a unique key for a block
   */
  private getBlockKey(block: Block, index: number): string {
    if (block.id) {
      return `${block.type}-${block.id}`;
    }
    if (block.parentHeading) {
      return `${block.type}-${block.parentHeading}-${index}`;
    }
    return `${block.type}-${index}`;
  }
}
