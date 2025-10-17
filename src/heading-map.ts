import * as yaml from 'js-yaml';
import { Section } from './types';

/**
 * Simple heading map for matching sections across languages
 * Maps English heading text → Translated heading text
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
 * - Adds new English→Translation pairs
 * - Removes deleted sections
 * - Preserves existing mappings
 */
export function updateHeadingMap(
  existingMap: HeadingMap,
  sourceSections: Section[],
  targetSections: Section[]
): HeadingMap {
  const updated = new Map(existingMap);
  
  // Helper to extract clean heading text (without ## markers)
  const cleanHeading = (heading: string): string => {
    return heading.replace(/^#+\s+/, '').trim();
  };
  
  // Build set of current source headings (for cleanup)
  const currentSourceHeadings = new Set<string>();
  
  // Process all sections and subsections
  const processSections = (
    sourceSecs: Section[],
    targetSecs: Section[]
  ) => {
    sourceSecs.forEach((sourceSection, i) => {
      const sourceHeading = cleanHeading(sourceSection.heading);
      currentSourceHeadings.add(sourceHeading);
      
      // Add to map if not present
      if (!updated.has(sourceHeading)) {
        // Try to match by position for new sections
        const targetSection = targetSecs[i];
        if (targetSection) {
          const targetHeading = cleanHeading(targetSection.heading);
          updated.set(sourceHeading, targetHeading);
        }
      }
      
      // Process subsections recursively
      if (sourceSection.subsections.length > 0) {
        const targetSection = targetSecs[i];
        if (targetSection && targetSection.subsections.length > 0) {
          processSections(sourceSection.subsections, targetSection.subsections);
        }
      }
    });
  };
  
  processSections(sourceSections, targetSections);
  
  // Remove deleted headings from map
  for (const [sourceHeading] of updated) {
    if (!currentSourceHeadings.has(sourceHeading)) {
      updated.delete(sourceHeading);
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
 * Find target section by looking up heading in map
 * Returns the target heading to search for, or undefined if not in map
 */
export function lookupTargetHeading(
  sourceHeading: string,
  headingMap: HeadingMap
): string | undefined {
  // Clean the source heading (remove ## markers)
  const clean = sourceHeading.replace(/^#+\s+/, '').trim();
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
