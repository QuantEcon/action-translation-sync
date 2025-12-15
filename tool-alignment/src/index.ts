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
import chalk from 'chalk';
import { StructuralAnalyzer } from './structural-analyzer';
import { ReportGenerator } from './report-generator';
import { CodeReportGenerator } from './code-report-generator';
import { DiagnoseOptions, MarkdownAnalysis, ConfigAnalysis } from './types';

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

  // Get source path for file discovery
  const sourceDocsPath = docsFolder 
    ? path.join(sourceRoot, docsFolder)
    : sourceRoot;
  const targetDocsPath = docsFolder
    ? path.join(targetRoot, docsFolder)
    : targetRoot;

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

  // 6. Print summary
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
  .option('-r, --report <type>', 'Report type: all, structure, code', 'all')
  .option('--max-diff-lines <n>', 'Max lines to show in code diffs', '50')
  .action(async (options) => {
    try {
      await runDiagnose({
        source: options.source,
        target: options.target,
        output: options.output,
        format: options.format as 'markdown' | 'json' | 'both',
        docsFolder: options.docsFolder,
        report: options.report as 'all' | 'structure' | 'code',
        maxDiffLines: parseInt(options.maxDiffLines, 10),
      });
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
