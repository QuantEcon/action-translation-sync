#!/usr/bin/env node
/**
 * Translation Quality Evaluation Tool
 * 
 * Evaluates translation PRs from tool-test-action-on-github using Claude Opus 4.5:
 * 1. Translation quality (accuracy, fluency, terminology, formatting)
 * 2. Diff quality (scope, position, structure, heading-map)
 * 
 * Hardcoded to QuantEcon test repositories:
 * - Source: QuantEcon/test-translation-sync
 * - Target: QuantEcon/test-translation-sync.zh-cn
 * 
 * Usage:
 *   npm run evaluate                     # Evaluate all open PR pairs
 *   npm run evaluate -- --pr 123         # Evaluate specific source PR
 *   npm run evaluate -- --dry-run        # Preview without posting reviews
 *   npm run evaluate -- --output report.md # Save report to file
 */

import { program } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { GitHubService } from './github.js';
import { TranslationEvaluator } from './evaluator.js';
import type { 
  EvaluationOptions, 
  EvaluationResult, 
  EvaluationReport,
  PRPair 
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Evaluation model - always use Opus 4.5 for quality assessment
const EVALUATOR_MODEL = 'claude-opus-4-5-20251101';

async function evaluatePRPair(
  pair: PRPair,
  github: GitHubService,
  evaluator: TranslationEvaluator,
  options: EvaluationOptions
): Promise<EvaluationResult> {
  console.log(chalk.blue(`\nEvaluating: ${pair.testScenario}`));
  console.log(chalk.gray(`  Source PR #${pair.sourceNumber} → Target PR #${pair.targetNumber}`));

  // Get source diff (English before/after)
  const sourceDiff = await github.getSourceDiff(pair.sourceNumber);
  
  // Get target diff (Chinese before/after)
  const targetDiff = await github.getTargetDiff(pair.targetNumber);

  // Find changed sections from source files
  const changedSections: string[] = [];
  for (const file of sourceDiff.files) {
    if (file.filename.endsWith('.md') && file.patch) {
      // Extract section headings from patch
      const headingMatches = file.patch.match(/^\+##+ .+$/gm);
      if (headingMatches) {
        changedSections.push(...headingMatches.map(h => h.replace(/^\+/, '').trim()));
      }
    }
  }

  // Get primary file content for evaluation
  const primaryFile = sourceDiff.files.find(f => f.filename.endsWith('.md'));
  const sourceFile = primaryFile?.filename || 'lecture-minimal.md';

  const sourceAfter = sourceDiff.afterContent.get(sourceFile) || '';
  const targetAfter = targetDiff.afterContent.get(sourceFile) || '';
  const sourceBefore = sourceDiff.beforeContent.get(sourceFile) || '';
  const targetBefore = targetDiff.beforeContent.get(sourceFile) || '';

  // Evaluate translation quality
  console.log(chalk.gray('  Evaluating translation quality...'));
  const translationResult = await evaluator.evaluateTranslation(
    sourceAfter,
    targetAfter,
    changedSections
  );

  // Evaluate diff quality
  console.log(chalk.gray('  Evaluating diff quality...'));
  const diffResult = await evaluator.evaluateDiff(
    sourceBefore,
    sourceAfter,
    targetBefore,
    targetAfter,
    sourceDiff.files,
    targetDiff.files
  );

  // Determine overall verdict
  const overallScore = (translationResult.score + diffResult.score) / 2;
  let verdict: 'PASS' | 'WARN' | 'FAIL';
  if (overallScore >= 8 && diffResult.score >= 8) {
    verdict = 'PASS';
  } else if (overallScore >= 6 && diffResult.score >= 6) {
    verdict = 'WARN';
  } else {
    verdict = 'FAIL';
  }

  // Generate review comment
  const reviewComment = evaluator.generateReviewComment(
    translationResult,
    diffResult,
    verdict
  );

  // Post review if enabled
  // Always use COMMENT to avoid "can't approve own PR" errors
  // The verdict (PASS/WARN/FAIL) is included in the comment body
  if (options.postReviews && !options.dryRun) {
    console.log(chalk.gray('  Posting review to PR...'));
    await github.postReview(pair.targetNumber, reviewComment, 'COMMENT');
  }

  const result: EvaluationResult = {
    prPair: pair,
    timestamp: new Date().toISOString(),
    translationQuality: translationResult,
    diffQuality: diffResult,
    overallScore: Math.round(overallScore * 10) / 10,
    overallVerdict: verdict,
    reviewComment,
  };

  // Print summary
  const verdictColor = verdict === 'PASS' ? chalk.green : 
                       verdict === 'WARN' ? chalk.yellow : chalk.red;
  console.log(verdictColor(`  ${verdict}: Translation ${translationResult.score}/10, Diff ${diffResult.score}/10`));

  return result;
}

function generateReport(
  results: EvaluationResult[],
  repoInfo: { sourceRepo: string; targetRepo: string }
): EvaluationReport {
  const passed = results.filter(r => r.overallVerdict === 'PASS').length;
  const warned = results.filter(r => r.overallVerdict === 'WARN').length;
  const failed = results.filter(r => r.overallVerdict === 'FAIL').length;

  const avgTranslation = results.length > 0 
    ? results.reduce((sum, r) => sum + r.translationQuality.score, 0) / results.length
    : 0;
  const avgDiff = results.length > 0
    ? results.reduce((sum, r) => sum + r.diffQuality.score, 0) / results.length
    : 0;

  // Collect common issues
  const allIssues = results.flatMap(r => [
    ...r.translationQuality.issues,
    ...r.diffQuality.issues,
  ]);
  const issueCounts = new Map<string, number>();
  for (const issue of allIssues) {
    issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
  }
  const commonIssues = [...issueCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue]) => issue);

  return {
    generatedAt: new Date().toISOString(),
    evaluator: EVALUATOR_MODEL,
    sourceRepo: repoInfo.sourceRepo,
    targetRepo: repoInfo.targetRepo,
    prPairsEvaluated: results.length,
    results,
    summary: {
      passed,
      warned,
      failed,
      averageTranslationScore: Math.round(avgTranslation * 10) / 10,
      averageDiffScore: Math.round(avgDiff * 10) / 10,
      commonIssues,
    },
  };
}

