# Release v0.1.0 - Setup Instructions

**Date**: October 16, 2025  
**Status**: Ready to release

## Prerequisites

✅ You have:
- GitHub CLI (`gh`) installed
- Repository `quantecon/action-translation-sync` available
- All files committed locally

## Step-by-Step Release Process

### Step 1: Initialize Git Repository

```bash
cd /Users/mmcky/work/quantecon/action-translation-sync

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - v0.1.0

Translation Sync Action for QuantEcon Lectures

Core Features:
- MyST Markdown parser with block-based parsing
- Diff detection with multi-strategy matching
- Claude Sonnet 4.5 integration (claude-sonnet-4.5-20241022)
- Support for diff and full translation modes
- Built-in glossary with 342 terms (glossary/zh-cn.json)
- Language-aware glossary loading
- GitHub Actions workflow integration

Components:
- src/parser.ts - MyST Markdown parser
- src/diff-detector.ts - Change detection engine
- src/translator.ts - Claude Sonnet 4.5 API integration
- src/file-processor.ts - Translation workflow orchestration
- src/index.ts - GitHub Action entry point
- glossary/zh-cn.json - Simplified Chinese glossary (342 terms)

Documentation:
- docs/SETUP-TESTING.md - Complete setup guide
- docs/ARCHITECTURE.md - System architecture
- docs/IMPLEMENTATION.md - Implementation details
- docs/BUILT-IN-GLOSSARY.md - Glossary documentation
- glossary/README.md - Glossary structure and contribution guide
- .github/copilot-instructions.md - Development guidelines

Build Status:
- TypeScript compilation: ✅ Passing
- Bundle size: 2,452 KB
- Unit tests: ✅ Passing (2/2)

Known Limitations:
- GitHub PR integration not yet implemented
- TOC management not yet implemented
- Limited test coverage
- No error recovery for partial failures

Note: This is a v0.1.x development release. Breaking changes may occur.
For testing with quantecon/lecture-python.myst → quantecon/lecture-python.zh-cn"
```

### Step 2: Check for Existing GitHub Repository

```bash
# Check if repository exists on GitHub
gh repo view quantecon/action-translation-sync
```

**If repository EXISTS**:
- Continue to Step 3

**If repository DOES NOT EXIST**:
```bash
# Create repository on GitHub
gh repo create quantecon/action-translation-sync \
  --public \
  --description "Automatically sync translations across QuantEcon lecture repositories using Claude Sonnet 4.5" \
  --source=. \
  --remote=origin
```

### Step 3: Add Remote and Push

```bash
# If repo already exists, add remote
git remote add origin https://github.com/quantecon/action-translation-sync.git

# Set main as default branch
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 4: Create Release Tags

```bash
# Create v0.1.0 tag (immutable, specific version)
git tag -a v0.1.0 -m "v0.1.0 - Initial Development Release

First testing release for QuantEcon lecture translation automation.

## Core Features

### Translation Engine
- ✅ MyST Markdown parser with block-based parsing
- ✅ Intelligent diff detection (translates only changes)
- ✅ Claude Sonnet 4.5 integration (claude-sonnet-4.5-20241022)
- ✅ Dual mode: diff (incremental) and full (new files)
- ✅ Built-in glossary with 342 terms
- ✅ Language-aware glossary loading (glossary/{language}.json)

### Built-in Glossary (glossary/zh-cn.json)
- 152 economic terms
- 98 mathematical terms
- 32 statistical terms
- 42 economist names
- Automatic loading based on target language
- Single source of truth for all translations

### Components
- src/parser.ts - MyST Markdown parser (unified/remark)
- src/diff-detector.ts - Multi-strategy change detection
- src/translator.ts - Claude Sonnet 4.5 API integration
- src/file-processor.ts - Translation orchestration
- src/index.ts - GitHub Action entry point

### Documentation
- Complete setup guide (docs/SETUP-TESTING.md)
- Architecture documentation (docs/ARCHITECTURE.md)
- Implementation details (docs/IMPLEMENTATION.md)
- Glossary guide (docs/BUILT-IN-GLOSSARY.md)
- Development guidelines (.github/copilot-instructions.md)

## Build Information

- TypeScript: 5.3 (strict mode)
- Node.js: 20
- Bundle size: 2,452 KB
- Tests: ✅ Passing (2/2)

## Testing

Intended for testing with:
- Source: quantecon/lecture-python.myst
- Target: quantecon/lecture-python.zh-cn

See docs/SETUP-TESTING.md for complete setup instructions.

## Known Limitations

⚠️ Development Release - Not Production Ready

- GitHub PR integration: NOT implemented (will fail at PR creation)
- TOC management: NOT implemented
- Test coverage: Basic only
- Error recovery: Limited

## Expected Behavior

During testing, the action will:
- ✅ Detect changed files in merged PRs
- ✅ Parse MyST Markdown correctly
- ✅ Identify changes (diff mode) or full content (new files)
- ✅ Call Claude API with glossary terms
- ✅ Generate translations
- ❌ Fail at PR creation (not implemented yet)

You can verify translation quality from workflow logs before PR creation is implemented.

## Breaking Changes

This is a v0.1.x release - API may change without notice during development.

## Next Steps

