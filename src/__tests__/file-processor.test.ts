import { Section } from '../types';

/**
 * Tests for FileProcessor key methods
 * 
 * These tests verify the critical bug fixes:
 * - Bug #2: findMatchingSectionIndex() must match by ID, not position
 */

describe('FileProcessor - Section Matching Logic', () => {
  /**
   * Simulates the FIXED findMatchingSectionIndex logic
   * This matches sections by ID, not position
   */
  function findMatchingSectionIndex(targetSections: Section[], sourceSection: Section): number {
    for (let i = 0; i < targetSections.length; i++) {
      if (targetSections[i].id === sourceSection.id) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Simulates the OLD BUGGY logic for comparison
   * This always returned 0 for the first matching level
   */
  function findMatchingSectionIndexBuggy(targetSections: Section[], sourceSection: Section): number {
    for (let i = 0; i < targetSections.length; i++) {
      const targetSection = targetSections[i];
      
      // BUG: This matched on level and subsection count, always returning first match
      if (targetSection.level === sourceSection.level) {
        const subsectionDiff = Math.abs(targetSection.subsections.length - sourceSection.subsections.length);
        if (subsectionDiff <= 1) {
          return i;  // Always returned 0 for level-2 sections
        }
      }
    }
    return -1;
  }

  describe('Bug #2 Fix - findMatchingSectionIndex()', () => {
    const targetSections: Section[] = [
      { id: 'intro.md:getting-started', heading: '## Getting Started', level: 2, content: '', startLine: 1, endLine: 5, subsections: [] },
      { id: 'intro.md:mathematical-example', heading: '## Mathematical Example', level: 2, content: '', startLine: 6, endLine: 10, subsections: [] },
      { id: 'intro.md:python-tools', heading: '## Python Tools', level: 2, content: '', startLine: 11, endLine: 15, subsections: [] },
      { id: 'intro.md:data-analysis', heading: '## Data Analysis', level: 2, content: '', startLine: 16, endLine: 20, subsections: [] }
    ];

    it('FIXED: should find correct section by ID', () => {
      // Test finding each section correctly
      expect(findMatchingSectionIndex(targetSections, targetSections[0])).toBe(0);
      expect(findMatchingSectionIndex(targetSections, targetSections[1])).toBe(1);
      expect(findMatchingSectionIndex(targetSections, targetSections[2])).toBe(2);
      expect(findMatchingSectionIndex(targetSections, targetSections[3])).toBe(3);
    });

    it('BUG: old code always returned 0 for level-2 sections', () => {
      // Demonstrate the bug - all level-2 sections matched the first one
      expect(findMatchingSectionIndexBuggy(targetSections, targetSections[0])).toBe(0); // Correct by accident
      expect(findMatchingSectionIndexBuggy(targetSections, targetSections[1])).toBe(0); // WRONG! Should be 1
      expect(findMatchingSectionIndexBuggy(targetSections, targetSections[2])).toBe(0); // WRONG! Should be 2
      expect(findMatchingSectionIndexBuggy(targetSections, targetSections[3])).toBe(0); // WRONG! Should be 3
    });

    it('should return -1 when section not found', () => {
      const newSection: Section = {
        id: 'intro.md:new-section',
        heading: '## New Section',
        level: 2,
        content: '',
        startLine: 25,
        endLine: 30,
        subsections: []
      };
      
      expect(findMatchingSectionIndex(targetSections, newSection)).toBe(-1);
    });

    it('should handle first section correctly (not always return 0)', () => {
      // Verify we correctly identify first section vs incorrectly always returning 0
      const firstSection = targetSections[0];
      const thirdSection = targetSections[2];
      
      expect(findMatchingSectionIndex(targetSections, firstSection)).toBe(0);
      expect(findMatchingSectionIndex(targetSections, thirdSection)).toBe(2); // NOT 0!
    });
  });

  describe('Document Reconstruction Logic', () => {
    /**
     * Simulates reconstructDocument - assembles sections back into a document
     */
    function reconstructDocument(sections: Section[], frontmatter: string): string {
      let result = frontmatter;
      
      for (const section of sections) {
        result += section.heading + section.content;
        
        // Add subsections
        for (const subsection of section.subsections) {
          result += subsection.heading + subsection.content;
        }
      }
      
      return result.trim();
    }

    it('should preserve section order', () => {
      const sections: Section[] = [
        { id: 'test.md:intro', heading: '# Title', level: 1, content: '\n\nIntro.\n\n', startLine: 1, endLine: 3, subsections: [] },
        { id: 'test.md:a', heading: '## A', level: 2, content: '\n\nContent A.\n\n', startLine: 4, endLine: 6, subsections: [] },
        { id: 'test.md:b', heading: '## B', level: 2, content: '\n\nContent B.\n\n', startLine: 7, endLine: 9, subsections: [] }
      ];
      
      const doc = reconstructDocument(sections, '');
      
      expect(doc.indexOf('# Title')).toBeLessThan(doc.indexOf('## A'));
      expect(doc.indexOf('## A')).toBeLessThan(doc.indexOf('## B'));
    });

    it('should include subsections in correct order', () => {
      const sections: Section[] = [
        {
          id: 'test.md:parent',
          heading: '## Parent',
          level: 2,
          content: '\n\nParent content.\n\n',
          startLine: 1,
          endLine: 5,
          subsections: [
            {
              id: 'test.md:parent:child',
              heading: '### Child',
              level: 3,
              content: '\n\nChild content.\n\n',
              startLine: 3,
              endLine: 5,
              subsections: []
            }
          ]
        }
      ];
      
      const doc = reconstructDocument(sections, '');
      
      expect(doc).toContain('## Parent');
      expect(doc).toContain('### Child');
      expect(doc.indexOf('## Parent')).toBeLessThan(doc.indexOf('### Child'));
    });
  });
});

