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

import { MystParser } from './parser';
import { DiffDetector } from './diff-detector';
import { TranslationService } from './translator';
import { Section, Glossary } from './types';
import * as core from '@actions/core';

export class FileProcessor {
  private parser: MystParser;
  private diffDetector: DiffDetector;
  private translator: TranslationService;
  private debug: boolean;

  constructor(translationService: TranslationService, debug: boolean = false) {
    this.parser = new MystParser();
    this.diffDetector = new DiffDetector(debug);
    this.translator = translationService;
    this.debug = debug;
  }

  private log(message: string): void {
    if (this.debug) {
      core.info(`[FileProcessor] ${message}`);
    }
  }

  /**
   * Process a file using section-based approach
   * This is the main method for handling existing files with changes
   */
  async processSectionBased(
    oldContent: string,
    newContent: string,
    targetContent: string,
    filepath: string,
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Glossary
  ): Promise<string> {
    this.log(`Processing file using section-based approach: ${filepath}`);

    // 1. Detect section-level changes
    const changes = await this.diffDetector.detectSectionChanges(oldContent, newContent, filepath);

    if (changes.length === 0) {
      this.log('No section changes detected, returning target content unchanged');
      return targetContent;
    }

    this.log(`Detected ${changes.length} section changes`);

    // 2. Parse source and target documents into sections
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
        
        const newSection: Section = {
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

      } else if (change.type === 'modified') {
        // Update existing section
        this.log(`Processing MODIFIED section: ${change.newSection?.heading}`);

        // For MODIFIED sections, match by position in the document
        // (IDs are language-specific, so we can't match by ID across languages)
        const sourceIndex = change.oldSection ? 
          sourceSections.sections.findIndex((s: Section) => s.id === change.oldSection?.id) : -1;
        
        if (sourceIndex === -1 || sourceIndex >= updatedSections.length) {
          this.log(`Warning: Could not find target section for "${change.oldSection?.heading}" at position ${sourceIndex}`);
          continue;
        }
        
        const targetSectionIndex = sourceIndex;

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

      } else if (change.type === 'deleted') {
        // Remove section
        this.log(`Processing DELETED section: ${change.oldSection?.heading}`);

        const targetSectionIndex = this.findMatchingSectionIndex(
          updatedSections,
          change.oldSection
        );

        if (targetSectionIndex !== -1) {
          updatedSections.splice(targetSectionIndex, 1);
          this.log(`Deleted section at position ${targetSectionIndex}`);
        }
      }
    }

    // 4. Reconstruct document from sections
    this.log(`Reconstructing document from ${updatedSections.length} sections`);
    return this.reconstructFromSections(
      updatedSections,
      targetSections.frontmatter,
      updatedPreamble
    );
  }

  /**
   * Process a full document (for new files)
   */
  async processFull(
    content: string,
    filepath: string,
    sourceLanguage: string,
    targetLanguage: string,
    glossary?: Glossary
  ): Promise<string> {
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
  private findMatchingSectionIndex(
    targetSections: Section[],
    sourceSection?: Section
  ): number {
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
  private reconstructFromSections(
    sections: Section[],
    frontmatter?: string,
    preamble?: string
  ): string {
    const parts: string[] = [];

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
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      this.log(`[Reconstruct] Section ${i}: "${section.heading}" with ${section.subsections.length} subsections`);
      
      // Add section content (heading and direct content)
      parts.push(section.content);
      
      // Add subsections if present
      for (const subsection of section.subsections) {
        this.log(`[Reconstruct]   Subsection: "${subsection.heading}"`);
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
  async validateMyST(content: string, filepath: string): Promise<{ valid: boolean; error?: string }> {
    return await this.parser.validateMyST(content, filepath);
  }
}
