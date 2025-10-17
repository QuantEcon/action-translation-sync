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
exports.extractHeadingMap = extractHeadingMap;
exports.updateHeadingMap = updateHeadingMap;
exports.serializeHeadingMap = serializeHeadingMap;
exports.lookupTargetHeading = lookupTargetHeading;
exports.injectHeadingMap = injectHeadingMap;
const yaml = __importStar(require("js-yaml"));
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
 * - Removes deleted sections
 * - Preserves existing mappings
 */
function updateHeadingMap(existingMap, sourceSections, targetSections) {
    const updated = new Map(existingMap);
    // Helper to extract clean heading text (without ## markers)
    const cleanHeading = (heading) => {
        return heading.replace(/^#+\s+/, '').trim();
    };
    // Build set of current source headings (for cleanup)
    const currentSourceHeadings = new Set();
    // Process all sections and subsections recursively
    const processSections = (sourceSecs, targetSecs, level = 0) => {
        sourceSecs.forEach((sourceSection, i) => {
            const sourceHeading = cleanHeading(sourceSection.heading);
            currentSourceHeadings.add(sourceHeading);
            // Find matching target section (same position or by ID)
            const targetSection = targetSecs[i];
            // Add to map if we have a matching target
            if (targetSection) {
                const targetHeading = cleanHeading(targetSection.heading);
                // Always update to ensure latest translation is captured
                updated.set(sourceHeading, targetHeading);
                // Debug logging
                const indent = '  '.repeat(level);
                console.log(`${indent}[HeadingMap] Added: "${sourceHeading}" → "${targetHeading}"`);
                console.log(`${indent}  Source subsections: ${sourceSection.subsections.length}, Target subsections: ${targetSection.subsections.length}`);
                // Process subsections recursively
                if (sourceSection.subsections.length > 0 && targetSection.subsections.length > 0) {
                    console.log(`${indent}  ✓ Processing ${sourceSection.subsections.length} subsections recursively`);
                    processSections(sourceSection.subsections, targetSection.subsections, level + 1);
                }
                else if (sourceSection.subsections.length > 0) {
                    console.log(`${indent}  ⚠ Source has subsections but target doesn't`);
                    // Source has subsections but target doesn't - add subsection headings to tracking
                    // (they'll be removed later if truly missing)
                    addSourceSubsections(sourceSection.subsections);
                }
            }
        });
    };
    // Helper to add all subsection headings to the tracking set
    const addSourceSubsections = (subsections) => {
        for (const sub of subsections) {
            const subHeading = cleanHeading(sub.heading);
            currentSourceHeadings.add(subHeading);
            if (sub.subsections.length > 0) {
                addSourceSubsections(sub.subsections);
            }
        }
    };
    processSections(sourceSections, targetSections);
    // Remove deleted headings from map (headings that existed before but not in current source)
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
 * Find target section by looking up heading in map
 * Returns the target heading to search for, or undefined if not in map
 */
function lookupTargetHeading(sourceHeading, headingMap) {
    // Clean the source heading (remove ## markers)
    const clean = sourceHeading.replace(/^#+\s+/, '').trim();
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