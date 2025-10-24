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
     * Process a file using component-based approach
     * Always reconstructs complete document: CONFIG + TITLE + INTRO + SECTIONS
     * This ensures no components get lost during translation updates
     */
    async processSectionBased(oldContent, newContent, targetContent, filepath, sourceLanguage, targetLanguage, glossary) {
        this.log(`Processing file using component-based approach: ${filepath}`);
        // 1. Parse all documents into components
        const oldSource = await this.parser.parseDocumentComponents(oldContent, filepath);
        const newSource = await this.parser.parseDocumentComponents(newContent, filepath);
        const target = await this.parser.parseDocumentComponents(targetContent, filepath);
        this.log(`Old source: ${oldSource.sections.length} sections`);
        this.log(`New source: ${newSource.sections.length} sections`);
        this.log(`Target: ${target.sections.length} sections`);
        // 2. Extract heading map from target document
        const headingMap = (0, heading_map_1.extractHeadingMap)(targetContent);
        this.log(`Loaded heading map with ${headingMap.size} entries`);
        // 3. Process each component - translate if changed, copy if unchanged
        // CONFIG: Always use new source config (doesn't get translated)
        const resultConfig = newSource.config;
        // TITLE: Translate if changed, otherwise keep target
        let resultTitle = target.title;
        if (oldSource.title !== newSource.title) {
            this.log(`TITLE changed: "${oldSource.titleText}" -> "${newSource.titleText}"`);
            const result = await this.translator.translateSection({
                mode: 'update',
                sourceLanguage,
                targetLanguage,
                glossary,
                oldEnglish: oldSource.title,
                newEnglish: newSource.title,
                currentTranslation: target.title,
            });
            if (!result.success) {
                throw new Error(`Translation failed for title: ${result.error}`);
            }
            resultTitle = result.translatedSection || target.title;
            this.log(`Translated title to: "${resultTitle}"`);
        }
        else {
            this.log(`TITLE unchanged, keeping target: "${target.title}"`);
        }
        // INTRO: Translate if changed, otherwise keep target
        let resultIntro = target.intro;
        if (oldSource.intro !== newSource.intro) {
            this.log(`INTRO changed (${oldSource.intro.length} -> ${newSource.intro.length} chars)`);
            const result = await this.translator.translateSection({
                mode: 'update',
                sourceLanguage,
                targetLanguage,
                glossary,
                oldEnglish: oldSource.intro,
                newEnglish: newSource.intro,
                currentTranslation: target.intro,
            });
            if (!result.success) {
                throw new Error(`Translation failed for intro: ${result.error}`);
            }
            resultIntro = result.translatedSection || target.intro;
            this.log(`Translated intro (${resultIntro.length} chars)`);
        }
        else {
            this.log(`INTRO unchanged, keeping target`);
        }
        // SECTIONS: Detect changes and process each section
        const changes = await this.diffDetector.detectSectionChanges(oldContent, newContent, filepath);
        this.log(`Detected ${changes.length} section-level changes`);
        const resultSections = [];
        // Process each section from new source (ensures proper order)
        for (let i = 0; i < newSource.sections.length; i++) {
            const newSection = newSource.sections[i];
            // Find if this section has changes
            const change = changes.find(c => c.newSection?.id === newSection.id);
            if (!change) {
                // Section unchanged - copy from target
                const targetSection = this.findTargetSectionByHeadingMap(newSection, target.sections, headingMap, i // Position hint for fallback
                );
                if (targetSection) {
                    resultSections.push(targetSection);
                    this.log(`Keeping unchanged section: ${newSection.heading}`);
                }
                else {
                    // If we can't find target section, treat as new
                    this.log(`Warning: No target found for section: ${newSection.heading}, treating as new`);
                    const translatedSection = await this.translateNewSection(newSection, sourceLanguage, targetLanguage, glossary);
                    resultSections.push(translatedSection);
                }
                continue;
            }
            // Section has changes - translate based on change type
            if (change.type === 'added') {
                this.log(`Processing ADDED section: ${newSection.heading}`);
                const translatedSection = await this.translateNewSection(newSection, sourceLanguage, targetLanguage, glossary);
                resultSections.push(translatedSection);
            }
            else if (change.type === 'modified') {
                this.log(`Processing MODIFIED section: ${newSection.heading}`);
                // Find matching target section
                const targetSection = this.findTargetSectionByHeadingMap(change.oldSection, target.sections, headingMap, i);
                if (!targetSection) {
                    this.log(`Warning: Could not find target for modified section, treating as new`);
                    const translatedSection = await this.translateNewSection(newSection, sourceLanguage, targetLanguage, glossary);
                    resultSections.push(translatedSection);
                    continue;
                }
                // Translate the update
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
                // Parse subsections from translated content and strip them from content
                const { subsections, contentWithoutSubsections } = await this.parseTranslatedSubsections(result.translatedSection || '', newSection);
                // Extract heading from target section (Chinese) and body from translated content
                // This preserves the Chinese heading while using the new translated body
                let finalContent = contentWithoutSubsections || targetSection.content;
                if (contentWithoutSubsections) {
                    const translatedLines = contentWithoutSubsections.split('\n');
                    // Skip the first line (translated heading) and keep the rest
                    const bodyLines = translatedLines.slice(1);
                    // Combine target heading with translated body
                    finalContent = `${targetSection.heading}\n${bodyLines.join('\n')}`;
                }
                // If no subsections found in translated content, preserve subsections from target
                // This handles cases where translator doesn't return full structure (e.g., TEST mode)
                const finalSubsections = subsections.length > 0 ? subsections : targetSection.subsections;
                resultSections.push({
                    ...targetSection,
                    content: finalContent,
                    subsections: finalSubsections,
                });
                this.log(`Updated section at position ${i}`);
            }
        }
        // 4. Update heading map with all sections (including title)
        this.log(`Updating heading map`);
        // Add title to heading map
        const updatedHeadingMap = new Map(headingMap);
        const newTitleText = newSource.titleText;
        const resultTitleText = resultTitle.replace(/^#\s+/, '').trim();
        updatedHeadingMap.set(newTitleText, resultTitleText);
        // Add sections to heading map
        const finalHeadingMap = (0, heading_map_1.updateHeadingMap)(updatedHeadingMap, newSource.sections, resultSections);
        this.log(`Updated heading map to ${finalHeadingMap.size} entries`);
        // 5. Reconstruct complete document from all components
        this.log(`Reconstructing complete document`);
        const reconstructed = this.reconstructFromComponents(resultConfig, resultTitle, resultIntro, resultSections);
        // 6. Inject updated heading map into frontmatter
        return (0, heading_map_1.injectHeadingMap)(reconstructed, finalHeadingMap);
    }
    /**
     * Helper: Translate a new section
     */
    async translateNewSection(section, sourceLanguage, targetLanguage, glossary) {
        const fullSectionContent = this.serializeSection(section);
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
        const translatedLines = (result.translatedSection || '').split('\n');
        const translatedHeading = translatedLines[0] || '';
        const { subsections, contentWithoutSubsections } = await this.parseTranslatedSubsections(result.translatedSection || '', section);
        return {
            heading: translatedHeading,
            level: section.level,
            id: section.id,
            content: contentWithoutSubsections || '',
            startLine: 0,
            endLine: 0,
            subsections: subsections,
        };
    }
    /**
     * Reconstruct document from components: CONFIG + TITLE + INTRO + SECTIONS
     * This ensures we always produce a complete, valid document
     */
    reconstructFromComponents(config, title, intro, sections) {
        const parts = [];
        // 1. CONFIG (frontmatter)
        if (config) {
            parts.push(config);
            parts.push(''); // Empty line after frontmatter
        }
        // 2. TITLE
        parts.push(title);
        parts.push(''); // Empty line after title
        // 3. INTRO (can be empty)
        if (intro) {
            parts.push(intro);
            parts.push(''); // Empty line after intro
        }
        // 4. SECTIONS (can be empty array) - includes subsections
        for (const section of sections) {
            // Use serializeSection to include subsections
            parts.push(this.serializeSection(section));
            parts.push(''); // Empty line between sections
        }
        return parts.join('\n').trim() + '\n';
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
     * Parse translated content to extract subsections and strip them from parent content
     * This ensures subsections are properly populated in the heading-map and not duplicated
     * Returns both the subsections and the content without subsections
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
                const section = parsed.sections[0];
                this.log(`Extracted ${section.subsections.length} subsections from translated content`);
                // Calculate wrapper length by counting lines up to and including the closing ---
                // This handles variable-length YAML headers correctly
                const wrapperLines = wrappedContent.split('\n');
                let wrapperLineCount = 0;
                let foundClosingFence = false;
                for (let i = 0; i < wrapperLines.length; i++) {
                    wrapperLineCount++;
                    if (i > 0 && wrapperLines[i] === '---') {
                        // Found closing fence, count one more line for the empty line after
                        wrapperLineCount++;
                        foundClosingFence = true;
                        break;
                    }
                }
                if (!foundClosingFence) {
                    this.log('Warning: Could not find closing YAML fence in wrapper');
                    return { subsections: [], contentWithoutSubsections: translatedContent };
                }
                // Convert parser's 1-indexed line number to position in original content
                // Parser line numbers are 1-indexed, array indices are 0-indexed
                const firstSubsectionLine1Indexed = section.subsections[0].startLine;
                const firstSubsectionLine0Indexed = firstSubsectionLine1Indexed - 1;
                const positionInOriginalContent = firstSubsectionLine0Indexed - wrapperLineCount;
                // Extract content before first subsection
                const lines = translatedContent.split('\n');
                const contentLines = lines.slice(0, positionInOriginalContent);
                const contentWithoutSubsections = contentLines.join('\n').trim();
                return {
                    subsections: section.subsections,
                    contentWithoutSubsections
                };
            }
        }
        catch (error) {
            this.log(`Warning: Failed to parse subsections from translated content: ${error}`);
        }
        return {
            subsections: [],
            contentWithoutSubsections: translatedContent
        };
    }
    /**
     * Find target section using heading map (preferred) or ID fallback
     * Returns the actual section object or undefined if not found
     */
    findTargetSectionByHeadingMap(sourceSection, targetSections, headingMap, positionHint // Optional position for fallback matching
    ) {
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
        // Strategy 3: Fall back to position-based matching if heading map is empty
        // This handles initial translations where no heading-map exists yet
        if (headingMap.size === 0 && positionHint !== undefined) {
            this.log(`  Strategy 3: Heading map empty, using position-based fallback`);
            if (positionHint >= 0 && positionHint < targetSections.length) {
                this.log(`  ✓ Found by position: index ${positionHint}`);
                return targetSections[positionHint];
            }
            this.log(`  ✗ Position ${positionHint} out of bounds (target has ${targetSections.length} sections)`);
        }
        return undefined;
    }
    /**
     * Helper to find the index of a section in the NEW source sections
     * Used for position-based fallback
     */
    findSourceSectionIndex(section) {
        // This is a bit of a hack - we don't have easy access to the newSourceSections array here
        // For now, return -1 to indicate we need a better solution
        // TODO: Refactor to pass section index or make newSourceSections available
        return -1;
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
     * Validate the translated content has valid MyST syntax
     */
    async validateMyST(content, filepath) {
        return await this.parser.validateMyST(content, filepath);
    }
}
exports.FileProcessor = FileProcessor;
//# sourceMappingURL=file-processor.js.map