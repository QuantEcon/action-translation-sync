# Test Plan: v0.7.0 Release Validation

**Created**: December 5, 2025  
**Version**: v0.7.0  
**Status**: Ready for Testing

---

## Overview

This test plan validates the v0.7.0 release which includes:
1. Repository rename (`action-translation-sync` → `action-translation`)
2. Required `mode` input (`sync` or `review`)
3. New review mode for AI-powered quality assessment
4. Removal of `workflow_dispatch` support

---

## Prerequisites

### GitHub Setup
- [ ] Commit pushed to `QuantEcon/action-translation` main branch
- [ ] Test repos exist:
  - [ ] `QuantEcon/test-translation-sync` (source)
  - [ ] `QuantEcon/test-translation-sync.zh-cn` (target)
- [ ] Secrets configured on source repo:
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `QUANTECON_SERVICES_PAT`

### Local Setup
- [ ] Node.js 20+ installed
- [ ] GitHub CLI (`gh`) installed and authenticated
- [ ] Working directory: `/Users/mmcky/work/quantecon/action-translation`

---

## Part 1: Local Validation

### 1.1 Unit Tests
```bash
cd /Users/mmcky/work/quantecon/action-translation
npm test
```

**Expected**: 183 tests pass  
**Status**: [ ] Pass / [ ] Fail

### 1.2 Build Verification
```bash
npm run build
```

**Expected**: Build succeeds, dist/index.js ~2000kB  
**Status**: [ ] Pass / [ ] Fail

### 1.3 TypeScript Compilation
```bash
npx tsc --noEmit
```

**Expected**: No errors  
**Status**: [ ] Pass / [ ] Fail

---

## Part 2: Push to GitHub

### 2.1 Push Commit
```bash
git push origin main
```

**Expected**: Push succeeds  
**Status**: [ ] Pass / [ ] Fail

### 2.2 Verify GitHub Actions
- [ ] Check repository settings are accessible
- [ ] Verify action.yml is valid (no syntax errors shown)

---

## Part 3: Sync Mode Testing

### 3.1 Dry Run
```bash
cd tool-test-action-on-github
./test-action-on-github.sh --dry-run
```

**Expected**: Shows 24 test scenarios without making changes  
**Status**: [ ] Pass / [ ] Fail

### 3.2 Run Full Test Suite
```bash
./test-action-on-github.sh
```

**Expected**:
- [ ] Both repos reset to base state
- [ ] All open PRs closed
- [ ] 24 new PRs created in source repo
- [ ] Each PR has `test-translation` label

**Status**: [ ] Pass / [ ] Fail

### 3.3 Monitor Sync Workflow
```bash
# Watch source repo actions
gh run list --repo QuantEcon/test-translation-sync --limit 10

# Check for translation PRs in target repo
gh pr list --repo QuantEcon/test-translation-sync.zh-cn
```

**Expected**:
- [ ] Workflows triggered for each test PR
- [ ] Translation PRs created in target repo (one per source PR)
- [ ] PRs have `action-translation,automated` labels

**Status**: [ ] Pass / [ ] Fail

### 3.4 Spot Check Translation PRs

Check a few translation PRs for correctness:

| PR | Scenario | Check |
|----|----------|-------|
| #1 | Intro change | [ ] Correct translation, heading-map updated |
| #5 | Add section | [ ] New section translated, positioned correctly |
| #9 | Real-world | [ ] Code cells preserved, math rendered |
| #17 | New document | [ ] New file created with correct content |
| #20 | Rename | [ ] File renamed, old file deleted |

**Status**: [ ] Pass / [ ] Fail

---

## Part 4: Evaluate Translations (Existing Tool)

### 4.1 Run Evaluator
```bash
cd tool-test-action-on-github/evaluate
npm install
npm run evaluate
```

**Expected**:
- [ ] Evaluator runs without errors
- [ ] Report generated in `reports/evaluation-YYYY-MM-DD.md`

**Status**: [ ] Pass / [ ] Fail

### 4.2 Review Evaluation Report

Check `reports/evaluation-*.md`:
- [ ] All 24 scenarios evaluated
- [ ] Average scores ≥ 8.0
- [ ] No FAIL verdicts
- [ ] Issues identified are minor/cosmetic

**Status**: [ ] Pass / [ ] Fail

---

## Part 5: Review Mode Testing (New Feature)

### 5.1 Set Up Review Workflow

Add review workflow to target repo:

```bash
cd /tmp
rm -rf test-translation-sync.zh-cn
git clone https://github.com/QuantEcon/test-translation-sync.zh-cn.git
cd test-translation-sync.zh-cn
mkdir -p .github/workflows
```

