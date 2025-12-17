/**
 * Tests for Quality Scorer
 * 
 * Tests the translation quality assessment module including:
 * - Cost estimation
 * - Response parsing
 * - Score calculation
 * - Report generation
 */

import { 
  QualityScorer, 
  countSections, 
  formatCostEstimate 
} from '../quality-scorer';
import { QualityReportGenerator, generateJsonReport } from '../quality-report-generator';
import { MarkdownAnalysis, QualityAssessment, SectionQuality, FileQualityAssessment } from '../types';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
  };
});

describe('QualityScorer', () => {
  describe('estimateCost', () => {
    it('should estimate cost for given section count', () => {
      const scorer = new QualityScorer({
        apiKey: 'test-key',
        targetLanguage: 'zh-cn',
      });

      const estimate = scorer.estimateCost(100);

      // ~4300 tokens per section + ~3900 glossary tokens (full glossary)
      expect(estimate.inputTokens).toBe(820000);  // 100 * (4300 + 3900)
      expect(estimate.outputTokens).toBe(25000);  // 100 * 250
      expect(estimate.totalUSD).toBeGreaterThan(0);
      expect(estimate.totalUSD).toBeLessThan(2);  // Haiku 3.5 default
    });

    it('should estimate low cost for small section count', () => {
      const scorer = new QualityScorer({
        apiKey: 'test-key',
        targetLanguage: 'zh-cn',
      });

      const estimate = scorer.estimateCost(10);

      expect(estimate.totalUSD).toBeLessThan(0.2);
    });

    it('should estimate higher cost for large section count', () => {
      const scorer = new QualityScorer({
        apiKey: 'test-key',
        targetLanguage: 'zh-cn',
      });

      const estimate = scorer.estimateCost(1000);

      expect(estimate.totalUSD).toBeGreaterThan(1);
      expect(estimate.totalUSD).toBeLessThan(10);
    });
  });

  describe('formatCostEstimate', () => {
    it('should format cost estimate as human-readable string', () => {
      const estimate = {
        inputTokens: 50000,
        outputTokens: 10000,
        totalUSD: 0.0375,
      };

      const formatted = formatCostEstimate(estimate);

      expect(formatted).toContain('$0.04');
      expect(formatted).toContain('50,000');
      expect(formatted).toContain('10,000');
    });
  });

  describe('countSections', () => {
    it('should count sections from aligned files only', () => {
      const analyses: MarkdownAnalysis[] = [
        createMockAnalysis('file1.md', 'aligned', 5),
        createMockAnalysis('file2.md', 'likely-aligned', 3),
        createMockAnalysis('file3.md', 'diverged', 10),
        createMockAnalysis('file4.md', 'missing', 0),
      ];

      const count = countSections(analyses);

      expect(count).toBe(8); // 5 + 3 (aligned + likely-aligned only)
    });

    it('should return 0 for no eligible files', () => {
      const analyses: MarkdownAnalysis[] = [
        createMockAnalysis('file1.md', 'diverged', 5),
        createMockAnalysis('file2.md', 'missing', 3),
      ];

      const count = countSections(analyses);

      expect(count).toBe(0);
    });
  });
});

