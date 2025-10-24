import * as yaml from 'js-yaml';
import { Section } from './types';

/**
 * Path separator for hierarchical heading keys
 * Example: "Vector Spaces::Basic Properties::Applications in Economics"
 */
export const PATH_SEPARATOR = '::';

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
export function extractHeadingMap(content: string): HeadingMap {
  const map = new Map<string, string>();
  
  // Extract frontmatter (between --- markers)
  const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
  if (!frontmatterMatch) {
    return map;
  }
  
  try {
    const frontmatter = yaml.load(frontmatterMatch[1]) as any;
    const headingMapData = frontmatter?.['heading-map'];
    
    if (headingMapData && typeof headingMapData === 'object') {
      // Convert YAML object to Map
      Object.entries(headingMapData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          map.set(key, value);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to parse heading-map from frontmatter:', error);
  }
  
  return map;
}

/**
 * Update heading map with new translations
 * - Adds new English→Translation pairs for ALL headings (sections and subsections)
 * - Uses path-based keys (Parent::Child::Grandchild) for uniqueness
 * - Removes deleted sections
 * - Preserves existing mappings
 */
export function updateHeadingMap(
  existingMap: HeadingMap,
  sourceSections: Section[],
  targetSections: Section[],
  titleHeading?: string  // Optional: preserve this heading even if not in sections
): HeadingMap {
  // Build new map in document order (title first, then sections)
  const updated = new Map<string, string>();
  
  // Helper to extract clean heading text (without ## markers)
  const cleanHeading = (heading: string): string => {
    return heading.replace(/^#+\s+/, '').trim();
  };
  
  // Build set of current source paths (for cleanup)
  const currentSourcePaths = new Set<string>();
  
  // Add title to current paths if provided (so it won't be deleted)
  if (titleHeading) {
    currentSourcePaths.add(titleHeading);
    // Add title to map first (if it exists in old map)
    const titleTranslation = existingMap.get(titleHeading);
    if (titleTranslation) {
      updated.set(titleHeading, titleTranslation);
    }
  }
  
  // Process all sections and subsections recursively with path tracking
  const processSections = (
    sourceSecs: Section[],
    targetSecs: Section[],
    parentPath: string = '',  // NEW: Track parent path
    level: number = 0
  ) => {
    sourceSecs.forEach((sourceSection, i) => {
      const sourceHeading = cleanHeading(sourceSection.heading);
      
      // Build path: either "Section" or "Parent::Child"
      const path = parentPath ? `${parentPath}${PATH_SEPARATOR}${sourceHeading}` : sourceHeading;
      currentSourcePaths.add(path);
      
      // Find matching target section (same position or by ID)
      const targetSection = targetSecs[i];
      
      // Add to map if we have a matching target
      if (targetSection) {
        const targetHeading = cleanHeading(targetSection.heading);
        // Store with path-based key
        updated.set(path, targetHeading);
        
        // Debug logging
        const indent = '  '.repeat(level);
        console.log(`${indent}[HeadingMap] Added: "${path}" → "${targetHeading}"`);
        console.log(`${indent}  Source subsections: ${sourceSection.subsections.length}, Target subsections: ${targetSection.subsections.length}`);
        
        // Process subsections recursively with current path as parent
        if (sourceSection.subsections.length > 0 && targetSection.subsections.length > 0) {
          console.log(`${indent}  ✓ Processing ${sourceSection.subsections.length} subsections recursively`);
          processSections(sourceSection.subsections, targetSection.subsections, path, level + 1);
        } else if (sourceSection.subsections.length > 0) {
          console.log(`${indent}  ⚠ Source has subsections but target doesn't`);
          // Source has subsections but target doesn't - add subsection paths to tracking
          // (they'll be removed later if truly missing)
          addSourceSubsections(sourceSection.subsections, path);
        }
      }
    });
  };
  
  // Helper to add all subsection paths to the tracking set
  const addSourceSubsections = (subsections: Section[], parentPath: string) => {
    for (const sub of subsections) {
      const subHeading = cleanHeading(sub.heading);
      const path = `${parentPath}${PATH_SEPARATOR}${subHeading}`;
      currentSourcePaths.add(path);
      if (sub.subsections.length > 0) {
        addSourceSubsections(sub.subsections, path);
      }
    }
  };
  
  processSections(sourceSections, targetSections);
  
  // Remove deleted headings from map (paths that existed before but not in current source)
  for (const [sourcePath] of updated) {
    if (!currentSourcePaths.has(sourcePath)) {
      updated.delete(sourcePath);
    }
  }
  
  return updated;
}

/**
 * Serialize heading map to YAML string for frontmatter
 */
export function serializeHeadingMap(map: HeadingMap): string {
  if (map.size === 0) {
    return '';
  }
  
  // Convert Map to plain object for YAML
  const obj: Record<string, string> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  
  return yaml.dump({ 'heading-map': obj }, {
    indent: 2,
    lineWidth: -1, // No line wrapping
    noRefs: true,
  });
}

/**
 * Find target section by looking up heading path in map
 * Returns the target heading to search for, or undefined if not in map
 * 
 * @param sourceHeading - The source heading text (e.g., "## Applications in Economics")
 * @param headingMap - The heading map
 * @param parentPath - The path of parent sections (e.g., "Vector Spaces::Basic Properties")
 */
export function lookupTargetHeading(
  sourceHeading: string,
  headingMap: HeadingMap,
  parentPath?: string
): string | undefined {
  // Clean the source heading (remove ## markers)
  const clean = sourceHeading.replace(/^#+\s+/, '').trim();
  
  // Build full path: either "Section" or "Parent::Child"
  const path = parentPath ? `${parentPath}${PATH_SEPARATOR}${clean}` : clean;
  
  // Try path-based lookup first (new format)
  const translation = headingMap.get(path);
  if (translation) {
    return translation;
  }
  
  // Fallback: Try simple heading lookup (for backwards compatibility with old maps)
  return headingMap.get(clean);
}

/**
 * Inject or update heading-map in frontmatter
 * Preserves all existing frontmatter fields
 */
export function injectHeadingMap(
  content: string,
  headingMap: HeadingMap
): string {
  // Extract existing frontmatter
  const frontmatterMatch = content.match(/^---\n(.*?)\n---\n(.*)/s);
  
  if (!frontmatterMatch) {
    // No frontmatter exists - add it
    if (headingMap.size === 0) {
      return content;
    }
    
    const mapYaml = serializeHeadingMap(headingMap).trim();
    return `---\n${mapYaml}\n---\n\n${content}`;
  }
  
  const [, existingYaml, bodyContent] = frontmatterMatch;
  
  try {
    // Parse existing frontmatter
    const frontmatter = yaml.load(existingYaml) as any || {};
    
    // Update or remove heading-map
    if (headingMap.size > 0) {
      const mapObj: Record<string, string> = {};
      headingMap.forEach((value, key) => {
        mapObj[key] = value;
      });
      frontmatter['heading-map'] = mapObj;
    } else {
      delete frontmatter['heading-map'];
    }
    
    // Serialize back to YAML
    const newYaml = yaml.dump(frontmatter, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    }).trim();
    
    return `---\n${newYaml}\n---\n${bodyContent}`;
  } catch (error) {
    console.error('Failed to update frontmatter with heading-map:', error);
    return content;
  }
}
