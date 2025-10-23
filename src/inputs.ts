import * as core from '@actions/core';
import { ActionInputs } from './types';

/**
 * Get and validate action inputs
 */
export function getInputs(): ActionInputs {
  const targetRepo = core.getInput('target-repo', { required: true });
  const targetLanguage = core.getInput('target-language', { required: true });
  const docsFolderRaw = core.getInput('docs-folder', { required: false });
  const docsFolder = docsFolderRaw !== undefined && docsFolderRaw !== null ? docsFolderRaw : 'lectures/';
  const sourceLanguage = core.getInput('source-language', { required: false }) || 'en';
  const glossaryPath = core.getInput('glossary-path', { required: false }) || '';  // Empty by default - uses built-in
  const tocFile = core.getInput('toc-file', { required: false }) || '_toc.yml';
  const anthropicApiKey = core.getInput('anthropic-api-key', { required: true });
  const claudeModel = core.getInput('claude-model', { required: false }) || 'claude-sonnet-4-5-20250929';
  const githubToken = core.getInput('github-token', { required: true });
  
  const prLabelsRaw = core.getInput('pr-labels', { required: false }) || 'translation-sync,automated';
  const prLabels = prLabelsRaw.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  
  const prReviewersRaw = core.getInput('pr-reviewers', { required: false }) || '';
  const prReviewers = prReviewersRaw.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0);

  const prTeamReviewersRaw = core.getInput('pr-team-reviewers', { required: false }) || '';
  const prTeamReviewers = prTeamReviewersRaw.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

  // Test mode: use PR head instead of merge commit
  const testModeRaw = core.getInput('test-mode', { required: false }) || 'false';
  const testMode = testModeRaw.toLowerCase() === 'true';

  // Validate target repo format
  if (!targetRepo.includes('/')) {
    throw new Error(`Invalid target-repo format: ${targetRepo}. Expected format: owner/repo`);
  }

  // Ensure docs folder ends with /
  const normalizedDocsFolder = docsFolder.endsWith('/') ? docsFolder : `${docsFolder}/`;

  return {
    targetRepo,
    targetLanguage,
    docsFolder: normalizedDocsFolder,
    sourceLanguage,
    glossaryPath,
    tocFile,
    anthropicApiKey,
    claudeModel,
    githubToken,
    prLabels,
    prReviewers,
    prTeamReviewers,
    testMode,
  };
}

/**
 * Validate that the event is a merged PR, test mode label, or manual dispatch
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validatePREvent(context: any, testMode: boolean): { merged: boolean; prNumber: number | null; isTestMode: boolean } {
  const { eventName, payload } = context;

  // Handle workflow_dispatch for manual testing
  if (eventName === 'workflow_dispatch') {
    core.info('Manual workflow dispatch - will process latest commit');
    return { merged: true, prNumber: null, isTestMode: false };
  }

  // Handle pull_request events
  if (eventName !== 'pull_request') {
    throw new Error(`This action only works on pull_request or workflow_dispatch events. Got: ${eventName}`);
  }

  // Test mode: triggered by label, use PR head (not merged)
  if (testMode || (payload.action === 'labeled' && payload.label?.name === 'test-translation')) {
    const prNumber = payload.pull_request?.number;
    if (!prNumber) {
      throw new Error('Could not determine PR number from event payload');
    }
    core.info(`🧪 Running in TEST mode for PR #${prNumber} (using PR head commit, not merge)`);
    return { merged: true, prNumber, isTestMode: true };  // merged=true to continue processing
  }

  // Production mode: must be closed and merged
  if (payload.action !== 'closed') {
    throw new Error(`This action only runs when PRs are closed or labeled with test-translation. Got action: ${payload.action}`);
  }

  const merged = payload.pull_request?.merged === true;
  const prNumber = payload.pull_request?.number;

  if (!merged) {
    core.info('PR was closed but not merged. Skipping sync.');
  }

  if (!prNumber) {
    throw new Error('Could not determine PR number from event payload');
  }

  core.info(`🚀 Running in PRODUCTION mode for merged PR #${prNumber}`);
  return { merged, prNumber, isTestMode: false };
}
