import * as core from '@actions/core';
import { ActionInputs } from './types';

/**
 * Get and validate action inputs
 */
export function getInputs(): ActionInputs {
  const targetRepo = core.getInput('target-repo', { required: true });
  const targetLanguage = core.getInput('target-language', { required: true });
  const docsFolder = core.getInput('docs-folder', { required: false }) || 'lectures/';
  const sourceLanguage = core.getInput('source-language', { required: false }) || 'en';
  const glossaryPath = core.getInput('glossary-path', { required: false }) || '';  // Empty by default - uses built-in
  const tocFile = core.getInput('toc-file', { required: false }) || '_toc.yml';
  const anthropicApiKey = core.getInput('anthropic-api-key', { required: true });
  const claudeModel = core.getInput('claude-model', { required: false }) || 'claude-sonnet-4.5-20241022';
  const githubToken = core.getInput('github-token', { required: true });
  
  const prLabelsRaw = core.getInput('pr-labels', { required: false }) || 'translation-sync,automated';
  const prLabels = prLabelsRaw.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  
  const prReviewersRaw = core.getInput('pr-reviewers', { required: false }) || '';
  const prReviewers = prReviewersRaw.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0);

  const prTeamReviewersRaw = core.getInput('pr-team-reviewers', { required: false }) || '';
  const prTeamReviewers = prTeamReviewersRaw.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

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
  };
}

/**
 * Validate that the event is a merged PR or manual dispatch
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validatePREvent(context: any): { merged: boolean; prNumber: number | null } {
  const { eventName, payload } = context;

  // Handle workflow_dispatch for manual testing
  if (eventName === 'workflow_dispatch') {
    core.info('Manual workflow dispatch - will process latest commit');
    return { merged: true, prNumber: null };
  }

  // Handle pull_request events
  if (eventName !== 'pull_request') {
    throw new Error(`This action only works on pull_request or workflow_dispatch events. Got: ${eventName}`);
  }

  if (payload.action !== 'closed') {
    throw new Error(`This action only runs when PRs are closed. Got action: ${payload.action}`);
  }

  const merged = payload.pull_request?.merged === true;
  const prNumber = payload.pull_request?.number;

  if (!merged) {
    core.info('PR was closed but not merged. Skipping sync.');
  }

  if (!prNumber) {
    throw new Error('Could not determine PR number from event payload');
  }

  return { merged, prNumber };
}
