#!/usr/bin/env node

/**
 * Alignment Diagnostic CLI
 * 
 * Analyzes alignment between source and target translation repositories.
 * 
 * Usage:
 *   npm run diagnose -- --source <path> --target <path> [options]
 */

import { Command } from 'commander';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';
import { StructuralAnalyzer } from './structural-analyzer';
import { ReportGenerator } from './report-generator';
import { CodeReportGenerator } from './code-report-generator';
import { QualityScorer, countSections, formatCostEstimate, MODELS, DEFAULT_MODEL } from './quality-scorer';
import { QualityReportGenerator } from './quality-report-generator';
import { Triage } from './triage';
import { TriageReportGenerator } from './triage-report';
import { FileAnalyzer, extractRepoName, getActionIcon, getPriorityIcon } from './file-analyzer';
import { DiagnoseOptions, MarkdownAnalysis, ConfigAnalysis, TriageOptions, FileOptions } from './types';

const VERSION = '0.1.0';

async function runDiagnose(options: DiagnoseOptions): Promise<void> {
  console.log(chalk.blue('\n🔍 Alignment Diagnostic Tool\n'));
  console.log(chalk.gray(`Source: ${options.source}`));
  console.log(chalk.gray(`Target: ${options.target}`));
  console.log(chalk.gray(`Docs Folder: ${options.docsFolder}`));
  console.log(chalk.gray(`Report: ${options.report}`));
  console.log('');

  const analyzer = new StructuralAnalyzer();
  const structureReportGenerator = new ReportGenerator();
  const codeReportGenerator = new CodeReportGenerator({
    maxDiffLines: options.maxDiffLines,
  });

  // Resolve paths
  const sourceRoot = path.resolve(options.source);
  const targetRoot = path.resolve(options.target);
  const docsFolder = options.docsFolder === '.' ? '' : options.docsFolder;

  // 1. Discover markdown files
  console.log(chalk.yellow('📁 Discovering files...'));
  
  const sourceFiles = analyzer.getMarkdownFiles(sourceRoot, options.docsFolder);
  const targetFiles = analyzer.getMarkdownFiles(targetRoot, options.docsFolder);
  
  // Combine unique files from both repos
  const allFiles = [...new Set([...sourceFiles, ...targetFiles])].sort();
  
  console.log(chalk.gray(`   Found ${sourceFiles.length} files in source`));
  console.log(chalk.gray(`   Found ${targetFiles.length} files in target`));
  console.log(chalk.gray(`   Total unique files: ${allFiles.length}`));

  // 2. Analyze markdown files
  console.log(chalk.yellow('\n📊 Analyzing markdown files...'));
  
  const markdownAnalysis: MarkdownAnalysis[] = [];
  let processed = 0;
  
  for (const file of allFiles) {
    const analysis = await analyzer.analyzeMarkdownFile(
      docsFolder ? path.join(sourceRoot, docsFolder) : sourceRoot,
      docsFolder ? path.join(targetRoot, docsFolder) : targetRoot,
      file
    );
    markdownAnalysis.push(analysis);
    
    processed++;
    const statusIcon = getStatusIcon(analysis.status);
    process.stdout.write(`\r   ${statusIcon} ${processed}/${allFiles.length} - ${file}`);
    // Clear rest of line
    process.stdout.write('\x1b[K');
  }
  console.log('');

  // 3. Analyze config files
  console.log(chalk.yellow('\n⚙️  Analyzing config files...'));
  
  const configFiles = analyzer.getConfigFiles(sourceRoot, targetRoot);
  const configAnalysis: ConfigAnalysis[] = [];
  
  for (const file of configFiles) {
    const analysis = await analyzer.analyzeConfigFile(sourceRoot, targetRoot, file);
    configAnalysis.push(analysis);
    
    const statusIcon = getConfigStatusIcon(analysis.status);
    console.log(chalk.gray(`   ${statusIcon} ${file}: ${analysis.status}`));
  }

  // 4. Generate report
  console.log(chalk.yellow('\n📝 Generating report...'));
  
  const report = structureReportGenerator.generateReport(
    sourceRoot,
    targetRoot,
    options.docsFolder,
    markdownAnalysis,
    configAnalysis
  );

  // 5. Write reports based on --report option
  const outputPath = path.resolve(options.output);
  const writtenFiles: string[] = [];

  if (options.report === 'all' || options.report === 'structure') {
    const files = structureReportGenerator.writeReport(report, outputPath, options.format);
    writtenFiles.push(...files);
  }

  if (options.report === 'all' || options.report === 'code') {
    const codeReportPath = codeReportGenerator.writeReport(report, outputPath);
    writtenFiles.push(codeReportPath);
  }
  
  for (const file of writtenFiles) {
    console.log(chalk.green(`   ✅ Written: ${file}`));
  }

  // 6. Run quality assessment if requested
  if (options.report === 'quality') {
    if (!options.apiKey) {
      console.error(chalk.red('\n❌ Error: Quality report requires --api-key option'));
      process.exit(1);
    }
    if (!options.targetLanguage) {
      console.error(chalk.red('\n❌ Error: Quality report requires --target-language option'));
      process.exit(1);
    }

    // Validate model
    const model = options.model || DEFAULT_MODEL;
    if (!MODELS[model]) {
      console.error(chalk.red(`\n❌ Error: Unknown model '${model}'. Valid models: ${Object.keys(MODELS).join(', ')}`));
      process.exit(1);
    }

    console.log(chalk.yellow('\n🔍 Quality Assessment\n'));
    console.log(chalk.gray(`   Model: ${MODELS[model].name} (${model})`));

    // Count sections to assess
    const sectionCount = countSections(markdownAnalysis);
    const eligibleFiles = markdownAnalysis.filter(
      a => a.status === 'aligned' || a.status === 'likely-aligned'
    ).length;

    console.log(chalk.gray(`   Eligible files: ${eligibleFiles}`));
    console.log(chalk.gray(`   Sections to assess: ${sectionCount}`));

    // Estimate cost
    const scorer = new QualityScorer({
      apiKey: options.apiKey,
      targetLanguage: options.targetLanguage,
      glossaryPath: options.glossaryPath,
      model,
    });
    const estimate = scorer.estimateCost(sectionCount);
    console.log(chalk.gray(`   ${formatCostEstimate(estimate)}`));

    // Confirm unless skipped
    if (!options.skipConfirmation) {
      const proceed = await confirmPrompt('\nProceed with quality assessment? [Y/n] ');
      if (!proceed) {
        console.log(chalk.yellow('\n   Quality assessment skipped.'));
        return;
      }
    }

    console.log(chalk.yellow('\n📊 Running quality assessment...'));

    // Progress callback
    const onProgress = (current: number, total: number, fileName: string) => {
      process.stdout.write(`\r   📄 ${current}/${total} - ${fileName}`);
      // Clear rest of line
      process.stdout.write('\x1b[K');
    };

    // Create scorer with progress callback
    const scorerWithProgress = new QualityScorer({
      apiKey: options.apiKey,
      targetLanguage: options.targetLanguage,
      glossaryPath: options.glossaryPath,
      model,
      onProgress,
    });

    // Run quality assessment
    const qualityAssessment = await scorerWithProgress.assessFiles(
      markdownAnalysis,
      sourceRoot,
      targetRoot,
      docsFolder
    );
    
    // Clear progress line and show completion
    process.stdout.write('\r');
    process.stdout.write('\x1b[K');

    // Generate quality report
    const qualityReportGenerator = new QualityReportGenerator({
      sourcePath: sourceRoot,
      targetPath: targetRoot,
      targetLanguage: options.targetLanguage,
    });
    const qualityReportPath = qualityReportGenerator.writeReport(qualityAssessment, outputPath);
    console.log(chalk.green(`   ✅ Written: ${qualityReportPath}`));

    // Print quality summary
    console.log(chalk.blue('\n📈 Quality Summary\n'));
    console.log(`   Overall Quality: ${getQualityEmoji(qualityAssessment.overallScore)} ${qualityAssessment.overallScore}%`);
    console.log(`   Sections Assessed: ${qualityAssessment.sectionCount}`);
    console.log(`   Sections Flagged: ${qualityAssessment.flaggedCount}`);
    console.log(`   Actual Cost: $${qualityAssessment.cost.totalUSD.toFixed(2)}`);
  }

  // 7. Print summary
  console.log(chalk.blue('\n📈 Summary\n'));
  
  const { summary } = report;
  const total = summary.markdownFiles;
  
  console.log(`   Total markdown files: ${total}`);
  console.log(`   ${chalk.green('✅ Aligned:')} ${summary.aligned} (${pct(summary.aligned, total)})`);
  console.log(`   ${chalk.yellow('🟡 Likely aligned:')} ${summary.likelyAligned} (${pct(summary.likelyAligned, total)})`);
  console.log(`   ${chalk.yellow('⚠️  Needs review:')} ${summary.needsReview} (${pct(summary.needsReview, total)})`);
  console.log(`   ${chalk.red('❌ Diverged:')} ${summary.diverged} (${pct(summary.diverged, total)})`);
  console.log(`   ${chalk.gray('📄 Missing:')} ${summary.missing} (${pct(summary.missing, total)})`);
  console.log(`   ${chalk.gray('➕ Extra:')} ${summary.extra} (${pct(summary.extra, total)})`);
  
  console.log(chalk.blue('\n✨ Done!\n'));
}

