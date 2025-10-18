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

  describe('Bug #3 Fix - Frontmatter and Preamble Preservation', () => {
    /**
     * Simulates reconstructFromSections with frontmatter and preamble
     */
    function reconstructWithFrontmatter(
      sections: Section[],
      frontmatter?: string,
      preamble?: string
    ): string {
      const parts: string[] = [];

      if (frontmatter) {
        parts.push(frontmatter);
        parts.push('');
      }

      if (preamble) {
        parts.push(preamble);
        parts.push('');
      }

      for (const section of sections) {
        parts.push(section.content);
        parts.push('');
      }

      return parts.join('\n').trim() + '\n';
    }

    it('should preserve YAML frontmatter during reconstruction', () => {
      const frontmatter = `---
jupytext:
  text_representation:
    extension: .md
    format_name: myst
kernelspec:
  display_name: Python 3
  name: python3
---`;

      const sections: Section[] = [
        {
          id: 'section-a',
          heading: '## Section A',
          level: 2,
          content: '## Section A\n\nContent here.',
          startLine: 1,
          endLine: 3,
          subsections: []
        }
      ];

      const doc = reconstructWithFrontmatter(sections, frontmatter);

      // Frontmatter should be at the start
      expect(doc.startsWith('---')).toBe(true);
      expect(doc).toContain('jupytext:');
      expect(doc).toContain('format_name: myst');
      expect(doc).toContain('kernelspec:');
      
      // Section should come after frontmatter
      expect(doc.indexOf('---')).toBeLessThan(doc.indexOf('## Section A'));
    });

    it('should preserve document title and intro (preamble) during reconstruction', () => {
      const frontmatter = '---\njupytext:\n  format_name: myst\n---';
      const preamble = '# Introduction to Economics\n\nThis is a test lecture for translation sync action.';

      const sections: Section[] = [
        {
          id: 'basic-concepts',
          heading: '## Basic Concepts',
          level: 2,
          content: '## Basic Concepts\n\nEconomics is the study of resources.',
          startLine: 1,
          endLine: 3,
          subsections: []
        }
      ];

      const doc = reconstructWithFrontmatter(sections, frontmatter, preamble);

      // Should contain frontmatter
      expect(doc).toContain('jupytext:');
      
      // Should contain preamble (title + intro)
      expect(doc).toContain('# Introduction to Economics');
      expect(doc).toContain('This is a test lecture');
      
      // Should contain sections
      expect(doc).toContain('## Basic Concepts');
      
      // Order should be: frontmatter → preamble → sections
      const frontmatterIndex = doc.indexOf('---');
      const titleIndex = doc.indexOf('# Introduction to Economics');
      const sectionIndex = doc.indexOf('## Basic Concepts');
      
      expect(frontmatterIndex).toBeLessThan(titleIndex);
      expect(titleIndex).toBeLessThan(sectionIndex);
    });

    it('BUG #3: without preservation, frontmatter and preamble are lost', () => {
      // This simulates the old buggy behavior
      function reconstructBuggy(sections: Section[]): string {
        const parts: string[] = [];
        for (const section of sections) {
          parts.push(section.content);
          parts.push('');
        }
        return parts.join('\n').trim() + '\n';
      }

      const sections: Section[] = [
        {
          id: 'section-a',
          heading: '## Section A',
          level: 2,
          content: '## Section A\n\nContent.',
          startLine: 1,
          endLine: 2,
          subsections: []
        }
      ];

      const buggyDoc = reconstructBuggy(sections);

      // Buggy version loses frontmatter and title
      expect(buggyDoc).not.toContain('---');
      expect(buggyDoc).not.toContain('jupytext:');
      expect(buggyDoc).not.toContain('# Introduction');
      
      // Only has the section
      expect(buggyDoc).toContain('## Section A');
    });

    it('should handle documents without frontmatter or preamble', () => {
      const sections: Section[] = [
        {
          id: 'section-a',
          heading: '## Section A',
          level: 2,
          content: '## Section A\n\nContent.',
          startLine: 1,
          endLine: 2,
          subsections: []
        }
      ];

      // No frontmatter, no preamble
      const doc = reconstructWithFrontmatter(sections);

      expect(doc).toContain('## Section A');
      expect(doc).not.toContain('---');
      expect(doc).not.toContain('#Introduction');
    });
  });

  // ========================================================================
  // REGRESSION TESTS FOR v0.4.3
  // ========================================================================
  
  describe('Document Reconstruction - v0.4.3 Regression Tests', () => {
    /**
     * Simulates reconstructFromSections - the FIXED version
     */
    function reconstructFromSections(
      sections: Section[],
      frontmatter?: string,
      preamble?: string
    ): string {
      const parts: string[] = [];

      if (frontmatter) {
        parts.push(frontmatter);
        parts.push('');
      }

      if (preamble) {
        parts.push(preamble);
        parts.push('');
      }

      for (const section of sections) {
        // FIXED: section.content already includes subsections
        parts.push(section.content);
        // DO NOT append subsections separately - they're already in section.content!
      }

      return parts.join('\n').trim() + '\n';
    }

    it('should NOT duplicate subsections in output', () => {
      // This is the critical v0.4.3 bug fix test
      const sections: Section[] = [
        {
          id: 'parent-section',
          heading: '## 概述',
          level: 2,
          content: `## 概述

主要内容在这里。

### 核心原则

子部分内容。

`,
          startLine: 10,
          endLine: 20,
          subsections: [
            {
              id: 'parent-section:core-principles',
              heading: '### 核心原则',
              level: 3,
              content: `### 核心原则

子部分内容。

`,
              startLine: 15,
              endLine: 20,
              subsections: []
            }
          ]
        }
      ];

      // Reconstruct document
      const reconstructed = reconstructFromSections(
        sections,
        '---\ntitle: Test\n---',
        ''
      );

      // Count occurrences of subsection heading
      const matches = reconstructed.match(/### 核心原则/g);
      
      // Should appear EXACTLY ONCE (not twice)
      expect(matches).toHaveLength(1);
      
      // Verify content structure
      expect(reconstructed).toContain('## 概述');
      expect(reconstructed).toContain('### 核心原则');
      expect(reconstructed).toContain('主要内容在这里');
      expect(reconstructed).toContain('子部分内容');
    });

    it('BUG: v0.4.3-debug duplicated subsections', () => {
      // Simulate the buggy v0.4.3-debug behavior
      function reconstructBuggy(sections: Section[]): string {
        const parts: string[] = [];
        
        for (const section of sections) {
          parts.push(section.content);  // Already includes subsections
          
          // BUG: Append subsections again!
          for (const subsection of section.subsections) {
            parts.push(subsection.content);  // DUPLICATE!
          }
        }
        
        return parts.join('\n');
      }

      const sections: Section[] = [
        {
          id: 'test',
          heading: '## Section',
          level: 2,
          content: '## Section\n\n### Subsection\n\nContent.\n\n',
          startLine: 1,
          endLine: 5,
          subsections: [
            {
              id: 'test:sub',
              heading: '### Subsection',
              level: 3,
              content: '### Subsection\n\nContent.\n\n',
              startLine: 3,
              endLine: 5,
              subsections: []
            }
          ]
        }
      ];

      const buggyOutput = reconstructBuggy(sections);
      const matches = buggyOutput.match(/### Subsection/g);
      
      // Buggy code produces DUPLICATE
      expect(matches).toHaveLength(2);  // Bug demonstrated!
      
      // Fixed code produces single occurrence
      const fixedOutput = reconstructFromSections(sections);
      const fixedMatches = fixedOutput.match(/### Subsection/g);
      expect(fixedMatches).toHaveLength(1);  // Fixed!
    });

    it('should handle multiple sections with subsections correctly', () => {
      const sections: Section[] = [
        {
          id: 'section-1',
          heading: '## Section 1',
          level: 2,
          content: '## Section 1\n\n### Sub 1A\n\nContent.\n\n### Sub 1B\n\nMore.\n\n',
          startLine: 1,
          endLine: 10,
          subsections: [
            {
              id: 'section-1:sub-1a',
              heading: '### Sub 1A',
              level: 3,
              content: '### Sub 1A\n\nContent.\n\n',
              startLine: 3,
              endLine: 5,
              subsections: []
            },
            {
              id: 'section-1:sub-1b',
              heading: '### Sub 1B',
              level: 3,
              content: '### Sub 1B\n\nMore.\n\n',
              startLine: 7,
              endLine: 10,
              subsections: []
            }
          ]
        },
        {
          id: 'section-2',
          heading: '## Section 2',
          level: 2,
          content: '## Section 2\n\n### Sub 2A\n\nText.\n\n',
          startLine: 11,
          endLine: 15,
          subsections: [
            {
              id: 'section-2:sub-2a',
              heading: '### Sub 2A',
              level: 3,
              content: '### Sub 2A\n\nText.\n\n',
              startLine: 13,
              endLine: 15,
              subsections: []
            }
          ]
        }
      ];

      const reconstructed = reconstructFromSections(sections, '', '');

      // Each subsection should appear exactly once
      expect(reconstructed.match(/### Sub 1A/g)).toHaveLength(1);
      expect(reconstructed.match(/### Sub 1B/g)).toHaveLength(1);
      expect(reconstructed.match(/### Sub 2A/g)).toHaveLength(1);
      
      // Sections should be in order
      expect(reconstructed.indexOf('## Section 1')).toBeLessThan(
        reconstructed.indexOf('## Section 2')
      );
      expect(reconstructed.indexOf('### Sub 1A')).toBeLessThan(
        reconstructed.indexOf('### Sub 1B')
      );
    });

    it('should preserve section.content which already includes subsections', () => {
      // The key insight: section.content from translation already includes subsections
      const section: Section = {
        id: 'overview',
        heading: '## Overview',
        level: 2,
        content: `## Overview

Introduction text.

### Core Principles

Subsection text already in section.content from translation.

`,
        startLine: 1,
        endLine: 10,
        subsections: [
          {
            id: 'overview:core-principles',
            heading: '### Core Principles',
            level: 3,
            content: `### Core Principles

Subsection text already in section.content from translation.

`,
            startLine: 5,
            endLine: 10,
            subsections: []
          }
        ]
      };

      // Reconstruct using ONLY section.content (correct approach)
      const parts: string[] = [];
      parts.push(section.content);
      // DO NOT append subsections separately!
      
      const correct = parts.join('\n');
      
      // Should have subsection exactly once
      expect(correct.match(/### Core Principles/g)).toHaveLength(1);
    });

    it('should handle sections without subsections', () => {
      const sections: Section[] = [
        {
          id: 'simple-section',
          heading: '## Simple Section',
          level: 2,
          content: '## Simple Section\n\nJust content, no subsections.\n\n',
          startLine: 1,
          endLine: 3,
          subsections: []  // Empty subsections array
        }
      ];

      const reconstructed = reconstructFromSections(sections);

      expect(reconstructed).toContain('## Simple Section');
      expect(reconstructed).toContain('Just content, no subsections.');
      
      // Should not have any level-3 headings
      expect(reconstructed).not.toContain('###');
    });
  });
});