function formatReportMarkdown(report: EvaluationReport): string {
  let md = `# Translation Evaluation Report

**Generated**: ${report.generatedAt}
**Evaluator**: ${report.evaluator}
**Source Repository**: ${report.sourceRepo}
**Target Repository**: ${report.targetRepo}

---

## Summary

| Metric | Value |
|--------|-------|
| PR Pairs Evaluated | ${report.prPairsEvaluated} |
| Passed ✅ | ${report.summary.passed} |
| Warnings ⚠️ | ${report.summary.warned} |
| Failed ❌ | ${report.summary.failed} |
| Avg Translation Score | ${report.summary.averageTranslationScore}/10 |
| Avg Diff Score | ${report.summary.averageDiffScore}/10 |

`;

  if (report.summary.commonIssues.length > 0) {
    md += `### Common Issues
${report.summary.commonIssues.map(i => `- ${i}`).join('\n')}

`;
  }

  md += `---

## Per-PR Results

`;

  for (const result of report.results) {
    const emoji = result.overallVerdict === 'PASS' ? '✅' : 
                  result.overallVerdict === 'WARN' ? '⚠️' : '❌';
    
    md += `### ${emoji} ${result.prPair.testScenario}

- **Source PR**: [#${result.prPair.sourceNumber}](${result.prPair.sourceUrl})
- **Target PR**: [#${result.prPair.targetNumber}](${result.prPair.targetUrl})
- **Translation Score**: ${result.translationQuality.score}/10
- **Diff Score**: ${result.diffQuality.score}/10
- **Verdict**: ${result.overallVerdict}

**Translation Summary**: ${result.translationQuality.summary}

**Diff Summary**: ${result.diffQuality.summary}

`;
  }

  return md;
}

