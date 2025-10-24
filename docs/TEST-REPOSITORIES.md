# GitHub Repository Testing

**Purpose**: Real-world end-to-end validation using actual GitHub repositories and workflows.

---

## Overview

Beyond unit tests (`npm test`), we validate the action in a real GitHub environment with actual PRs, cross-repo operations, and GitHub Actions workflows.

**Test Repositories**:
- **Source**: `quantecon/test-translation-sync` (English)
- **Target**: `quantecon/test-translation-sync.zh-cn` (Chinese translations)

---

## Quick Start

### Automated Testing

```bash
# From repository root
./scripts/test-action-on-github.sh
```

This script automatically:
1. Resets test repositories to clean state
2. Closes all old PRs
3. Creates 9 test PRs covering different scenarios
4. Triggers GitHub Actions on each PR
5. Validates translations in target repo

**Test Scenarios**: New files, section updates, deletions, subsections, root-level files, and more.

---

## First-Time Setup

Only needed once:

```bash
# 1. Create test repositories
gh repo create quantecon/test-translation-sync --public
gh repo create quantecon/test-translation-sync.zh-cn --public

# 2. Add Claude API key
gh secret set ANTHROPIC_API_KEY --repo quantecon/test-translation-sync
```

Then run the test script above.

---

## Why GitHub Testing?

| Benefit | Description |
|---------|-------------|
| **Real Environment** | Tests actual GitHub Actions workflow |
| **Cross-Repo** | Validates PR creation in target repo |
| **Full Integration** | Tests API permissions, secrets, webhooks |
| **Safe** | Dedicated test repos don't affect production |
| **Repeatable** | Automated reset for consistent testing |

---

## Monitoring

```bash
# View test PRs in source repo
gh pr list --repo quantecon/test-translation-sync --label test-translation

# View translation PRs in target repo
gh pr list --repo quantecon/test-translation-sync.zh-cn

# Check GitHub Actions logs
gh run list --repo quantecon/test-translation-sync
gh run view <run-id> --log
```

---

## Iterative Testing

The script is idempotent - safe to run repeatedly:

```bash
# Make code changes
vim src/translator.ts
npm run build && npm run package

# Test again (auto-resets everything)
./scripts/test-action-on-github.sh

# Check results
gh run list --repo quantecon/test-translation-sync
```

---

## Detailed Documentation

For complete information on:
- Test scenarios and data
- Troubleshooting
- Script internals
- File structure and workflow

**See: [scripts/README.md](../scripts/README.md)**

---

## Local vs GitHub Testing

| Aspect | Local (`npm test`) | GitHub Testing |
|--------|-------------------|----------------|
| **Speed** | ~2 seconds | ~2-3 minutes per scenario |
| **Scope** | Unit/integration | End-to-end workflow |
| **Cost** | Free | ~$0.50 per full test run |
| **Use** | Every commit, TDD | Pre-release validation |

**Both are essential**: Local tests for development speed, GitHub tests for release confidence.

---

## Cleanup

The script auto-cleans between runs. When completely done:

```bash
# Archive (read-only)
gh repo archive quantecon/test-translation-sync
gh repo archive quantecon/test-translation-sync.zh-cn

# Or delete
gh repo delete quantecon/test-translation-sync --yes
gh repo delete quantecon/test-translation-sync.zh-cn --yes
```

---

**Ready?** Run `./scripts/test-action-on-github.sh` to start testing! 🚀

For detailed documentation, see [scripts/README.md](../scripts/README.md).
