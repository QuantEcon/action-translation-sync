/**
 * Tests for Phase 3: File-Centric Diagnostics
 */

import * as path from 'path';
import { FileAnalyzer, extractRepoName, sortByPriority, getActionIcon, getPriorityIcon } from '../file-analyzer';
import { Triage } from '../triage';
import { TriageReportGenerator } from '../triage-report';
import { FileDiagnostic, Priority, FileAction } from '../types';

const FIXTURES_PATH = path.join(__dirname, '../../test-fixtures');

describe('FileAnalyzer', () => {
  const analyzer = new FileAnalyzer();

  describe('analyzeFile', () => {
    it('should analyze aligned file correctly', async () => {
      const fixturePath = path.join(FIXTURES_PATH, '01-aligned-perfect');
      const result = await analyzer.analyzeFile(
        path.join(fixturePath, 'source'),
        path.join(fixturePath, 'target'),
        '.',
        'intro.md'
      );

      expect(result.file).toBe('intro.md');
      expect(result.sourceExists).toBe(true);
      expect(result.targetExists).toBe(true);
      expect(result.structure).not.toBeNull();
      expect(result.structure?.score).toBe(100);
      // Action is 'resync' because fixture doesn't have heading-map
      expect(['ok', 'resync']).toContain(result.action);
      expect(['ok', 'low']).toContain(result.priority);
    });

    it('should detect missing file', async () => {
      const fixturePath = path.join(FIXTURES_PATH, '07-missing-file');
      const result = await analyzer.analyzeFile(
        path.join(fixturePath, 'source'),
        path.join(fixturePath, 'target'),
        '.',
        'new-chapter.md'  // This file exists in source but not target
      );

      expect(result.sourceExists).toBe(true);
      expect(result.targetExists).toBe(false);
      expect(result.action).toBe('create');
      expect(result.priority).toBe('critical');
    });

    it('should detect diverged structure', async () => {
      const fixturePath = path.join(FIXTURES_PATH, '06-diverged-major');
      const result = await analyzer.analyzeFile(
        path.join(fixturePath, 'source'),
        path.join(fixturePath, 'target'),
        '.',
        'guide.md'  // Correct filename for this fixture
      );

      expect(result.structure).not.toBeNull();
      expect(result.structure?.score).toBeLessThan(80);
      expect(result.action).toBe('diverged');
      expect(['critical', 'high']).toContain(result.priority);
    });

    it('should handle files with no code blocks', async () => {
      const fixturePath = path.join(FIXTURES_PATH, '01-aligned-perfect');
      const result = await analyzer.analyzeFile(
        path.join(fixturePath, 'source'),
        path.join(fixturePath, 'target'),
        '.',
        'intro.md'
      );

      // File may have no code blocks - should still work
      expect(result.code === null || result.code.score === 100).toBe(true);
    });
  });

  describe('getMarkdownFiles', () => {
    it('should discover markdown files', () => {
      const fixturePath = path.join(FIXTURES_PATH, '13-multi-file-mixed');
      const files = analyzer.getMarkdownFiles(path.join(fixturePath, 'source'), '.');
      
      expect(files.length).toBeGreaterThan(0);
      expect(files.every(f => f.endsWith('.md'))).toBe(true);
    });
  });
});

describe('extractRepoName', () => {
  it('should extract repo name from absolute path', () => {
    expect(extractRepoName('/Users/user/repos/lecture-python-intro')).toBe('lecture-python-intro');
  });

  it('should extract repo name from relative path', () => {
    expect(extractRepoName('../lecture-python.myst')).toBe('lecture-python.myst');
  });

  it('should handle paths with trailing slash', () => {
    expect(extractRepoName('/path/to/repo/')).toBe('repo');
  });
});

describe('sortByPriority', () => {
  it('should sort critical first, ok last', () => {
    const files: FileDiagnostic[] = [
      { file: 'ok.md', priority: 'ok' as Priority } as FileDiagnostic,
      { file: 'critical.md', priority: 'critical' as Priority } as FileDiagnostic,
      { file: 'medium.md', priority: 'medium' as Priority } as FileDiagnostic,
    ];

    const sorted = sortByPriority(files);
    
    expect(sorted[0].priority).toBe('critical');
    expect(sorted[sorted.length - 1].priority).toBe('ok');
  });

  it('should sort alphabetically within same priority', () => {
    const files: FileDiagnostic[] = [
      { file: 'z.md', priority: 'medium' as Priority } as FileDiagnostic,
      { file: 'a.md', priority: 'medium' as Priority } as FileDiagnostic,
    ];

    const sorted = sortByPriority(files);
    
    expect(sorted[0].file).toBe('a.md');
    expect(sorted[1].file).toBe('z.md');
  });
});

describe('getActionIcon', () => {
  it('should return correct icons', () => {
    expect(getActionIcon('ok')).toBe('✅');
    expect(getActionIcon('create')).toBe('📄');
    expect(getActionIcon('diverged')).toBe('⚠️');
    expect(getActionIcon('review-code')).toBe('🔧');
    expect(getActionIcon('retranslate')).toBe('🔴');
  });
});

