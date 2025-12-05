# Implementation Plan: Rename to `action-translation` and Add Review Mode

**Created**: December 5, 2025  
**Target Version**: v0.7.0  
**Status**: ✅ Complete

---

## Overview

Renamed repository from `action-translation-sync` to `action-translation` and added a new `review` mode that provides AI-powered quality assessment of translation PRs.

### Goals

1. **Cleaner naming** - `action-translation` better reflects multi-mode functionality
2. **Review mode** - Automated quality assessment using Claude (adapted from evaluation tool)
3. **Two-repo workflow** - Sync runs in source repo, review runs in target repo

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  SOURCE REPO (e.g., lecture-python-programming.myst)                │
│                                                                     │
│  Workflow: sync-translations.yml                                    │
│  Trigger: PR merged with docs changes                               │
│  Action: quantecon/action-translation (mode: sync)                  │
│  Output: Creates translation PR in target repo                      │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ Creates PR
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TARGET REPO (e.g., lecture-python-programming.myst.fa)             │
│                                                                     │
│  Workflow: review-translations.yml                                  │
│  Trigger: PR opened with 'action-translation' label                 │
│  Action: quantecon/action-translation (mode: review)                │
│  Output: Posts quality review comment on PR                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Repository Rename ✅

- [x] **Step 1**: Rename repository via GitHub UI
  - Go to: https://github.com/QuantEcon/action-translation-sync/settings
  - Change name to: `action-translation`
  - GitHub will auto-redirect old URLs

- [x] **Step 2**: Update local git remote
  ```bash
  git remote set-url origin https://github.com/QuantEcon/action-translation.git
  ```

### Phase 2: Update Action Configuration ✅

- [x] **Step 3**: Update `action.yml`
  - Changed action name to "Translation Action"
  - Added `mode` input (required): `sync` | `review`
  - Added review-specific inputs: `source-repo`, `max-suggestions`
  - Added review mode outputs: `review-verdict`, `translation-score`, `diff-score`
  - Updated default PR labels to `action-translation,automated`

- [x] **Step 4**: Update `package.json`
  - Changed `name` to `action-translation`
  - Added `review` keyword

### Phase 3: Add Review Mode ✅

- [x] **Step 5**: Update `src/index.ts`
  - Added mode routing logic (`runSync()` or `runReview()`)
  - Validated mode-specific required inputs
  - Removed `workflow_dispatch` support (use `test-translation` label instead)

- [x] **Step 6**: Create `src/reviewer.ts` (~700 lines)
  - `TranslationReviewer` class for PR review workflow
  - `parseSourcePRNumber()` - Extract source PR from translation PR body
  - `getSourceDiff()` - Fetch English before/after from source PR
  - `evaluateTranslation()` - Assess translation quality
  - `evaluateDiff()` - Verify diff correctness
  - `generateReviewComment()` - Format markdown review
  - `postReviewComment()` - Post/update comment on GitHub PR

- [x] **Step 7**: Add review types to `src/types.ts`
  - `ReviewInputs`, `ChangedSection`, `TranslationQualityResult`
  - `DiffQualityResult`, `ReviewResult`

- [x] **Step 7b**: Update `src/inputs.ts`
  - Added `getMode()` function (required input)
  - Added `getReviewInputs()` function
  - Added `validateReviewPREvent()` function
  - Removed workflow_dispatch handling (prNumber always available)

- [x] **Step 7c**: Create `src/__tests__/reviewer.test.ts` (28 tests)
  - Helper function tests
  - Change detection tests (new/deleted/modified/renamed)
  - Review comment formatting tests
  - Integration scenarios

### Phase 4: Update Documentation ✅

- [x] **Step 8**: Update `README.md`
  - New action name and description
  - Documented both modes with examples
  - Updated all `action-translation-sync` references

- [x] **Step 9**: Update `docs/` files
  - `INDEX.md`, `QUICKSTART.md`, `ARCHITECTURE.md`
  - `IMPLEMENTATION.md`, `HEADING-MAPS.md`, `CLAUDE-MODELS.md`

- [x] **Step 10**: Update `.github/copilot-instructions.md`
  - New project name, documented review mode, updated module list

- [x] **Step 11**: Update `CHANGELOG.md`
  - Documented v0.7.0 changes (rename, review mode, workflow_dispatch removal)

