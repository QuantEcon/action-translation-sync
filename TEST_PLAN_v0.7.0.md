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
**Status**: [x] Pass

### 1.2 Build Verification
```bash
npm run build
```

**Expected**: Build succeeds, dist/index.js ~2000kB  
**Status**: [x] Pass

### 1.3 TypeScript Compilation
```bash
npx tsc --noEmit
```

**Expected**: No errors  
**Status**: [x] Pass

---

## Part 2: Push to GitHub

### 2.1 Push Commit
```bash
git push origin main
```

**Expected**: Push succeeds  
**Status**: [x] Pass

### 2.2 Verify GitHub Actions
- [x] Check repository settings are accessible
- [x] Verify action.yml is valid (no syntax errors shown)

---

## Part 3: Sync Mode Testing

### 3.1 Dry Run
```bash
cd tool-test-action-on-github
./test-action-on-github.sh --dry-run
```

**Expected**: Shows 24 test scenarios without making changes  
**Status**: [x] Pass

### 3.2 Run Full Test Suite
```bash
./test-action-on-github.sh
```

**Expected**:
- [x] Both repos reset to base state
- [x] All open PRs closed
- [x] 24 new PRs created in source repo (#540-563)
- [x] Each PR has `test-translation` label

**Status**: [x] Pass

### 3.3 Monitor Sync Workflow
```bash
# Watch source repo actions
gh run list --repo QuantEcon/test-translation-sync --limit 10

# Check for translation PRs in target repo
gh pr list --repo QuantEcon/test-translation-sync.zh-cn
```

**Expected**:
- [x] Workflows triggered for each test PR
- [x] Translation PRs created in target repo (#508-531, one per source PR)
- [x] PRs have `action-translation,automated` labels

**Status**: [x] Pass

### 3.4 Spot Check Translation PRs

Check a few translation PRs for correctness:

| PR | Scenario | Check |
|----|----------|-------|
| #530 | Empty sections | [x] All sections translated, heading-map complete |
| #508 | Intro change | [x] Correct translation, heading-map updated |
| #512 | Add section | [x] New section translated, positioned correctly |
| #516 | Real-world | [x] Code cells preserved, math rendered |
| #524 | New document | [x] New file created with correct content |
| #527 | Rename | [x] File renamed, old file deleted |

**Status**: [x] Pass

---

## Part 4: Evaluate Translations (Existing Tool)

### 4.1 Run Evaluator
```bash
cd tool-test-action-on-github/evaluate
npm install
GITHUB_TOKEN=$(gh auth token) npm run evaluate:post
```

**Expected**:
- [x] Evaluator runs without errors
- [x] Report generated in `reports/evaluation-YYYY-MM-DD.md`
- [x] Review comments posted to all 24 translation PRs

**Status**: [x] Pass

**Notes**: 
- Updated evaluator label from `test-translation` to match source PRs
- Created comprehensive README documenting PR review vs issue comment behavior
- All 24 PRs received review comments successfully

### 4.2 Review Evaluation Report

Check `reports/evaluation-2025-12-05.md`:
- [x] All 24 scenarios evaluated
- [x] Average scores ≥ 8.0 (Translation: 9.5/10, Diff: 10/10)
- [x] No FAIL verdicts (24 PASS, 0 WARN, 0 FAIL)
- [x] Issues identified are minor/cosmetic

**Results Summary**:
- **24/24 PRs PASSED** ✅
- **Translation Quality**: 9.5/10 average (range: 8.9-10.0)
- **Diff Quality**: 10/10 average (perfect)
- **0 warnings, 0 failures**

**Status**: [x] Pass

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

Trigger review workflow on translation PRs using empty commits (triggers `synchronize` event):

```bash
# Test single PR first (e.g., #530 for comparison with evaluator)
gh pr checkout 530 --repo QuantEcon/test-translation-sync.zh-cn
git commit --allow-empty -m "Trigger review workflow"
git push

# Watch workflow execution
gh run watch --repo QuantEcon/test-translation-sync.zh-cn

# Verify review comment posted
gh pr view 530 --repo QuantEcon/test-translation-sync.zh-cn --comments
```

Optional - trigger all 24 PRs:
```bash
# Trigger reviews on all translation PRs
for pr in {508..531}; do
  echo "Triggering review for PR #$pr..."
  gh pr checkout $pr --repo QuantEcon/test-translation-sync.zh-cn
  git commit --allow-empty -m "Trigger review workflow"
  git push
  sleep 5  # Avoid rate limiting
done
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