After testing and feedback:
- Implement GitHub PR integration (v0.2.0)
- Add TOC management (v0.2.0)
- Expand test coverage (v0.3.0)
- Eventually: v1.0.0 (production ready)

## Cost Estimates

Claude Sonnet 4.5 pricing (October 2025):
- ~\$0.13 per typical lecture file
- ~\$10 for 100 lecture initial sync
- Monitor at: https://console.anthropic.com/

## Support

- Documentation: docs/INDEX.md
- Issues: https://github.com/quantecon/action-translation-sync/issues
- Setup help: docs/SETUP-TESTING.md"

# Create v0.1 floating tag (will move with updates)
git tag -a v0.1 -m "v0.1 - Development Series (Floating Tag)

This tag tracks the latest v0.1.x release.

## Usage

For automatic updates (recommended for testing):
\`\`\`yaml
uses: quantecon/action-translation-sync@v0.1
\`\`\`

For pinned version (stability):
\`\`\`yaml
uses: quantecon/action-translation-sync@v0.1.0
\`\`\`

## Development Phase

⚠️ This is a development series - breaking changes may occur.

When v0.1.1, v0.1.2, etc. are released, this tag will move to point to the latest patch version.

## Stability

Use v0.1.x series for:
- ✅ Testing and development
- ✅ Getting latest bug fixes automatically
- ❌ Production use (wait for v1.0)

## Updates

This tag will be force-pushed when new v0.1.x versions are released:
\`\`\`bash
git tag -f v0.1 -m \"Updated to v0.1.x\"
git push origin v0.1 --force
\`\`\`"

# Push tags to GitHub
git push origin v0.1.0
git push origin v0.1
```

### Step 5: Create GitHub Release (Optional but Recommended)

```bash
# Create release on GitHub with notes
gh release create v0.1.0 \
  --title "v0.1.0 - Initial Development Release" \
  --notes-file docs/RELEASE-NOTES-v0.1.0.md \
  --prerelease \
  --target main
```

Or manually:
1. Go to: https://github.com/quantecon/action-translation-sync/releases/new
2. Select tag: `v0.1.0`
3. Copy content from Step 4 tag message
4. Check "This is a pre-release"
5. Click "Publish release"

### Step 6: Verify Release

```bash
# Verify tags exist
git tag -l

# Verify on GitHub
gh release list

# Verify remote tags
git ls-remote --tags origin

# Should see:
# v0.1
# v0.1.0
```

### Step 7: Update README Badge (Optional)

Add release badge to README.md:

```markdown
# Translation Sync Action

[![Release](https://img.shields.io/github/v/release/quantecon/action-translation-sync?include_prereleases)](https://github.com/quantecon/action-translation-sync/releases)
[![License](https://img.shields.io/github/license/quantecon/action-translation-sync)](LICENSE)

A GitHub Action that automatically synchronizes translations...
```

## Post-Release: Setup for Testing

Now you can set up `lecture-python.myst` to use the action!

### In `lecture-python.myst` Repository

1. **Add Secrets**

Go to: https://github.com/quantecon/lecture-python.myst/settings/secrets/actions

Add:
- `ANTHROPIC_API_KEY` - From https://console.anthropic.com/
- `PAT_TRANSLATION_SYNC` - From https://github.com/settings/tokens

2. **Create Workflow File**

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

3. **Commit and Push**

```bash
cd /path/to/lecture-python.myst

git add .github/workflows/sync-translations.yml
git commit -m "Add translation sync workflow (v0.1 testing)"
git push origin main
```

4. **Test It!**

Follow the test scenarios in `docs/SETUP-TESTING.md`:
- Test 1: Simple text change
- Test 2: New file
- Test 3: Multiple files

## Troubleshooting

### Remote Already Exists
```bash
git remote remove origin
git remote add origin https://github.com/quantecon/action-translation-sync.git
```

### Tag Already Exists
```bash
git tag -d v0.1.0
git tag -d v0.1
# Recreate tags from Step 4
```

### Push Rejected
```bash
# Force push if needed (only do this if you're sure!)
git push origin main --force
git push origin v0.1.0 --force
git push origin v0.1 --force
```

## Verification Checklist

After completing all steps:

- [ ] Git repository initialized
- [ ] Remote added: `quantecon/action-translation-sync`
- [ ] Code pushed to `main` branch
- [ ] Tag `v0.1.0` created and pushed
- [ ] Tag `v0.1` created and pushed
- [ ] GitHub release created (optional)
- [ ] Tags visible on GitHub
- [ ] Repository is public
- [ ] Documentation updated

## Next Steps

1. ✅ Complete this release process
2. Configure `lecture-python.myst` with workflow
3. Add secrets to `lecture-python.myst`
4. Run first test (merge a PR with a small change)
5. Review workflow logs
6. Iterate based on results
7. Gather feedback
8. Plan v0.2.0 improvements

## Quick Commands Summary

```bash
# Complete release in one go:
git init
git add .
git commit -m "Initial commit - v0.1.0"
git remote add origin https://github.com/quantecon/action-translation-sync.git
git branch -M main
git push -u origin main
git tag -a v0.1.0 -m "v0.1.0 - Initial Development Release"
git tag -a v0.1 -m "v0.1 - Development Series"
git push origin v0.1.0
git push origin v0.1
```

---

**Ready to release!** Follow the steps above to publish v0.1.0 🚀