### Phase 5: Update Tool References ✅

- [x] **Step 12**: Update `tool-test-action-on-github/`
  - Updated `README.md`, `workflow-template.yml`
  - Removed incorrect workflow from target repo on GitHub

- [x] **Step 13**: Update `tool-bulk-translator/`
  - Updated `README.md` and `bulk-translate.ts`

### Phase 6: Build and Test ✅

- [x] **Step 14**: Build and verify
  - `npm run build` - Success (2000kB bundle)
  - `npm test` - 183 tests pass

### Phase 7: Release ⏳

- [ ] **Step 15**: Commit all changes
- [ ] **Step 16**: Create v0.7.0 release tag

---

## New Inputs Summary (action.yml)

### Mode Selection
| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `mode` | **Yes** | - | Operation mode: `sync` or `review` |

### Sync Mode Inputs
| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `target-repo` | Yes* | - | Target repository (owner/repo) |
| `target-language` | Yes* | - | Target language code |
| `docs-folder` | No | `lectures/` | Documentation folder |
| `pr-labels` | No | `action-translation,automated` | PR labels |

### Review Mode Inputs
| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `source-repo` | Yes** | - | Source repository for English content |
| `max-suggestions` | No | `5` | Max suggestions in review |

*Required when `mode: sync`  
**Required when `mode: review`

---

## Key Architectural Decisions

1. **Removed `workflow_dispatch` support**: Ensures every run has source PR metadata
2. **Mode is required**: Forces explicit intent (no default mode)
3. **Source PR parsing**: Reviewer extracts source PR # from translation PR body
4. **Same evaluation approach**: Reviewer uses same before/after comparison as evaluator tool

---

## Progress Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Rename | ✅ Complete | Repository renamed to action-translation |
| Phase 2: Config | ✅ Complete | action.yml and package.json updated |
| Phase 3: Review Mode | ✅ Complete | reviewer.ts + 28 tests |
| Phase 4: Documentation | ✅ Complete | All docs updated |
| Phase 5: Tools | ✅ Complete | Both tools updated |
| Phase 6: Build/Test | ✅ Complete | 183 tests pass |
| Phase 7: Release | ⏳ Pending | Ready to commit and tag |

---

**Last Updated**: December 5, 2025
  - `ReviewInputs`
  - `ChangedSection`
  - `TranslationQualityResult`
  - `DiffQualityResult`
  - `ReviewResult`

- [x] **Step 7b**: Update `src/inputs.ts`
  - Add `getMode()` function
  - Add `getReviewInputs()` function
  - Add `validateReviewPREvent()` function
  - Update Claude model validation patterns

- [x] **Step 7c**: Create `src/__tests__/reviewer.test.ts` (28 tests)
  - Helper function tests (extractPreamble, extractSections via identifyChangedSections)
  - Change detection tests (new/deleted/modified/renamed documents, sections, subsections)
  - Review comment formatting tests
  - Input validation tests
  - Integration scenarios (real-world lecture updates, code cells)

### Phase 4: Update Documentation ✅

- [x] **Step 8**: Update `README.md`
  - New action name and description
  - Document both modes with examples
  - Update all `action-translation-sync` references

- [x] **Step 9**: Update `docs/` files
  - `INDEX.md` - Update project name and overview
  - `QUICKSTART.md` - Add review mode setup
  - `ARCHITECTURE.md` - Add review mode diagram
  - `IMPLEMENTATION.md` - Document reviewer module
  - `HEADING-MAPS.md` - Update action references

- [x] **Step 10**: Update `.github/copilot-instructions.md`
  - New project name
  - Document review mode
  - Update module list

- [x] **Step 11**: Update `CHANGELOG.md`
  - Move Unreleased items to v0.7.0
  - Document:
    - Repository rename
    - New review mode
    - Persian glossary addition

### Phase 5: Update Tool References ✅

- [x] **Step 12**: Update `tool-test-action-on-github/`
  - `README.md` - Update action references
  - `test-action-on-github.sh` - Update any hardcoded references
  - Keep test repo names as `test-translation-sync` (no change needed)

- [x] **Step 13**: Update `tool-bulk-translator/`
  - `README.md` - Update action references

### Phase 6: Build and Test

