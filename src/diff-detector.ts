import { MystParser } from './parser';
import { Block, ChangeBlock, ParsedDocument, BlockMapping, ReplaceStrategy } from './types';

/**
 * Diff Detection Engine
 * Detects and tracks changes between two versions of a MyST document
 */
export class DiffDetector {
  private parser: MystParser;

  constructor() {
    this.parser = new MystParser();
  }

  /**
   * Detect changes between old and new versions
   */
  async detectChanges(
    oldContent: string,
    newContent: string,
    filepath: string
  ): Promise<ChangeBlock[]> {
    const oldDoc = await this.parser.parse(oldContent, filepath);
    const newDoc = await this.parser.parse(newContent, filepath);

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
        changes.push({
          type: 'added',
          newBlock,
          position: this.findInsertionPoint(newBlock, oldDoc.blocks, i),
        });
      } else {
        processedOldBlocks.add(this.getBlockKey(correspondingOldBlock, oldDoc.blocks.indexOf(correspondingOldBlock)));

        // Check if content changed
        if (!this.blocksEqual(correspondingOldBlock, newBlock)) {
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
        changes.push({
          type: 'deleted',
          oldBlock,
          anchor: oldBlock.parentHeading || oldBlock.id,
        });
      }
    }

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
    const targetDoc = await this.parser.parse(targetContent, filepath);
    const mappings: BlockMapping[] = [];

    for (const change of changes) {
      let mapping: BlockMapping;

      if (change.type === 'modified' && change.oldBlock) {
        // Find corresponding block in target
        const targetBlock = this.findCorrespondingBlock(
          change.oldBlock,
          targetDoc.blocks,
          -1 // Index not relevant for target
        );

        mapping = {
          change,
          targetBlock,
          replaceStrategy: 'exact-match' as ReplaceStrategy,
          confidence: targetBlock ? 1.0 : 0.0,
        };
      } else if (change.type === 'added' && change.newBlock) {
        // Find insertion point in target
        const insertAfter = this.findInsertionBlockInTarget(
          change,
          targetDoc.blocks
        );

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

    // Try to find the heading to insert under
    if (change.position.underHeading) {
      const heading = targetBlocks.find(
        b => b.id === change.position!.underHeading && b.type === 'heading'
      );
      if (heading) {
        // Find the last block under this heading
        const blocksUnderHeading = targetBlocks.filter(
          b => b.parentHeading === heading.id
        );
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
