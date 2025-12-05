import { ActionInputs, ReviewInputs } from './types';
/**
 * Get the action mode (sync or review)
 */
export declare function getMode(): 'sync' | 'review';
/**
 * Get and validate action inputs for SYNC mode
 */
export declare function getInputs(): ActionInputs;
/**
 * Get and validate action inputs for REVIEW mode
 */
export declare function getReviewInputs(): ReviewInputs;
/**
 * Validate that the event is a merged PR or test mode label (SYNC mode)
 * Note: workflow_dispatch is NOT supported - use test-translation label for manual testing
 */
export declare function validatePREvent(context: any, testMode: boolean): {
    merged: boolean;
    prNumber: number;
    isTestMode: boolean;
};
/**
 * Validate that the event is a PR event (REVIEW mode)
 * Returns PR number for open PRs, or throws if not a PR event
 */
export declare function validateReviewPREvent(context: any): {
    prNumber: number;
};
//# sourceMappingURL=inputs.d.ts.map