describe('getPriorityIcon', () => {
  it('should return correct icons', () => {
    expect(getPriorityIcon('critical')).toBe('🔴');
    expect(getPriorityIcon('high')).toBe('🟠');
    expect(getPriorityIcon('medium')).toBe('🟡');
    expect(getPriorityIcon('low')).toBe('🟢');
    expect(getPriorityIcon('ok')).toBe('✅');
  });
});

describe('Triage', () => {
  const triage = new Triage();

  describe('triageRepository', () => {
    it('should triage multi-file fixture', async () => {
      const fixturePath = path.join(FIXTURES_PATH, '13-multi-file-mixed');
      const result = await triage.triageRepository({
        source: path.join(fixturePath, 'source'),
        target: path.join(fixturePath, 'target'),
        docsFolder: '.',
        output: '',
        all: false,
      });

      expect(result.metadata.sourceRepo).toBe('source');
      expect(result.summary.totalFiles).toBeGreaterThan(0);
      expect(result.files.length).toBe(result.summary.totalFiles);
      expect(result.summary.ok + result.summary.needsAttention).toBe(result.summary.totalFiles);
    });

    it('should sort files by priority', async () => {
      const fixturePath = path.join(FIXTURES_PATH, '13-multi-file-mixed');
      const result = await triage.triageRepository({
        source: path.join(fixturePath, 'source'),
        target: path.join(fixturePath, 'target'),
        docsFolder: '.',
        output: '',
        all: false,
      });

      // Files should be sorted (critical < high < medium < low < ok)
      const priorityOrder: Record<Priority, number> = {
        'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'ok': 4
      };

      for (let i = 1; i < result.files.length; i++) {
        const prev = priorityOrder[result.files[i-1].priority];
        const curr = priorityOrder[result.files[i].priority];
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('should count actions correctly', async () => {
      const fixturePath = path.join(FIXTURES_PATH, '13-multi-file-mixed');
      const result = await triage.triageRepository({
        source: path.join(fixturePath, 'source'),
        target: path.join(fixturePath, 'target'),
        docsFolder: '.',
        output: '',
        all: false,
      });

      // Sum of all action counts should equal total files
      const actionSum = Object.values(result.summary.byAction).reduce((a, b) => a + b, 0);
      expect(actionSum).toBe(result.summary.totalFiles);
    });
  });
});

describe('TriageReportGenerator', () => {
  const generator = new TriageReportGenerator();

  describe('generateTriageReport', () => {
    it('should generate markdown report with correct structure', async () => {
      const fixturePath = path.join(FIXTURES_PATH, '13-multi-file-mixed');
      const triage = new Triage();
      const result = await triage.triageRepository({
        source: path.join(fixturePath, 'source'),
        target: path.join(fixturePath, 'target'),
        docsFolder: '.',
        output: '',
        all: false,
      });

      const report = generator.generateTriageReport(result);

      expect(report).toContain('# 📊 Triage Report:');
      expect(report).toContain('## Summary');
      expect(report).toContain('Total Files');
      expect(report).toContain('Action Breakdown');
      expect(report).toContain('Quick Stats');
      expect(report).toContain('Next Steps');
    });

    it('should include priority action list when files need attention', async () => {
      const fixturePath = path.join(FIXTURES_PATH, '13-multi-file-mixed');
      const triage = new Triage();
      const result = await triage.triageRepository({
        source: path.join(fixturePath, 'source'),
        target: path.join(fixturePath, 'target'),
        docsFolder: '.',
        output: '',
        all: false,
      });

      const report = generator.generateTriageReport(result);

      if (result.filesNeedingAttention.length > 0) {
        expect(report).toContain('## Priority Action List');
      }
    });
  });

  describe('generateFileReport', () => {
    it('should generate file report with correct structure', async () => {
      const diagnostic: FileDiagnostic = {
        file: 'test.md',
        sourceExists: true,
        targetExists: true,
        structure: {
          score: 100,
          sectionMatch: true,
          subsectionMatch: true,
          sourceSections: 3,
          targetSections: 3,
          sourceSubsections: 2,
          targetSubsections: 2,
          hasHeadingMap: true,
          issues: [],
        },
        code: {
          score: 95,
          sourceBlocks: 5,
          targetBlocks: 5,
          matchedBlocks: 5,
          modifiedBlocks: 0,
          missingBlocks: 0,
          extraBlocks: 0,
          hasLocalizationChanges: false,
          issues: [],
        },
        action: 'ok',
        priority: 'ok',
        reason: 'All checks passed',
      };

      const metadata = {
        sourceRepo: 'test-repo',
        sourcePath: '/path/to/source',
        targetPath: '/path/to/target',
        docsFolder: '.',
        generatedAt: new Date().toISOString(),
        version: '0.2.0',
      };

      const report = generator.generateFileReport(diagnostic, metadata);

      expect(report).toContain('# 📄 File Diagnostic: test.md');
      expect(report).toContain('## Quick Summary');
      expect(report).toContain('Recommended Action');
      expect(report).toContain('## Detailed Analysis');
      expect(report).toContain('### Structure');
      expect(report).toContain('### Code Integrity');
    });
  });
});
