/**
 * GitHub API utilities for fetching PR information
 * 
 * Hardcoded to QuantEcon test repositories:
 * - Source: QuantEcon/test-translation-sync
 * - Target: QuantEcon/test-translation-sync.zh-cn
 */

import { Octokit } from '@octokit/rest';
import type { PRPair, FileDiff } from './types.js';

// Test repository configuration
const SOURCE_OWNER = 'QuantEcon';
const SOURCE_REPO = 'test-translation-sync';
const TARGET_OWNER = 'QuantEcon';
const TARGET_REPO = 'test-translation-sync.zh-cn';

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Get all open PRs from source repo with test-translation label
   */
  async getSourcePRs(): Promise<Array<{
    number: number;
    title: string;
    branch: string;
    url: string;
  }>> {
    const { data: prs } = await this.octokit.pulls.list({
      owner: SOURCE_OWNER,
      repo: SOURCE_REPO,
      state: 'open',
    });

    return prs
      .filter(pr => pr.labels.some(l => l.name === 'test-translation'))
      .map(pr => ({
        number: pr.number,
        title: pr.title,
        branch: pr.head.ref,
        url: pr.html_url,
      }));
  }

  /**
   * Get all open PRs from target repo
   */
  async getTargetPRs(): Promise<Array<{
    number: number;
    title: string;
    branch: string;
    url: string;
    body: string;
  }>> {
    const { data: prs } = await this.octokit.pulls.list({
      owner: TARGET_OWNER,
      repo: TARGET_REPO,
      state: 'open',
    });

    return prs.map(pr => ({
      number: pr.number,
      title: pr.title,
      branch: pr.head.ref,
      url: pr.html_url,
      body: pr.body || '',
    }));
  }

  /**
   * Match source PRs to their corresponding target PRs
   * Target PRs reference source PRs in their body via "### Source PR" section
   */
  async matchPRPairs(): Promise<PRPair[]> {
    const sourcePRs = await this.getSourcePRs();
    const targetPRs = await this.getTargetPRs();
    
    const pairs: PRPair[] = [];

    for (const sourcePR of sourcePRs) {
      // Find target PR that references this source PR
      // Target PR body contains: "### Source PR\n**[#123 - ..."
      const matchingTarget = targetPRs.find(tpr => 
        tpr.body.includes(`#${sourcePR.number}`)
      );

      if (matchingTarget) {
        // Extract test scenario from title (e.g., "TEST: New section added (05 - minimal)")
        const scenarioMatch = sourcePR.title.match(/TEST:\s*(.+)/);
        const testScenario = scenarioMatch ? scenarioMatch[1] : sourcePR.title;

        pairs.push({
          sourceNumber: sourcePR.number,
          targetNumber: matchingTarget.number,
          sourceTitle: sourcePR.title,
          targetTitle: matchingTarget.title,
          sourceBranch: sourcePR.branch,
          targetBranch: matchingTarget.branch,
          sourceUrl: sourcePR.url,
          targetUrl: matchingTarget.url,
          testScenario,
        });
      }
    }

    return pairs;
  }

  /**
   * Get files changed in source PR
   */
  async getSourcePRFiles(prNumber: number): Promise<FileDiff[]> {
    const { data: files } = await this.octokit.pulls.listFiles({
      owner: SOURCE_OWNER,
      repo: SOURCE_REPO,
      pull_number: prNumber,
    });

    return files.map(file => ({
      filename: file.filename,
      status: file.status as FileDiff['status'],
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
      previousFilename: file.previous_filename,
    }));
  }

  /**
   * Get files changed in target PR
   */
  async getTargetPRFiles(prNumber: number): Promise<FileDiff[]> {
    const { data: files } = await this.octokit.pulls.listFiles({
      owner: TARGET_OWNER,
      repo: TARGET_REPO,
      pull_number: prNumber,
    });

    return files.map(file => ({
      filename: file.filename,
      status: file.status as FileDiff['status'],
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
      previousFilename: file.previous_filename,
    }));
  }

  /**
   * Get file content from a specific branch
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string
  ): Promise<string | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get source PR diff (English before/after)
   */
  async getSourceDiff(prNumber: number): Promise<{
    files: FileDiff[];
    beforeContent: Map<string, string>;
    afterContent: Map<string, string>;
  }> {
    const files = await this.getSourcePRFiles(prNumber);
    
    // Get the PR details to find base and head
    const { data: pr } = await this.octokit.pulls.get({
      owner: SOURCE_OWNER,
      repo: SOURCE_REPO,
      pull_number: prNumber,
    });

    const beforeContent = new Map<string, string>();
    const afterContent = new Map<string, string>();

    for (const file of files) {
      if (file.filename.endsWith('.md')) {
        // Get content before (base)
        const before = await this.getFileContent(
          SOURCE_OWNER,
          SOURCE_REPO,
          file.filename,
          pr.base.ref
        );
        if (before) beforeContent.set(file.filename, before);

        // Get content after (head)
        if (file.status !== 'removed') {
          const after = await this.getFileContent(
            SOURCE_OWNER,
            SOURCE_REPO,
            file.filename,
            pr.head.ref
          );
          if (after) afterContent.set(file.filename, after);
        }
      }
    }

    return { files, beforeContent, afterContent };
  }

  /**
   * Get target PR diff (Chinese before/after)
   */
  async getTargetDiff(prNumber: number): Promise<{
    files: FileDiff[];
    beforeContent: Map<string, string>;
    afterContent: Map<string, string>;
  }> {
    const files = await this.getTargetPRFiles(prNumber);
    
    const { data: pr } = await this.octokit.pulls.get({
      owner: TARGET_OWNER,
      repo: TARGET_REPO,
      pull_number: prNumber,
    });

    const beforeContent = new Map<string, string>();
    const afterContent = new Map<string, string>();

    for (const file of files) {
      if (file.filename.endsWith('.md') || file.filename.endsWith('.yml')) {
        const before = await this.getFileContent(
          TARGET_OWNER,
          TARGET_REPO,
          file.filename,
          pr.base.ref
        );
        if (before) beforeContent.set(file.filename, before);

        if (file.status !== 'removed') {
          const after = await this.getFileContent(
            TARGET_OWNER,
            TARGET_REPO,
            file.filename,
            pr.head.ref
          );
          if (after) afterContent.set(file.filename, after);
        }
      }
    }

    return { files, beforeContent, afterContent };
  }

  /**
   * Post a review comment on target PR
   */
  async postReview(
    prNumber: number,
    comment: string,
    event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES' = 'COMMENT'
  ): Promise<void> {
    await this.octokit.pulls.createReview({
      owner: TARGET_OWNER,
      repo: TARGET_REPO,
      pull_number: prNumber,
      body: comment,
      event,
    });
  }

  /**
   * Get repo info for reports
   */
  getRepoInfo(): { sourceRepo: string; targetRepo: string } {
    return {
      sourceRepo: `${SOURCE_OWNER}/${SOURCE_REPO}`,
      targetRepo: `${TARGET_OWNER}/${TARGET_REPO}`,
    };
  }
}