// ============================================================================
// TRIAGE COMMAND IMPLEMENTATION (Phase 3)
// ============================================================================

async function runTriage(options: TriageOptions): Promise<void> {
  console.log(chalk.blue('\n📊 Triage Tool\n'));

  // Resolve source path and extract repo name
  const sourcePath = path.resolve(options.source);
  const targetPath = path.resolve(options.target);
  const repoName = extractRepoName(sourcePath);

  // Compute output directory
  const outputDir = options.output 
    ? path.resolve(options.output)
    : path.resolve('./status', repoName);

  console.log(chalk.gray(`Source: ${sourcePath}`));
  console.log(chalk.gray(`Target: ${targetPath}`));
  console.log(chalk.gray(`Docs Folder: ${options.docsFolder || '.'}`));
  console.log(chalk.gray(`Output: ${outputDir}`));
  console.log(chalk.gray(`Generate all: ${options.all ? 'yes' : 'no (only files needing attention)'}`));
  console.log('');

  // Run triage
  console.log(chalk.yellow('📁 Analyzing files...'));
  
  const triage = new Triage();
  const result = await triage.triageRepository(options, (progress) => {
    process.stdout.write(`\r   ${progress.current}/${progress.total} - ${progress.file}`);
    process.stdout.write('\x1b[K');
  });

  // Clear progress line
  process.stdout.write('\r\x1b[K');
  console.log(chalk.green(`   ✅ Analyzed ${result.summary.totalFiles} files`));

  // Generate reports
  console.log(chalk.yellow('\n📝 Generating reports...'));
  
  const reportGenerator = new TriageReportGenerator();
  const { triageReport, fileReports } = reportGenerator.generateAndSave(
    result,
    outputDir,
    options.all
  );

  console.log(chalk.green(`   ✅ Triage report: ${triageReport}`));
  if (fileReports.length > 0) {
    console.log(chalk.green(`   ✅ File reports: ${fileReports.length} files`));
  }

  // Print summary
  console.log(chalk.blue('\n📈 Summary\n'));
  
  const { summary } = result;
  const okPercent = summary.totalFiles > 0 
    ? Math.round((summary.ok / summary.totalFiles) * 100) 
    : 0;

  console.log(`   Total files: ${summary.totalFiles}`);
  console.log(`   ${chalk.green('✅ OK:')} ${summary.ok} (${okPercent}%)`);
  console.log(`   ${chalk.yellow('⚠️  Needs attention:')} ${summary.needsAttention}`);

  // Show action breakdown
  if (summary.needsAttention > 0) {
    console.log('');
    console.log(chalk.gray('   Action breakdown:'));
    
    const actionLabels: Record<string, string> = {
      'create': '📄 Create (missing)',
      'diverged': '⚠️  Diverged',
      'review-code': '🔧 Review code',
      'review-quality': '📝 Review quality',
      'retranslate': '🔴 Retranslate',
      'resync': '🔄 Resync',
    };

    for (const [action, count] of Object.entries(summary.byAction)) {
      if (count > 0 && action !== 'ok') {
        const label = actionLabels[action] || action;
        console.log(`      ${label}: ${count}`);
      }
    }
  }

  // Next steps
  if (result.filesNeedingAttention.length > 0) {
    console.log(chalk.blue('\n🎯 Next Steps\n'));
    console.log(`   Review the triage report at: ${triageReport}`);
    console.log('');
    
    // Show top 3 priority files
    const top3 = result.filesNeedingAttention.slice(0, 3);
    console.log('   Top priority files:');
    for (let i = 0; i < top3.length; i++) {
      const f = top3[i];
      console.log(`   ${i + 1}. ${getPriorityIcon(f.priority)} ${f.file} → ${getActionIcon(f.action)} ${f.action}`);
    }
    if (result.filesNeedingAttention.length > 3) {
      console.log(`   ... and ${result.filesNeedingAttention.length - 3} more`);
    }
  } else {
    console.log(chalk.green('\n🎉 All files are aligned and ready for sync!\n'));
  }

  console.log(chalk.blue('\n✨ Done!\n'));
}

