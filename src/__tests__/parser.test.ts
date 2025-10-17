import { MystParser } from '../parser';
import * as fs from 'fs';
import * as path from 'path';

describe('MystParser', () => {
  let parser: MystParser;
  
  beforeEach(() => {
    parser = new MystParser();
  });

  describe('Basic Parsing', () => {
    it('should parse content into sections', async () => {
      const content = `## Section 1

Content 1.

## Section 2

Content 2.
`;
      const result = await parser.parseSections(content, 'test.md');
      const sections = result.sections;
      
      // Parser only captures ## level (level 2) sections
      expect(sections).toHaveLength(2);
      expect(sections[0].heading).toBe('## Section 1');
      expect(sections[1].heading).toBe('## Section 2');
    });

    it('should generate unique IDs for sections', async () => {
      const content = `## Section A

Text.

## Section B

Text.
`;
      const result = await parser.parseSections(content, 'test.md');
      const sections = result.sections;
      
      // IDs don't include filename
      expect(sections[0].id).toBe('section-a');
      expect(sections[1].id).toBe('section-b');
    });

    it('should handle sections with subsections', async () => {
      const content = `## Parent Section

Parent content.

### Child Section

Child content.

### Another Child

More child content.
`;
      const result = await parser.parseSections(content, 'test.md');
      const sections = result.sections;
      
      // Should have one level-2 section with two subsections
      expect(sections).toHaveLength(1);
      expect(sections[0].heading).toBe('## Parent Section');
      expect(sections[0].subsections).toHaveLength(2);
      expect(sections[0].subsections[0].heading).toBe('### Child Section');
      expect(sections[0].subsections[1].heading).toBe('### Another Child');
    });

    it('should preserve content correctly', async () => {
      const content = `## Section

Content with some text.
`;
      const result = await parser.parseSections(content, 'test.md');
      const sections = result.sections;
      
      expect(sections[0].content).toContain('Content with some text');
    });
  });

  describe('Real File Parsing', () => {
    it('should parse intro-old.md fixture correctly', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'intro-old.md');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      
      const result = await parser.parseSections(content, 'intro.md');
      const sections = result.sections;
      
      // Should have 5 level-2 sections
      expect(sections).toHaveLength(5);
      expect(sections[0].heading).toBe('## Getting Started');
      expect(sections[1].heading).toBe('## Mathematical Example');
      expect(sections[2].heading).toBe('## Python Tools');
      expect(sections[3].heading).toBe('## Data Analysis');
      expect(sections[4].heading).toBe('## Conclusion');
    });

    it('should parse intro-new.md fixture correctly', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'intro-new.md');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      
      const result = await parser.parseSections(content, 'intro.md');
      const sections = result.sections;
      
      // Should have 6 level-2 sections (Economic Models added)
      expect(sections).toHaveLength(6);
      expect(sections[0].heading).toBe('## Getting Started');
      expect(sections[1].heading).toBe('## Economic Models');
      expect(sections[2].heading).toBe('## Mathematical Example');
      expect(sections[3].heading).toBe('## Python Tools');
      expect(sections[4].heading).toBe('## Data Analysis');
      expect(sections[5].heading).toBe('## Conclusion');
    });

    it('should handle code blocks in content', async () => {
      const content = `## Python Section

Here's some code:

\`\`\`python
import numpy as np
x = np.array([1, 2, 3])
\`\`\`

End of section.
`;
      const result = await parser.parseSections(content, 'test.md');
      const sections = result.sections;
      
      expect(sections[0].content).toContain('```python');
      expect(sections[0].content).toContain('import numpy as np');
    });

    it('should handle math equations', async () => {
      const content = `## Math Section

Inline math: $x^2 + y^2 = z^2$

Block math:

$$
\\max_{x} f(x) = -x^2 + 4x + 1
$$

End of section.
`;
      const result = await parser.parseSections(content, 'test.md');
      const sections = result.sections;
      
      expect(sections[0].content).toContain('$x^2 + y^2 = z^2$');
      expect(sections[0].content).toContain('$$');
      expect(sections[0].content).toContain('\\max_{x}');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const result = await parser.parseSections('', 'test.md');
      expect(result.sections).toHaveLength(0);
    });

    it('should handle content with no sections', async () => {
      const content = `Just some text without headings.

More text.
`;
      const result = await parser.parseSections(content, 'test.md');
      expect(result.sections).toHaveLength(0);
    });

    it('should handle sections with special characters in headings', async () => {
      const content = `## Section with "quotes" and 'apostrophes'

Content.

## Section with (parentheses) and [brackets]

Content.
`;
      const result = await parser.parseSections(content, 'test.md');
      const sections = result.sections;
      
      expect(sections).toHaveLength(2);
      expect(sections[0].id).toBe('section-with-quotes-and-apostrophes');
      expect(sections[1].id).toBe('section-with-parentheses-and-brackets');
    });
  });

  describe('Frontmatter and Preamble Extraction', () => {
    it('should extract YAML frontmatter', async () => {
      const content = `---
jupytext:
  text_representation:
    extension: .md
    format_name: myst
kernelspec:
  display_name: Python 3
  name: python3
---

# Title

Intro paragraph.

## Section One

Content.
`;
      const result = await parser.parseSections(content, 'test.md');
      
      // Should extract frontmatter
      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter).toContain('jupytext:');
      expect(result.frontmatter).toContain('format_name: myst');
      expect(result.frontmatter).toContain('kernelspec:');
      expect(result.frontmatter?.startsWith('---')).toBe(true);
      expect(result.frontmatter?.endsWith('---')).toBe(true);
    });

    it('should extract preamble (title and intro)', async () => {
      const content = `---
jupytext:
  format_name: myst
---

# Introduction to Economics

This is a test lecture for translation sync action.

It has multiple paragraphs before the first section.

## Basic Concepts

Content here.
`;
      const result = await parser.parseSections(content, 'test.md');
      
      // Should extract preamble
      expect(result.preamble).toBeDefined();
      expect(result.preamble).toContain('# Introduction to Economics');
      expect(result.preamble).toContain('test lecture for translation sync action');
      expect(result.preamble).toContain('multiple paragraphs');
      
      // Preamble should not include frontmatter or sections
      expect(result.preamble).not.toContain('---');
      expect(result.preamble).not.toContain('jupytext:');
      expect(result.preamble).not.toContain('## Basic Concepts');
    });

    it('should handle documents without frontmatter', async () => {
      const content = `# Title

Intro text.

## Section One

Content.
`;
      const result = await parser.parseSections(content, 'test.md');
      
      // No frontmatter
      expect(result.frontmatter).toBeUndefined();
      
      // But should have preamble
      expect(result.preamble).toBeDefined();
      expect(result.preamble).toContain('# Title');
      expect(result.preamble).toContain('Intro text');
    });

    it('should handle documents without preamble', async () => {
      const content = `---
jupytext:
  format_name: myst
---

## Section One

Content immediately after frontmatter.
`;
      const result = await parser.parseSections(content, 'test.md');
      
      // Should have frontmatter
      expect(result.frontmatter).toBeDefined();
      
      // But no preamble (goes straight to sections)
      expect(result.preamble).toBeUndefined();
      
      // Should have sections
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].heading).toBe('## Section One');
    });

    it('should handle documents with neither frontmatter nor preamble', async () => {
      const content = `## Section One

Just starts with a section.

## Section Two

Another section.
`;
      const result = await parser.parseSections(content, 'test.md');
      
      // No frontmatter or preamble
      expect(result.frontmatter).toBeUndefined();
      expect(result.preamble).toBeUndefined();
      
      // But should have sections
      expect(result.sections).toHaveLength(2);
    });

    it('should handle empty preamble (only whitespace)', async () => {
      const content = `---
jupytext:
  format_name: myst
---


## Section One

Content.
`;
      const result = await parser.parseSections(content, 'test.md');
      
      // Frontmatter present
      expect(result.frontmatter).toBeDefined();
      
      // Preamble should be undefined (only whitespace)
      expect(result.preamble).toBeUndefined();
    });
  });
});
