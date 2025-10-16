import { ActionInputs } from './types';
/**
 * Get and validate action inputs
 */
export declare function getInputs(): ActionInputs;
/**
 * Validate that the event is a merged PR or manual dispatch
 */
export declare function validatePREvent(context: any): {
    merged: boolean;
    prNumber: number | null;
};
//# sourceMappingURL=inputs.d.ts.map