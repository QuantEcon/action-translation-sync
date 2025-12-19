#!/usr/bin/env node
/**
 * tool-onboarding: Translation alignment analysis tool
 * 
 * Compares SOURCE and TARGET repositories to identify alignment status
 * and generate actionable reports for bringing them into sync.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import Anthropic from '@anthropic-ai/sdk';

// Types
import { OnboardOptions, FileResult, Thresholds } from './types';

// Constants
import { DEFAULT_THRESHOLDS, getLanguageName } from './constants';

// Discovery
import { 
  discoverFiles, 
  getGitLastModified, 
  getUpdateDirection,
  readFileContent,
  getFilePath 
} from './discovery';

// Extraction
import { extractCodeBlocks, extractSectionPositions } from './extraction';

// Analysis
import { 
  compareCodeBlocks, 
  analyzeProseWithClaude, 
  parseProseAnalysis,
  analyzeConfigFiles 
} from './analysis';

// Decisions
import { codeAnalysisToDecisions, buildFileDecisions } from './decision';

// Reports
import { 
  generateFileReport, 
  generateSummaryReport, 
  generateCodeAnalysisSection 
} from './report';

// =============================================================================
// MAIN ORCHESTRATION
// =============================================================================

async function runOnboard(options: OnboardOptions): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !options.codeOnly) {
    console.error(chalk.red('Error: ANTHROPIC_API_KEY required (or use --code-only)'));
    process.exit(1);
  }
  
  const client = apiKey ? new Anthropic({ apiKey }) : null;
  
  // Build thresholds
  const thresholds: Thresholds = {
    code: {
      aligned: options.codeAligned ?? DEFAULT_THRESHOLDS.code.aligned,
      review: options.codeReview ?? DEFAULT_THRESHOLDS.code.review,
    },
    prose: {
      aligned: options.proseAligned ?? DEFAULT_THRESHOLDS.prose.aligned,
      review: options.proseReview ?? DEFAULT_THRESHOLDS.prose.review,
    },
  };
  
  // Extract repo names from paths
  const sourceName = path.basename(options.source);
  const targetName = path.basename(options.target);
  const languageName = getLanguageName(options.language);
  
  console.log(chalk.bold.blue('\n🚀 Onboarding Analysis\n'));
  console.log(`Source: ${chalk.cyan(sourceName)}`);
  console.log(`Target: ${chalk.cyan(targetName)}`);
  console.log(`Docs: ${chalk.cyan(options.docsFolder)}`);
  console.log(`Language: ${chalk.cyan(languageName)} (${options.language})`);
  console.log(`Model: ${chalk.cyan(options.model)}`);
  console.log(`Thresholds: code=${thresholds.code.aligned}/${thresholds.code.review}, prose=${thresholds.prose.aligned}/${thresholds.prose.review}`);
  console.log('');
  
  // Discover files
  const discovery = discoverFiles(options.source, options.target, options.docsFolder);
  
  // Determine which files to process
  let filesToProcess: string[];
  if (options.file) {
    // Single file mode
    filesToProcess = [options.file];
  } else {
    // All paired files
    filesToProcess = discovery.paired;
    if (options.limit) {
      filesToProcess = filesToProcess.slice(0, options.limit);
    }
  }
  
  // Create output directory
  const outputDir = options.output || `./reports/${sourceName}↔${targetName}`;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create debug directory if debug mode
  const debugDir = options.debug ? path.join(outputDir, 'debug') : null;
  if (debugDir && !fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  if (options.debug) {
    console.log(chalk.yellow(`Debug mode: saving raw responses to ${debugDir}`));
  }
  
  // Process files
  const results: FileResult[] = [];
  
  for (const file of filesToProcess) {
    console.log(chalk.gray(`Processing: ${file}`));
    
    try {
      const result = await processFile(
        file,
        options.source,
        options.target,
        options.docsFolder,
        options.language,
        options.model,
        client,
        options.codeOnly ?? false,
        thresholds,
        debugDir
      );
      
      results.push(result);
      
      // Write per-file report
      if (result.decisions) {
        const fileReport = generateFileReport(result.decisions, sourceName, targetName);
        fs.writeFileSync(path.join(outputDir, `${file}`), fileReport);
      }
      
      // Status indicator
      const icon = result.status === 'aligned' ? '✅' :
                   result.status === 'review' ? '⚠️' :
                   result.status === 'translate' ? '📄' : '🎯';
      console.log(`  ${icon} ${result.status}`);
      
    } catch (error) {
      console.error(chalk.red(`  ❌ Error: ${error}`));
      results.push({
        file,
        status: 'error',
        error: String(error),
      });
    }
  }
  
  // Add source-only files
  for (const file of discovery.sourceOnly) {
    if (!options.file) {
      results.push({
        file,
        status: 'translate',
      });
    }
  }
  
  // Add target-only files
  for (const file of discovery.targetOnly) {
    if (!options.file) {
      results.push({
        file,
        status: 'suggest',
      });
    }
  }
  
  // Config analysis
  let configAnalysis;
  if (options.checkConfig) {
    configAnalysis = analyzeConfigFiles(options.source, options.target, options.docsFolder);
  }
  
  // Generate summary report
  const summaryReport = generateSummaryReport(results, sourceName, targetName, configAnalysis);
  fs.writeFileSync(path.join(outputDir, 'summary.md'), summaryReport);
  
  // Print summary
  console.log('');
  console.log(chalk.bold(`📄 Summary: ${path.join(outputDir, 'summary.md')}`));
  console.log(chalk.bold(`📁 Reports: ${outputDir}/`));
  console.log('');
  
  const aligned = results.filter(r => r.status === 'aligned').length;
  const review = results.filter(r => r.status === 'review').length;
  const translate = results.filter(r => r.status === 'translate').length;
  const suggest = results.filter(r => r.status === 'suggest').length;
  
  console.log(chalk.bold('📊 Summary:'));
  console.log(`  ✅ Aligned: ${aligned}`);
  console.log(`  📋 Review: ${review}`);
  console.log(`  📄 Translate: ${translate}`);
  console.log(`  🎯 Target-only: ${suggest}`);
  console.log('');
  
  // Action counts
  let totalSync = 0, totalBackport = 0, totalAccept = 0, totalManual = 0;
  for (const r of results) {
    if (r.decisions) {
      totalSync += r.decisions.counts.sync;
      totalBackport += r.decisions.counts.backport;
      totalAccept += r.decisions.counts.accept;
      totalManual += r.decisions.counts.manual;
    }
  }
  
  console.log(chalk.bold('🎯 Actions:'));
  console.log(`  SYNC: ${totalSync}`);
  console.log(`  BACKPORT: ${totalBackport}`);
  console.log(`  ACCEPT: ${totalAccept}`);
  console.log(`  MANUAL: ${totalManual}`);
}

// =============================================================================
// FILE PROCESSING
// =============================================================================

async function processFile(
  file: string,
  sourceRoot: string,
  targetRoot: string,
  docsFolder: string,
  language: string,
  model: string,
  client: Anthropic | null,
  codeOnly: boolean,
  thresholds: Thresholds,
  debugDir: string | null = null
): Promise<FileResult> {
  // Read files
  const sourcePath = getFilePath(sourceRoot, docsFolder, file);
  const targetPath = getFilePath(targetRoot, docsFolder, file);
  
  const sourceContent = readFileContent(sourcePath);
  const targetContent = readFileContent(targetPath);
  
  // Handle missing files
  if (!sourceContent && !targetContent) {
    return { file, status: 'error', error: 'Both files missing' };
  }
  if (!sourceContent) {
    return { file, status: 'suggest' }; // Only in target
  }
  if (!targetContent) {
    return { file, status: 'translate' }; // Only in source
  }
  
  // Get dates
  const sourceDate = getGitLastModified(sourceRoot, docsFolder, file);
  const targetDate = getGitLastModified(targetRoot, docsFolder, file);
  const direction = getUpdateDirection(sourceDate, targetDate);
  
  // Extract code blocks
  const sourceBlocks = extractCodeBlocks(sourceContent);
  const targetBlocks = extractCodeBlocks(targetContent);
  
  // Code analysis (deterministic)
  const codeAnalysis = compareCodeBlocks(sourceBlocks, targetBlocks);
  const codeDecisions = codeAnalysisToDecisions(codeAnalysis, sourceBlocks, targetBlocks, direction);
  
  // Prose analysis (AI-powered, unless --code-only)
  let proseDecisions: typeof codeDecisions = [];
  
  if (!codeOnly && client) {
    const sectionPositions = extractSectionPositions(sourceContent);
    const { analysis } = await analyzeProseWithClaude(
      client,
      sourceContent,
      targetContent,
      language,
      model
    );
    
    // Save raw Claude response if debug mode
    if (debugDir) {
      const debugFile = path.join(debugDir, `${file.replace('.md', '')}-prose.md`);
      const debugContent = `# Claude Prose Analysis: ${file}\n\n` +
        `Model: ${model}\n` +
        `Date: ${new Date().toISOString()}\n\n` +
        `---\n\n${analysis}`;
      fs.writeFileSync(debugFile, debugContent);
    }
    
    proseDecisions = parseProseAnalysis(analysis, sectionPositions);
  }
  
  // Build file decisions
  const fileDecisions = buildFileDecisions(
    file,
    codeDecisions,
    proseDecisions,
    sourceDate,
    targetDate,
    codeAnalysis.score,
    thresholds
  );
  
  return {
    file,
    status: fileDecisions.status,
    sourceDate,
    targetDate,
    codeScore: codeAnalysis.score,
    proseStatus: proseDecisions.length > 0 ? 'review' : 'aligned',
    decisions: fileDecisions,
  };
}

// =============================================================================
// CLI
// =============================================================================

const program = new Command();

program
  .name('tool-onboarding')
  .description('Analyze translation alignment between source and target repositories')
  .requiredOption('-s, --source <path>', 'Source repository path')
  .requiredOption('-t, --target <path>', 'Target repository path')
  .requiredOption('-d, --docs-folder <path>', 'Docs folder within repositories')
  .option('-l, --language <code>', 'Target language code', 'zh-cn')
  .option('-m, --model <model>', 'Claude model to use', 'claude-sonnet-4-5-20250929')
  .option('-o, --output <path>', 'Output directory for reports')
  .option('-f, --file <filename>', 'Analyze a single file')
  .option('--limit <n>', 'Limit number of files to analyze', parseInt)
  .option('--code-only', 'Skip prose analysis (no API calls)')
  .option('--check-config', 'Include config file analysis')
  .option('--code-aligned <n>', 'Code alignment threshold (default: 90)', parseInt)
  .option('--code-review <n>', 'Code review threshold (default: 70)', parseInt)
  .option('--prose-aligned <n>', 'Prose alignment threshold (default: 90)', parseInt)
  .option('--prose-review <n>', 'Prose review threshold (default: 70)', parseInt)
  .option('--debug', 'Save raw Claude responses for prompt evaluation')
  .action(runOnboard);

program.parse();
