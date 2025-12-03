#!/usr/bin/env node
/**
 * Bulk Translation Tool
 * 
 * One-time bulk translation of entire lecture series to bootstrap new language repository.
 * 
 * Architecture:
 * 1. Clone/download source repository
 * 2. Create target folder with language suffix
 * 3. Copy all non-.md files (preserves Jupyter Book structure)
 * 4. Parse _toc.yml to get lecture list
 * 5. Translate lectures one-at-a-time (high quality, focused context)
 * 6. Generate heading-maps for future incremental sync
 * 7. Create summary report
 * 
 * Usage:
 *   npm run translate -- \
 *     --source-repo QuantEcon/lecture-python \
 *     --target-folder lecture-python.zh-cn \
 *     --target-language zh-cn \
 *     --anthropic-api-key $ANTHROPIC_API_KEY \
 *     --github-token $GITHUB_TOKEN
 */

import { Command } from 'commander';
import { Octokit } from '@octokit/rest';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import ora from 'ora';

// Import from parent action (reuse existing translation logic)
import { TranslationService } from '../../src/translator';
import { MystParser } from '../../src/parser';
import { Glossary } from '../../src/types';
import { extractHeadingMap, injectHeadingMap } from '../../src/heading-map';

interface BulkOptions {
  sourceRepo: string;
  targetFolder: string;
  sourceLanguage: string;
  targetLanguage: string;
  docsFolder: string;
  anthropicApiKey: string;
  githubToken: string;
  glossaryPath?: string;
  model: string;
  batchDelay: number;
  resumeFrom?: string;
  dryRun?: boolean;
}

interface TranslationStats {
  totalLectures: number;
  successCount: number;
  failureCount: number;
  totalTokens: number;
  totalTimeMs: number;
  failures: Array<{ file: string; error: string }>;
}

interface TocEntry {
  file?: string;
  sections?: TocEntry[];
  caption?: string;
  chapters?: TocEntry[];
}

class BulkTranslator {
  private options: BulkOptions;
  private octokit: Octokit;
  private translator: TranslationService;
  private parser: MystParser;
  private glossary?: Glossary;
  private stats: TranslationStats;
  private sourceOwner: string;
  private sourceRepoName: string;

  constructor(options: BulkOptions) {
    this.options = options;
    // For dry-run with public repos, token is optional
    this.octokit = new Octokit(options.githubToken ? { auth: options.githubToken } : {});
    this.translator = new TranslationService(options.anthropicApiKey, options.model, true);
    this.parser = new MystParser();
    this.stats = {
      totalLectures: 0,
      successCount: 0,
      failureCount: 0,
      totalTokens: 0,
      totalTimeMs: 0,
      failures: [],
    };

    const [owner, repo] = options.sourceRepo.split('/');
    this.sourceOwner = owner;
    this.sourceRepoName = repo;
  }

