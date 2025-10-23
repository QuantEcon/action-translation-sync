# Testing Scripts

This directory contains scripts for testing the translation-sync action against real GitHub repositories.

## test-action-on-github.sh

Automated end-to-end testing script that resets and configures test infrastructure on GitHub.

### What It Does

1. **Clones/updates test repositories** from GitHub:
   - `test-translation-sync` (English source)
   - `test-translation-sync.zh-cn` (Chinese target)

2. **Resets both repos to base state**:
   - Force pushes clean base documents to `main`
   - Ensures identical starting point for all tests

3. **Closes all open PRs** on source repo (clean slate)

4. **Creates 9 test PRs** with different scenarios:
   - 01: Intro text change only
   - 02: Title change only
   - 03: Section content change
   - 04: Section reordering
   - 05: New section added
   - 06: Section deleted
   - 07: Subsection change
   - 08: Multi-element changes
   - 09: Real-world lecture update

5. **Adds `test-translation` label** to each PR to trigger the action

6. **Prints summary** of all created PRs

### Prerequisites

- **GitHub CLI** (`gh`) installed and authenticated
- Repositories **must exist** on GitHub:
  - `mmcky/test-translation-sync`
  - `mmcky/test-translation-sync.zh-cn`
- **ANTHROPIC_API_KEY** secret configured in `test-translation-sync` repository

### First-Time Setup

If repositories don't exist yet:

```bash
# Create repositories on GitHub
gh repo create mmcky/test-translation-sync --public --description "Test repository for translation-sync action (English source)"
gh repo create mmcky/test-translation-sync.zh-cn --public --description "Test repository for translation-sync action (Chinese target)"

# Add secret to source repo
gh secret set ANTHROPIC_API_KEY --repo mmcky/test-translation-sync
# Paste your Anthropic API key when prompted
```

### Usage

```bash
# From repository root
./scripts/test-action-on-github.sh
```

**The script is idempotent** - you can run it multiple times:
- Resets repos to clean state each time
- Closes old PRs before creating new ones
- Perfect for iterative testing and debugging

### After Running

1. PRs are automatically created with `test-translation` label
2. GitHub Action triggers immediately on each PR
3. Monitor translation PRs being created in `test-translation-sync.zh-cn`
4. Review results and re-run script as needed

### Workflow

The script creates PRs with the `test-translation` label, which triggers the action in **TEST mode**:
- Uses PR head commit (not merge commit)
- Creates translation PRs labeled with `test-translation`
- Allows testing without merging PRs to main
- Safe to iterate and re-test

### Test Data

Test scenarios are in `test-action-on-github-data/`:
- `workflow-template.yml` - GitHub Actions workflow for test repos
- `base-minimal.md` / `base-minimal-zh-cn.md` - Simple test document
- `base-lecture.md` / `base-lecture-zh-cn.md` - Realistic lecture
- `01-*-minimal.md` through `08-*-minimal.md` - Minimal test scenarios
- `09-real-world-lecture.md` - Realistic scenario

### File Structure

Test files use **flat structure** (root level):
```
test-translation-sync/
├── .github/workflows/translation-sync.yml
└── lecture.md

test-translation-sync.zh-cn/
└── lecture.md
```

### Cleanup

The repos persist between runs (keeps secrets configured).

To fully cleanup when done:

```bash
# Delete repositories
gh repo delete mmcky/test-translation-sync --yes
gh repo delete mmcky/test-translation-sync.zh-cn --yes

# Clean local working directory
rm -rf tmp/test-repos
```

### Troubleshooting

**"Repository does not exist"**
- Create repositories first (see First-Time Setup above)

**"GitHub CLI not authenticated"**
- Run: `gh auth login`
- Follow the prompts

**"Action not triggering"**
- Ensure `ANTHROPIC_API_KEY` secret is set in repository
- Check workflow file exists: `.github/workflows/translation-sync.yml`
- Verify the `test-translation` label was added to PRs
- Check Actions tab on GitHub for error logs

**"Old PRs interfering"**
- Just re-run the script - it closes all old PRs automatically

---

**Note**: The legacy `setup-test-repos.sh` script has been removed. Use `test-action-on-github.sh` for all testing needs.