Create `.github/workflows/review-translations.yml`:
```yaml
name: Review Translations

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    # Only review PRs created by the sync action
    if: contains(github.event.pull_request.labels.*.name, 'action-translation')
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout action
        uses: actions/checkout@v4
        with:
          repository: QuantEcon/action-translation
          path: action
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd action
          npm ci
      
      - name: Review translation
        uses: ./action
        with:
          mode: review
          source-repo: 'QuantEcon/test-translation-sync'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

```bash
git add .github/workflows/review-translations.yml
git commit -m "feat: add review workflow for translation PRs"
git push origin main
```

**Status**: [ ] Complete

### 5.2 Trigger Review Workflow

Re-trigger a translation PR to test review:

```bash
# Find an open translation PR
gh pr list --repo QuantEcon/test-translation-sync.zh-cn

# Add a comment to trigger workflow (or close/reopen)
gh pr comment <PR_NUMBER> --repo QuantEcon/test-translation-sync.zh-cn --body "Testing review workflow"
```

Or create a new sync to generate fresh PR:
```bash
# Re-run one test scenario
cd tool-test-action-on-github/test-translation-sync
git checkout test/01-intro-change-minimal
# Make a small change
echo "" >> lecture-minimal.md
git add lecture-minimal.md
git commit -m "Trigger re-sync"
git push -f origin test/01-intro-change-minimal
```

**Status**: [ ] Complete

### 5.3 Verify Review Comment

Check the translation PR for review comment:

```bash
gh pr view <PR_NUMBER> --repo QuantEcon/test-translation-sync.zh-cn --comments
```

**Expected Review Comment Contains**:
- [ ] Translation Quality section with score
- [ ] Diff Quality section with score
- [ ] Overall verdict (PASS/WARN/FAIL)
- [ ] Specific suggestions (if any)
- [ ] Source PR reference

**Status**: [ ] Pass / [ ] Fail

### 5.4 Test Review Mode Edge Cases

| Scenario | Test Method | Expected |
|----------|-------------|----------|
| Missing source PR | Edit PR body to remove source ref | Graceful error message |
| New document | Check PR for new doc (test 17) | All sections marked as "added" |
| Deleted document | Check PR for deleted doc (test 18) | Marked as deletion |
| Renamed document | Check PR for rename (test 20) | Correctly identified |

**Status**: [ ] Pass / [ ] Fail

---

## Part 6: Comparison Test

### 6.1 Compare Evaluator vs Reviewer

For the same PR, compare:

| Metric | Evaluator | Reviewer | Match? |
|--------|-----------|----------|--------|
| Translation Score | ___ | ___ | [ ] |
| Diff Score | ___ | ___ | [ ] |
| Verdict | ___ | ___ | [ ] |
| Key Issues | ___ | ___ | [ ] |

**Notes**: Scores may differ slightly due to different prompts and context, but should be in same range (±1 point).

**Status**: [ ] Acceptable / [ ] Needs Investigation

---

## Part 7: Cleanup

### 7.1 Close Test PRs (Optional)

```bash
# Close all source PRs
gh pr list --repo QuantEcon/test-translation-sync --state open --json number --jq '.[].number' | xargs -I {} gh pr close {} --repo QuantEcon/test-translation-sync

# Close all target PRs  
gh pr list --repo QuantEcon/test-translation-sync.zh-cn --state open --json number --jq '.[].number' | xargs -I {} gh pr close {} --repo QuantEcon/test-translation-sync.zh-cn
```

### 7.2 Document Results

Record test results:
- Date: _______________
- Tester: _______________
- Overall Status: [ ] PASS / [ ] FAIL
- Notes: _______________

---

## Summary Checklist

| Part | Description | Status |
|------|-------------|--------|
| 1 | Local Validation | [ ] |
| 2 | Push to GitHub | [ ] |
| 3 | Sync Mode Testing | [ ] |
| 4 | Evaluate Translations | [ ] |
| 5 | Review Mode Testing | [ ] |
| 6 | Comparison Test | [ ] |
| 7 | Cleanup | [ ] |

**Final Verdict**: [ ] Ready for Release / [ ] Needs Fixes

---

## Known Issues / Notes

_Document any issues discovered during testing:_

1. 
2. 
3. 

---

## Next Steps After Testing

If all tests pass:

1. Create v0.7.0 release tag:
   ```bash
   git tag -a v0.7.0 -m "v0.7.0 - Review Mode & Repository Rename"
   git push origin v0.7.0
   ```

2. Create GitHub Release with notes from CHANGELOG.md

3. Update floating tags:
   ```bash
   git tag -f v0 -m "Latest v0.x"
   git push origin v0 --force
   ```
