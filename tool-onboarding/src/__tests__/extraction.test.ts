/**
 * Tests for extraction.ts - Code block extraction and normalization
 */

import {
  extractCodeBlocks,
  extractSectionPositions,
  normalizeCodeContent,
  isI18nBlock,
  isI18nOnlyChange
} from '../extraction';
import { CodeBlock } from '../types';

// Helper to create a code block
function createBlock(content: string, language: string = 'python'): CodeBlock {
  const normalized = normalizeCodeContent(content, language);
  return {
    content,
    contentNormalized: normalized,
    language,
    startLine: 1,
    endLine: content.split('\n').length,
  };
}

describe('extractCodeBlocks', () => {
  it('should extract Python code blocks', () => {
    const content = `
# Introduction

Some text here.

\`\`\`python
import numpy as np
x = np.array([1, 2, 3])
\`\`\`

More text.
`;
    const blocks = extractCodeBlocks(content);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBe('python');
    expect(blocks[0].content).toContain('import numpy as np');
  });

  it('should extract multiple code blocks', () => {
    const content = `
\`\`\`python
print("first")
\`\`\`

\`\`\`python
print("second")
\`\`\`

\`\`\`python
print("third")
\`\`\`
`;
    const blocks = extractCodeBlocks(content);
    
    expect(blocks).toHaveLength(3);
    expect(blocks[0].content).toContain('first');
    expect(blocks[1].content).toContain('second');
    expect(blocks[2].content).toContain('third');
  });

  it('should preserve language in code blocks', () => {
    const content = `
\`\`\`python
def hello():
    print("world")
\`\`\`

\`\`\`bash
echo "hello"
\`\`\`

\`\`\`javascript
console.log("test");
\`\`\`
`;
    const blocks = extractCodeBlocks(content);
    
    expect(blocks).toHaveLength(3);
    expect(blocks[0].language).toBe('python');
    expect(blocks[1].language).toBe('bash');
    expect(blocks[2].language).toBe('javascript');
  });

  it('should handle empty content', () => {
    const blocks = extractCodeBlocks('');
    expect(blocks).toHaveLength(0);
  });

  it('should handle content with no code blocks', () => {
    const content = `
# Just Text

This is a document with no code blocks.
Just paragraphs of text.
`;
    const blocks = extractCodeBlocks(content);
    expect(blocks).toHaveLength(0);
  });

  it('should track line numbers', () => {
    const content = `Line 1
Line 2
\`\`\`python
code here
\`\`\`
Line 6
`;
    const blocks = extractCodeBlocks(content);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startLine).toBe(3); // Fence starts at line 3
    expect(blocks[0].endLine).toBe(5);   // Fence ends at line 5
  });
});

describe('extractSectionPositions', () => {
  it('should extract ## section positions', () => {
    const content = `---
title: Test
---

# Main Title

## First Section

Content here.

## Second Section

More content.
`;
    const sections = extractSectionPositions(content);
    
    expect(sections.size).toBe(2);
    expect(sections.get(1)).toBeDefined();
    expect(sections.get(2)).toBeDefined();
  });

  it('should handle document with no sections', () => {
    const content = 'Just some plain text without headings.';
    const sections = extractSectionPositions(content);
    expect(sections.size).toBe(0);
  });

  it('should not count ### headings as main sections', () => {
    const content = `
## Main Section

### Subsection (not counted)

## Another Main Section
`;
    const sections = extractSectionPositions(content);
    expect(sections.size).toBe(2);
  });
});

describe('normalizeCodeContent', () => {
  it('should remove Python comments', () => {
    const content = `# This is a comment
import numpy as np
x = 1  # inline comment`;
    
    const normalized = normalizeCodeContent(content, 'python');
    
    expect(normalized).not.toContain('This is a comment');
    expect(normalized).toContain('import numpy as np');
  });

  it('should remove JavaScript comments', () => {
    const content = `// Line comment
const x = 1;
/* Block comment */
const y = 2;`;
    
    const normalized = normalizeCodeContent(content, 'javascript');
    
    expect(normalized).not.toContain('Line comment');
    expect(normalized).not.toContain('Block comment');
    expect(normalized).toContain('const x = 1');
  });

  it('should normalize whitespace', () => {
    const content = `

import numpy as np

x = 1


y = 2

`;
    const normalized = normalizeCodeContent(content, 'python');
    
    // Should have trimmed and normalized
    expect(normalized.startsWith('import')).toBe(true);
    expect(normalized.endsWith('y = 2')).toBe(true);
  });

  it('should handle empty content', () => {
    expect(normalizeCodeContent('', 'python')).toBe('');
    expect(normalizeCodeContent('   ', 'python')).toBe('');
    expect(normalizeCodeContent('\n\n', 'python')).toBe('');
  });
});

describe('isI18nBlock', () => {
  it('should detect font configuration blocks', () => {
    const block = createBlock(`import matplotlib.font_manager as fm
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['SimHei']`, 'python');
    
    expect(isI18nBlock(block)).toBe(true);
  });

  it('should not flag blocks with substantial code', () => {
    const block = createBlock(`import numpy as np
x = np.array([1, 2, 3])
y = np.mean(x)
print(y)`, 'python');
    
    expect(isI18nBlock(block)).toBe(false);
  });

  it('should handle empty blocks', () => {
    const block = createBlock('', 'python');
    expect(isI18nBlock(block)).toBe(false);
  });
});

describe('isI18nOnlyChange', () => {
  it('should detect i18n-only additions (font config)', () => {
    const source = `import numpy as np
x = np.mean(data)`;
    const target = `import numpy as np
import matplotlib.font_manager as fm
plt.rcParams['font.family'] = 'sans-serif'
x = np.mean(data)`;
    
    const result = isI18nOnlyChange(source, target);
    expect(result.isI18nOnly).toBe(true);
    expect(result.patterns.length).toBeGreaterThan(0);
  });

  it('should detect actual code changes', () => {
    const source = `x = np.mean(data)`;
    const target = `x = np.median(data)`;
    
    const result = isI18nOnlyChange(source, target);
    expect(result.isI18nOnly).toBe(false);
  });

  it('should return false for identical content (no additions)', () => {
    const content = `x = 1
y = 2`;
    
    // Identical content = no added lines = isI18nOnly false
    const result = isI18nOnlyChange(content, content);
    expect(result.isI18nOnly).toBe(false);
    expect(result.patterns).toEqual([]);
  });
});
