# Quick Reference: Release and Testing Commands

## Release Commands (Run in action-translation-sync repo)

```bash
# Final build check
npm run build

# Create and push release
git add .
git commit -m "Release v0.1.0 - Initial testing release"
git push origin main

# Create tags
git tag -a v0.1.0 -m "v0.1.0 - Initial testing release"
git tag -a v0.1 -m "v0.1 - Development series (floating tag)"

# Push tags
git push origin v0.1.0
git push origin v0.1

# Verify
git ls-remote --tags origin
```

## Setup Commands (Run in lecture-python.myst repo)

```bash
# Create workflow directory
mkdir -p .github/workflows

# Create workflow file (then paste content from SETUP-TESTING.md)
nano .github/workflows/sync-translations.yml

# Optional: Create glossary
mkdir -p .github
nano .github/translation-glossary.json

# Commit and push
git add .github/
git commit -m "Add translation sync workflow for v0.1 testing"
git push origin main
```

## Testing Commands

```bash
# Test 1: Simple change
cd lecture-python.myst
git checkout -b test/update-intro
# Edit lectures/intro.md
git add lectures/intro.md
git commit -m "Update introduction"
git push origin test/update-intro
# Create PR on GitHub, then merge

# Test 2: New file
git checkout main
git pull
git checkout -b test/new-lecture
# Create lectures/test_lecture.md
git add lectures/test_lecture.md  
git commit -m "Add test lecture"
git push origin test/new-lecture
# Create PR on GitHub, then merge

# Watch the action
gh run list --repo quantecon/lecture-python.myst
gh run view <run-id> --log

# Check target repo for PR
gh pr list --repo quantecon/lecture-python.zh-cn
```

## GitHub Secrets Setup

### For lecture-python.myst

1. **ANTHROPIC_API_KEY**
   ```
   Go to: https://console.anthropic.com/ → Settings → API Keys
   Copy key (starts with sk-ant-)
   Add to: https://github.com/quantecon/lecture-python.myst/settings/secrets/actions
   ```

2. **PAT_TRANSLATION_SYNC**
   ```
   Go to: https://github.com/settings/tokens → Fine-grained tokens
   Create new token with:
   - Repository access: quantecon/lecture-python.zh-cn
   - Permissions: Contents (RW), Pull Requests (RW), Metadata (R)
   Add to: https://github.com/quantecon/lecture-python.myst/settings/secrets/actions
   ```

## Monitoring Commands

```bash
# View workflow runs
gh run list --repo quantecon/lecture-python.myst --workflow="Sync Translations"

# View specific run logs
gh run view <run-id> --repo quantecon/lecture-python.myst --log

# List PRs in target repo  
gh pr list --repo quantecon/lecture-python.zh-cn --label translation-sync

# View PR details
gh pr view <pr-number> --repo quantecon/lecture-python.zh-cn
```

## Update Floating Tag (For bug fixes)

```bash
cd action-translation-sync

# Make changes, commit
git add .
git commit -m "Fix: improve error handling"
git push origin main

# Optional: Create patch version
git tag -a v0.1.1 -m "v0.1.1 - Bug fixes"
git push origin v0.1.1

# Move floating tag
git tag -f v0.1 -m "v0.1 - Updated"
git push origin v0.1 --force
```

## Useful URLs

- **Action repo**: https://github.com/quantecon/action-translation-sync
- **Source repo**: https://github.com/quantecon/lecture-python.myst
- **Target repo**: https://github.com/quantecon/lecture-python.zh-cn
- **Workflows**: https://github.com/quantecon/lecture-python.myst/actions
- **Claude console**: https://console.anthropic.com/
- **GitHub tokens**: https://github.com/settings/tokens

## Troubleshooting

```bash
# Action not triggering
# → Check workflow file path: .github/workflows/*.yml
# → Check trigger conditions (merged PR, correct paths)

# Permission errors
# → Verify PAT_TRANSLATION_SYNC has correct permissions
# → Check token hasn't expired

# API errors
# → Verify ANTHROPIC_API_KEY is correct
# → Check API quota/billing

# Translation quality issues
# → Add more terms to glossary
# → Check source file MyST syntax
# → Review Claude API logs
```

## Cost Tracking

```bash
# Check Claude usage
# https://console.anthropic.com/ → Usage

# Estimate: ~$0.13 per lecture file
# Budget: ~$10 for 100 lectures
```

---

**Quick Start**: Run commands from top to bottom for fastest setup!
