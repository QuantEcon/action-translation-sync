"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATH_SEPARATOR = void 0;
exports.extractHeadingMap = extractHeadingMap;
exports.updateHeadingMap = updateHeadingMap;
exports.serializeHeadingMap = serializeHeadingMap;
exports.lookupTargetHeading = lookupTargetHeading;
exports.injectHeadingMap = injectHeadingMap;
const yaml = __importStar(require("js-yaml"));
/**
 * Path separator for hierarchical heading keys
 * Example: "Vector Spaces::Basic Properties::Applications in Economics"
 */
exports.PATH_SEPARATOR = '::';
/**
 * Extract heading map from target document frontmatter
 */
function extractHeadingMap(content) {
    const map = new Map();
    // Extract frontmatter (between --- markers)
    const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
    if (!frontmatterMatch) {
        return map;
    }
    try {
        const frontmatter = yaml.load(frontmatterMatch[1]);
        const headingMapData = frontmatter?.['heading-map'];
        if (headingMapData && typeof headingMapData === 'object') {
            // Convert YAML object to Map
            Object.entries(headingMapData).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    map.set(key, value);
                }
            });
        }
    }
    catch (error) {
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
function updateHeadingMap(existingMap, sourceSections, targetSections, titleHeading // Optional: preserve this heading even if not in sections
) {
    // Build new map in document order (title first, then sections)
    const updated = new Map();
    // Helper to extract clean heading text (without ## markers)
    const cleanHeading = (heading) => {
        return heading.replace(/^#+\s+/, '').trim();
    };
    // Build set of current source paths (for cleanup)
    const currentSourcePaths = new Set();
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
    const processSections = (sourceSecs, targetSecs, parentPath = '', // NEW: Track parent path
    level = 0) => {
        sourceSecs.forEach((sourceSection, i) => {
            const sourceHeading = cleanHeading(sourceSection.heading);
            // Build path: either "Section" or "Parent::Child"
            const path = parentPath ? `${parentPath}${exports.PATH_SEPARATOR}${sourceHeading}` : sourceHeading;
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
                }
                else if (sourceSection.subsections.length > 0) {
                    console.log(`${indent}  ⚠ Source has subsections but target doesn't`);
                    // Source has subsections but target doesn't - add subsection paths to tracking
                    // (they'll be removed later if truly missing)
                    addSourceSubsections(sourceSection.subsections, path);
                }
            }
        });
    };
    // Helper to add all subsection paths to the tracking set
    const addSourceSubsections = (subsections, parentPath) => {
        for (const sub of subsections) {
            const subHeading = cleanHeading(sub.heading);
            const path = `${parentPath}${exports.PATH_SEPARATOR}${subHeading}`;
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
function serializeHeadingMap(map) {
    if (map.size === 0) {
        return '';
    }
    // Convert Map to plain object for YAML
    const obj = {};
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
function lookupTargetHeading(sourceHeading, headingMap, parentPath) {
    // Clean the source heading (remove ## markers)
    const clean = sourceHeading.replace(/^#+\s+/, '').trim();
    // Build full path: either "Section" or "Parent::Child"
    const path = parentPath ? `${parentPath}${exports.PATH_SEPARATOR}${clean}` : clean;
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
function injectHeadingMap(content, headingMap) {
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
        const frontmatter = yaml.load(existingYaml) || {};
        // Update or remove heading-map
        if (headingMap.size > 0) {
            const mapObj = {};
            headingMap.forEach((value, key) => {
                mapObj[key] = value;
            });
            frontmatter['heading-map'] = mapObj;
        }
        else {
            delete frontmatter['heading-map'];
        }
        // Serialize back to YAML
        const newYaml = yaml.dump(frontmatter, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
        }).trim();
        return `---\n${newYaml}\n---\n${bodyContent}`;
    }
    catch (error) {
        console.error('Failed to update frontmatter with heading-map:', error);
        return content;
    }
}
//# sourceMappingURL=heading-map.js.map