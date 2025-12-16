/**
 * Structure Report Generator for Alignment Diagnostics
 * 
 * Generates human-readable markdown reports and machine-readable JSON
 * for structural alignment (sections, subsections, heading maps).
 * 
 * Code block comparison is handled by CodeReportGenerator.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  DiagnosticReport,
  MarkdownAnalysis,
  ConfigAnalysis,
  Recommendation,
  RecommendedAction,
  AlignmentStatus,
  ConfigStatus,
} from './types';

export class ReportGenerator {
  /**
   * Generate a complete diagnostic report
   */
  generateReport(
    sourcePath: string,
    targetPath: string,
    docsFolder: string,
    markdownAnalysis: MarkdownAnalysis[],
    configAnalysis: ConfigAnalysis[]
  ): DiagnosticReport {
    const recommendations = this.generateRecommendations(markdownAnalysis, configAnalysis);

    // Calculate summary
    const summary = {
      totalFiles: markdownAnalysis.length + configAnalysis.length,
      markdownFiles: markdownAnalysis.length,
      configFiles: configAnalysis.length,
      aligned: markdownAnalysis.filter(a => a.status === 'aligned').length,
      likelyAligned: markdownAnalysis.filter(a => a.status === 'likely-aligned').length,
      needsReview: markdownAnalysis.filter(a => a.status === 'needs-review').length,
      diverged: markdownAnalysis.filter(a => a.status === 'diverged').length,
      missing: markdownAnalysis.filter(a => a.status === 'missing').length,
      extra: markdownAnalysis.filter(a => a.status === 'extra').length,
    };

    return {
      metadata: {
        sourcePath,
        targetPath,
        docsFolder,
        generatedAt: new Date().toISOString(),
        version: '0.1.0',
      },
      summary,
      markdownAnalysis,
      configAnalysis,
      recommendations,
    };
  }

  /**
   * Generate markdown report (structure-focused)
   */
  toMarkdown(report: DiagnosticReport): string {
    const lines: string[] = [];

    // Header
    lines.push('# Structure Alignment Report');
    lines.push('');
    lines.push(`**Source**: \`${report.metadata.sourcePath}\`  `);
    lines.push(`**Target**: \`${report.metadata.targetPath}\`  `);
    lines.push(`**Docs Folder**: \`${report.metadata.docsFolder}\`  `);
    lines.push(`**Generated**: ${report.metadata.generatedAt}  `);
    lines.push(`**Tool Version**: ${report.metadata.version}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('### Alignment Status');
    lines.push('');
    lines.push('| Status | Count | Percentage |');
    lines.push('|--------|-------|------------|');
    
    const total = report.summary.markdownFiles;
    const pct = (n: number) => total > 0 ? `${Math.round(n / total * 100)}%` : '0%';
    
    lines.push(`| ✅ Aligned | ${report.summary.aligned} | ${pct(report.summary.aligned)} |`);
    lines.push(`| 🟡 Likely Aligned | ${report.summary.likelyAligned} | ${pct(report.summary.likelyAligned)} |`);
    lines.push(`| ⚠️ Needs Review | ${report.summary.needsReview} | ${pct(report.summary.needsReview)} |`);
    lines.push(`| ❌ Diverged | ${report.summary.diverged} | ${pct(report.summary.diverged)} |`);
    lines.push(`| 📄 Missing | ${report.summary.missing} | ${pct(report.summary.missing)} |`);
    lines.push(`| ➕ Extra | ${report.summary.extra} | ${pct(report.summary.extra)} |`);
    lines.push('');

    // Scoring Methodology
    lines.push('### Scoring Methodology');
    lines.push('');
    lines.push('The **Structure Score** is calculated as follows:');
    lines.push('');
    lines.push('```');
    lines.push('Base Score = 0');
    lines.push('');
    lines.push('Bonuses (additive):');
    lines.push('  - Section count match:       +40');
    lines.push('  - Subsection count match:    +30');
    lines.push('  - Code block count match:    +15');
    lines.push('  - Math block count match:    +15');
    lines.push('');
    lines.push('Maximum Score = 100');
    lines.push('');
    lines.push('Classification:');
    lines.push('  - aligned:        100% (perfect match)');
    lines.push('  - likely-aligned: 85-99% (minor differences, e.g., code blocks)');
    lines.push('  - needs-review:   55-84% (structural differences need attention)');
    lines.push('  - diverged:       <55% OR section ratio <50%');
    lines.push('```');
    lines.push('');

    // Config Files
    if (report.configAnalysis.length > 0) {
      lines.push('### Config Files');
      lines.push('');
      lines.push('| File | Status | Issues |');
      lines.push('|------|--------|--------|');
      
      for (const config of report.configAnalysis) {
        const statusIcon = this.getConfigStatusIcon(config.status);
        const issues = config.issues.length > 0 ? config.issues.join('; ') : '-';
        lines.push(`| \`${config.file}\` | ${statusIcon} ${config.status} | ${issues} |`);
      }
      lines.push('');
    }

    // Aligned Files
    const aligned = report.markdownAnalysis.filter(a => 
      a.status === 'aligned' || a.status === 'likely-aligned'
    );
    
    if (aligned.length > 0) {
      lines.push('## Aligned Files (Ready for Sync)');
      lines.push('');
      lines.push('| File | Sections | Subsections | Code Blocks | Math Blocks | Structure | Heading Map |');
      lines.push('|------|----------|-------------|-------------|-------------|-----------|-------------|');
      
      for (const file of aligned) {
        const sections = file.source && file.target 
          ? `${file.target.sections}/${file.source.sections}`
          : '-';
        const subsections = file.source && file.target
          ? `${file.target.subsections}/${file.source.subsections}`
          : '-';
        const codeBlocks = file.source && file.target
          ? `${file.target.codeBlocks}/${file.source.codeBlocks}`
          : '-';
        const mathBlocks = file.source && file.target
          ? `${file.target.mathBlocks}/${file.source.mathBlocks}`
          : '-';
        const score = file.comparison?.structureScore ?? 0;
        const hasMap = file.target?.hasHeadingMap ? '✅' : '❌';
        const statusIcon = file.status === 'aligned' ? '✅' : '🟡';
        
        lines.push(`| ${statusIcon} \`${file.file}\` | ${sections} | ${subsections} | ${codeBlocks} | ${mathBlocks} | ${score}% | ${hasMap} |`);
      }
      lines.push('');
    }

    // Files Needing Review
    const needsReview = report.markdownAnalysis.filter(a => a.status === 'needs-review');
    
    if (needsReview.length > 0) {
      lines.push('## Files Needing Review');
      lines.push('');
      lines.push('| File | Issue | Structure Score |');
      lines.push('|------|-------|-----------------|');
      
      for (const file of needsReview) {
        const issue = file.issues[0] || 'Structure mismatch';
        const score = file.comparison?.structureScore ?? 0;
        lines.push(`| ⚠️ \`${file.file}\` | ${issue} | ${score}% |`);
      }
      lines.push('');
    }

    // Diverged Files
    const diverged = report.markdownAnalysis.filter(a => a.status === 'diverged');
    
    if (diverged.length > 0) {
      lines.push('## Diverged Files');
      lines.push('');
      lines.push('| File | Source Sections | Target Sections | Issues |');
      lines.push('|------|-----------------|-----------------|--------|');
      
      for (const file of diverged) {
        const sourceSections = file.source?.sections ?? 0;
        const targetSections = file.target?.sections ?? 0;
        const issues = file.issues.join('; ');
        lines.push(`| ❌ \`${file.file}\` | ${sourceSections} | ${targetSections} | ${issues} |`);
      }
      lines.push('');
    }

    // Missing Files
    const missing = report.markdownAnalysis.filter(a => a.status === 'missing');
    
    if (missing.length > 0) {
      lines.push('## Missing Files (In Source Only)');
      lines.push('');
      lines.push('| File | Source Sections | Action |');
      lines.push('|------|-----------------|--------|');
      
      for (const file of missing) {
        const sections = file.source?.sections ?? 0;
        lines.push(`| 📄 \`${file.file}\` | ${sections} | Translate |`);
      }
      lines.push('');
    }

    // Extra Files
    const extra = report.markdownAnalysis.filter(a => a.status === 'extra');
    
    if (extra.length > 0) {
      lines.push('## Extra Files (In Target Only)');
      lines.push('');
      lines.push('| File | Target Sections | Notes |');
      lines.push('|------|-----------------|-------|');
      
      for (const file of extra) {
        const sections = file.target?.sections ?? 0;
        lines.push(`| ➕ \`${file.file}\` | ${sections} | May be localization content |`);
      }
      lines.push('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');
      lines.push('| File | Status | Action | Details |');
      lines.push('|------|--------|--------|---------|');
      
      for (const rec of report.recommendations) {
        const statusIcon = this.getStatusIcon(rec.status);
        const action = this.formatAction(rec.action);
        lines.push(`| \`${rec.file}\` | ${statusIcon} | ${action} | ${rec.details} |`);
      }
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('*Generated by tool-alignment*');

    return lines.join('\n');
  }

  /**
   * Generate JSON report
   */
  toJSON(report: DiagnosticReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Write report to file(s)
   */
  writeReport(
    report: DiagnosticReport,
    outputPath: string,
    format: 'markdown' | 'json' | 'both'
  ): string[] {
    const written: string[] = [];
    const dir = path.dirname(outputPath);
    const baseName = path.basename(outputPath).replace(/\.(md|json)$/, '');

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (format === 'markdown' || format === 'both') {
      const mdPath = path.join(dir, `${baseName}-structure.md`);
      fs.writeFileSync(mdPath, this.toMarkdown(report));
      written.push(mdPath);
    }

    if (format === 'json' || format === 'both') {
      const jsonPath = path.join(dir, `${baseName}.json`);
      fs.writeFileSync(jsonPath, this.toJSON(report));
      written.push(jsonPath);
    }

    return written;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateRecommendations(
    markdownAnalysis: MarkdownAnalysis[],
    configAnalysis: ConfigAnalysis[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Markdown file recommendations
    for (const analysis of markdownAnalysis) {
      const rec = this.getMarkdownRecommendation(analysis);
      if (rec) {
        recommendations.push(rec);
      }
    }

    // Config file recommendations
    for (const analysis of configAnalysis) {
      const rec = this.getConfigRecommendation(analysis);
      if (rec) {
        recommendations.push(rec);
      }
    }

    return recommendations;
  }

  private getMarkdownRecommendation(analysis: MarkdownAnalysis): Recommendation | null {
    switch (analysis.status) {
      case 'aligned':
        if (!analysis.target?.hasHeadingMap) {
          return {
            file: analysis.file,
            status: analysis.status,
            action: 'generate-heading-map',
            details: 'Structure aligned; generate heading-map to enable sync',
          };
        }
        return {
          file: analysis.file,
          status: analysis.status,
          action: 'ready-for-sync',
          details: 'Ready for automated sync',
        };

      case 'likely-aligned':
        return {
          file: analysis.file,
          status: analysis.status,
          action: 'generate-heading-map',
          details: `Structure score ${analysis.comparison?.structureScore}%; review and generate heading-map`,
        };

      case 'needs-review':
        return {
          file: analysis.file,
          status: analysis.status,
          action: 'review-structure',
          details: analysis.issues.join('; '),
        };

      case 'diverged':
        return {
          file: analysis.file,
          status: analysis.status,
          action: 'manual-merge',
          details: `Major structure mismatch: ${analysis.issues.join('; ')}`,
        };

      case 'missing':
        return {
          file: analysis.file,
          status: analysis.status,
          action: 'translate-file',
          details: `File needs to be translated (${analysis.source?.sections} sections)`,
        };

      case 'extra':
        // Extra files might be intentional localization, no action needed
        return null;
    }
  }

  private getConfigRecommendation(analysis: ConfigAnalysis): Recommendation | null {
    switch (analysis.status) {
      case 'identical':
        return null; // No action needed

      case 'structure-match':
        return {
          file: analysis.file,
          status: analysis.status,
          action: 'review-config',
          details: 'Structure matches but content differs; verify translations',
        };

      case 'diverged':
        return {
          file: analysis.file,
          status: analysis.status,
          action: 'update-config',
          details: analysis.issues.join('; '),
        };

      case 'missing':
        return {
          file: analysis.file,
          status: analysis.status,
          action: 'update-config',
          details: 'Config file missing in target; copy and translate if needed',
        };

      case 'extra':
        return null; // Extra config might be intentional
    }
  }

  private getStatusIcon(status: AlignmentStatus | ConfigStatus): string {
    const icons: Record<string, string> = {
      'aligned': '✅',
      'likely-aligned': '🟡',
      'needs-review': '⚠️',
      'diverged': '❌',
      'missing': '📄',
      'extra': '➕',
      'identical': '✅',
      'structure-match': '🟡',
    };
    return icons[status] || '❓';
  }

  private getConfigStatusIcon(status: ConfigStatus): string {
    return this.getStatusIcon(status);
  }

  private formatAction(action: RecommendedAction): string {
    const labels: Record<RecommendedAction, string> = {
      'ready-for-sync': '✅ Ready',
      'generate-heading-map': '🗺️ Generate Heading Map',
      'review-structure': '👀 Review Structure',
      'manual-merge': '🔧 Manual Merge',
      'translate-file': '🌐 Translate',
      'review-config': '⚙️ Review Config',
      'update-config': '📝 Update Config',
    };
    return labels[action] || action;
  }
}