  /**
   * Main execution flow
   */
  async run(): Promise<void> {
    if (this.options.dryRun) {
      console.log(chalk.bold.yellow('\n🔍 DRY RUN MODE - No changes will be made\n'));
    } else {
      console.log(chalk.bold.cyan('\n🌍 Bulk Translation Tool\n'));
    }
    
    console.log(chalk.gray(`Source: ${this.options.sourceRepo}`));
    console.log(chalk.gray(`Target: ${this.options.targetFolder}`));
    console.log(chalk.gray(`Language: ${this.options.sourceLanguage} → ${this.options.targetLanguage}`));
    console.log(chalk.gray(`Model: ${this.options.model}\n`));

    try {
      // Phase 1: Load glossary
      await this.loadGlossary();

      // Phase 2: Setup target folder
      if (this.options.dryRun) {
        console.log(chalk.yellow('[DRY RUN] Would create target folder:'), this.options.targetFolder);
      } else {
        await this.setupTargetFolder();
      }

      // Phase 3: Copy non-markdown files
      if (this.options.dryRun) {
        console.log(chalk.yellow('[DRY RUN] Would copy non-.md files from source repository'));
      } else {
        await this.copyNonMarkdownFiles();
      }

      // Phase 4: Get lecture list from TOC
      const lectures = await this.getLectureList();
      this.stats.totalLectures = lectures.length;

      console.log(chalk.bold(`\nFound ${lectures.length} lectures to translate\n`));

      if (this.options.dryRun) {
        // In dry-run mode, just list what would be translated
        console.log(chalk.yellow('Would translate the following lectures:'));
        lectures.forEach((lecture, index) => {
          console.log(chalk.gray(`  ${index + 1}. ${lecture}`));
        });
        console.log(chalk.yellow('\nTo actually run translation, execute without --dry-run'));
        return;
      }

      // Phase 5: Translate lectures one by one
      await this.translateLectures(lectures);

      // Phase 6: Generate report
      await this.generateReport();

      // Phase 7: Summary
      this.printSummary();

    } catch (error) {
      console.error(chalk.red('\n❌ Fatal error:'), error);
      process.exit(1);
    }
  }

  /**
   * Load glossary for target language
   */
  private async loadGlossary(): Promise<void> {
    const spinner = ora('Loading glossary').start();

    try {
      let glossaryPath: string;

      if (this.options.glossaryPath) {
        // Use custom glossary path provided by user
        glossaryPath = this.options.glossaryPath;
      } else {
        // Use built-in glossary from bundled resources
        // __dirname in compiled JS points to: dist/tool-bulk-translator/src/
        // Bundled resources are at: dist/resources/glossary/
        // So we go up 2 levels: ../../resources/glossary/
        glossaryPath = path.join(__dirname, '../../resources/glossary', `${this.options.targetLanguage}.json`);
      }

      // Check if file exists
      try {
        await fs.access(glossaryPath);
      } catch {
        throw new Error(`Glossary file not found: ${glossaryPath}`);
      }

      const glossaryContent = await fs.readFile(glossaryPath, 'utf-8');
      this.glossary = JSON.parse(glossaryContent);
      spinner.succeed(chalk.green(`Loaded glossary: ${this.glossary?.terms?.length || 0} terms`));
    } catch (error) {
      spinner.warn(chalk.yellow(`No glossary found for ${this.options.targetLanguage}, proceeding without`));
      this.glossary = undefined;
    }
  }

