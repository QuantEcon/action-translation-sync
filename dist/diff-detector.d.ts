/**
 * Section-Based Diff Detection Engine
 *
 * Detects changes at the section level (## headings) rather than individual blocks.
 * This approach is much simpler and more reliable for translation workflows.
 *
 * Key principles:
 * - Sections are matched by position (most reliable for translations)
 * - Changes are: added section, modified section, deleted section
 * - No complex block matching or insertion point logic needed
 */
import { SectionChange } from './types';
export declare class DiffDetector {
    private parser;
    private debug;
    constructor(debug?: boolean);
    private log;
    /**
     * Detect section-level changes between old and new documents
     * Also detects preamble changes (title and intro before first ## section)
     */
    detectSectionChanges(oldContent: string, newContent: string, filepath: string): Promise<SectionChange[]>;
    /**
     * Check if two sections match (for position-based matching)
     * Sections match if they have the same ID (heading)
     *
     * Note: We used to check structural similarity (level + subsection count),
     * but this caused false matches when inserting new sections.
     * Now we require ID match for position-based matching.
     */
    private sectionsMatch;
    /**
     * Check if section content has changed
     */
    private sectionContentEqual;
    /**
     * Extract code blocks from content
     */
    private extractCodeBlocks;
}
//# sourceMappingURL=diff-detector.d.ts.map