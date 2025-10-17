"use strict";
/**
 * Section-Based File Processor
 *
 * Orchestrates the translation process for a single file using section-based approach.
 *
 * Key operations:
 * 1. Detect section-level changes between old and new English documents
 * 2. Match sections to target document (by position)
 * 3. Translate changed sections (update mode for modified, new mode for added)
 * 4. Reconstruct target document with translated sections
 *
 * This is much simpler than the old block-based approach!
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
exports.FileProcessor = void 0;
const parser_1 = require("./parser");
const diff_detector_1 = require("./diff-detector");
const core = __importStar(require("@actions/core"));
const heading_map_1 = require("./heading-map");
class FileProcessor {
    constructor(translationService, debug = false) {
        this.parser = new parser_1.MystParser();
        this.diffDetector = new diff_detector_1.DiffDetector(debug);
        this.translator = translationService;
        this.debug = debug;
    }
    log(message) {
        if (this.debug) {
            core.info(`[FileProcessor] ${message}`);
        }
    }
    /**
     * Process a file using section-based approach
     * This is the main method for handling existing files with changes
     */
    async processSectionBased(oldContent, newContent, targetContent, filepath, sourceLanguage, targetLanguage, glossary) {
        this.log(`Processing file using section-based approach: ${filepath}`);
        // 1. Detect section-level changes
        const changes = await this.diffDetector.detectSectionChanges(oldContent, newContent, filepath);
        if (changes.length === 0) {
            this.log('No section changes detected, returning target content unchanged');
            return targetContent;
        }
        this.log(`Detected ${changes.length} section changes`);
        // 2. Extract heading map from target document
        const headingMap = (0, heading_map_1.extractHeadingMap)(targetContent);
        this.log(`Loaded heading map with ${headingMap.size} entries`);
        // 3. Parse source and target documents into sections
        const sourceSections = await this.parser.parseSections(oldContent, filepath);
        const targetSections = await this.parser.parseSections(targetContent, filepath);
        this.log(`Target document has ${targetSections.sections.length} sections`);
        // 3. Process each change
        const updatedSections = [...targetSections.sections];
        let updatedPreamble = targetSections.preamble;
        for (const change of changes) {
            // Handle preamble changes (special section with ID '_preamble')
            if (change.newSection?.id === '_preamble' || change.oldSection?.id === '_preamble') {
                this.log(`Processing PREAMBLE change`);
                const result = await this.translator.translateSection({
                    mode: 'update',
                    sourceLanguage,
                    targetLanguage,
                    glossary,
                    oldEnglish: change.oldSection?.content || '',
                    newEnglish: change.newSection?.content || '',
                    currentTranslation: targetSections.preamble || '',
                });
                if (!result.success) {
                    throw new Error(`Translation failed for preamble: ${result.error}`);
                }
                updatedPreamble = result.translatedSection;
                this.log(`Updated preamble`);
                continue;
            }
            if (change.type === 'added') {
                // Translate new section
                this.log(`Processing ADDED section: ${change.newSection?.heading}`);
                const result = await this.translator.translateSection({
                    mode: 'new',
                    sourceLanguage,
                    targetLanguage,
                    glossary,
                    englishSection: change.newSection?.content,
                });
                if (!result.success) {
                    throw new Error(`Translation failed for new section: ${result.error}`);
                }
                // Insert at correct position
                const insertIndex = change.position?.index ?? updatedSections.length;
                // Extract heading from translated content (first line should be the heading)
                const translatedLines = (result.translatedSection || '').split('\n');
                const translatedHeading = translatedLines[0] || '';
                const newSection = {
                    heading: translatedHeading,
                    level: change.newSection?.level || 2,
                    id: change.newSection?.id || '',
                    content: result.translatedSection || '',
                    startLine: 0,
                    endLine: 0,
                    subsections: [],
                };
                updatedSections.splice(insertIndex, 0, newSection);
                this.log(`Inserted new section at position ${insertIndex}`);
            }
            else if (change.type === 'modified') {
                // Update existing section
                this.log(`Processing MODIFIED section: ${change.newSection?.heading}`);
                // Match section using heading map (preferred) or fallback to position
                const targetSectionIndex = this.findTargetSectionIndex(change.oldSection, updatedSections, sourceSections.sections, headingMap);
                if (targetSectionIndex === -1) {
                    this.log(`Warning: Could not find target section for "${change.oldSection?.heading}"`);
                    continue;
                }
                const targetSection = updatedSections[targetSectionIndex];
                const result = await this.translator.translateSection({
                    mode: 'update',
                    sourceLanguage,
                    targetLanguage,
                    glossary,
                    oldEnglish: change.oldSection?.content,
                    newEnglish: change.newSection?.content,
                    currentTranslation: targetSection.content,
                });
                if (!result.success) {
                    throw new Error(`Translation failed for modified section: ${result.error}`);
                }
                // Replace the section
                updatedSections[targetSectionIndex] = {
                    ...targetSection,
                    content: result.translatedSection || targetSection.content,
                };
                this.log(`Updated section at position ${targetSectionIndex}`);
            }
            else if (change.type === 'deleted') {
                // Remove section
                this.log(`Processing DELETED section: ${change.oldSection?.heading}`);
                const targetSectionIndex = this.findMatchingSectionIndex(updatedSections, change.oldSection);
                if (targetSectionIndex !== -1) {
                    updatedSections.splice(targetSectionIndex, 1);
                    this.log(`Deleted section at position ${targetSectionIndex}`);
                }
            }
        }
        // 4. Update heading map with new/changed sections
        const updatedHeadingMap = (0, heading_map_1.updateHeadingMap)(headingMap, await (await this.parser.parseSections(newContent, filepath)).sections, updatedSections);
        this.log(`Updated heading map to ${updatedHeadingMap.size} entries`);
        // 5. Reconstruct document from sections
        this.log(`Reconstructing document from ${updatedSections.length} sections`);
        const reconstructed = this.reconstructFromSections(updatedSections, targetSections.frontmatter, updatedPreamble);
        // 6. Inject updated heading map into frontmatter
        return (0, heading_map_1.injectHeadingMap)(reconstructed, updatedHeadingMap);
    }
    /**
     * Process a full document (for new files)
     */
    async processFull(content, filepath, sourceLanguage, targetLanguage, glossary) {
        this.log(`Processing full document: ${filepath}`);
        const result = await this.translator.translateFullDocument({
            sourceLanguage,
            targetLanguage,
            glossary,
            content,
        });
        if (!result.success) {
            throw new Error(`Full translation failed: ${result.error}`);
        }
        return result.translatedSection || '';
    }
    /**
     * Find target section index using heading map (preferred) or position fallback
     *
     * Strategy:
     * 1. Look up translated heading in heading map
     * 2. Search for that heading in target sections
     * 3. If not found, fall back to position-based matching
     */
    findTargetSectionIndex(sourceSection, targetSections, sourceSections, headingMap) {
        if (!sourceSection) {
            return -1;
        }
        // Strategy 1: Use heading map to find translated heading
        const translatedHeading = (0, heading_map_1.lookupTargetHeading)(sourceSection.heading, headingMap);
        if (translatedHeading) {
            this.log(`Looking for translated heading: "${translatedHeading}"`);
            // Search for the translated heading in target sections
            for (let i = 0; i < targetSections.length; i++) {
                const cleanTargetHeading = targetSections[i].heading.replace(/^#+\s+/, '').trim();
                if (cleanTargetHeading === translatedHeading) {
                    this.log(`Found by heading map at position ${i}`);
                    return i;
                }
            }
        }
        // Strategy 2: Fall back to position-based matching
        const sourceIndex = sourceSections.findIndex(s => s.id === sourceSection.id);
        if (sourceIndex !== -1 && sourceIndex < targetSections.length) {
            this.log(`Using position-based fallback: ${sourceIndex}`);
            return sourceIndex;
        }
        return -1;
    }
    /**
     * Find matching section index in target document
     * Match by section ID (heading ID like "economic-models", "introduction", etc.)
     *
     * @deprecated Use findTargetSectionIndex with heading map instead
     */
    findMatchingSectionIndex(targetSections, sourceSection) {
        if (!sourceSection) {
            return -1;
        }
        // Match by ID - this works across languages because IDs are based on
        // the English heading structure (e.g., "introduction" in both repos)
        for (let i = 0; i < targetSections.length; i++) {
            if (targetSections[i].id === sourceSection.id) {
                return i;
            }
        }
        return -1;
    }
    /**
     * Reconstruct markdown document from sections
     */
    reconstructFromSections(sections, frontmatter, preamble) {
        const parts = [];
        // Add frontmatter if present
        if (frontmatter) {
            parts.push(frontmatter);
            parts.push(''); // Empty line after frontmatter
        }
        // Add preamble if present (title, intro before first ##)
        if (preamble) {
            parts.push(preamble);
            parts.push(''); // Empty line after preamble
        }
        // Add all sections
        for (const section of sections) {
            // Add section content (heading and direct content)
            parts.push(section.content);
            // Add subsections if present
            for (const subsection of section.subsections) {
                parts.push(''); // Empty line before subsection
                parts.push(subsection.content);
            }
            parts.push(''); // Empty line between sections
        }
        return parts.join('\n').trim() + '\n';
    }
    /**
     * Validate the translated content has valid MyST syntax
     */
    async validateMyST(content, filepath) {
        return await this.parser.validateMyST(content, filepath);
    }
}
exports.FileProcessor = FileProcessor;
//# sourceMappingURL=file-processor.js.map