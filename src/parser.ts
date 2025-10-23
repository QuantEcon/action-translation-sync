/**
 * MyST Markdown Section Parser
 * 
 * Parses MyST markdown documents into sections based on ## headings.
 * Each section includes all content until the next ## heading, including
 * any nested ### subsections.
 * 
 * This simplified parser replaces the previous block-based approach with
 * a cleaner section-based structure that's easier to work with for translations.
 */

import { Section, ParsedSections, DocumentComponents } from './types';

export class MystParser {
  /**
   * Parse markdown content into sections based on ## headings
   * Each section includes all content until the next ## heading
   */
  async parseSections(content: string, filepath: string): Promise<ParsedSections> {
    const lines = content.split('\n');
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let currentSubsection: Section | null = null;
    
    // Extract frontmatter (YAML between --- markers)
    let frontmatter: string | undefined;
    let preamble: string | undefined;
    let contentStartIndex = 0;
    
    if (lines[0] === '---') {
      // Find end of frontmatter
      const endIndex = lines.slice(1).findIndex(line => line === '---');
      if (endIndex !== -1) {
        // Extract frontmatter including the --- markers
        frontmatter = lines.slice(0, endIndex + 2).join('\n');
        contentStartIndex = endIndex + 2;
      }
    }
    
    // Extract preamble (content before first ## heading)
    const firstSectionIndex = lines.slice(contentStartIndex).findIndex(line => line.match(/^##\s+/));
    if (firstSectionIndex !== -1) {
      const preambleLines = lines.slice(contentStartIndex, contentStartIndex + firstSectionIndex);
      // Only keep preamble if it has non-empty content
      const preambleText = preambleLines.join('\n').trim();
      if (preambleText) {
        preamble = preambleText;
      }
      contentStartIndex = contentStartIndex + firstSectionIndex;
    }
    
    for (let i = contentStartIndex; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check for ## heading (top-level section)
      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        // Save previous section if exists
        if (currentSection) {
          // Save current subsection to section before pushing
          if (currentSubsection) {
            currentSubsection.endLine = lineNum - 1;
            currentSection.subsections.push(currentSubsection);
          }
          currentSection.endLine = lineNum - 1;
          sections.push(currentSection);
        }
        
        // Start new section
        const headingText = h2Match[1];
        const id = this.generateHeadingId(headingText);
        currentSection = {
          heading: line,
          level: 2,
          id,
          content: line + '\n',
          startLine: lineNum,
          endLine: lineNum,
          subsections: [],
        };
        currentSubsection = null;
        continue;
      }
      
      // Check for ### heading (subsection)
      const h3Match = line.match(/^###\s+(.+)$/);
      if (h3Match && currentSection) {
        // Save previous subsection if exists
        if (currentSubsection) {
          currentSubsection.endLine = lineNum - 1;
          currentSection.subsections.push(currentSubsection);
        }
        
        // Start new subsection
        const headingText = h3Match[1];
        const id = this.generateHeadingId(headingText);
        currentSubsection = {
          heading: line,
          level: 3,
          id,
          content: line + '\n',
          startLine: lineNum,
          endLine: lineNum,
          parentId: currentSection.id,
          subsections: [],
        };
        continue;
      }
      
      // Add content to current section/subsection
      if (currentSubsection) {
        currentSubsection.content += line + '\n';
        currentSubsection.endLine = lineNum;
      } else if (currentSection) {
        currentSection.content += line + '\n';
        currentSection.endLine = lineNum;
      }
    }
    
    // Save last section
    if (currentSection) {
      if (currentSubsection) {
        currentSection.subsections.push(currentSubsection);
      }
      sections.push(currentSection);
    }
    
    // Trim trailing newlines from content
    sections.forEach(section => {
      section.content = section.content.trimEnd();
      section.subsections.forEach(sub => {
        sub.content = sub.content.trimEnd();
      });
    });

    return {
      sections,
      frontmatter,
      preamble,
      metadata: {
        filepath,
        totalLines: lines.length,
        sectionCount: sections.length,
      },
    };
  }  /**
   * Generate heading ID/anchor from heading text
   * Follows the same rules as MyST/Sphinx for consistency
   */
  private generateHeadingId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Find a section by ID (searches recursively through subsections)
   */
  findSectionById(sections: Section[], id: string): Section | undefined {
    for (const section of sections) {
      if (section.id === id) {
        return section;
      }
      const found = this.findSectionById(section.subsections, id);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  /**
   * Find section by position/index
   */
  findSectionByPosition(sections: Section[], index: number): Section | undefined {
    return sections[index];
  }

  /**
   * Validate MyST syntax by attempting to parse
   * Returns true if valid, false otherwise
   */
  async validateMyST(content: string, filepath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.parseSections(content, filepath);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  /**
   * Parse document into explicit components: CONFIG + TITLE + INTRO + SECTIONS
   * 
   * This provides a more structured view of the document that ensures
   * complete reconstruction by always including all components.
   * 
   * @param content - The markdown content to parse
   * @param filepath - Path to the file (for metadata)
   * @returns DocumentComponents with all parts explicitly separated
   */
  async parseDocumentComponents(content: string, filepath: string): Promise<DocumentComponents> {
    const lines = content.split('\n');
    let contentStartIndex = 0;
    
    // 1. Extract CONFIG (frontmatter YAML)
    let config = '';
    if (lines[0] === '---') {
      const endIndex = lines.slice(1).findIndex(line => line === '---');
      if (endIndex !== -1) {
        config = lines.slice(0, endIndex + 2).join('\n');
        contentStartIndex = endIndex + 2;
      }
    }
    
    // 2. Extract TITLE (# heading)
    let title = '';
    let titleText = '';
    let titleEndIndex = contentStartIndex;
    
    // Skip empty lines after frontmatter
    while (titleEndIndex < lines.length && lines[titleEndIndex].trim() === '') {
      titleEndIndex++;
    }
    
    // Find the # heading
    if (titleEndIndex < lines.length) {
      const titleLine = lines[titleEndIndex];
      const titleMatch = titleLine.match(/^#\s+(.+)$/);
      if (titleMatch) {
        title = titleLine;
        titleText = titleMatch[1];
        titleEndIndex++;
      } else {
        throw new Error(`Expected # title heading at line ${titleEndIndex + 1}, found: ${titleLine}`);
      }
    } else {
      throw new Error('Document must have a # title heading');
    }
    
    // 3. Extract INTRO (content between title and first ##)
    const firstSectionIndex = lines.slice(titleEndIndex).findIndex(line => line.match(/^##\s+/));
    let intro = '';
    let sectionsStartIndex = titleEndIndex;
    
    if (firstSectionIndex !== -1) {
      // There are ## sections, so extract intro
      const introLines = lines.slice(titleEndIndex, titleEndIndex + firstSectionIndex);
      intro = introLines.join('\n').trim();
      sectionsStartIndex = titleEndIndex + firstSectionIndex;
    } else {
      // No ## sections, everything after title is intro
      const introLines = lines.slice(titleEndIndex);
      intro = introLines.join('\n').trim();
      sectionsStartIndex = lines.length; // No sections to parse
    }
    
    // 4. Extract SECTIONS (## headings)
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let currentSubsection: Section | null = null;
    
    for (let i = sectionsStartIndex; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check for ## heading (top-level section)
      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        // Save previous section if exists
        if (currentSection) {
          if (currentSubsection) {
            currentSubsection.endLine = lineNum - 1;
            currentSection.subsections.push(currentSubsection);
          }
          currentSection.endLine = lineNum - 1;
          sections.push(currentSection);
        }
        
        // Start new section
        const headingText = h2Match[1];
        const id = this.generateHeadingId(headingText);
        currentSection = {
          heading: line,
          level: 2,
          id,
          content: line + '\n',
          startLine: lineNum,
          endLine: lineNum,
          subsections: [],
        };
        currentSubsection = null;
        continue;
      }
      
      // Check for ### heading (subsection)
      const h3Match = line.match(/^###\s+(.+)$/);
      if (h3Match && currentSection) {
        // Save previous subsection if exists
        if (currentSubsection) {
          currentSubsection.endLine = lineNum - 1;
          currentSection.subsections.push(currentSubsection);
        }
        
        // Start new subsection
        const headingText = h3Match[1];
        const id = this.generateHeadingId(headingText);
        currentSubsection = {
          heading: line,
          level: 3,
          id,
          content: line + '\n',
          startLine: lineNum,
          endLine: lineNum,
          parentId: currentSection.id,
          subsections: [],
        };
        continue;
      }
      
      // Add content to current section/subsection
      if (currentSubsection) {
        currentSubsection.content += line + '\n';
        currentSubsection.endLine = lineNum;
      } else if (currentSection) {
        currentSection.content += line + '\n';
        currentSection.endLine = lineNum;
      }
    }
    
    // Save last section
    if (currentSection) {
      if (currentSubsection) {
        currentSection.subsections.push(currentSubsection);
      }
      sections.push(currentSection);
    }
    
    // Trim trailing newlines from section content
    sections.forEach(section => {
      section.content = section.content.trimEnd();
      section.subsections.forEach(sub => {
        sub.content = sub.content.trimEnd();
      });
    });
    
    return {
      config,
      title,
      titleText,
      intro,
      sections,
      metadata: {
        filepath,
        totalLines: lines.length,
        sectionCount: sections.length,
      },
    };
  }
}
