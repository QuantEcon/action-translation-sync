/**
 * Tests for Structural Analyzer using test fixtures
 * 
 * Test fixtures are in test-fixtures/ directory:
 * - 01-aligned-perfect: Perfect structural alignment
 * - 02-aligned-with-heading-map: Aligned with heading-map
 * - 03-likely-aligned: Minor differences (code block)
 * - 04-needs-review-missing-section: Target missing section
 * - 05-needs-review-extra-section: Target has extra section
 * - 06-diverged-major: Major structural divergence
 * - 07-missing-file: File only in source
 * - 08-extra-file: File only in target
 * - 09-config-identical: Identical _toc.yml
 * - 10-config-diverged: Different _toc.yml structure
 * - 11-subsections-nested: Deep nested subsections
 * - 12-code-math-blocks: Code and math block counting
 * - 13-multi-file-mixed: Multiple files with mixed status
 */

import * as path from 'path';
import { StructuralAnalyzer } from '../structural-analyzer';

const FIXTURES_DIR = path.join(__dirname, '../../test-fixtures');

describe('StructuralAnalyzer', () => {
  let analyzer: StructuralAnalyzer;

  beforeAll(() => {
    analyzer = new StructuralAnalyzer();
  });

  describe('01-aligned-perfect', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '01-aligned-perfect');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect perfectly aligned files', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'intro.md');

      expect(analysis.status).toBe('aligned');
      expect(analysis.source?.sections).toBe(2);
      expect(analysis.target?.sections).toBe(2);
      expect(analysis.comparison?.sectionMatch).toBe(true);
      expect(analysis.comparison?.structureScore).toBe(100);
    });
  });

  describe('02-aligned-with-heading-map', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '02-aligned-with-heading-map');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect aligned files with heading-map', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'intro.md');

      expect(analysis.status).toBe('aligned');
      expect(analysis.target?.hasHeadingMap).toBe(true);
      expect(analysis.source?.sections).toBe(2);
      expect(analysis.target?.sections).toBe(2);
    });
  });

  describe('03-likely-aligned', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '03-likely-aligned');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect likely aligned files with minor differences', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'guide.md');

      expect(analysis.status).toBe('likely-aligned');
      expect(analysis.source?.sections).toBe(3);
      expect(analysis.target?.sections).toBe(3);
      expect(analysis.comparison?.codeBlockMatch).toBe(false);
      expect(analysis.source?.codeBlocks).toBe(2);
      expect(analysis.target?.codeBlocks).toBe(3);
    });
  });

  describe('04-needs-review-missing-section', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '04-needs-review-missing-section');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect files needing review due to missing section', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'economics.md');

      expect(analysis.status).toBe('needs-review');
      expect(analysis.source?.sections).toBe(5);
      expect(analysis.target?.sections).toBe(4);
      expect(analysis.comparison?.sectionMatch).toBe(false);
    });
  });

  describe('05-needs-review-extra-section', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '05-needs-review-extra-section');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect files needing review due to extra section', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'analysis.md');

      expect(analysis.status).toBe('needs-review');
      expect(analysis.source?.sections).toBe(3);
      expect(analysis.target?.sections).toBe(4);
      expect(analysis.comparison?.sectionMatch).toBe(false);
    });
  });

  describe('06-diverged-major', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '06-diverged-major');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect diverged files with major structure mismatch', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'guide.md');

      expect(analysis.status).toBe('diverged');
      expect(analysis.source?.sections).toBe(6);
      expect(analysis.target?.sections).toBe(2);
      expect(analysis.comparison?.sectionMatch).toBe(false);
    });
  });

  describe('07-missing-file', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '07-missing-file');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect file that exists in source but not target', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'new-chapter.md');

      expect(analysis.status).toBe('missing');
      expect(analysis.source?.exists).toBe(true);
      expect(analysis.target).toBeNull();
      expect(analysis.issues).toContain('File does not exist in target repository');
    });

    it('should analyze file that exists in both repos', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'existing.md');

      expect(analysis.status).toBe('aligned');
      expect(analysis.source?.exists).toBe(true);
      expect(analysis.target?.exists).toBe(true);
    });
  });

  describe('08-extra-file', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '08-extra-file');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect file that exists in target but not source', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'local-guide.md');

      expect(analysis.status).toBe('extra');
      expect(analysis.source).toBeNull();
      expect(analysis.target?.exists).toBe(true);
      expect(analysis.issues).toContain('File exists only in target repository (localization?)');
    });

    it('should analyze file that exists in both repos', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'main.md');

      expect(analysis.status).toBe('aligned');
    });
  });

  describe('09-config-identical', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '09-config-identical');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect identical config files', async () => {
      const analysis = await analyzer.analyzeConfigFile(sourceDir, targetDir, '_toc.yml');

      expect(analysis.status).toBe('identical');
      expect(analysis.comparison?.identical).toBe(true);
    });
  });

  describe('10-config-diverged', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '10-config-diverged');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect diverged config files', async () => {
      const analysis = await analyzer.analyzeConfigFile(sourceDir, targetDir, '_toc.yml');

      expect(analysis.status).toBe('diverged');
      expect(analysis.comparison?.identical).toBe(false);
      expect(analysis.source?.entries).toBe(5);
      expect(analysis.target?.entries).toBe(2);
    });
  });

  describe('11-subsections-nested', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '11-subsections-nested');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should handle deeply nested subsections', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'linear-algebra.md');

      expect(analysis.status).toBe('aligned');
      // Main sections: Vectors, Matrices
      expect(analysis.source?.sections).toBe(2);
      expect(analysis.target?.sections).toBe(2);
      // Subsections should be counted
      expect(analysis.source?.subsections).toBeGreaterThan(0);
      expect(analysis.target?.subsections).toBeGreaterThan(0);
    });
  });

  describe('12-code-math-blocks', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '12-code-math-blocks');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should count code blocks correctly', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'computing.md');

      expect(analysis.source?.codeBlocks).toBe(3);
      expect(analysis.target?.codeBlocks).toBe(3);
      expect(analysis.comparison?.codeBlockMatch).toBe(true);
    });

    it('should count math blocks correctly', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'computing.md');

      expect(analysis.source?.mathBlocks).toBe(2);
      expect(analysis.target?.mathBlocks).toBe(2);
      expect(analysis.comparison?.mathBlockMatch).toBe(true);
    });
  });

  describe('13-multi-file-mixed', () => {
    const fixtureDir = path.join(FIXTURES_DIR, '13-multi-file-mixed');
    const sourceDir = path.join(fixtureDir, 'source');
    const targetDir = path.join(fixtureDir, 'target');

    it('should detect aligned file in mixed collection', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'aligned.md');

      expect(analysis.status).toBe('aligned');
      expect(analysis.source?.sections).toBe(2);
      expect(analysis.target?.sections).toBe(2);
      expect(analysis.target?.hasHeadingMap).toBe(true);
    });

    it('should detect diverged file in mixed collection', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'diverged.md');

      expect(analysis.status).toBe('diverged');
      expect(analysis.source?.sections).toBe(4);
      expect(analysis.target?.sections).toBe(1);
    });

    it('should detect missing file in mixed collection', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'new.md');

      expect(analysis.status).toBe('missing');
      expect(analysis.source?.exists).toBe(true);
      expect(analysis.target).toBeNull();
    });

    it('should detect extra file in mixed collection', async () => {
      const analysis = await analyzer.analyzeMarkdownFile(sourceDir, targetDir, 'extra.md');

      expect(analysis.status).toBe('extra');
      expect(analysis.source).toBeNull();
      expect(analysis.target?.exists).toBe(true);
    });

    it('should detect config files with same structure', async () => {
      const analysis = await analyzer.analyzeConfigFile(sourceDir, targetDir, '_toc.yml');

      expect(analysis.status).toBe('structure-match');
      expect(analysis.source?.entries).toBe(3);
      expect(analysis.target?.entries).toBe(3);
    });
  });

  describe('getMarkdownFiles', () => {
    it('should find all markdown files in fixture', () => {
      const fixtureDir = path.join(FIXTURES_DIR, '13-multi-file-mixed');
      const sourceDir = path.join(fixtureDir, 'source');

      const files = analyzer.getMarkdownFiles(sourceDir, '.');

      expect(files).toContain('aligned.md');
      expect(files).toContain('diverged.md');
      expect(files).toContain('new.md');
      expect(files.length).toBe(3);
    });
  });
});
