/**
 * Tests for component-based document reconstruction
 * 
 * These tests verify that the new component-based approach always
 * reconstructs complete documents: CONFIG + TITLE + INTRO + SECTIONS
 */

import { FileProcessor } from '../file-processor';
import { TranslationService } from '../translator';

describe('Component-Based Reconstruction', () => {
  let processor: FileProcessor;
  let mockTranslator: jest.Mocked<TranslationService>;

  beforeEach(() => {
    // Create mock translator
    mockTranslator = {
      translateSection: jest.fn(),
      translateFullDocument: jest.fn(),
    } as any;

    processor = new FileProcessor(mockTranslator, true);
  });

  it('should preserve all sections when only intro changes', async () => {
    const oldContent = `---
config: test
---

# Introduction to Economics

This is a comprehensive test lecture.

## Basic Concepts

Economics is the study of resources.

## Mathematical Framework

The production function is key.`;

    const newContent = `---
config: test
---

# Introduction to Economics

This is a simple test lecture.

## Basic Concepts

Economics is the study of resources.

## Mathematical Framework

The production function is key.`;

    const targetContent = `---
config: test
---

# 经济学导论

这是一个全面的测试讲座。

## 基本概念

经济学是资源的研究。

## 数学框架

生产函数是关键。`;

    // Mock translation for intro change
    mockTranslator.translateSection.mockResolvedValue({
      success: true,
      translatedSection: '这是一个简单的测试讲座。',
    });

    const result = await processor.processSectionBased(
      oldContent,
      newContent,
      targetContent,
      'test.md',
      'en',
      'zh-cn'
    );

    // Verify structure is complete
    expect(result).toContain('---');  // CONFIG
    expect(result).toContain('# 经济学导论');  // TITLE
    expect(result).toContain('这是一个简单的测试讲座');  // INTRO (translated)
    expect(result).toContain('## 基本概念');  // SECTION 1
    expect(result).toContain('## 数学框架');  // SECTION 2

    // Count sections - should have both
    const sectionMatches = result.match(/^## /gm);
    expect(sectionMatches).toHaveLength(2);

    // Verify only intro was translated (1 call)
    expect(mockTranslator.translateSection).toHaveBeenCalledTimes(1);
  });

  it('should preserve intro when only section changes', async () => {
    const oldContent = `---
config: test
---

# Title

Introduction paragraph here.

## Section One

Old content.`;

    const newContent = `---
config: test
---

# Title

Introduction paragraph here.

## Section One

New content here with actual changes.`;

    const targetContent = `---
config: test
---

# 标题

介绍段落在这里。

## 第一部分

旧内容。`;

    // Mock translation for section change
    mockTranslator.translateSection.mockResolvedValue({
      success: true,
      translatedSection: '## 第一部分\n\n新内容在这里，有实际的变化。',
    });

    const result = await processor.processSectionBased(
      oldContent,
      newContent,
      targetContent,
      'test.md',
      'en',
      'zh-cn'
    );

    // Verify complete structure
    expect(result).toContain('---');
    expect(result).toContain('# 标题');
    expect(result).toContain('介绍段落在这里');  // Intro preserved
    expect(result).toContain('## 第一部分');
    expect(result).toContain('新内容在这里，有实际的变化');  // Section updated

    // Only section was translated
    expect(mockTranslator.translateSection).toHaveBeenCalledTimes(1);
  });

  it('should handle documents with empty intro', async () => {
    const oldContent = `---
config: test
---

# Title

## Section

Content.`;

    const newContent = `---
config: test
---

# Title

## Section

New content.`;

    const targetContent = `---
config: test
---

# 标题

## 部分

内容。`;

    mockTranslator.translateSection.mockResolvedValue({
      success: true,
      translatedSection: '## 部分\n\n新内容。',
    });

    const result = await processor.processSectionBased(
      oldContent,
      newContent,
      targetContent,
      'test.md',
      'en',
      'zh-cn'
    );

    // Verify structure
    expect(result).toContain('# 标题');
    expect(result).toContain('## 部分');
    
    // No double empty lines where intro should be
    expect(result).not.toMatch(/\n\n\n\n/);
  });

  it('should handle title changes', async () => {
    const oldContent = `---
config: test
---

# Introduction

Text.

## Section

Content.`;

    const newContent = `---
config: test
---

# Introduction to Economics

Text.

## Section

Content.`;

    const targetContent = `---
config: test
---

# 介绍

文本。

## 部分

内容。`;

    // Mock title translation
    mockTranslator.translateSection.mockResolvedValueOnce({
      success: true,
      translatedSection: '# 经济学导论',
    });

    const result = await processor.processSectionBased(
      oldContent,
      newContent,
      targetContent,
      'test.md',
      'en',
      'zh-cn'
    );

    // Verify title changed
    expect(result).toContain('# 经济学导论');
    expect(result).not.toContain('# 介绍');
    
    // But intro and sections preserved
    expect(result).toContain('文本');
    expect(result).toContain('## 部分');
  });

  it('should handle documents with no sections (only title + intro)', async () => {
    const oldContent = `---
config: test
---

# Title

This is just intro text with no sections.

More intro.`;

    const newContent = `---
config: test
---

# Title

This is updated intro text with no sections.

More intro.`;

    const targetContent = `---
config: test
---

# 标题

这只是没有部分的介绍文本。

更多介绍。`;

    mockTranslator.translateSection.mockResolvedValue({
      success: true,
      translatedSection: '这是更新的没有部分的介绍文本。\n\n更多介绍。',
    });

    const result = await processor.processSectionBased(
      oldContent,
      newContent,
      targetContent,
      'test.md',
      'en',
      'zh-cn'
    );

    // Verify structure
    expect(result).toContain('# 标题');
    expect(result).toContain('这是更新的没有部分的介绍文本');
    
    // No sections
    expect(result).not.toContain('##');
  });
});