async function main() {
  program
    .name('evaluate')
    .description('Evaluate translation PR quality using Claude Opus 4.5')
    .option('--pr <number>', 'Specific source PR number to evaluate')
    .option('--post-reviews', 'Post review comments to target PRs', false)
    .option('--output <file>', 'Output report to file (default: reports/evaluation-<date>.md)')
    .option('--dry-run', 'Preview without posting reviews or saving', false)
    .option('--list-only', 'Only list matched PR pairs without evaluation (no API key needed)', false)
    .parse(process.argv);

  const opts = program.opts();

  // Check for required environment variables
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    console.error(chalk.red('Error: GITHUB_TOKEN environment variable is required'));
    process.exit(1);
  }

  // List-only mode: just show matched PRs without evaluation
  if (opts.listOnly) {
    const github = new GitHubService(githubToken);
    const repoInfo = github.getRepoInfo();
    
    console.log(chalk.blue('═'.repeat(50)));
    console.log(chalk.blue('PR Pair Discovery (List Only)'));
    console.log(chalk.blue('═'.repeat(50)));
    console.log(chalk.gray(`Source: ${repoInfo.sourceRepo}`));
    console.log(chalk.gray(`Target: ${repoInfo.targetRepo}`));
    
    console.log(chalk.blue('\nFetching PR pairs...'));
    const pairs = await github.matchPRPairs();
    
    if (pairs.length === 0) {
      console.log(chalk.yellow('No matching PR pairs found'));
      process.exit(0);
    }
    
    console.log(chalk.green(`\nFound ${pairs.length} PR pair(s):\n`));
    
    for (const pair of pairs) {
      console.log(chalk.cyan(`${pair.testScenario}`));
      console.log(chalk.gray(`  Source: PR #${pair.sourceNumber} (${pair.sourceBranch})`));
      console.log(chalk.gray(`  Target: PR #${pair.targetNumber} (${pair.targetBranch})`));
      console.log(chalk.gray(`  ${pair.sourceUrl}`));
      console.log(chalk.gray(`  ${pair.targetUrl}`));
      console.log('');
    }
    
    process.exit(0);
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    console.error(chalk.red('Error: ANTHROPIC_API_KEY environment variable is required'));
    process.exit(1);
  }

  const options: EvaluationOptions = {
    anthropicApiKey,
    githubToken,
    dryRun: opts.dryRun,
    prNumber: opts.pr ? parseInt(opts.pr, 10) : undefined,
    postReviews: opts.postReviews,
    outputFile: opts.output,
  };

  // Initialize services
  const github = new GitHubService(githubToken);
  const evaluator = new TranslationEvaluator(anthropicApiKey);
  const repoInfo = github.getRepoInfo();

  console.log(chalk.blue('═'.repeat(50)));
  console.log(chalk.blue('Translation Quality Evaluation'));
  console.log(chalk.blue('═'.repeat(50)));
  console.log(chalk.gray(`Source: ${repoInfo.sourceRepo}`));
  console.log(chalk.gray(`Target: ${repoInfo.targetRepo}`));
  console.log(chalk.gray(`Model: ${EVALUATOR_MODEL}`));
  if (options.dryRun) {
    console.log(chalk.yellow('DRY RUN MODE - No reviews will be posted'));
  }

  // Get PR pairs to evaluate
  console.log(chalk.blue('\nFetching PR pairs...'));
  let pairs = await github.matchPRPairs();

  // Filter by specific PR number if provided
  if (options.prNumber) {
    pairs = pairs.filter(p => p.sourceNumber === options.prNumber);
  }

  if (pairs.length === 0) {
    console.log(chalk.yellow('No matching PR pairs found'));
    process.exit(0);
  }

  console.log(chalk.green(`Found ${pairs.length} PR pair(s) to evaluate`));

  // Evaluate each pair
  const results: EvaluationResult[] = [];
  for (const pair of pairs) {
    try {
      const result = await evaluatePRPair(pair, github, evaluator, options);
      results.push(result);
    } catch (error) {
      console.error(chalk.red(`Failed to evaluate PR pair ${pair.sourceNumber}: ${error}`));
    }
  }

  // Generate report
  const report = generateReport(results, repoInfo);

  // Print summary
  console.log(chalk.blue('\n' + '═'.repeat(50)));
  console.log(chalk.blue('Evaluation Complete'));
  console.log(chalk.blue('═'.repeat(50)));
  console.log(`Evaluated: ${report.prPairsEvaluated} PR pairs`);
  console.log(chalk.green(`Passed: ${report.summary.passed}`));
  console.log(chalk.yellow(`Warnings: ${report.summary.warned}`));
  console.log(chalk.red(`Failed: ${report.summary.failed}`));
  console.log(`Avg Translation Score: ${report.summary.averageTranslationScore}/10`);
  console.log(`Avg Diff Score: ${report.summary.averageDiffScore}/10`);

  // Save report
  if (!options.dryRun) {
    const dateStr = new Date().toISOString().split('T')[0];
    const outputFile = options.outputFile || path.join('..', 'reports', `evaluation-${dateStr}.md`);
    const outputPath = path.resolve(__dirname, '..', outputFile);
    
    const reportMd = formatReportMarkdown(report);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, reportMd);
    console.log(chalk.green(`\nReport saved to: ${outputPath}`));
  }

  // Exit with error code if any failures
  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
