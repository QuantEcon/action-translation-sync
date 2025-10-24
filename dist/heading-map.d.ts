import { Section } from './types';
/**
 * Path separator for hierarchical heading keys
 * Example: "Vector Spaces::Basic Properties::Applications in Economics"
 */
export declare const PATH_SEPARATOR = "::";
/**
 * Heading map for matching sections across languages
 * Maps English heading path → Translated heading text
 *
 * Path format:
 * - Top-level sections: "Section Name"
 * - Nested sections: "Parent::Child::Grandchild"
 *
 * This ensures uniqueness even when multiple sections share the same heading text.
 */
export type HeadingMap = Map<string, string>;
/**
 * Extract heading map from target document frontmatter
 */
export declare function extractHeadingMap(content: string): HeadingMap;
/**
 * Update heading map with new translations
 * - Adds new English→Translation pairs for ALL headings (sections and subsections)
 * - Uses path-based keys (Parent::Child::Grandchild) for uniqueness
 * - Removes deleted sections
 * - Preserves existing mappings
 */
export declare function updateHeadingMap(existingMap: HeadingMap, sourceSections: Section[], targetSections: Section[], titleHeading?: string): HeadingMap;
/**
 * Serialize heading map to YAML string for frontmatter
 */
export declare function serializeHeadingMap(map: HeadingMap): string;
/**
 * Find target section by looking up heading path in map
 * Returns the target heading to search for, or undefined if not in map
 *
 * @param sourceHeading - The source heading text (e.g., "## Applications in Economics")
 * @param headingMap - The heading map
 * @param parentPath - The path of parent sections (e.g., "Vector Spaces::Basic Properties")
 */
export declare function lookupTargetHeading(sourceHeading: string, headingMap: HeadingMap, parentPath?: string): string | undefined;
/**
 * Inject or update heading-map in frontmatter
 * Preserves all existing frontmatter fields
 */
export declare function injectHeadingMap(content: string, headingMap: HeadingMap): string;
//# sourceMappingURL=heading-map.d.ts.map