- [ ] **Step 14**: Build and verify
  ```bash
  npm run build
  npm test
  npm run lint
  ```

- [ ] **Step 15**: Test review mode locally
  - Create test PR in target repo
  - Verify review comment posted correctly

### Phase 7: Release

- [ ] **Step 16**: Commit all changes
  ```bash
  git add .
  git commit -m "feat: rename to action-translation and add review mode (v0.7.0)"
  git push origin main
  ```

- [ ] **Step 17**: Create v0.7.0 release
  - Tag: `v0.7.0`
  - Title: "v0.7.0 - Review Mode & Repository Rename"
  - Release notes from CHANGELOG

---

## New Inputs (action.yml)

### Mode Selection
| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `mode` | **Yes** | - | Operation mode: `sync` or `review` |

### Sync Mode Inputs (existing)
| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `target-repo` | Yes* | - | Target repository (owner/repo) |
| `target-language` | Yes* | - | Target language code |
| `docs-folder` | No | `lectures/` | Documentation folder |
| `pr-labels` | No | `action-translation-sync,automated` | PR labels |
| `pr-reviewers` | No | - | PR reviewers |

### Review Mode Inputs (new)
| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `source-repo` | Yes** | - | Source repository for English content |
| `max-suggestions` | No | `5` | Max suggestions in review |

### Shared Inputs
| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `anthropic-api-key` | Yes | - | Claude API key |
| `github-token` | Yes | - | GitHub token |
| `claude-model` | No | `claude-sonnet-4-5-20250929` | Claude model |
| `glossary-path` | No | - | Custom glossary path |

*Required when `mode: sync`  
**Required when `mode: review`

---

## Example Workflows

### Sync Mode (Source Repo)

```yaml
# .github/workflows/sync-translations-fa.yml
name: Sync Translations (Persian)

on:
  pull_request:
    types: [closed]
    paths:
      - 'lectures/**/*.md'

jobs:
  sync:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: quantecon/action-translation@v0.7
        with:
          mode: sync
          target-repo: 'quantecon/lecture-python-programming.myst.fa'
          target-language: 'fa'
          docs-folder: 'lectures/'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Review Mode (Target Repo)

```yaml
# .github/workflows/review-translations.yml
name: Review Translations

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    if: contains(github.event.pull_request.labels.*.name, 'action-translation-sync')
    runs-on: ubuntu-latest
    steps:
      - uses: quantecon/action-translation@v0.7
        with:
          mode: review
          source-repo: 'quantecon/lecture-python-programming.myst'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Files to Modify

### Core Files
- [ ] `action.yml` - Add mode input and review inputs
- [ ] `package.json` - Update name
- [ ] `src/index.ts` - Add mode routing
- [ ] `src/reviewer.ts` - New file (port from evaluate/)
- [ ] `src/types.ts` - Add review types

### Documentation
- [ ] `README.md`
- [ ] `CHANGELOG.md`
- [ ] `.github/copilot-instructions.md`
- [ ] `docs/INDEX.md`
- [ ] `docs/QUICKSTART.md`
- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/IMPLEMENTATION.md`
- [ ] `docs/HEADING-MAPS.md`

### Tools
- [ ] `tool-test-action-on-github/README.md`
- [ ] `tool-bulk-translator/README.md`

---

## Notes

- **Test repositories**: Keep names as `test-translation-sync` / `test-translation-sync.zh-cn` - still descriptive, less churn
- **Evaluation tool**: Keep in `tool-test-action-on-github/evaluate/` as standalone CLI for batch testing
- **Backward compatibility**: Not required (still in testing/development)
- **GitHub redirects**: Old URLs will auto-redirect after rename

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Rename | ✅ Complete | Repository renamed to action-translation |
| Phase 2: Config | ✅ Complete | action.yml and package.json updated |
| Phase 3: Review Mode | ✅ Complete | index.ts, reviewer.ts, types.ts, inputs.ts + 28 tests |
| Phase 4: Documentation | ✅ Complete | README, CHANGELOG, docs/, copilot-instructions updated |
| Phase 5: Tools | ✅ Complete | tool-test-action-on-github, tool-bulk-translator updated |
| Phase 6: Build/Test | ✅ Complete | Build succeeds, 183 tests pass |
| Phase 7: Release | ⏳ Pending | |

---

**Last Updated**: December 5, 2025