describe('QualityReportGenerator', () => {
  const mockAssessment: QualityAssessment = {
    model: 'claude-3-5-haiku-20241022',
    overallScore: 85,
    filesAssessed: 3,
    filesSkipped: 1,
    sectionCount: 10,
    flaggedCount: 2,
    cost: {
      inputTokens: 5000,
      outputTokens: 1000,
      totalUSD: 0.02,
    },
    averageScores: {
      accuracy: 88,
      fluency: 82,
      terminology: 90,
      completeness: 85,
    },
    files: [
      createMockFileAssessment('intro.md', 90, 3, 0),
      createMockFileAssessment('guide.md', 75, 4, 2),
      createMockFileAssessment('advanced.md', 92, 3, 0),
    ],
  };

  it('should generate markdown report', () => {
    const generator = new QualityReportGenerator({
      sourcePath: '/path/to/source',
      targetPath: '/path/to/target',
      targetLanguage: 'zh-cn',
    });

    const report = generator.generateReport(mockAssessment);

    expect(report).toContain('# Translation Quality Report');
    expect(report).toContain('zh-cn');
    expect(report).toContain('claude-3-5-haiku-20241022');
    expect(report).toContain('85%');
    expect(report).toContain('Files Assessed | 3');
    expect(report).toContain('Sections Flagged');
    expect(report).toContain('Accuracy');
    expect(report).toContain('Fluency');
  });

  it('should include flagged files requiring attention', () => {
    const generator = new QualityReportGenerator({
      sourcePath: '/path/to/source',
      targetPath: '/path/to/target',
      targetLanguage: 'zh-cn',
    });

    const report = generator.generateReport(mockAssessment);

    expect(report).toContain('Files Requiring Attention');
    expect(report).toContain('guide.md');
    expect(report).toContain('Recommendation');
  });

  it('should include file details with collapsible sections', () => {
    const generator = new QualityReportGenerator({
      sourcePath: '/path/to/source',
      targetPath: '/path/to/target',
      targetLanguage: 'zh-cn',
    });

    const report = generator.generateReport(mockAssessment);

    expect(report).toContain('## File Details');
    expect(report).toContain('<details>');
    expect(report).toContain('Section Details');
  });

  it('should include score legend', () => {
    const generator = new QualityReportGenerator({
      sourcePath: '/path/to/source',
      targetPath: '/path/to/target',
      targetLanguage: 'zh-cn',
    });

    const report = generator.generateReport(mockAssessment);

    expect(report).toContain('### Score Legend');
    expect(report).toContain('90-100%: Excellent');
    expect(report).toContain('### Quality Flags');
    expect(report).toContain('inaccurate');
  });
});

describe('generateJsonReport', () => {
  it('should generate valid JSON', () => {
    const assessment: QualityAssessment = {
      model: 'claude-3-5-haiku-20241022',
      overallScore: 85,
      filesAssessed: 2,
      filesSkipped: 0,
      sectionCount: 5,
      flaggedCount: 1,
      cost: { inputTokens: 1000, outputTokens: 200, totalUSD: 0.01 },
      averageScores: { accuracy: 85, fluency: 85, terminology: 85, completeness: 85 },
      files: [],
    };

    const json = generateJsonReport(assessment);
    const parsed = JSON.parse(json);

    expect(parsed.overallScore).toBe(85);
    expect(parsed.model).toBe('claude-3-5-haiku-20241022');
    expect(parsed.cost.totalUSD).toBe(0.01);
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMockAnalysis(
  file: string, 
  status: 'aligned' | 'likely-aligned' | 'diverged' | 'missing' | 'needs-review' | 'extra',
  sections: number
): MarkdownAnalysis {
  return {
    file,
    fileType: 'markdown',
    source: {
      exists: status !== 'extra',
      sections,
      subsections: 0,
      codeBlocks: 0,
      mathBlocks: 0,
      wordCount: 100,
      headingHierarchy: [],
    },
    target: {
      exists: status !== 'missing',
      sections,
      subsections: 0,
      codeBlocks: 0,
      mathBlocks: 0,
      charCount: 200,
      headingHierarchy: [],
      hasHeadingMap: false,
    },
    comparison: {
      sectionMatch: true,
      subsectionMatch: true,
      structureScore: 100,
      codeBlockMatch: true,
      mathBlockMatch: true,
    },
    codeIntegrity: null,
    status,
    issues: [],
  };
}

function createMockFileAssessment(
  file: string,
  overallScore: number,
  sectionCount: number,
  flaggedCount: number
): FileQualityAssessment {
  const sections: SectionQuality[] = [];
  
  for (let i = 0; i < sectionCount; i++) {
    const isFlagged = i < flaggedCount;
    sections.push({
      sectionId: `section-${i}`,
      heading: `## Section ${i + 1}`,
      translatedHeading: `## 第${i + 1}节`,
      accuracyScore: isFlagged ? 65 : 90,
      fluencyScore: isFlagged ? 60 : 88,
      terminologyScore: isFlagged ? 70 : 92,
      completenessScore: isFlagged ? 75 : 90,
      overallScore: isFlagged ? 68 : 90,
      flags: isFlagged ? ['inaccurate', 'awkward'] : [],
      notes: isFlagged ? 'Some issues found' : '',
    });
  }

  return {
    file,
    overallScore,
    sectionCount,
    flaggedCount,
    sections,
  };
}
