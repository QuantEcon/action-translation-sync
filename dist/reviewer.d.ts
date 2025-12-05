/**
 * Translation Reviewer for GitHub Action Review Mode
 *
 * Provides AI-powered quality assessment of translation PRs.
 * Adapted from tool-test-action-on-github/evaluate/src/evaluator.ts
 */
import { ReviewResult, ChangedSection } from './types';
/**
 * Identify changed sections by comparing before and after content
 */
export declare function identifyChangedSections(sourceBefore: string, sourceAfter: string, targetBefore: string, targetAfter: string): ChangedSection[];
/**
 * Translation Reviewer class
 * Evaluates translation quality and posts review comments on PRs
 */
export declare class TranslationReviewer {
    private anthropic;
    private octokit;
    private model;
    private maxSuggestions;
    constructor(anthropicApiKey: string, githubToken: string, model?: string, maxSuggestions?: number);
    /**
     * Parse source PR number from translation PR body
     * Looks for: ### Source PR\n**[#123 - ...
     */
    private parseSourcePRNumber;
    /**
     * Get source PR diff (English before/after)
     */
    private getSourceDiff;
    /**
     * Review a translation PR
     */
    reviewPR(prNumber: number, sourceRepo: string, targetOwner: string, targetRepo: string, docsFolder: string, glossaryTerms?: string, targetLanguage?: string): Promise<ReviewResult>;
    /**
     * Evaluate translation quality using Claude
     */
    private evaluateTranslation;
    /**
     * Evaluate diff quality using Claude
     */
    private evaluateDiff;
    /**
     * Format changed sections for the prompt
     */
    private formatChangedSections;
    /**
     * Normalize issues to strings
     */
    private normalizeIssues;
    /**
     * Generate review comment
     */
    private generateReviewComment;
    /**
     * Post review comment on PR
     */
    private postReviewComment;
}
//# sourceMappingURL=reviewer.d.ts.map