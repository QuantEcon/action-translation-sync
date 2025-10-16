# Setup Guide: Testing Translation Sync Action

**Version**: v0.1.0 (Development/Testing Phase)  
**Date**: October 16, 2025  
**Status**: Ready for initial testing

## Overview

This guide walks through setting up the Translation Sync Action for testing with:
- **Source Repository**: `quantecon/lecture-python.myst`
- **Target Repository**: `quantecon/lecture-python.zh-cn`

## Release Strategy for v0.1.x

### Version Tags

We'll create two tags for the testing phase:

1. **`v0.1.0`** - Specific version (immutable)
2. **`v0.1`** - Floating tag (will move with updates)

This allows users to:
- Pin to `v0.1.0` for stability
- Use `v0.1` to automatically get bug fixes and improvements

### Creating the Release

```bash
# In the action-translation-sync repository

# 1. Ensure everything is committed
git add .
git commit -m "Release v0.1.0 - Initial testing release"

# 2. Create the specific version tag
git tag -a v0.1.0 -m "v0.1.0 - Initial testing release

- MyST Markdown parser with block-based parsing
- Diff detection with multi-strategy matching
- Claude Sonnet 4.5 integration
- Support for diff and full translation modes
- Basic GitHub Actions integration

Note: This is a development release for testing. Breaking changes may occur."

# 3. Create the floating v0.1 tag
git tag -a v0.1 -m "v0.1 - Development series (floating tag)"

# 4. Push everything
git push origin main
git push origin v0.1.0
git push origin v0.1
```

### Updating the Floating Tag

When you make improvements during v0.1.x development:

```bash
# 1. Make your changes and commit
git add .
git commit -m "Fix: improve diff detection accuracy"

# 2. Create a new patch version tag (optional)
git tag -a v0.1.1 -m "v0.1.1 - Bug fixes"

# 3. Move the floating v0.1 tag
git tag -f v0.1 -m "v0.1 - Development series (updated)"

# 4. Push with force for the floating tag
git push origin main
git push origin v0.1.1  # if created
git push origin v0.1 --force
```

## Prerequisites

### 1. API Keys and Secrets

You'll need to set up the following secrets in the **source repository** (`lecture-python.myst`):

#### Required Secrets

1. **`ANTHROPIC_API_KEY`**
   - Get from: https://console.anthropic.com/
   - Navigate to: Settings → API Keys → Create Key
   - Scope: Full access to Claude API
   - Cost: Pay-per-use (Sonnet 4.5 pricing applies)

2. **`PAT_TRANSLATION_SYNC`** (Personal Access Token)
   - Why not `GITHUB_TOKEN`? The default `GITHUB_TOKEN` cannot trigger workflows in other repos
   - Create at: https://github.com/settings/tokens
   - Type: Fine-grained token (recommended) or Classic
   - Permissions needed:
     - **Contents**: Read and Write (to create branches and files)
     - **Pull Requests**: Read and Write (to create PRs)
     - **Metadata**: Read (automatic)
   - Repository access: Select `quantecon/lecture-python.zh-cn`
   - Expiration: Set appropriate expiration (90 days for testing)

#### Adding Secrets to GitHub

```
1. Go to: https://github.com/quantecon/lecture-python.myst/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret:
   - Name: ANTHROPIC_API_KEY
     Value: sk-ant-...
   
   - Name: PAT_TRANSLATION_SYNC
     Value: github_pat_...
```

## Built-in Glossary

The action includes a **built-in glossary** with 300+ terms including:
- Economic terms: "dynamic programming" → "动态规划"
- Mathematical terms: "eigenvalue" → "特征值"
- Statistical terms: "distribution" → "分布"
- Economist names: "Robert Solow" → "罗伯特·索洛"

**No configuration needed** - the glossary is automatically loaded and used for all translations!

This ensures **consistent terminology** across all QuantEcon lecture translations.

## Setup: Source Repository (lecture-python.myst)

### 1. Create the Workflow File

Create `.github/workflows/sync-translations.yml`:

```yaml
name: Sync Translations

on:
  pull_request:
    types: [closed]
    paths:
      - 'lectures/**/*.md'

jobs:
  sync-to-chinese:
    # Only run when PR is merged (not just closed)
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
          pr-reviewers: 'mmcky'  # Add your GitHub username
```

**Note**: No `glossary-path` needed - the built-in glossary is used automatically!

### 2. Commit and Push

```bash
cd /path/to/lecture-python.myst

# Create the workflow file
mkdir -p .github/workflows
# (paste the content above into .github/workflows/sync-translations.yml)

# Commit
git add .github/workflows/
git commit -m "Add translation sync workflow for v0.1 testing"
git push origin main
```

## Setup: Target Repository (lecture-python.zh-cn)

### Requirements

The target repository needs:

1. **Same folder structure** as source
   - If source has `lectures/intro.md`, target should have `lectures/intro.md`
   - For new files, you can create empty placeholders (the action will translate them)

2. **`_toc.yml`** file in the same location as source
   - The action will update this when new files are added

### No Special Configuration Needed

The target repository (`lecture-python.zh-cn`) doesn't need any special setup! The action will:
- Create branches automatically
- Commit translated changes
- Open pull requests
- Update TOC files as needed

You just need to:
1. Review and merge the PRs when they appear
2. Report any issues back to the action development

## Testing Workflow

### Test 1: Simple Text Change (Diff Mode)

