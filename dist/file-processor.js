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
        // 2. Parse target document into sections
        const targetSections = await this.parser.parseSections(targetContent, filepath);
        this.log(`Target document has ${targetSections.sections.length} sections`);
        // 3. Process each change
        const updatedSections = [...targetSections.sections];
        for (const change of changes) {
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
                // Find matching section in target (by position)
                const targetSectionIndex = this.findMatchingSectionIndex(updatedSections, change.oldSection);
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
        // 4. Reconstruct document from sections
        this.log(`Reconstructing document from ${updatedSections.length} sections`);
        return this.reconstructFromSections(updatedSections, targetSections.frontmatter, targetSections.preamble);
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
     * Find matching section index in target document
     * Match by section ID (heading ID like "economic-models", "introduction", etc.)
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
            // Add section content (includes heading and all nested content)
            parts.push(section.content);
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