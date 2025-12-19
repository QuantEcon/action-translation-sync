/**
 * Tests for types.ts - TypeScript type definitions
 */

import { 
  ActionType, 
  RegionStatus, 
  BlockStatus,
  CodeBlock,
  BlockMapping,
  CodeAnalysisResult,
  DecisionItem,
  FileDecisions,
  FileResult,
  ConfigAnalysis,
  Thresholds,
  OnboardOptions
} from '../types';

describe('Type definitions', () => {
  describe('ActionType', () => {
    it('should allow valid action types', () => {
      const actions: ActionType[] = [
        'SYNC',
        'BACKPORT',
        'ACCEPT LOCALISATION',
        'MANUAL REVIEW'
      ];
      expect(actions).toHaveLength(4);
    });
  });

  describe('RegionStatus', () => {
    it('should allow valid region statuses', () => {
      const statuses: RegionStatus[] = ['aligned', 'differs', 'missing', 'inserted'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('BlockStatus', () => {
    it('should allow valid block statuses', () => {
      const statuses: BlockStatus[] = [
        'aligned',
        'modified',
        'inserted',
        'inserted-i18n',
        'missing'
      ];
      expect(statuses).toHaveLength(5);
    });
  });

  describe('CodeBlock', () => {
    it('should accept valid code block', () => {
      const block: CodeBlock = {
        content: 'print("hello")',
        contentNormalized: 'print("hello")',
        language: 'python',
        startLine: 1,
        endLine: 1,
      };
      expect(block.content).toBe('print("hello")');
    });
  });

  describe('BlockMapping', () => {
    it('should accept valid mapping with both indices', () => {
      const mapping: BlockMapping = {
        srcIdx: 0,
        tgtIdx: 0,
        status: 'aligned',
        sourceLines: 5,
        targetLines: 5,
        language: 'python',
      };
      expect(mapping.status).toBe('aligned');
    });

    it('should accept mapping with null source (inserted)', () => {
      const mapping: BlockMapping = {
        srcIdx: null,
        tgtIdx: 0,
        status: 'inserted',
        sourceLines: 0,
        targetLines: 5,
        language: 'python',
        notes: ['Extra block'],
      };
      expect(mapping.srcIdx).toBeNull();
    });

    it('should accept mapping with null target (missing)', () => {
      const mapping: BlockMapping = {
        srcIdx: 0,
        tgtIdx: null,
        status: 'missing',
        sourceLines: 5,
        targetLines: 0,
        language: 'python',
      };
      expect(mapping.tgtIdx).toBeNull();
    });
  });

  describe('CodeAnalysisResult', () => {
    it('should accept valid analysis result', () => {
      const result: CodeAnalysisResult = {
        sourceBlocks: 5,
        targetBlocks: 5,
        aligned: 4,
        modified: 1,
        inserted: 0,
        insertedI18n: 0,
        missing: 0,
        score: 80,
        mappings: [],
      };
      expect(result.score).toBe(80);
    });
  });

  describe('DecisionItem', () => {
    it('should accept valid decision item', () => {
      const decision: DecisionItem = {
        id: 'section-1',
        region: 'Section 1',
        type: 'prose',
        status: 'differs',
        startLine: 10,
        sourceHeading: 'Introduction',
        targetHeading: '介绍',
        issue: 'Content differs',
        issueType: 'CONTENT',
        recommendation: 'SYNC',
        notes: ['Needs update'],
      };
      expect(decision.recommendation).toBe('SYNC');
    });
  });

  describe('FileDecisions', () => {
    it('should accept valid file decisions', () => {
      const decisions: FileDecisions = {
        file: 'test.md',
        status: 'review',
        sourceDate: '2024-12-15',
        targetDate: '2024-12-01',
        decisions: [],
        counts: {
          sync: 1,
          backport: 0,
          accept: 3,
          manual: 0,
          aligned: 2,
        },
      };
      expect(decisions.status).toBe('review');
    });
  });

  describe('FileResult', () => {
    it('should accept valid file result', () => {
      const result: FileResult = {
        file: 'test.md',
        status: 'aligned',
        sourceDate: '2024-12-15',
        targetDate: '2024-12-15',
        codeScore: 100,
        proseStatus: 'aligned',
      };
      expect(result.status).toBe('aligned');
    });

    it('should accept file result with error', () => {
      const result: FileResult = {
        file: 'test.md',
        status: 'error',
        error: 'File not found',
      };
      expect(result.error).toBe('File not found');
    });
  });

  describe('ConfigAnalysis', () => {
    it('should accept valid config analysis', () => {
      const config: ConfigAnalysis = {
        file: '_toc.yml',
        sourceExists: true,
        targetExists: true,
        status: 'differs',
        differences: ['Entry count differs'],
        sourceEntries: 10,
        targetEntries: 8,
      };
      expect(config.status).toBe('differs');
    });
  });

  describe('Thresholds', () => {
    it('should accept valid thresholds', () => {
      const thresholds: Thresholds = {
        code: {
          aligned: 90,
          review: 70,
        },
        prose: {
          aligned: 90,
          review: 70,
        },
      };
      expect(thresholds.code.aligned).toBe(90);
    });
  });

  describe('OnboardOptions', () => {
    it('should accept valid CLI options', () => {
      const options: OnboardOptions = {
        source: '/path/to/source',
        target: '/path/to/target',
        docsFolder: 'lectures',
        language: 'zh-cn',
        model: 'claude-sonnet-4-20250514',
      };
      expect(options.language).toBe('zh-cn');
    });

    it('should accept options with all optional fields', () => {
      const options: OnboardOptions = {
        source: '/path/to/source',
        target: '/path/to/target',
        docsFolder: 'lectures',
        language: 'zh-cn',
        model: 'claude-sonnet-4-20250514',
        output: '/path/to/output',
        file: 'specific.md',
        limit: 10,
        codeOnly: true,
        checkConfig: true,
        codeAligned: 95,
        codeReview: 75,
        proseAligned: 92,
        proseReview: 72,
      };
      expect(options.codeOnly).toBe(true);
    });
  });
});
