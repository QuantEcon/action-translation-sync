import { ActionInputs } from './types';
/**
 * Get and validate action inputs
 */
export declare function getInputs(): ActionInputs;
/**
 * Validate that the event is a merged PR, test mode label, or manual dispatch
 */
export declare function validatePREvent(context: any, testMode: boolean): {
    merged: boolean;
    prNumber: number | null;
    isTestMode: boolean;
};
//# sourceMappingURL=inputs.d.ts.map