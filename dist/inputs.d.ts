import { ActionInputs } from './types';
/**
 * Get and validate action inputs
 */
export declare function getInputs(): ActionInputs;
/**
 * Validate that the event is a merged PR
 */
export declare function validatePREvent(context: any): {
    merged: boolean;
    prNumber: number;
};
//# sourceMappingURL=inputs.d.ts.map