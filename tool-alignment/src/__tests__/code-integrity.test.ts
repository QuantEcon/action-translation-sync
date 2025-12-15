/**
 * Comprehensive tests for Code Block Integrity feature (Phase 1b)
 * 
 * Tests cover:
 * - Code block extraction
 * - Comment stripping for multiple languages
 * - Exact and normalized matching
 * - Modified code detection
 * - Missing/extra block handling
 * - Edge cases
 */

import { StructuralAnalyzer } from '../structural-analyzer';
import { CodeBlock, CodeIntegrity } from '../types';

describe('Code Block Integrity', () => {
  let analyzer: StructuralAnalyzer;

  beforeAll(() => {
    analyzer = new StructuralAnalyzer();
  });

  // ============================================================================
  // CODE BLOCK EXTRACTION
  // ============================================================================

  describe('Code Block Extraction', () => {
    it('should extract Python code blocks', () => {
      const content = `
\`\`\`python
import numpy as np
x = np.array([1, 2, 3])
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks.length).toBe(1);
      expect(blocks[0].language).toBe('python');
      expect(blocks[0].content).toContain('import numpy');
    });

    it('should extract JavaScript code blocks', () => {
      const content = `
\`\`\`javascript
const x = [1, 2, 3];
console.log(x);
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks.length).toBe(1);
      expect(blocks[0].language).toBe('javascript');
    });

    it('should extract Julia code blocks', () => {
      const content = `
\`\`\`julia
using LinearAlgebra
x = [1, 2, 3]
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks.length).toBe(1);
      expect(blocks[0].language).toBe('julia');
    });

    it('should extract R code blocks', () => {
      const content = `
\`\`\`r
x <- c(1, 2, 3)
print(x)
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks.length).toBe(1);
      expect(blocks[0].language).toBe('r');
    });

    it('should extract multiple code blocks in order', () => {
      const content = `
\`\`\`python
first = 1
\`\`\`

Some text

\`\`\`javascript
const second = 2;
\`\`\`

More text

\`\`\`python
third = 3
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks.length).toBe(3);
      expect(blocks[0].index).toBe(0);
      expect(blocks[0].content).toContain('first');
      expect(blocks[1].index).toBe(1);
      expect(blocks[1].content).toContain('second');
      expect(blocks[2].index).toBe(2);
      expect(blocks[2].content).toContain('third');
    });

    it('should skip code blocks with no language specified', () => {
      // Code blocks without language are typically not actual code
      // (e.g., text examples, MyST directives output, etc.)
      const content = `
\`\`\`
plain code here
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      // Should not extract blocks without language
      expect(blocks.length).toBe(0);
    });

    it('should handle tilde fence style', () => {
      const content = `
~~~python
x = 1
~~~
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks.length).toBe(1);
      expect(blocks[0].language).toBe('python');
    });

    it('should handle mixed fence styles', () => {
      const content = `
\`\`\`python
first = 1
\`\`\`

~~~javascript
const second = 2;
~~~
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks.length).toBe(2);
    });

    it('should preserve multiline code content', () => {
      const content = `
\`\`\`python
line1 = 1
line2 = 2
line3 = 3
line4 = 4
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks[0].content.split('\n').length).toBe(4);
    });

    it('should handle empty code blocks', () => {
      const content = `
\`\`\`python
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks.length).toBe(1);
      expect(blocks[0].content).toBe('');
    });

    it('should track start line numbers', () => {
      const content = `Line 1
Line 2

\`\`\`python
code here
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks[0].startLine).toBe(4);
    });

    it('should handle code with special characters', () => {
      const content = `
\`\`\`python
x = "Hello, 世界! 🎉"
y = {'key': 'value'}
z = [1, 2, 3]
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks[0].content).toContain('世界');
      expect(blocks[0].content).toContain('🎉');
    });

    it('should handle code with backticks inside (not at start of line)', () => {
      const content = `
\`\`\`python
x = "use \`backticks\` for code"
\`\`\`
`;
      const blocks = analyzer.extractCodeBlocks(content);
      
      expect(blocks.length).toBe(1);
      expect(blocks[0].content).toContain('backticks');
    });
  });

  // ============================================================================
  // COMMENT STRIPPING / NORMALIZATION
  // ============================================================================

  describe('Code Normalization', () => {
    it('should normalize Python comments (full-line only)', () => {
      const source = `
\`\`\`python
# This is a comment
x = 1
# Another comment
y = 2
\`\`\`
`;
      const target = `
\`\`\`python
# 这是注释
x = 1
# 另一个注释
y = 2
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      // After normalization, the code should match (full-line comments stripped)
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should normalize JavaScript comments', () => {
      const source = `
\`\`\`javascript
// English comment
const x = 1;
\`\`\`
`;
      const target = `
\`\`\`javascript
// 中文注释
const x = 1;
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should normalize Julia comments', () => {
      const source = `
\`\`\`julia
# Julia comment
x = 1
\`\`\`
`;
      const target = `
\`\`\`julia
# Julia 注释
x = 1
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should handle multiline JS comments', () => {
      const source = `
\`\`\`javascript
/* This is a
   multiline comment */
const x = 1;
\`\`\`
`;
      const target = `
\`\`\`javascript
/* 这是一个
   多行注释 */
const x = 1;
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should preserve code while stripping full-line comments', () => {
      const source = `
\`\`\`python
# Setup
import numpy as np
# Create array
x = np.array([1, 2, 3])
# Print result
print(x)
\`\`\`
`;
      const target = `
\`\`\`python
# 设置
import numpy as np
# 创建数组
x = np.array([1, 2, 3])
# 打印结果
print(x)
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      // Should match after comment stripping (same code, different comments)
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should normalize trailing whitespace', () => {
      const source = `
\`\`\`python
x = 1   
y = 2
\`\`\`
`;
      const target = `
\`\`\`python
x = 1
y = 2
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should normalize multiple blank lines', () => {
      const source = `
\`\`\`python
x = 1


y = 2
\`\`\`
`;
      const target = `
\`\`\`python
x = 1

y = 2
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should normalize string literals (translated labels)', () => {
      const source = `
\`\`\`python
ax.plot(x, y, label="true density")
ax.legend()
\`\`\`
`;
      const target = `
\`\`\`python
ax.plot(x, y, label="真实密度")
ax.legend()
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should normalize inline comments', () => {
      const source = `
\`\`\`python
mu, v = -3.0, 0.6  # initial conditions mu_0, v_0
\`\`\`
`;
      const target = `
\`\`\`python
mu, v = -3.0, 0.6  # 初始条件 mu_0, v_0
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should normalize f-strings', () => {
      const source = `
\`\`\`python
print(f"Value is {x:.2f}")
\`\`\`
`;
      const target = `
\`\`\`python
print(f"值为 {x:.2f}")
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      // f-strings are normalized to f"", so both become the same
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });
  });

  // ============================================================================
  // LOCALIZATION DETECTION
  // ============================================================================

  describe('Localization Detection', () => {
    it('should detect Chinese font configuration patterns', () => {
      const source = `
\`\`\`python
import matplotlib.pyplot as plt
fig, ax = plt.subplots()
\`\`\`
`;
      const target = `
\`\`\`python
import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axes.unicode_minus'] = False
fig, ax = plt.subplots()
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.localizationNote).toBeDefined();
      expect(integrity.localizationNote).toContain('font');
    });

    it('should not flag localization when no patterns detected', () => {
      const source = `
\`\`\`python
x = 1
y = 2
\`\`\`
`;
      const target = `
\`\`\`python
x = 1
y = 2
z = 3
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.localizationNote).toBeUndefined();
    });
  });

  // ============================================================================
  // CODE COMPARISON
  // ============================================================================

  describe('Code Comparison', () => {
    it('should detect identical code', () => {
      const content = `
\`\`\`python
x = 1
y = 2
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(content, content);
      
      expect(integrity.comparisons[0].match).toBe('identical');
      expect(integrity.score).toBe(100);
    });

    it('should detect modified code', () => {
      const source = `
\`\`\`python
x = 1
\`\`\`
`;
      const target = `
\`\`\`python
x = 2
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('modified');
      expect(integrity.modifiedBlocks).toBe(1);
    });

    it('should treat same code with different language tags as identical (code-focused)', () => {
      // Note: The integrity check focuses on CODE content, not metadata
      // Same code in different language tags is still the same code
      const source = `
\`\`\`python
x = 1
\`\`\`
`;
      const target = `
\`\`\`julia
x = 1
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      // Code content is identical, so it's marked as identical
      // Language difference is noted but code integrity is preserved
      expect(integrity.comparisons[0].match).toBe('identical');
      expect(integrity.score).toBe(100);
    });

    it('should detect actual code changes even with same language', () => {
      const source = `
\`\`\`python
original_code = 1
\`\`\`
`;
      const target = `
\`\`\`python
modified_code = 2
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('modified');
      expect(integrity.modifiedBlocks).toBe(1);
    });

    it('should detect line count changes', () => {
      const source = `
\`\`\`python
x = 1
y = 2
z = 3
\`\`\`
`;
      const target = `
\`\`\`python
x = 1
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('modified');
      expect(integrity.comparisons[0].differences?.some(d => d.includes('Line count'))).toBe(true);
    });

    it('should handle missing blocks at end', () => {
      const source = `
\`\`\`python
first = 1
\`\`\`

\`\`\`python
second = 2
\`\`\`

\`\`\`python
third = 3
\`\`\`
`;
      const target = `
\`\`\`python
first = 1
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.sourceBlocks).toBe(3);
      expect(integrity.matchedBlocks).toBe(1);
      expect(integrity.missingBlocks).toBe(2);
    });

    it('should handle extra blocks at end', () => {
      const source = `
\`\`\`python
first = 1
\`\`\`
`;
      const target = `
\`\`\`python
first = 1
\`\`\`

\`\`\`python
extra = 2
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.sourceBlocks).toBe(1);
      expect(integrity.matchedBlocks).toBe(1);
      expect(integrity.extraBlocks).toBe(1);
    });

    it('should calculate correct score with mixed results', () => {
      const source = `
\`\`\`python
identical = 1
\`\`\`

\`\`\`python
# Comment
normalized = 2
\`\`\`

\`\`\`python
modified = 3
\`\`\`

\`\`\`python
missing = 4
\`\`\`
`;
      const target = `
\`\`\`python
identical = 1
\`\`\`

\`\`\`python
# 注释
normalized = 2
\`\`\`

\`\`\`python
changed = 999
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      // 2 matched (identical + normalized), 1 modified, 1 missing
      expect(integrity.matchedBlocks).toBe(2);
      expect(integrity.modifiedBlocks).toBe(1);
      expect(integrity.missingBlocks).toBe(1);
      expect(integrity.score).toBe(50); // 2/4 = 50%
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle no code blocks in either file', () => {
      const content = 'Just plain text, no code blocks here.';
      const integrity = analyzer.analyzeCodeIntegrity(content, content);
      
      expect(integrity.sourceBlocks).toBe(0);
      expect(integrity.score).toBe(100);
      expect(integrity.comparisons.length).toBe(0);
    });

    it('should handle code blocks only in source', () => {
      const source = `
\`\`\`python
x = 1
\`\`\`
`;
      const target = 'No code blocks here';
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.sourceBlocks).toBe(1);
      expect(integrity.missingBlocks).toBe(1);
      expect(integrity.score).toBe(0);
    });

    it('should handle code blocks only in target', () => {
      const source = 'No code blocks here';
      const target = `
\`\`\`python
x = 1
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.sourceBlocks).toBe(0);
      expect(integrity.extraBlocks).toBe(1);
      expect(integrity.score).toBe(100); // No source blocks to match
    });

    it('should handle very long code blocks', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line${i} = ${i}`);
      const code = lines.join('\n');
      const source = `
\`\`\`python
${code}
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, source);
      
      expect(integrity.score).toBe(100);
      expect(integrity.comparisons[0].match).toBe('identical');
    });

    it('should handle code with indentation', () => {
      const source = `
\`\`\`python
def foo():
    if True:
        return 1
    else:
        return 2
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, source);
      
      expect(integrity.comparisons[0].match).toBe('identical');
    });

    it('should handle shell/bash code blocks', () => {
      const source = `
\`\`\`bash
# Install package
pip install numpy
# Run script
python script.py
\`\`\`
`;
      const target = `
\`\`\`bash
# 安装包
pip install numpy
# 运行脚本
python script.py
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should handle TypeScript code blocks', () => {
      const source = `
\`\`\`typescript
// Type definition
interface User {
  name: string;
  age: number;
}
\`\`\`
`;
      const target = `
\`\`\`typescript
// 类型定义
interface User {
  name: string;
  age: number;
}
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('normalized-match');
    });

    it('should detect print statement changes', () => {
      const source = `
\`\`\`python
x = 1
\`\`\`
`;
      const target = `
\`\`\`python
x = 1
print(x)
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.comparisons[0].match).toBe('modified');
      expect(integrity.comparisons[0].differences?.some(d => d.includes('Print statement'))).toBe(true);
    });
  });

  // ============================================================================
  // INTEGRITY SCORE CALCULATIONS
  // ============================================================================

  describe('Integrity Score Calculations', () => {
    it('should return 100% for all identical blocks', () => {
      const content = `
\`\`\`python
a = 1
\`\`\`

\`\`\`python
b = 2
\`\`\`

\`\`\`python
c = 3
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(content, content);
      
      expect(integrity.score).toBe(100);
      expect(integrity.matchedBlocks).toBe(3);
    });

    it('should return 0% when all blocks are modified', () => {
      const source = `
\`\`\`python
x = 1
\`\`\`

\`\`\`python
y = 2
\`\`\`
`;
      const target = `
\`\`\`python
x = 999
\`\`\`

\`\`\`python
y = 888
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.score).toBe(0);
      expect(integrity.modifiedBlocks).toBe(2);
    });

    it('should return 50% when half blocks match', () => {
      const source = `
\`\`\`python
same = 1
\`\`\`

\`\`\`python
different = 2
\`\`\`
`;
      const target = `
\`\`\`python
same = 1
\`\`\`

\`\`\`python
changed = 999
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.score).toBe(50);
    });

    it('should round score to nearest integer', () => {
      const source = `
\`\`\`python
a = 1
\`\`\`

\`\`\`python
b = 2
\`\`\`

\`\`\`python
c = 3
\`\`\`
`;
      const target = `
\`\`\`python
a = 1
\`\`\`

\`\`\`python
b = 999
\`\`\`

\`\`\`python
c = 999
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      // 1/3 = 33.33...% rounds to 33%
      expect(integrity.score).toBe(33);
    });

    it('should count normalized matches as matched', () => {
      const source = `
\`\`\`python
# Comment
x = 1
\`\`\`
`;
      const target = `
\`\`\`python
# Different comment
x = 1
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.matchedBlocks).toBe(1);
      expect(integrity.score).toBe(100);
    });
  });

  // ============================================================================
  // ISSUES GENERATION
  // ============================================================================

  describe('Issues Generation', () => {
    it('should generate issue for each modified block', () => {
      const source = `
\`\`\`python
first = 1
\`\`\`

\`\`\`javascript
const second = 2;
\`\`\`
`;
      const target = `
\`\`\`python
changed = 999
\`\`\`

\`\`\`javascript
const changed = 888;
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.issues.length).toBe(2);
      expect(integrity.issues[0]).toContain('Code block 1');
      expect(integrity.issues[1]).toContain('Code block 2');
    });

    it('should include language in issue message', () => {
      const source = `
\`\`\`python
x = 1
\`\`\`
`;
      const target = `
\`\`\`python
y = 2
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.issues[0]).toContain('python');
    });

    it('should generate issue for missing blocks', () => {
      const source = `
\`\`\`python
x = 1
\`\`\`

\`\`\`python
y = 2
\`\`\`
`;
      const target = `
\`\`\`python
x = 1
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.issues.some(i => i.includes('missing'))).toBe(true);
    });

    it('should not generate issues for matched blocks', () => {
      const content = `
\`\`\`python
x = 1
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(content, content);
      
      expect(integrity.issues.length).toBe(0);
    });

    it('should not generate issues for normalized matches', () => {
      const source = `
\`\`\`python
# Comment
x = 1
\`\`\`
`;
      const target = `
\`\`\`python
# 注释
x = 1
\`\`\`
`;
      const integrity = analyzer.analyzeCodeIntegrity(source, target);
      
      expect(integrity.issues.length).toBe(0);
    });
  });
});
