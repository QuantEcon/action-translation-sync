/**
 * Tests for analysis/code.ts - Deterministic code block comparison
 */

import { compareCodeBlocks, calculateCodeScore, isCodeAligned } from '../analysis/code';
import { CodeBlock, Thresholds } from '../types';
import { DEFAULT_THRESHOLDS } from '../constants';
import { normalizeCodeContent } from '../extraction';

// Helper to create code blocks
function createBlock(content: string, language: string = 'python'): CodeBlock {
  return {
    content,
    contentNormalized: normalizeCodeContent(content, language),
    language,
    startLine: 1,
    endLine: content.split('\n').length,
  };
}

describe('compareCodeBlocks', () => {
  it('should match identical blocks', () => {
    const source = [
      createBlock('import numpy as np\nx = 1'),
      createBlock('print(x)'),
    ];
    const target = [
      createBlock('import numpy as np\nx = 1'),
      createBlock('print(x)'),
    ];

    const result = compareCodeBlocks(source, target);

    expect(result.aligned).toBe(2);
    expect(result.modified).toBe(0);
    expect(result.missing).toBe(0);
    expect(result.inserted).toBe(0);
  });

  it('should detect modified blocks', () => {
    const source = [createBlock('x = np.mean(data)')];
    const target = [createBlock('x = np.median(data)')];

    const result = compareCodeBlocks(source, target);

    expect(result.modified).toBe(1);
    expect(result.aligned).toBe(0);
  });

  it('should detect missing blocks in target', () => {
    const source = [
      createBlock('x = 1'),
      createBlock('y = 2'),
      createBlock('z = 3'),
    ];
    const target = [
      createBlock('x = 1'),
      createBlock('y = 2'),
    ];

    const result = compareCodeBlocks(source, target);

    expect(result.missing).toBe(1);
  });

  it('should detect extra blocks in target', () => {
    const source = [createBlock('x = 1')];
    const target = [
      createBlock('x = 1'),
      createBlock('y = 2'),
    ];

    const result = compareCodeBlocks(source, target);

    expect(result.inserted).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty source', () => {
    const source: CodeBlock[] = [];
    const target = [createBlock('x = 1')];

    const result = compareCodeBlocks(source, target);

    expect(result.sourceBlocks).toBe(0);
    expect(result.targetBlocks).toBe(1);
  });

  it('should handle empty target', () => {
    const source = [createBlock('x = 1')];
    const target: CodeBlock[] = [];

    const result = compareCodeBlocks(source, target);

    expect(result.sourceBlocks).toBe(1);
    expect(result.targetBlocks).toBe(0);
    expect(result.missing).toBe(1);
  });

  it('should return score between 0 and 100', () => {
    const source = [createBlock('x = 1'), createBlock('y = 2')];
    const target = [createBlock('x = 1'), createBlock('y = 2')];

    const result = compareCodeBlocks(source, target);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('calculateCodeScore', () => {
  it('should return 100 for perfect alignment', () => {
    const source = [createBlock('x = 1'), createBlock('y = 2')];
    const target = [createBlock('x = 1'), createBlock('y = 2')];

    const result = compareCodeBlocks(source, target);
    const score = calculateCodeScore(result);

    expect(score).toBe(100);
  });

  it('should reduce score for modified blocks', () => {
    const source = [
      createBlock('x = np.mean(data)'),
      createBlock('y = 2'),
    ];
    const target = [
      createBlock('x = np.median(data)'),
      createBlock('y = 2'),
    ];

    const result = compareCodeBlocks(source, target);
    const score = calculateCodeScore(result);

    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });

  it('should reduce score for missing blocks', () => {
    const source = [createBlock('x = 1'), createBlock('y = 2')];
    const target = [createBlock('x = 1')];

    const result = compareCodeBlocks(source, target);
    const score = calculateCodeScore(result);

    expect(score).toBeLessThan(100);
  });

  it('should return 100 for both empty', () => {
    const result = compareCodeBlocks([], []);
    const score = calculateCodeScore(result);

    expect(score).toBe(100);
  });
});

describe('isCodeAligned', () => {
  it('should return true for high scores', () => {
    const source = [createBlock('x = 1')];
    const target = [createBlock('x = 1')];
    const result = compareCodeBlocks(source, target);

    expect(isCodeAligned(result, DEFAULT_THRESHOLDS.code.aligned)).toBe(true);
  });

  it('should return false for low scores', () => {
    const source = [createBlock('x = 1'), createBlock('y = 2'), createBlock('z = 3')];
    const target = [createBlock('a = 10')];
    const result = compareCodeBlocks(source, target);

    expect(isCodeAligned(result, DEFAULT_THRESHOLDS.code.aligned)).toBe(false);
  });
});
