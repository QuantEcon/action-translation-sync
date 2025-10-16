import * as core from '@actions/core';
import * as github from '@actions/github';
import { getInputs, validatePREvent } from './inputs';
import { TranslationService } from './translator';
import { FileProcessor } from './file-processor';
import { Glossary, FileChange, SyncResult } from './types';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Main entry point for the GitHub Action
 */
async function run(): Promise<void> {
  try {
    // Get and validate inputs
    core.info('Getting action inputs...');
    const inputs = getInputs();

    // Validate this is a merged PR event
    core.info('Validating PR event...');
    const { merged, prNumber } = validatePREvent(github.context);

    if (!merged) {
      core.info('PR was not merged. Exiting.');
      return;
    }

    core.info(`Processing merged PR #${prNumber}`);

    // Get changed files from the PR
    const octokit = github.getOctokit(inputs.githubToken);
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: prNumber,
    });

    // Filter for markdown files in docs folder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changedMarkdownFiles = files.filter(
      (file: any) =>
        file.filename.startsWith(inputs.docsFolder) &&
        file.filename.endsWith('.md') &&
        file.status !== 'removed'
    );

    if (changedMarkdownFiles.length === 0) {
      core.info('No markdown files changed in docs folder. Exiting.');
      return;
    }

    core.info(`Found ${changedMarkdownFiles.length} changed markdown files`);

    // Load glossary - uses built-in glossary by default
    let glossary: Glossary | undefined;
    
    // First, try to load the built-in glossary (shipped with the action)
    // Glossary path is language-specific: glossary/{target-language}.json
    const builtInGlossaryPath = path.join(__dirname, '..', 'glossary', `${inputs.targetLanguage}.json`);
    try {
      const glossaryContent = await fs.readFile(builtInGlossaryPath, 'utf-8');
      glossary = JSON.parse(glossaryContent);
      if (glossary) {
        core.info(`✓ Loaded built-in glossary for ${inputs.targetLanguage} with ${glossary.terms.length} terms`);
      }
    } catch (error) {
      core.warning(`Could not load built-in glossary for ${inputs.targetLanguage}: ${error}`);
      
      // Fallback: try custom glossary path if provided
      if (inputs.glossaryPath) {
        try {
          const customGlossaryContent = await fs.readFile(inputs.glossaryPath, 'utf-8');
          glossary = JSON.parse(customGlossaryContent);
          if (glossary) {
            core.info(`✓ Loaded custom glossary from ${inputs.glossaryPath} with ${glossary.terms.length} terms`);
          }
        } catch (fallbackError) {
          core.warning(`Could not load custom glossary from ${inputs.glossaryPath}: ${fallbackError}`);
        }
      }
    }

    // Initialize translation service
    const translator = new TranslationService(inputs.anthropicApiKey);
    const processor = new FileProcessor(translator);

    // Process each changed file
    const processedFiles: string[] = [];
    const errors: string[] = [];

    for (const file of changedMarkdownFiles) {
      try {
        core.info(`Processing ${file.filename}...`);

        // Get file content from PR
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          path: file.filename,
          ref: github.context.sha,
        });

        if (!('content' in fileData)) {
          throw new Error(`Could not get content for ${file.filename}`);
        }

        const newContent = Buffer.from(fileData.content, 'base64').toString('utf-8');

        // Get old content (before the PR)
        let oldContent = '';
        try {
          const { data: oldFileData } = await octokit.rest.repos.getContent({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            path: file.filename,
            ref: `${github.context.sha}^`, // Parent commit
          });

          if ('content' in oldFileData) {
            oldContent = Buffer.from(oldFileData.content, 'base64').toString('utf-8');
          }
        } catch (error) {
          // File is new (doesn't exist in parent)
          core.info(`${file.filename} is a new file`);
        }

        // Check if file exists in target repo
        const [targetOwner, targetRepo] = inputs.targetRepo.split('/');
        let targetContent = '';
        let isNewFile = false;

        try {
          const { data: targetFileData } = await octokit.rest.repos.getContent({
            owner: targetOwner,
            repo: targetRepo,
            path: file.filename,
          });

          if ('content' in targetFileData) {
            targetContent = Buffer.from(targetFileData.content, 'base64').toString('utf-8');
          }
        } catch (error) {
          isNewFile = true;
          core.info(`${file.filename} does not exist in target repo - will create it`);
        }

        // Process the file
        let translatedContent: string;
        if (isNewFile) {
          translatedContent = await processor.processFull(
            newContent,
            file.filename,
            inputs.sourceLanguage,
            inputs.targetLanguage,
            glossary
          );
        } else {
          translatedContent = await processor.processDiff(
            oldContent,
            newContent,
            targetContent,
            file.filename,
            inputs.sourceLanguage,
            inputs.targetLanguage,
            glossary
          );
        }

        // Validate the translated content
        const validation = await processor.validateMyST(translatedContent, file.filename);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.error}`);
        }

        core.info(`Successfully processed ${file.filename}`);
        processedFiles.push(file.filename);

        // TODO: Create PR in target repo with translated content
        // This will be implemented in the next phase

      } catch (error) {
        const errorMessage = `Error processing ${file.filename}: ${error}`;
        core.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    // Report results
    if (errors.length > 0) {
      core.setFailed(`Translation completed with ${errors.length} errors`);
    } else {
      core.info(`Successfully processed ${processedFiles.length} files`);
      core.setOutput('files-synced', processedFiles.length.toString());
    }

  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run the action
run();
