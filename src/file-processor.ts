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
import { 
  extractHeadingMap, 
  updateHeadingMap, 
  lookupTargetHeading,
  injectHeadingMap,
  HeadingMap
} from './heading-map';

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

    // 2. Extract heading map from target document
    const headingMap = extractHeadingMap(targetContent);
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
        
        // Serialize section with all subsections
        const fullSectionContent = change.newSection 
          ? this.serializeSection(change.newSection)
          : '';
        
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

        // Match section using heading map (preferred) or fallback to position
        const targetSectionIndex = this.findTargetSectionIndex(
          change.oldSection,
          updatedSections,
          sourceSections.sections,
          headingMap
        );
        
        if (targetSectionIndex === -1) {
          this.log(`Warning: Could not find target section for "${change.oldSection?.heading}"`);
          continue;
        }

        const targetSection = updatedSections[targetSectionIndex];

        // Serialize sections with all subsections
        const oldFullContent = change.oldSection 
          ? this.serializeSection(change.oldSection)
          : '';
        const newFullContent = change.newSection 
          ? this.serializeSection(change.newSection)
          : '';
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

    // 4. Update heading map with new/changed sections
    const updatedHeadingMap = updateHeadingMap(
      headingMap,
      await (await this.parser.parseSections(newContent, filepath)).sections,
      updatedSections
    );
    this.log(`Updated heading map to ${updatedHeadingMap.size} entries`);
    
    // 5. Reconstruct document from sections
    this.log(`Reconstructing document from ${updatedSections.length} sections`);
    const reconstructed = this.reconstructFromSections(
      updatedSections,
      targetSections.frontmatter,
      updatedPreamble
    );
    
    // 6. Inject updated heading map into frontmatter
    return injectHeadingMap(reconstructed, updatedHeadingMap);
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
   * Find target section index using heading map (preferred) or position fallback
   * 
   * Strategy:
   * 1. Look up translated heading in heading map
   * 2. Search for that heading in target sections
   * 3. If not found, fall back to position-based matching
   */
  private findTargetSectionIndex(
    sourceSection: Section | undefined,
    targetSections: Section[],
    sourceSections: Section[],
    headingMap: HeadingMap
  ): number {
    if (!sourceSection) {
      return -1;
    }

    // Strategy 1: Use heading map to find translated heading
    const translatedHeading = lookupTargetHeading(sourceSection.heading, headingMap);
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
   * Serialize a section with all its subsections into markdown text
   * This ensures subsections are included when translating
   */
  private serializeSection(section: Section): string {
    const parts: string[] = [];
    
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
  async validateMyST(content: string, filepath: string): Promise<{ valid: boolean; error?: string }> {
    return await this.parser.validateMyST(content, filepath);
  }
}