  /**
   * Create target folder
   */
  private async setupTargetFolder(): Promise<void> {
    const spinner = ora('Setting up target folder').start();

    try {
      await fs.mkdir(this.options.targetFolder, { recursive: true });
      spinner.succeed(chalk.green(`Created target folder: ${this.options.targetFolder}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to create target folder'));
      throw error;
    }
  }

  /**
   * Copy all non-.md files from source to target
   * Preserves: _config.yml, _toc.yml, images, CSS, data files, etc.
   */
  private async copyNonMarkdownFiles(): Promise<void> {
    const spinner = ora('Copying non-markdown files from source repository').start();

    try {
      // Get repository tree
      const { data: tree } = await this.octokit.rest.git.getTree({
        owner: this.sourceOwner,
        repo: this.sourceRepoName,
        tree_sha: 'HEAD',
        recursive: 'true',
      });

      const filesToCopy = tree.tree.filter((item: any) =>
        item.type === 'blob' &&
        item.path &&
        !item.path.endsWith('.md') &&
        !item.path.startsWith('.git')
      );

      spinner.text = `Copying ${filesToCopy.length} files...`;

      for (const item of filesToCopy) {
        if (!item.path) continue;

        // Get file content
        const { data: blob } = await this.octokit.rest.git.getBlob({
          owner: this.sourceOwner,
          repo: this.sourceRepoName,
          file_sha: item.sha!,
        });

        // Decode content
        const content = Buffer.from(blob.content, blob.encoding as BufferEncoding);

        // Write to target
        const targetPath = path.join(this.options.targetFolder, item.path);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, content);
      }

      spinner.succeed(chalk.green(`Copied ${filesToCopy.length} non-markdown files`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to copy files'));
      throw error;
    }
  }

  /**
   * Parse _toc.yml to get ordered list of lectures
   */
  private async getLectureList(): Promise<string[]> {
    const spinner = ora('Parsing _toc.yml').start();

    try {
      let tocContent: string;
      
      if (this.options.dryRun) {
        // In dry-run mode, fetch _toc.yml from GitHub
        const tocPath = this.options.docsFolder 
          ? `${this.options.docsFolder}/_toc.yml`
          : '_toc.yml';
        
        const { data } = await this.octokit.repos.getContent({
          owner: this.sourceOwner,
          repo: this.sourceRepoName,
          path: tocPath,
        });
        
        if ('content' in data) {
          tocContent = Buffer.from(data.content, 'base64').toString('utf-8');
        } else {
          throw new Error('_toc.yml not found in repository');
        }
      } else {
        // Normal mode: read from target folder
        const tocPath = path.join(this.options.targetFolder, '_toc.yml');
        tocContent = await fs.readFile(tocPath, 'utf-8');
      }
      
      const toc = yaml.load(tocContent) as any;

      const lectures: string[] = [];

      // Recursively extract file paths from TOC structure
      const extractFiles = (entries: TocEntry[] | undefined, basePath: string = '') => {
        if (!entries) return;

        for (const entry of entries) {
          if (entry.file) {
            const filePath = path.join(this.options.docsFolder, `${entry.file}.md`);
            lectures.push(filePath);
          }
          if (entry.sections) {
            extractFiles(entry.sections, basePath);
          }
          if (entry.chapters) {
            extractFiles(entry.chapters, basePath);
          }
        }
      };

      // TOC can have 'chapters' or 'parts' at root level
      if (toc.chapters) {
        extractFiles(toc.chapters);
      }
      if (toc.parts) {
        for (const part of toc.parts) {
          if (part.chapters) {
            extractFiles(part.chapters);
          }
        }
      }

      spinner.succeed(chalk.green(`Found ${lectures.length} lectures in TOC`));
      return lectures;
    } catch (error) {
      spinner.fail(chalk.red('Failed to parse _toc.yml'));
      throw error;
    }
  }

  /**
   * Translate all lectures sequentially
   */
  private async translateLectures(lectures: string[]): Promise<void> {
    console.log(chalk.bold.cyan('\n📚 Starting Translation\n'));

    let startIndex = 0;

    // Handle resume
    if (this.options.resumeFrom) {
      startIndex = lectures.indexOf(this.options.resumeFrom);
      if (startIndex === -1) {
        console.log(chalk.yellow(`Resume file not found: ${this.options.resumeFrom}`));
        startIndex = 0;
      } else {
        console.log(chalk.yellow(`Resuming from: ${this.options.resumeFrom}\n`));
      }
    }

    for (let i = startIndex; i < lectures.length; i++) {
      const lecture = lectures[i];
      const progress = `[${i + 1}/${lectures.length}]`;

      console.log(chalk.bold(`${progress} ${lecture}`));

      try {
        await this.translateLecture(lecture);
        this.stats.successCount++;

        // Delay between lectures (rate limiting)
        if (i < lectures.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.options.batchDelay));
        }

      } catch (error) {
        this.stats.failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.stats.failures.push({ file: lecture, error: errorMsg });
        console.log(chalk.red(`  ✗ Failed: ${errorMsg}\n`));
      }
    }
  }

  /**
   * Translate a single lecture
   */
  private async translateLecture(lectureFile: string): Promise<void> {
    const startTime = Date.now();

    // Get source content from GitHub
    const { data: fileData } = await this.octokit.rest.repos.getContent({
      owner: this.sourceOwner,
      repo: this.sourceRepoName,
      path: lectureFile,
    });

    if (!('content' in fileData)) {
      throw new Error('Could not get file content');
    }

    const sourceContent = Buffer.from(fileData.content, 'base64').toString('utf-8');

    // Translate full document
    const result = await this.translator.translateFullDocument({
      content: sourceContent,
      sourceLanguage: this.options.sourceLanguage,
      targetLanguage: this.options.targetLanguage,
      glossary: this.glossary,
    });

    if (!result.success || !result.translatedSection) {
      throw new Error(result.error || 'Translation failed');
    }

    const translatedContent = result.translatedSection;

    // Parse translated content to generate heading-map
    const headingMap = await this.generateHeadingMap(sourceContent, translatedContent);

    // Inject heading-map into frontmatter
    const finalContent = injectHeadingMap(translatedContent, headingMap);

    // Write to target folder
    const targetPath = path.join(this.options.targetFolder, lectureFile);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, finalContent, 'utf-8');

    // Update stats
    const elapsedMs = Date.now() - startTime;
    this.stats.totalTimeMs += elapsedMs;
    this.stats.totalTokens += result.tokensUsed || 0;

    console.log(chalk.green(`  ✓ Completed in ${(elapsedMs / 1000).toFixed(1)}s (${result.tokensUsed?.toLocaleString() || 0} tokens)\n`));
  }

  /**
   * Generate heading-map by parsing source and translated sections
   */
  private async generateHeadingMap(sourceContent: string, translatedContent: string): Promise<Map<string, string>> {
    const sourceParsed = await this.parser.parseDocumentComponents(sourceContent, 'temp.md');
    const translatedParsed = await this.parser.parseDocumentComponents(translatedContent, 'temp.md');

    const headingMap = new Map<string, string>();

    // Match sections by position and build heading map
    const matchSections = (sourceSections: any[], translatedSections: any[]) => {
      for (let i = 0; i < Math.min(sourceSections.length, translatedSections.length); i++) {
        const sourceSection = sourceSections[i];
        const translatedSection = translatedSections[i];

        if (sourceSection.id && translatedSection.heading) {
          // Extract heading text from translated section (without level markers)
          const translatedHeading = translatedSection.heading.replace(/^#+\s*/, '');
          headingMap.set(sourceSection.id, translatedHeading);
        }

        // Recurse into subsections
        if (sourceSection.subsections && translatedSection.subsections) {
          matchSections(sourceSection.subsections, translatedSection.subsections);
        }
      }
    };

    matchSections(sourceParsed.sections, translatedParsed.sections);

    return headingMap;
  }

  /**
   * Generate summary report
   */
  private async generateReport(): Promise<void> {
    const reportPath = path.join(this.options.targetFolder, 'TRANSLATION-REPORT.md');

    const avgTimePerLecture = this.stats.totalTimeMs / this.stats.successCount;
    const estimatedCost = this.estimateCost(this.stats.totalTokens);

    let report = `# Translation Report

**Generated**: ${new Date().toISOString()}

## Summary

- **Total Lectures**: ${this.stats.totalLectures}
- **Successfully Translated**: ${this.stats.successCount}
- **Failed**: ${this.stats.failureCount}
- **Total Tokens Used**: ${this.stats.totalTokens.toLocaleString()}
- **Total Time**: ${(this.stats.totalTimeMs / 1000 / 60).toFixed(1)} minutes
- **Average Time per Lecture**: ${(avgTimePerLecture / 1000).toFixed(1)} seconds
- **Estimated Cost**: $${estimatedCost.toFixed(2)} USD

## Configuration

- **Source Repository**: ${this.options.sourceRepo}
- **Source Language**: ${this.options.sourceLanguage}
- **Target Language**: ${this.options.targetLanguage}
- **Target Folder**: ${this.options.targetFolder}
- **Glossary Terms**: ${this.glossary?.terms?.length || 0}

`;

    if (this.stats.failures.length > 0) {
      report += `## Failures

The following lectures failed to translate:

`;
      for (const failure of this.stats.failures) {
        report += `- **${failure.file}**: ${failure.error}\n`;
      }
    }

    report += `
## Next Steps

1. Review translated lectures in \`${this.options.targetFolder}\`
2. Build Jupyter Book to verify: \`jupyter-book build ${this.options.targetFolder}\`
3. Push to GitHub repository
4. Configure \`action-translation-sync\` for incremental updates

---

Generated by Bulk Translator Tool
`;

    await fs.writeFile(reportPath, report, 'utf-8');
    console.log(chalk.green(`\n📄 Report saved to: ${reportPath}`));
  }

  /**
   * Estimate cost based on tokens used
   * Claude Sonnet 4.5 pricing (Nov 2025):
   *   Input: $3 per 1M tokens
   *   Output: $15 per 1M tokens
   * Assuming 50/50 split for estimation
   */
  private estimateCost(tokens: number): number {
    const inputTokens = tokens * 0.5;
    const outputTokens = tokens * 0.5;
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return inputCost + outputCost;
  }

  /**
   * Print final summary
   */
  private printSummary(): void {
    console.log(chalk.bold.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold.cyan('   TRANSLATION COMPLETE   '));
    console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(chalk.bold('Summary:'));
    console.log(chalk.green(`  ✓ Successfully translated: ${this.stats.successCount}/${this.stats.totalLectures}`));
    
    if (this.stats.failureCount > 0) {
      console.log(chalk.red(`  ✗ Failed: ${this.stats.failureCount}`));
    }

    console.log(chalk.gray(`\n  Total tokens: ${this.stats.totalTokens.toLocaleString()}`));
    console.log(chalk.gray(`  Total time: ${(this.stats.totalTimeMs / 1000 / 60).toFixed(1)} minutes`));
    console.log(chalk.gray(`  Estimated cost: $${this.estimateCost(this.stats.totalTokens).toFixed(2)}`));

    console.log(chalk.bold.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(chalk.yellow('Next steps:'));
    console.log(chalk.gray(`  1. Review translations in: ${this.options.targetFolder}`));
    console.log(chalk.gray(`  2. Build book: jupyter-book build ${this.options.targetFolder}`));
    console.log(chalk.gray('  3. Push to GitHub'));
    console.log(chalk.gray('  4. Configure action-translation-sync\n'));
  }
}

/**
 * CLI Entry Point
 */
async function main() {
  const program = new Command();

  program
    .name('bulk-translate')
    .description('Bulk translation tool for bootstrapping new language repositories')
    .version('1.0.0')
    .requiredOption('--source-repo <repo>', 'Source repository (owner/repo)')
    .requiredOption('--target-folder <folder>', 'Target folder for translations')
    .requiredOption('--target-language <lang>', 'Target language code (e.g., zh-cn)')
    .option('--anthropic-api-key <key>', 'Anthropic API key (not needed for --dry-run)')
    .option('--github-token <token>', 'GitHub personal access token (optional for public repos in --dry-run)')
    .option('--source-language <lang>', 'Source language code', 'en')
    .option('--docs-folder <folder>', 'Documentation folder in repo', 'lectures/')
    .option('--glossary-path <path>', 'Custom glossary file path')
    .option('--model <model>', 'AI model for translation (e.g., claude-sonnet-4-5-20250929)', 'claude-sonnet-4-5-20250929')
    .option('--batch-delay <ms>', 'Delay between lectures in milliseconds', '1000')
    .option('--resume-from <file>', 'Resume from specific lecture file')
    .option('--dry-run', 'Show what would be done without making API calls or creating files')
    .parse();

  const options = program.opts() as BulkOptions;
  options.batchDelay = parseInt(options.batchDelay as any);

  const translator = new BulkTranslator(options);
  await translator.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('\nFatal error:'), error);
    process.exit(1);
  });
}

export { BulkTranslator, BulkOptions };
