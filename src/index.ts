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

    // Validate this is a merged PR event or manual dispatch
    core.info('Validating PR event...');
    const { merged, prNumber } = validatePREvent(github.context);

    if (!merged) {
      core.info('PR was not merged. Exiting.');
      return;
    }

    if (prNumber) {
      core.info(`Processing merged PR #${prNumber}`);
    } else {
      core.info('Processing manual workflow dispatch');
    }

    // Get changed files
    const octokit = github.getOctokit(inputs.githubToken);
    let files: any[];

    if (prNumber) {
      // Get files from PR
      const { data: prFiles } = await octokit.rest.pulls.listFiles({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
      });
      files = prFiles;
    } else {
      // For workflow_dispatch, get files from the latest commit
      const { data: commit } = await octokit.rest.repos.getCommit({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        ref: github.context.sha,
      });
      files = commit.files || [];
    }

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
    const translator = new TranslationService(inputs.anthropicApiKey, inputs.claudeModel);
    
    // Enable debug mode for detailed logging
    const debugMode = true;
    const processor = new FileProcessor(translator, debugMode);

    // Process each changed file
    const processedFiles: string[] = [];
    const translatedFiles: Array<{ path: string; content: string; sha?: string }> = [];
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
        let existingFileSha: string | undefined;

        try {
          const { data: targetFileData } = await octokit.rest.repos.getContent({
            owner: targetOwner,
            repo: targetRepo,
            path: file.filename,
          });

          if ('content' in targetFileData) {
            targetContent = Buffer.from(targetFileData.content, 'base64').toString('utf-8');
            existingFileSha = targetFileData.sha;
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

        // Store translated content for PR creation
        translatedFiles.push({
          path: file.filename,
          content: translatedContent,
          sha: existingFileSha,
        });

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
      
      // Create PR in target repo with translated content
      if (translatedFiles.length > 0) {
        try {
          core.info('Creating PR in target repository...');
          
          const [targetOwner, targetRepoName] = inputs.targetRepo.split('/');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const branchName = `translation-sync-${timestamp}`;
          
          // Get default branch of target repo
          const { data: targetRepoData } = await octokit.rest.repos.get({
            owner: targetOwner,
            repo: targetRepoName,
          });
          const defaultBranch = targetRepoData.default_branch;
          
          // Get the SHA of the default branch
          const { data: refData } = await octokit.rest.git.getRef({
            owner: targetOwner,
            repo: targetRepoName,
            ref: `heads/${defaultBranch}`,
          });
          const baseSha = refData.object.sha;
          
          // Create a new branch
          await octokit.rest.git.createRef({
            owner: targetOwner,
            repo: targetRepoName,
            ref: `refs/heads/${branchName}`,
            sha: baseSha,
          });
          
          core.info(`Created branch: ${branchName}`);
          
          // Commit each translated file
          for (const file of translatedFiles) {
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: targetOwner,
              repo: targetRepoName,
              path: file.path,
              message: `Update translation: ${file.path}`,
              content: Buffer.from(file.content).toString('base64'),
              branch: branchName,
              sha: file.sha, // Include SHA if updating existing file
            });
            core.info(`Committed: ${file.path}`);
          }
          
          // Create pull request
          const prBody = `## Automated Translation Sync

This PR contains automated translations from [${github.context.repo.owner}/${github.context.repo.repo}](https://github.com/${github.context.repo.owner}/${github.context.repo.repo}).

### Changes
${translatedFiles.map(f => `- \`${f.path}\``).join('\n')}

### Source
${prNumber ? `- **PR**: #${prNumber}` : '- **Trigger**: Manual workflow dispatch'}
- **Source Language**: ${inputs.sourceLanguage}
- **Target Language**: ${inputs.targetLanguage}
- **Model**: ${inputs.claudeModel}

---
*This PR was created automatically by the [translation-sync action](https://github.com/quantecon/action-translation-sync).*`;

          const { data: pr } = await octokit.rest.pulls.create({
            owner: targetOwner,
            repo: targetRepoName,
            title: `🌐 Translation sync: ${processedFiles.length} file(s) updated`,
            body: prBody,
            head: branchName,
            base: defaultBranch,
          });
          
          core.info(`Created PR: ${pr.html_url}`);
          
          // Add labels if specified
          if (inputs.prLabels.length > 0) {
            await octokit.rest.issues.addLabels({
              owner: targetOwner,
              repo: targetRepoName,
              issue_number: pr.number,
              labels: inputs.prLabels,
            });
            core.info(`Added labels: ${inputs.prLabels.join(', ')}`);
          }
          
          // Request reviewers if specified
          if (inputs.prReviewers.length > 0 || inputs.prTeamReviewers.length > 0) {
            try {
              const reviewRequest: { reviewers?: string[]; team_reviewers?: string[] } = {};
              if (inputs.prReviewers.length > 0) {
                reviewRequest.reviewers = inputs.prReviewers;
              }
              if (inputs.prTeamReviewers.length > 0) {
                reviewRequest.team_reviewers = inputs.prTeamReviewers;
              }
              
              await octokit.rest.pulls.requestReviewers({
                owner: targetOwner,
                repo: targetRepoName,
                pull_number: pr.number,
                ...reviewRequest,
              });
              
              const reviewersList = [];
              if (inputs.prReviewers.length > 0) {
                reviewersList.push(`users: ${inputs.prReviewers.join(', ')}`);
              }
              if (inputs.prTeamReviewers.length > 0) {
                reviewersList.push(`teams: ${inputs.prTeamReviewers.join(', ')}`);
              }
              core.info(`Requested reviewers: ${reviewersList.join('; ')}`);
            } catch (reviewerError) {
              // Don't fail the entire action if reviewer request fails
              // (e.g., if PR author is in the reviewer list)
              core.warning(`Could not request reviewers: ${reviewerError instanceof Error ? reviewerError.message : String(reviewerError)}`);
            }
          }
          
          core.setOutput('pr-url', pr.html_url);
          core.setOutput('files-synced', processedFiles.length.toString());
          
        } catch (prError) {
          core.setFailed(`Failed to create PR: ${prError instanceof Error ? prError.message : String(prError)}`);
        }
      }
    }

  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run the action
run();
