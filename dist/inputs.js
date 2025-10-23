"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInputs = getInputs;
exports.validatePREvent = validatePREvent;
const core = __importStar(require("@actions/core"));
/**
 * Get and validate action inputs
 */
function getInputs() {
    const targetRepo = core.getInput('target-repo', { required: true });
    const targetLanguage = core.getInput('target-language', { required: true });
    // Handle docs-folder: empty string means root level (no prefix)
    const docsFolderInput = core.getInput('docs-folder', { required: false });
    const docsFolder = docsFolderInput; // Use as-is, including empty string for root
    const sourceLanguage = core.getInput('source-language', { required: false }) || 'en';
    const glossaryPath = core.getInput('glossary-path', { required: false }) || ''; // Empty by default - uses built-in
    const tocFile = core.getInput('toc-file', { required: false }) || '_toc.yml';
    const anthropicApiKey = core.getInput('anthropic-api-key', { required: true });
    const claudeModel = core.getInput('claude-model', { required: false }) || 'claude-sonnet-4-5-20250929';
    const githubToken = core.getInput('github-token', { required: true });
    const prLabelsRaw = core.getInput('pr-labels', { required: false }) || 'translation-sync,automated';
    const prLabels = prLabelsRaw.split(',').map((l) => l.trim()).filter((l) => l.length > 0);
    const prReviewersRaw = core.getInput('pr-reviewers', { required: false }) || '';
    const prReviewers = prReviewersRaw.split(',').map((r) => r.trim()).filter((r) => r.length > 0);
    const prTeamReviewersRaw = core.getInput('pr-team-reviewers', { required: false }) || '';
    const prTeamReviewers = prTeamReviewersRaw.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
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
function validatePREvent(context, testMode) {
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
        return { merged: true, prNumber, isTestMode: true }; // merged=true to continue processing
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
//# sourceMappingURL=inputs.js.map