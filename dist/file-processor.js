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
        const oldSourceSections = await this.parser.parseSections(oldContent, filepath);
        const newSourceSections = await this.parser.parseSections(newContent, filepath);
        const targetSections = await this.parser.parseSections(targetContent, filepath);
        this.log(`Target document has ${targetSections.sections.length} sections`);
        // 4. Build new target document by processing new source sections in order
        // This avoids position tracking issues from in-place modifications
        const resultSections = [];
        let updatedPreamble = targetSections.preamble;
        // Process preamble changes first
        for (const change of changes) {
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
                break;
            }
        }
        // 5. Process each section from NEW source document
        for (let i = 0; i < newSourceSections.sections.length; i++) {
            const newSection = newSourceSections.sections[i];
            // Find the change for this section
            const change = changes.find(c => c.newSection?.id === newSection.id &&
                c.newSection?.id !== '_preamble');
            if (!change) {
                // Section unchanged - find matching target section and copy it
                const targetSection = this.findTargetSectionByHeadingMap(newSection, targetSections.sections, headingMap);
                if (targetSection) {
                    resultSections.push(targetSection);
                    this.log(`Keeping unchanged section: ${newSection.heading}`);
                }
                else {
                    this.log(`Warning: No target found for unchanged section: ${newSection.heading}`);
                }
                continue;
            }
            if (change.type === 'added') {
                // Translate new section
                this.log(`Processing ADDED section: ${newSection.heading}`);
                const fullSectionContent = this.serializeSection(newSection);
                const result = await this.translator.translateSection({
                    mode: 'new',
                    sourceLanguage,
                    targetLanguage,
                    glossary,
                    englishSection: fullSectionContent,
                });
                if (!result.success) {
                    throw new Error(`Translation failed for new section: ${result.error}`);
                }
                // Extract heading from translated content
                const translatedLines = (result.translatedSection || '').split('\n');
                const translatedHeading = translatedLines[0] || '';
                // Parse subsections from translated content
                const subsections = await this.parseTranslatedSubsections(result.translatedSection || '', newSection);
                const translatedSection = {
                    heading: translatedHeading,
                    level: newSection.level,
                    id: newSection.id,
                    content: result.translatedSection || '',
                    startLine: 0,
                    endLine: 0,
                    subsections: subsections,
                };
                resultSections.push(translatedSection);
                this.log(`Added new section at position ${i}`);
            }
            else if (change.type === 'modified') {
                // Update existing section
                this.log(`Processing MODIFIED section: ${newSection.heading}`);
                // Find matching target section
                const targetSection = this.findTargetSectionByHeadingMap(change.oldSection, targetSections.sections, headingMap);
                if (!targetSection) {
                    this.log(`Warning: Could not find target section for "${change.oldSection?.heading}", treating as new`);
                    // Treat as new section
                    const fullSectionContent = this.serializeSection(newSection);
                    const result = await this.translator.translateSection({
                        mode: 'new',
                        sourceLanguage,
                        targetLanguage,
                        glossary,
                        englishSection: fullSectionContent,
                    });
                    if (!result.success) {
                        throw new Error(`Translation failed for section: ${result.error}`);
                    }
                    const translatedLines = (result.translatedSection || '').split('\n');
                    const translatedHeading = translatedLines[0] || '';
                    // Parse subsections from translated content
                    const subsections = await this.parseTranslatedSubsections(result.translatedSection || '', newSection);
                    resultSections.push({
                        heading: translatedHeading,
                        level: newSection.level,
                        id: newSection.id,
                        content: result.translatedSection || '',
                        startLine: 0,
                        endLine: 0,
                        subsections: subsections,
                    });
                    continue;
                }
                // Serialize sections with all subsections
                const oldFullContent = this.serializeSection(change.oldSection);
                const newFullContent = this.serializeSection(newSection);
                const currentFullContent = this.serializeSection(targetSection);
                const result = await this.translator.translateSection({
                    mode: 'update',
                    sourceLanguage,
                    targetLanguage,
                    glossary,
                    oldEnglish: oldFullContent,
                    newEnglish: newFullContent,
                    currentTranslation: currentFullContent,
                });
                if (!result.success) {
                    throw new Error(`Translation failed for modified section: ${result.error}`);
                }
                // Parse subsections from translated content
                const subsections = await this.parseTranslatedSubsections(result.translatedSection || '', newSection);
                // Use updated content
                resultSections.push({
                    ...targetSection,
                    content: result.translatedSection || targetSection.content,
                    subsections: subsections,
                });
                this.log(`Updated section at position ${i}`);
            }
        }
        // 6. Update heading map with new/changed sections
        // Debug: Count subsections in result
        let totalSubsections = 0;
        for (const section of resultSections) {
            totalSubsections += section.subsections?.length || 0;
        }
        this.log(`Debug: resultSections has ${resultSections.length} sections with ${totalSubsections} total subsections`);
        const updatedHeadingMap = (0, heading_map_1.updateHeadingMap)(headingMap, newSourceSections.sections, resultSections);
        this.log(`Updated heading map to ${updatedHeadingMap.size} entries`);
        // 7. Reconstruct document from sections
        this.log(`Reconstructing document from ${resultSections.length} sections`);
        const reconstructed = this.reconstructFromSections(resultSections, targetSections.frontmatter, updatedPreamble);
        // 8. Inject updated heading map into frontmatter
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
     * Parse translated content to extract subsections
     * This ensures subsections are properly populated in the heading-map
     */
    async parseTranslatedSubsections(translatedContent, sourceSection) {
        try {
            // Wrap in minimal MyST document for parsing
            const wrappedContent = `---
jupytext:
  text_representation:
    extension: .md
    format_name: myst
---

${translatedContent}`;
            const parsed = await this.parser.parseSections(wrappedContent, 'temp.md');
            // Extract subsections from the first section
            if (parsed.sections.length > 0 && parsed.sections[0].subsections.length > 0) {
                this.log(`Extracted ${parsed.sections[0].subsections.length} subsections from translated content`);
                return parsed.sections[0].subsections;
            }
        }
        catch (error) {
            this.log(`Warning: Failed to parse subsections from translated content: ${error}`);
        }
        return [];
    }
    /**
     * Find target section using heading map (preferred) or ID fallback
     * Returns the actual section object or undefined if not found
     */
    findTargetSectionByHeadingMap(sourceSection, targetSections, headingMap) {
        this.log(`Finding target for source section: "${sourceSection.heading}" (id: ${sourceSection.id})`);
        // Strategy 1: Use heading map to find translated heading
        const translatedHeading = (0, heading_map_1.lookupTargetHeading)(sourceSection.heading, headingMap);
        if (translatedHeading) {
            this.log(`  Strategy 1: Looking for translated heading: "${translatedHeading}"`);
            // Search for the translated heading in target sections
            for (const targetSection of targetSections) {
                const cleanTargetHeading = targetSection.heading.replace(/^#+\s+/, '').trim();
                if (cleanTargetHeading === translatedHeading) {
                    this.log(`  ✓ Found by heading map: "${translatedHeading}"`);
                    return targetSection;
                }
            }
            this.log(`  ✗ Not found by heading map`);
        }
        else {
            this.log(`  Strategy 1: No heading map entry for "${sourceSection.heading.replace(/^#+\s+/, '').trim()}"`);
        }
        // Strategy 2: Fall back to ID-based matching
        this.log(`  Strategy 2: Looking for ID: "${sourceSection.id}"`);
        for (const targetSection of targetSections) {
            if (targetSection.id === sourceSection.id) {
                this.log(`  ✓ Found by ID: ${sourceSection.id}`);
                return targetSection;
            }
        }
        this.log(`  ✗ Not found by ID`);
        // Log target section IDs for debugging
        if (targetSections.length <= 10) {
            this.log(`  Available target IDs: ${targetSections.map(s => s.id).join(', ')}`);
        }
        return undefined;
    }
    /**
     * Find target section index using heading map (preferred) or position fallback
     *
     * Strategy:
     * 1. Look up translated heading in heading map
     * 2. Search for that heading in target sections
     * 3. If not found, fall back to position-based matching
     *
     * @deprecated Use findTargetSectionByHeadingMap instead - this version has position tracking bugs
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
     * Serialize a section with all its subsections into markdown text
     * This ensures subsections are included when translating
     */
    serializeSection(section) {
        const parts = [];
        // Add section content (heading and direct content)
        parts.push(section.content);
        // Add subsections if present
        for (const subsection of section.subsections) {
            parts.push(''); // Empty line before subsection
            parts.push(subsection.content);
        }
        return parts.join('\n');
    }
    /**
     * Reconstruct full markdown document from sections
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