// ============================================================================
// FILE COMMAND IMPLEMENTATION (Phase 3)
// ============================================================================

async function runFileCommand(options: FileOptions): Promise<void> {
  console.log(chalk.blue('\n📄 File Diagnostic\n'));

  // Resolve paths
  const sourcePath = path.resolve(options.source);
  const targetPath = path.resolve(options.target);
  const repoName = extractRepoName(sourcePath);

  // Compute output directory
  const outputDir = options.output 
    ? path.resolve(options.output)
    : path.resolve('./status', repoName);

  console.log(chalk.gray(`File: ${options.file}`));
  console.log(chalk.gray(`Source: ${sourcePath}`));
  console.log(chalk.gray(`Target: ${targetPath}`));
  console.log('');

  // Analyze file
  const analyzer = new FileAnalyzer();
  const diagnostic = await analyzer.analyzeFile(
    sourcePath,
    targetPath,
    options.docsFolder,
    options.file
  );

  // Generate report
  const reportGenerator = new TriageReportGenerator();
  
  // Create minimal metadata for the file report
  const metadata = {
    sourceRepo: repoName,
    sourcePath,
    targetPath,
    docsFolder: options.docsFolder,
    generatedAt: new Date().toISOString(),
    version: '0.2.0',
  };

  const report = reportGenerator.generateFileReport(diagnostic, metadata);

  // Ensure output directory exists
  const fs = await import('fs');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, options.file);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, report);

  console.log(chalk.green(`   ✅ Report written: ${outputPath}`));

  // Print quick summary to console
  console.log(chalk.blue('\n📈 Quick Summary\n'));

  // Structure
  if (diagnostic.structure) {
    const structIcon = diagnostic.structure.score >= 100 ? '✅' : diagnostic.structure.score >= 80 ? '🟡' : '⚠️';
    console.log(`   Structure: ${structIcon} ${diagnostic.structure.score}%`);
  }

  // Code
  if (diagnostic.code) {
    const codeIcon = diagnostic.code.score >= 90 ? '✅' : diagnostic.code.score >= 80 ? '🟡' : '⚠️';
    const i18nNote = diagnostic.code.hasLocalizationChanges ? ' (i18n detected)' : '';
    console.log(`   Code: ${codeIcon} ${diagnostic.code.score}%${i18nNote}`);
  }

  // Recommendation
  console.log('');
  console.log(`   ${getActionIcon(diagnostic.action)} Recommended Action: ${chalk.bold(diagnostic.action.toUpperCase())}`);
  console.log(`   ${getPriorityIcon(diagnostic.priority)} Priority: ${diagnostic.priority}`);
  console.log(chalk.gray(`   Reason: ${diagnostic.reason}`));

  console.log(chalk.blue('\n✨ Done!\n'));
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    'aligned': '✅',
    'likely-aligned': '🟡',
    'needs-review': '⚠️',
    'diverged': '❌',
    'missing': '📄',
    'extra': '➕',
  };
  return icons[status] || '❓';
}

function getConfigStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    'identical': '✅',
    'structure-match': '🟡',
    'diverged': '❌',
    'missing': '📄',
    'extra': '➕',
  };
  return icons[status] || '❓';
}

function pct(n: number, total: number): string {
  return total > 0 ? `${Math.round(n / total * 100)}%` : '0%';
}

function getQualityEmoji(score: number): string {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

/**
 * Prompt user for confirmation
 */
function confirmPrompt(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
}

// ============================================================================
// CLI SETUP
// ============================================================================

const program = new Command();

program
  .name('tool-alignment')
  .description('Alignment diagnostic tool for translation repositories')
  .version(VERSION);

program
  .command('diagnose')
  .description('Analyze alignment between source and target repositories')
  .requiredOption('-s, --source <path>', 'Path to source repository')
  .requiredOption('-t, --target <path>', 'Path to target repository')
  .option('-o, --output <path>', 'Output file path (base name)', './reports/diagnostic-report')
  .option('-f, --format <format>', 'Output format: markdown, json, both', 'markdown')
  .option('-d, --docs-folder <folder>', 'Subdirectory containing docs', '.')
  .option('-r, --report <type>', 'Report type: all, structure, code, quality', 'all')
  .option('--max-diff-lines <n>', 'Max lines to show in code diffs', '50')
  .option('--api-key <key>', 'Anthropic API key (required for quality report)')
  .option('--target-language <lang>', 'Target language code, e.g. zh-cn (required for quality report)')
  .option('--glossary <path>', 'Path to glossary JSON file')
  .option('--model <model>', `Model for quality assessment: ${Object.keys(MODELS).join(', ')}`, DEFAULT_MODEL)
  .option('-y, --yes', 'Skip cost confirmation for quality assessment')
  .action(async (options) => {
    try {
      await runDiagnose({
        source: options.source,
        target: options.target,
        output: options.output,
        format: options.format as 'markdown' | 'json' | 'both',
        docsFolder: options.docsFolder,
        report: options.report as 'all' | 'structure' | 'code' | 'quality',
        maxDiffLines: parseInt(options.maxDiffLines, 10),
        apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY,
        targetLanguage: options.targetLanguage,
        glossaryPath: options.glossary,
        skipConfirmation: options.yes,
        model: options.model,
      });
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================================================
// TRIAGE COMMAND (Phase 3)
// ============================================================================

program
  .command('triage')
  .description('Triage all files in a repository - generate prioritized action list')
  .requiredOption('-s, --source <path>', 'Path to source repository')
  .requiredOption('-t, --target <path>', 'Path to target repository')
  .option('-d, --docs-folder <folder>', 'Subdirectory containing docs', '.')
  .option('-o, --output <path>', 'Output directory (default: ./status/<repo-name>)')
  .option('-a, --all', 'Generate reports for ALL files (not just those needing attention)')
  .action(async (options) => {
    try {
      await runTriage({
        source: options.source,
        target: options.target,
        docsFolder: options.docsFolder,
        output: options.output || '',  // Will be computed from source if empty
        all: options.all || false,
      });
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================================================
// FILE COMMAND (Phase 3)
// ============================================================================

program
  .command('file <filename>')
  .description('Diagnose a single file in detail')
  .requiredOption('-s, --source <path>', 'Path to source repository')
  .requiredOption('-t, --target <path>', 'Path to target repository')
  .option('-d, --docs-folder <folder>', 'Subdirectory containing docs', '.')
  .option('-o, --output <path>', 'Output directory (default: ./status/<repo-name>)')
  .action(async (filename, options) => {
    try {
      await runFileCommand({
        file: filename,
        source: options.source,
        target: options.target,
        docsFolder: options.docsFolder,
        output: options.output || '',  // Will be computed from source if empty
      });
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
