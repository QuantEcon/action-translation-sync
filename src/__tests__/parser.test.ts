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
});
