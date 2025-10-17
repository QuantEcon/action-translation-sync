import { Section } from './types';
/**
 * Simple heading map for matching sections across languages
 * Maps English heading text → Translated heading text
 */
export type HeadingMap = Map<string, string>;
/**
 * Extract heading map from target document frontmatter
 */
export declare function extractHeadingMap(content: string): HeadingMap;
/**
 * Update heading map with new translations
 * - Adds new English→Translation pairs
 * - Removes deleted sections
 * - Preserves existing mappings
 */
export declare function updateHeadingMap(existingMap: HeadingMap, sourceSections: Section[], targetSections: Section[]): HeadingMap;
/**
 * Serialize heading map to YAML string for frontmatter
 */
export declare function serializeHeadingMap(map: HeadingMap): string;
/**
 * Find target section by looking up heading in map
 * Returns the target heading to search for, or undefined if not in map
 */
export declare function lookupTargetHeading(sourceHeading: string, headingMap: HeadingMap): string | undefined;
/**
 * Inject or update heading-map in frontmatter
 * Preserves all existing frontmatter fields
 */
export declare function injectHeadingMap(content: string, headingMap: HeadingMap): string;
//# sourceMappingURL=heading-map.d.ts.map