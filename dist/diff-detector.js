"use strict";
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
exports.DiffDetector = void 0;
const parser_1 = require("./parser");
const core = __importStar(require("@actions/core"));
class DiffDetector {
    constructor(debug = false) {
        this.parser = new parser_1.MystParser();
        this.debug = debug;
    }
    log(message) {
        if (this.debug) {
            core.info(`[DiffDetector] ${message}`);
        }
    }
    /**
     * Detect section-level changes between old and new documents
     */
    async detectSectionChanges(oldContent, newContent, filepath) {
        this.log(`Detecting section changes in ${filepath}`);
        const oldSections = await this.parser.parseSections(oldContent, filepath);
        const newSections = await this.parser.parseSections(newContent, filepath);
        this.log(`Old document: ${oldSections.sections.length} sections`);
        this.log(`New document: ${newSections.sections.length} sections`);
        const changes = [];
        const processedOldSections = new Set();
        // Check for added and modified sections
        for (let i = 0; i < newSections.sections.length; i++) {
            const newSection = newSections.sections[i];
            // Try to find corresponding section in old document
            // Strategy 1: Match by position (most reliable for translations)
            const oldSectionByPosition = oldSections.sections[i];
            // Strategy 2: Match by ID (works if section heading didn't change)
            const oldSectionById = this.parser.findSectionById(oldSections.sections, newSection.id);
            let matchedOldSection;
            // Prefer position-based matching for translations
            // (Chinese "## 经济模型" is at same position as English "## Economic Models")
            if (oldSectionByPosition && this.sectionsMatch(oldSectionByPosition, newSection)) {
                matchedOldSection = oldSectionByPosition;
                this.log(`Matched section "${newSection.heading}" by position ${i}`);
            }
            else if (oldSectionById) {
                matchedOldSection = oldSectionById;
                this.log(`Matched section "${newSection.heading}" by ID "${newSection.id}"`);
            }
            if (!matchedOldSection) {
                // New section added
                this.log(`ADDED: Section "${newSection.heading}" at position ${i}`);
                changes.push({
                    type: 'added',
                    newSection,
                    position: {
                        index: i,
                        afterSectionId: i > 0 ? newSections.sections[i - 1].id : undefined,
                    },
                });
            }
            else {
                processedOldSections.add(matchedOldSection.id);
                // Check if section content changed
                if (!this.sectionContentEqual(matchedOldSection, newSection)) {
                    this.log(`MODIFIED: Section "${newSection.heading}"`);
                    changes.push({
                        type: 'modified',
                        oldSection: matchedOldSection,
                        newSection,
                    });
                }
                else {
                    this.log(`UNCHANGED: Section "${newSection.heading}"`);
                }
            }
        }
        // Check for deleted sections
        for (const oldSection of oldSections.sections) {
            if (!processedOldSections.has(oldSection.id)) {
                this.log(`DELETED: Section "${oldSection.heading}"`);
                changes.push({
                    type: 'deleted',
                    oldSection,
                });
            }
        }
        this.log(`Total section changes detected: ${changes.length}`);
        return changes;
    }
    /**
     * Check if two sections match (for position-based matching)
     * Sections match if they have the same ID (heading)
     *
     * Note: We used to check structural similarity (level + subsection count),
     * but this caused false matches when inserting new sections.
     * Now we require ID match for position-based matching.
     */
    sectionsMatch(section1, section2) {
        // Sections must have the same ID to be considered a match
        // This prevents false matches when sections shift positions
        return section1.id === section2.id;
    }
    /**
     * Check if section content has changed
     */
    sectionContentEqual(section1, section2) {
        // For translations, we can't compare content directly
        // Instead, compare structure: subsections, code blocks, math, etc.
        // Same number of subsections
        if (section1.subsections.length !== section2.subsections.length) {
            return false;
        }
        // Compare content length (rough heuristic)
        const lengthDiff = Math.abs(section1.content.length - section2.content.length);
        const avgLength = (section1.content.length + section2.content.length) / 2;
        // If length changed by more than 20%, consider it modified
        if (lengthDiff / avgLength > 0.2) {
            return false;
        }
        // Check if code blocks match (these should be preserved)
        const codeBlocks1 = this.extractCodeBlocks(section1.content);
        const codeBlocks2 = this.extractCodeBlocks(section2.content);
        if (codeBlocks1.length !== codeBlocks2.length) {
            return false;
        }
        return true;
    }
    /**
     * Extract code blocks from content
     */
    extractCodeBlocks(content) {
        const codeBlockRegex = /```[\s\S]*?```/g;
        return content.match(codeBlockRegex) || [];
    }
}
exports.DiffDetector = DiffDetector;
//# sourceMappingURL=diff-detector.js.map