**Goal**: Test that diff translation works

1. In `lecture-python.myst`, make a small change to an existing file:
   ```bash
   # Edit a file, e.g., lectures/intro.md
   # Change a paragraph or add a sentence
   git add lectures/intro.md
   git commit -m "Update introduction with new example"
   ```

2. Create a PR and merge it:
   ```bash
   git checkout -b test/update-intro
   git push origin test/update-intro
   # Open PR on GitHub, then merge it
   ```

3. Watch the workflow run:
   - Go to: https://github.com/quantecon/lecture-python.myst/actions
   - You should see "Sync Translations" workflow triggered
   - Check logs for any errors

4. Check the target repository:
   - Go to: https://github.com/quantecon/lecture-python.zh-cn/pulls
   - You should see a new PR with the translated changes
   - Review the translation quality

**Expected Result**: 
- Only the changed paragraph is translated
- Existing translations are preserved
- MyST formatting is maintained

### Test 2: New File (Full Mode)

**Goal**: Test full file translation

1. In `lecture-python.myst`, create a new lecture file:
   ```bash
   # Create lectures/test_lecture.md
   cat > lectures/test_lecture.md << 'EOF'
   ---
   jupytext:
     text_representation:
       extension: .md
       format_name: myst
   kernelspec:
     display_name: Python 3
     language: python
     name: python3
   ---

   # Test Lecture

   This is a test lecture to verify translation functionality.

   ## Introduction

   Dynamic programming is a powerful technique.

   ```python
   def example():
       print("Hello, World!")
   ```

   ## Mathematical Content

   The Bellman equation is:

   $$
   V(x) = \max_{a} \{r(x,a) + \beta V(x')\}
   $$

   ## Conclusion

   This concludes our test lecture.
   EOF
   
   git add lectures/test_lecture.md
   git commit -m "Add test lecture for translation sync"
   git checkout -b test/new-lecture
   git push origin test/new-lecture
   # Open PR and merge
   ```

2. Watch the workflow and check the target repository

**Expected Result**:
- Entire file is translated
- Code blocks are preserved unchanged
- Math equations are preserved unchanged
- MyST metadata is preserved
- `_toc.yml` is updated with new entry

### Test 3: Multiple Files

**Goal**: Test batch translation

1. Change multiple files in one PR
2. Merge the PR
3. Verify all files are translated in a single PR to target repo

### Test 4: Error Handling

**Goal**: Test what happens with errors

Try these scenarios:
1. Invalid MyST syntax (should fail gracefully with error message)
2. Very large file (should handle or report size limits)
3. File with complex directives (should preserve them)

## Monitoring and Debugging

### Check Action Logs

1. Go to workflow run: https://github.com/quantecon/lecture-python.myst/actions
2. Click on the run
3. Expand "Sync to Chinese Repository" step
4. Look for:
   - Files detected
   - Changes detected
   - Translation requests
   - PR creation status

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Workflow doesn't trigger | Path filter doesn't match | Check `paths:` in workflow file |
| "Permission denied" | Wrong token or insufficient permissions | Check PAT_TRANSLATION_SYNC token permissions |
| "API key invalid" | Wrong Anthropic key | Verify ANTHROPIC_API_KEY secret |
| Translation quality poor | Missing glossary or context | Add more terms to glossary |
| MyST structure broken | Parser issue | Report with minimal example |

### Cost Monitoring

Claude Sonnet 4.5 pricing (as of Oct 2025):
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

For a typical lecture file (~5,000 words):
- Input tokens: ~6,500
- Output tokens: ~6,500
- Cost per file: ~$0.13

Budget estimate for 100 lectures with ~50% changes:
- ~50 full translations: ~$6.50
- ~50 diff translations (smaller): ~$3.00
- **Total: ~$10** for initial sync

Monitor usage at: https://console.anthropic.com/

## Feedback and Issues

### What to Report

During testing, please report:

1. **Success cases**: What worked well?
2. **Translation quality**: Were translations accurate and natural?
3. **Failures**: What broke? (Include logs)
4. **Performance**: How long did it take?
5. **Suggestions**: What could be improved?

### How to Report

Create issues in the action repository:
https://github.com/quantecon/action-translation-sync/issues

Include:
- Test scenario (Test 1, 2, 3, etc.)
- Source file (if possible)
- Expected vs actual behavior
- Workflow logs (if applicable)

## After Testing

Once testing is complete and stable:

1. **Collect feedback** and make improvements
2. **Create v0.2.0** with fixes
3. **Eventually release v1.0.0** when production-ready
4. **Update workflow to use `@v1`** for stability

## Quick Reference

### Useful Commands

```bash
# Check workflow status
gh run list --repo quantecon/lecture-python.myst

# View workflow logs
gh run view <run-id> --repo quantecon/lecture-python.myst

# List PRs in target repo
gh pr list --repo quantecon/lecture-python.zh-cn

# Test action locally (future feature)
act pull_request --secret-file .secrets
```

### Key URLs

- Source repo: https://github.com/quantecon/lecture-python.myst
- Target repo: https://github.com/quantecon/lecture-python.zh-cn
- Action repo: https://github.com/quantecon/action-translation-sync
- Workflows: https://github.com/quantecon/lecture-python.myst/actions
- API keys: https://console.anthropic.com/

---

**Ready to start testing!** 🚀

Follow the steps above and report any issues you encounter.
