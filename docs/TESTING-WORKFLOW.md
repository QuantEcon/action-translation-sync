# Testing Configuration for Translation Sync

## Problem with Production Testing

Testing on `lecture-python.myst` main branch creates noise in production. Instead, we should test on a dedicated test branch.

## Solution: Test Branch Workflow

### Setup for `lecture-python.myst`

#### 1. Create Test Branch

In the **source repository** (`lecture-python.myst`):

```bash
cd /path/to/lecture-python.myst

# Create test branch from main
git checkout main
git pull origin main
git checkout -b test-action-translation-sync
git push -u origin test-action-translation-sync
```

#### 2. Create Test Workflow

Create `.github/workflows/sync-translations-test.yml`:

```yaml
name: Sync Translations (TEST)

on:
  pull_request:
    types: [closed]
    branches:
      - test-action-translation-sync  # Only run on test branch merges
    paths:
      - 'lectures/**/*.md'

jobs:
  sync-to-chinese:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    
    steps:
      - name: Sync to Chinese Repository (TEST)
        uses: quantecon/action-translation-sync@v0.1
        with:
          target-repo: 'quantecon/lecture-python.zh-cn'
          target-language: 'zh-cn'
          docs-folder: 'lectures/'
          source-language: 'en'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.PAT_TRANSLATION_SYNC }}
          pr-labels: 'translation-sync,automated,needs-review,test'
          pr-reviewers: 'mmcky'
```

**Key Changes**:
- Only triggers on PRs merged to `test-action-translation-sync` branch
- Adds `test` label to generated PRs
- Won't affect production `main` branch

#### 3. Test Workflow

**Making Test Changes**:

```bash
# Make sure you're on test branch
git checkout test-action-translation-sync

# Create feature branch from test branch
git checkout -b test/update-intro
```

**Edit a file** (e.g., `lectures/intro.md`):
- Make a small change (change a few words)
- Commit and push

**Create PR**:
- Base: `test-action-translation-sync` (NOT `main`)
- Head: `test/update-intro`
- Title: "[TEST] Update intro.md"

**Merge PR**:
- Merge the PR into `test-action-translation-sync`
- Workflow will trigger
- Translation sync will run

**Advantages**:
- ✅ No noise in production `main` branch
- ✅ Test branch can be reset/recreated as needed
- ✅ Easy to review test PRs vs production PRs
- ✅ Can run multiple tests without cluttering history

### Alternative: Separate Test Repository

If you want complete isolation, create a test repository:

```bash
# Clone lecture-python.myst to test repo
gh repo create quantecon/lecture-python.myst-test --public --clone

# Setup workflow in test repo
# Point to real target repo or another test repo
```

## Production Workflow (When Ready)

Once testing is complete, create the production workflow in `.github/workflows/sync-translations.yml`:

```yaml
name: Sync Translations

on:
  pull_request:
    types: [closed]
    branches:
      - main  # Production branch only
    paths:
      - 'lectures/**/*.md'

jobs:
  sync-to-chinese:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    
    steps:
      - name: Sync to Chinese Repository
        uses: quantecon/action-translation-sync@v0.1
        with:
          target-repo: 'quantecon/lecture-python.zh-cn'
          target-language: 'zh-cn'
          docs-folder: 'lectures/'
          source-language: 'en'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.PAT_TRANSLATION_SYNC }}
          pr-labels: 'translation-sync,automated,needs-review'
          pr-reviewers: 'mmcky'
```

## GitHub Branch Protection (Optional)

Protect the test branch from accidental deletions:

1. Go to: `https://github.com/quantecon/lecture-python.myst/settings/branches`
2. Add rule for `test-action-translation-sync`
3. Enable: "Require pull request before merging"

## Cleanup After Testing

When testing is complete:

```bash
# Delete test branch locally
git branch -D test-action-translation-sync

# Delete test branch on GitHub
git push origin --delete test-action-translation-sync

# Or keep it for future testing rounds
```

## Test Scenarios

### Test 1: Simple Text Change
```bash
git checkout test-action-translation-sync
git checkout -b test/simple-change
# Edit lectures/intro.md - change a few words
git commit -am "test: simple text change"
git push origin test/simple-change
# Create PR to test-action-translation-sync → Merge
```

### Test 2: Add New File
```bash
git checkout test-action-translation-sync
git checkout -b test/new-file
# Create lectures/new-lecture.md
git add lectures/new-lecture.md
git commit -m "test: add new lecture"
git push origin test/new-file
# Create PR to test-action-translation-sync → Merge
```

### Test 3: Multiple Files
```bash
git checkout test-action-translation-sync
git checkout -b test/multiple-files
# Edit multiple files in lectures/
git commit -am "test: update multiple lectures"
git push origin test/multiple-files
# Create PR to test-action-translation-sync → Merge
```

## Monitoring Tests

After merging test PRs:

1. **Check Action Logs**:
   - Go to: Actions tab in `lecture-python.myst`
   - Find "Sync Translations (TEST)" workflow
   - Review logs for errors

2. **Check Target Repository**:
   - Look for PR in `lecture-python.zh-cn`
   - Review translation quality
   - Check glossary usage in diffs

3. **Monitor Costs**:
   - Check Claude API usage: https://console.anthropic.com/
   - Track tokens/costs per run

## Notes

- Test branch can be reset to `main` anytime: `git reset --hard origin/main && git push --force`
- Delete test workflow before going to production
- Keep test PRs clearly labeled with `[TEST]` prefix
- Consider using draft PRs for experimental changes
