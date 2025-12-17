/**
 * Quality Report Generator
 * 
 * Generates markdown reports for translation quality assessment.
 * Output: *-quality.md files with per-file and per-section scores.
 */

import * as fs from 'fs';
import * as path from 'path';
import { QualityAssessment, FileQualityAssessment, SectionQuality } from './types';

export interface QualityReportOptions {
  sourcePath: string;
  targetPath: string;
  targetLanguage: string;
}

export class QualityReportGenerator {
  private options: QualityReportOptions;

  constructor(options: QualityReportOptions) {
    this.options = options;
  }

  /**
   * Generate markdown report from quality assessment
   */
  generateReport(assessment: QualityAssessment): string {
    const lines: string[] = [];
    const now = new Date().toISOString().split('T')[0];

    // Header
    lines.push('# Translation Quality Report');
    lines.push('');
    lines.push(`**Source**: ${path.basename(this.options.sourcePath)}`);
    lines.push(`**Target**: ${path.basename(this.options.targetPath)}`);
    lines.push(`**Language**: ${this.options.targetLanguage}`);
    lines.push(`**Model**: ${assessment.model}`);
    lines.push(`**Generated**: ${now}`);
    lines.push(`**API Cost**: $${assessment.cost.totalUSD.toFixed(2)} (${assessment.cost.inputTokens.toLocaleString()} input tokens, ${assessment.cost.outputTokens.toLocaleString()} output tokens)`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| **Overall Quality** | ${this.getScoreEmoji(assessment.overallScore)} ${assessment.overallScore}% |`);
    lines.push(`| Files Assessed | ${assessment.filesAssessed} |`);
    lines.push(`| Files Skipped | ${assessment.filesSkipped} |`);
    lines.push(`| Sections Assessed | ${assessment.sectionCount} |`);
    lines.push(`| Sections Flagged | ${assessment.flaggedCount} (${this.pct(assessment.flaggedCount, assessment.sectionCount)}) |`);
    lines.push('');

    // Score Breakdown
    lines.push('### Score Breakdown');
    lines.push('');
    lines.push('| Category | Average |');
    lines.push('|----------|---------|');
    lines.push(`| Accuracy | ${this.getScoreEmoji(assessment.averageScores.accuracy)} ${assessment.averageScores.accuracy}% |`);
    lines.push(`| Fluency | ${this.getScoreEmoji(assessment.averageScores.fluency)} ${assessment.averageScores.fluency}% |`);
    lines.push(`| Terminology | ${this.getScoreEmoji(assessment.averageScores.terminology)} ${assessment.averageScores.terminology}% |`);
    lines.push(`| Completeness | ${this.getScoreEmoji(assessment.averageScores.completeness)} ${assessment.averageScores.completeness}% |`);
    lines.push('');

    // Files Requiring Attention (sorted by score)
    const flaggedFiles = this.collectFlaggedFiles(assessment);
    if (flaggedFiles.length > 0) {
      lines.push('## Files Requiring Attention');
      lines.push('');
      lines.push('Files with flagged sections, sorted by quality score (lowest first):');
      lines.push('');
      lines.push('| File | Score | Sections | Flagged | Recommendation |');
      lines.push('|------|-------|----------|---------|----------------|');
      
      for (const file of flaggedFiles) {
        const recommendation = this.getRecommendation(file.overallScore, file.flaggedCount, file.sectionCount);
        lines.push(`| [${file.file}](#${this.slugify(file.file)}) | ${this.getScoreEmoji(file.overallScore)} ${file.overallScore}% | ${file.sectionCount} | ${file.flaggedCount} | ${recommendation} |`);
      }
      lines.push('');
    }

    // Per-File Details
    lines.push('## File Details');
    lines.push('');

    for (const fileAssessment of assessment.files) {
      lines.push(`### ${fileAssessment.file}`);
      lines.push('');
      lines.push(`**Overall**: ${this.getScoreEmoji(fileAssessment.overallScore)} ${fileAssessment.overallScore}% | **Sections**: ${fileAssessment.sectionCount} | **Flagged**: ${fileAssessment.flaggedCount}`);
      lines.push('');

      if (fileAssessment.sections.length > 0) {
        // Score summary table
        lines.push('| # | Section | Acc | Flu | Term | Comp | Overall |');
        lines.push('|---|---------|-----|-----|------|------|---------|');
        
        for (let i = 0; i < fileAssessment.sections.length; i++) {
          const s = fileAssessment.sections[i];
          const headingDisplay = this.truncate(s.heading.replace(/^#+\s*/, ''), 30);
          lines.push(`| ${i + 1} | ${headingDisplay} | ${s.accuracyScore} | ${s.fluencyScore} | ${s.terminologyScore} | ${s.completenessScore} | ${this.getScoreEmoji(s.overallScore)} ${s.overallScore}% |`);
        }
        lines.push('');

        // Detailed notes for flagged sections (score < 80)
        const flaggedInFile = fileAssessment.sections.filter(s => s.overallScore < 80);
        if (flaggedInFile.length > 0) {
          lines.push('<details>');
          lines.push('<summary>Flagged Section Details</summary>');
          lines.push('');
          
          for (const s of flaggedInFile) {
            const flagsStr = s.flags.length > 0 ? `**Flags**: ${s.flags.join(', ')}` : '';
            lines.push(`#### ${s.heading.replace(/^#+\s*/, '')}`);
            lines.push('');
            lines.push(`**Score**: ${this.getScoreEmoji(s.overallScore)} ${s.overallScore}% (Acc: ${s.accuracyScore}, Flu: ${s.fluencyScore}, Term: ${s.terminologyScore}, Comp: ${s.completenessScore})`);
            if (flagsStr) {
              lines.push('');
              lines.push(flagsStr);
            }
            if (s.notes) {
              lines.push('');
              lines.push(`**Assessment**: ${s.notes}`);
            }
            lines.push('');
          }
          
          lines.push('</details>');
          lines.push('');
        }
      }
    }

    // Score Legend
    lines.push('---');
    lines.push('');
    lines.push('### Score Legend');
    lines.push('');
    lines.push('- 🟢 90-100%: Excellent');
    lines.push('- 🟡 70-89%: Good/Acceptable');
    lines.push('- 🟠 50-69%: Needs Improvement');
    lines.push('- 🔴 <50%: Poor');
    lines.push('');
    lines.push('### Quality Flags');
    lines.push('');
    lines.push('- `inaccurate`: Meaning changed or wrong');
    lines.push('- `awkward`: Unnatural phrasing');
    lines.push('- `terminology`: Wrong technical term');
    lines.push('- `omission`: Content missing');
    lines.push('- `addition`: Extra content added');
    lines.push('- `formatting`: MyST formatting issues');
    lines.push('');
    lines.push('---');
    lines.push('*Generated by tool-alignment quality assessment*');

    return lines.join('\n');
  }

  /**
   * Write report to file
   * Filename includes model name: *-quality-{model}.md
   */
  writeReport(assessment: QualityAssessment, outputBasePath: string): string {
    const report = this.generateReport(assessment);
    const basePath = outputBasePath.replace(/\.md$/, '');
    const qualityReportPath = `${basePath}-quality-${assessment.model}.md`;
    
    // Ensure directory exists
    const dir = path.dirname(qualityReportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(qualityReportPath, report);
    return qualityReportPath;
  }

  /**
   * Get emoji for score tier
   */
  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  }

  /**
   * Calculate percentage string
   */
  private pct(n: number, total: number): string {
    return total > 0 ? `${Math.round(n / total * 100)}%` : '0%';
  }

  /**
   * Truncate string with ellipsis
   */
  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
  }

  /**
   * Generate URL-safe slug from filename
   */
  private slugify(filename: string): string {
    return filename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /**
   * Get recommendation based on score and flagged count
   */
  private getRecommendation(score: number, flagged: number, total: number): string {
    const flaggedPct = total > 0 ? flagged / total : 0;
    
    if (score < 60) return '🔴 **Retranslate**';
    if (score < 70) return '🟠 Review all sections';
    if (score < 80 || flaggedPct > 0.5) return '🟡 Review flagged sections';
    return '✓ Minor issues only';
  }

  /**
   * Collect files with flagged sections, sorted by score
   */
  private collectFlaggedFiles(assessment: QualityAssessment): FileQualityAssessment[] {
    const flagged = assessment.files.filter(f => f.flaggedCount > 0);
    
    // Sort by score (worst first)
    flagged.sort((a, b) => a.overallScore - b.overallScore);
    
    return flagged;
  }
}

/**
 * Generate JSON report
 */
export function generateJsonReport(assessment: QualityAssessment): string {
  return JSON.stringify(assessment, null, 2);
}
