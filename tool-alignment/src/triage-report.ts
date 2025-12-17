/**
 * Triage Report Generator for Phase 3: File-Centric Diagnostics
 * 
 * Generates the _triage.md summary report and individual file reports.
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  TriageResult, 
  FileDiagnostic, 
  FileAction,
  Priority 
} from './types';
import { getActionIcon, getPriorityIcon } from './file-analyzer';

export class TriageReportGenerator {
  /**
   * Generate triage report and save to output directory
   */
  generateAndSave(
    result: TriageResult,
    outputDir: string,
    generateAllFileReports: boolean = false
  ): { triageReport: string; fileReports: string[] } {
    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Generate and save triage report
    const triageReport = this.generateTriageReport(result);
    const triagePath = path.join(outputDir, '_triage.md');
    fs.writeFileSync(triagePath, triageReport);

    // Generate file reports
    const fileReports: string[] = [];
    const filesToReport = generateAllFileReports 
      ? result.files 
      : result.filesNeedingAttention;

    for (const file of filesToReport) {
      const fileReport = this.generateFileReport(file, result.metadata);
      const filePath = path.join(outputDir, file.file);
      
      // Ensure subdirectories exist
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, fileReport);
      fileReports.push(filePath);
    }

    return { triageReport: triagePath, fileReports };
  }

  /**
   * Generate the main triage summary report
   */
  generateTriageReport(result: TriageResult): string {
    const lines: string[] = [];
    const { metadata, summary, filesNeedingAttention, files } = result;

    // Header
    lines.push(`# 📊 Triage Report: ${metadata.sourceRepo}`);
    lines.push('');
    lines.push(`**Source**: \`${metadata.sourcePath}\``);
    lines.push(`**Target**: \`${metadata.targetPath}\``);
    lines.push(`**Docs Folder**: \`${metadata.docsFolder || '.'}\``);
    lines.push(`**Generated**: ${new Date(metadata.generatedAt).toLocaleString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Files | ${summary.totalFiles} |`);
    lines.push(`| ✅ OK | ${summary.ok} |`);
    lines.push(`| ⚠️ Needs Attention | ${summary.needsAttention} |`);
    lines.push('');

    // Breakdown by action
    lines.push('### Action Breakdown');
    lines.push('');
    lines.push(`| Action | Count | Description |`);
    lines.push(`|--------|-------|-------------|`);
    
    const actionDescriptions: Record<FileAction, string> = {
      'ok': 'Ready for sync',
      'resync': 'Can auto-sync',
      'review-code': 'Verify code changes',
      'review-quality': 'Review quality issues',
      'retranslate': 'Full retranslation needed',
      'create': 'New translation needed',
      'diverged': 'Manual alignment needed',
    };

    for (const [action, count] of Object.entries(summary.byAction)) {
      if (count > 0) {
        const icon = getActionIcon(action as FileAction);
        const desc = actionDescriptions[action as FileAction];
        lines.push(`| ${icon} ${action} | ${count} | ${desc} |`);
      }
    }
    lines.push('');

    // Priority Action List
    if (filesNeedingAttention.length > 0) {
      lines.push('## Priority Action List');
      lines.push('');
      lines.push('Files requiring attention, sorted by priority:');
      lines.push('');
      lines.push(`| Priority | File | Action | Reason |`);
      lines.push(`|----------|------|--------|--------|`);

      let rank = 1;
      for (const file of filesNeedingAttention) {
        const priorityIcon = getPriorityIcon(file.priority);
        const actionIcon = getActionIcon(file.action);
        lines.push(`| ${priorityIcon} ${rank} | \`${file.file}\` | ${actionIcon} ${file.action} | ${file.reason} |`);
        rank++;
      }
      lines.push('');
    }

    // Quick Stats
    lines.push('## Quick Stats');
    lines.push('');
    
    const okPercent = summary.totalFiles > 0 
      ? Math.round((summary.ok / summary.totalFiles) * 100) 
      : 0;
    
    lines.push(`- **Sync Ready**: ${okPercent}% of files (${summary.ok}/${summary.totalFiles})`);
    
    if (summary.byAction['create'] > 0) {
      lines.push(`- **Missing Translations**: ${summary.byAction['create']} files need translation`);
    }
    if (summary.byAction['diverged'] > 0) {
      lines.push(`- **Diverged Files**: ${summary.byAction['diverged']} files need manual alignment`);
    }
    if (summary.byAction['review-code'] > 0) {
      lines.push(`- **Code Review**: ${summary.byAction['review-code']} files have code modifications`);
    }
    lines.push('');

    // Next Steps
    lines.push('## Next Steps');
    lines.push('');
    
    if (filesNeedingAttention.length === 0) {
      lines.push('🎉 All files are aligned and ready for sync!');
    } else {
      lines.push('Work through the Priority Action List from top to bottom:');
      lines.push('');
      
      // Group suggestions by action type
      const critical = filesNeedingAttention.filter(f => f.priority === 'critical');
      const high = filesNeedingAttention.filter(f => f.priority === 'high');
      
      if (critical.length > 0) {
        lines.push(`1. **Critical** (${critical.length} files): Address missing files and major divergence first`);
      }
      if (high.length > 0) {
        lines.push(`2. **High** (${high.length} files): Fix structural mismatches`);
      }
      
      lines.push('');
      lines.push('For detailed analysis of any file:');
      lines.push('```bash');
      lines.push(`npm run diagnose -- file <filename> --source ${metadata.sourcePath} --target ${metadata.targetPath}`);
      lines.push('```');
    }
    lines.push('');

    // File list (collapsed)
    lines.push('<details>');
    lines.push('<summary>All Files (click to expand)</summary>');
    lines.push('');
    lines.push(`| File | Action | Priority | Reason |`);
    lines.push(`|------|--------|----------|--------|`);
    
    for (const file of files) {
      const actionIcon = getActionIcon(file.action);
      const priorityIcon = getPriorityIcon(file.priority);
      lines.push(`| \`${file.file}\` | ${actionIcon} ${file.action} | ${priorityIcon} | ${file.reason} |`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate a detailed report for a single file
   */
  generateFileReport(
    diagnostic: FileDiagnostic,
    metadata: TriageResult['metadata']
  ): string {
    const lines: string[] = [];
    const { file, structure, code, action, priority, reason } = diagnostic;

    // Header
    lines.push(`# 📄 File Diagnostic: ${file}`);
    lines.push('');

    // Quick Summary
    lines.push('## Quick Summary');
    lines.push('');
    lines.push(`| Dimension | Status | Score | Details |`);
    lines.push(`|-----------|--------|-------|---------|`);

    // Structure row
    if (structure) {
      const structureIcon = structure.score >= 100 ? '✅' : structure.score >= 80 ? '🟡' : '⚠️';
      const structureDetails = `${structure.sourceSections}→${structure.targetSections} sections`;
      lines.push(`| Structure | ${structureIcon} | ${structure.score}% | ${structureDetails} |`);
    } else {
      lines.push(`| Structure | - | - | Not analyzed |`);
    }

    // Code row
    if (code) {
      const codeIcon = code.score >= 90 ? '✅' : code.score >= 80 ? '🟡' : '⚠️';
      const codeDetails = code.hasLocalizationChanges 
        ? `${code.modifiedBlocks} modified (i18n)`
        : `${code.modifiedBlocks} modified`;
      lines.push(`| Code | ${codeIcon} | ${code.score}% | ${codeDetails} |`);
    } else {
      lines.push(`| Code | - | - | No code blocks |`);
    }

    lines.push('');

    // Recommendation
    const actionIcon = getActionIcon(action);
    const priorityIcon = getPriorityIcon(priority);
    lines.push(`## 🎯 Recommended Action: ${actionIcon} ${action.toUpperCase()}`);
    lines.push('');
    lines.push(`**Priority**: ${priorityIcon} ${priority}`);
    lines.push('');
    lines.push(`**Reason**: ${reason}`);
    lines.push('');

    // Detailed Analysis
    lines.push('---');
    lines.push('');
    lines.push('## Detailed Analysis');
    lines.push('');

    // Structure details
    if (structure) {
      lines.push('### Structure');
      lines.push('');
      lines.push(`- **Score**: ${structure.score}%`);
      lines.push(`- **Sections**: ${structure.sourceSections} (source) → ${structure.targetSections} (target) ${structure.sectionMatch ? '✅' : '❌'}`);
      lines.push(`- **Subsections**: ${structure.sourceSubsections} (source) → ${structure.targetSubsections} (target) ${structure.subsectionMatch ? '✅' : '❌'}`);
      lines.push(`- **Heading Map**: ${structure.hasHeadingMap ? '✅ Present' : '❌ Missing'}`);
      
      if (structure.issues.length > 0) {
        lines.push('');
        lines.push('**Issues**:');
        for (const issue of structure.issues) {
          lines.push(`- ${issue}`);
        }
      }
      lines.push('');
    }

    // Code details
    if (code) {
      lines.push('### Code Integrity');
      lines.push('');
      lines.push(`- **Score**: ${code.score}%`);
      lines.push(`- **Blocks**: ${code.sourceBlocks} (source) → ${code.targetBlocks} (target)`);
      lines.push(`- **Matched**: ${code.matchedBlocks}`);
      lines.push(`- **Modified**: ${code.modifiedBlocks}`);
      lines.push(`- **Missing**: ${code.missingBlocks}`);
      lines.push(`- **Extra**: ${code.extraBlocks}`);
      
      if (code.hasLocalizationChanges) {
        lines.push('');
        lines.push('📍 **Note**: Localization patterns detected (e.g., CJK font configuration)');
      }
      
      if (code.issues.length > 0) {
        lines.push('');
        lines.push('**Issues**:');
        for (const issue of code.issues) {
          lines.push(`- ${issue}`);
        }
      }
      lines.push('');
    }

    // Metadata
    lines.push('---');
    lines.push('');
    lines.push(`*Generated from ${metadata.sourceRepo} triage on ${new Date(metadata.generatedAt).toLocaleString()}*`);
    lines.push('');

    return lines.join('\n');
  }
}
