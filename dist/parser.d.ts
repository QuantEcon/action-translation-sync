/**
 * MyST Markdown Section Parser
 *
 * Parses MyST markdown documents into sections based on ## headings.
 * Each section includes all content until the next ## heading, including
 * any nested ### subsections.
 *
 * This simplified parser replaces the previous block-based approach with
 * a cleaner section-based structure that's easier to work with for translations.
 */
import { Section, ParsedSections } from './types';
export declare class MystParser {
    /**
     * Parse markdown content into sections based on ## headings
     * Each section includes all content until the next ## heading
     */
    parseSections(content: string, filepath: string): Promise<ParsedSections>; /**
     * Generate heading ID/anchor from heading text
     * Follows the same rules as MyST/Sphinx for consistency
     */
    private generateHeadingId;
    /**
     * Find a section by ID (searches recursively through subsections)
     */
    findSectionById(sections: Section[], id: string): Section | undefined;
    /**
     * Find section by position/index
     */
    findSectionByPosition(sections: Section[], index: number): Section | undefined;
    /**
     * Validate MyST syntax by attempting to parse
     * Returns true if valid, false otherwise
     */
    validateMyST(content: string, filepath: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=parser.d.ts.map