import { Block, ParsedDocument } from './types';
/**
 * MyST Markdown Parser
 * Parses MyST markdown into semantic blocks for translation
 */
export declare class MystParser {
    private processor;
    constructor();
    /**
     * Parse markdown content into structured blocks
     */
    parse(content: string, filepath: string): Promise<ParsedDocument>;
    /**
     * Reconstruct markdown from blocks
     */
    reconstructMarkdown(blocks: Block[]): string;
    /**
     * Extract content between line numbers
     */
    private extractContent;
    /**
     * Generate heading ID/anchor from heading text
     */
    private generateHeadingId;
    /**
     * Find a block by its ID (for headings)
     */
    findBlockById(blocks: Block[], id: string): Block | undefined;
    /**
     * Find blocks under a specific heading
     */
    findBlocksUnderHeading(blocks: Block[], headingId: string): Block[];
    /**
     * Get context around a block (before and after)
     */
    getBlockContext(blocks: Block[], block: Block, contextLines?: number): {
        before: string;
        after: string;
    };
}
//# sourceMappingURL=parser.d.ts.map