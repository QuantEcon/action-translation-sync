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
    const docsFolder = core.getInput('docs-folder', { required: false }) || 'lectures/';
    const sourceLanguage = core.getInput('source-language', { required: false }) || 'en';
    const glossaryPath = core.getInput('glossary-path', { required: false }) || ''; // Empty by default - uses built-in
    const tocFile = core.getInput('toc-file', { required: false }) || '_toc.yml';
    const anthropicApiKey = core.getInput('anthropic-api-key', { required: true });
    const claudeModel = core.getInput('claude-model', { required: false }) || 'claude-sonnet-4-20250514';
    const githubToken = core.getInput('github-token', { required: true });
    const prLabelsRaw = core.getInput('pr-labels', { required: false }) || 'translation-sync,automated';
    const prLabels = prLabelsRaw.split(',').map((l) => l.trim()).filter((l) => l.length > 0);
    const prReviewersRaw = core.getInput('pr-reviewers', { required: false }) || '';
    const prReviewers = prReviewersRaw.split(',').map((r) => r.trim()).filter((r) => r.length > 0);
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
    };
}
/**
 * Validate that the event is a merged PR or manual dispatch
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validatePREvent(context) {
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
//# sourceMappingURL=inputs.js.map