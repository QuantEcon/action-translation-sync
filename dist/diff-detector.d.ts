import { ChangeBlock, BlockMapping } from './types';
/**
 * Diff Detection Engine
 * Detects and tracks changes between two versions of a MyST document
 */
export declare class DiffDetector {
    private parser;
    private debug;
    constructor(debug?: boolean);
    private log;
    /**
     * Detect changes between old and new versions
     */
    detectChanges(oldContent: string, newContent: string, filepath: string): Promise<ChangeBlock[]>;
    /**
     * Map changes to corresponding blocks in target document
     */
    mapToTarget(changes: ChangeBlock[], targetContent: string, filepath: string): Promise<BlockMapping[]>;
    /**
     * Find corresponding block between two versions
     */
    private findCorrespondingBlock;
    /**
     * Find best matching block by content similarity
     * Note: Caller is responsible for applying threshold
     */
    private findBestMatchByContent;
    /**
     * Calculate similarity between two strings (simple Jaccard similarity)
     */
    private calculateSimilarity;
    /**
     * Check if two blocks are equal
     */
    private blocksEqual;
    /**
     * Find insertion point for a new block
     */
    private findInsertionPoint;
    /**
     * Find where to insert a new block in the target document
     */
    private findInsertionBlockInTarget;
    /**
     * Build a map of blocks for quick lookup
     */
    private buildBlockMap;
    /**
     * Get a unique key for a block
     */
    private getBlockKey;
}
//# sourceMappingURL=diff-detector.d.ts.map