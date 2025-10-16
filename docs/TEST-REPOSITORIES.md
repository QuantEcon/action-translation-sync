# Testing with Dedicated Test Repositories

**Recommended Approach**: Use dedicated test repositories instead of production infrastructure

---

## Why Use Test Repositories?

✅ **No Production Pollution**: Keep production repos clean  
✅ **Safe Experimentation**: Test without risk  
✅ **Repeatable**: Easy to reset and retry  
✅ **Complete Testing**: Full workflow including PRs  
✅ **Easy Cleanup**: Delete when done  

❌ **Don't**: Test on `lecture-python.myst` → `lecture-python.zh-cn` (production)  
✅ **Do**: Test on `test-translation-sync` → `test-translation-sync.zh-cn`  

---

## Test Repository Setup

### Step 1: Create Source Repository

Create `quantecon/test-translation-sync`:

```bash
# Create local directory
mkdir test-translation-sync
cd test-translation-sync

# Initialize with structure
mkdir -p lectures .github/workflows
git init
```

Create `lectures/intro.md`:

```markdown
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

# Introduction to Economics

This is a test lecture for translation sync.

## Basic Concepts

Economics is the study of how societies allocate scarce resources.

### Key Terms

- **Scarcity**: Limited resources
- **Opportunity cost**: The value of the next best alternative
- **Supply and demand**: Market forces

## Mathematical Example

The production function:

$$
Y = A K^{\alpha} L^{1-\alpha}
$$

where:
- $Y$ is output
- $K$ is capital
- $L$ is labor
- $A$ is productivity

## Code Example

```python
def calculate_gdp(capital, labor, productivity=1.0, alpha=0.3):
    """
    Calculate GDP using Cobb-Douglas production function
    """
    return productivity * (capital ** alpha) * (labor ** (1 - alpha))

# Example
gdp = calculate_gdp(100, 50)
print(f"GDP: {gdp:.2f}")
```

## MyST Directive Example

```{note}
This is an important note about economic theory.
```

```{warning}
Be careful with assumptions in economic models!
```

## Summary

This lecture covered basic economic concepts with mathematical and code examples.

## References

- Smith, Adam. "The Wealth of Nations" (1776)
- Keynes, John Maynard. "General Theory" (1936)
```

Create `lectures/advanced.md`:

```markdown
---
jupytext:
  text_representation:
    extension: .md
    format_name: myst
---

# Advanced Topics

This lecture covers more advanced economic concepts.

## Dynamic Programming

The Bellman equation:

$$
V(s) = \max_{a} \left\{ r(s,a) + \beta \sum_{s'} P(s'|s,a) V(s') \right\}
$$

## Implementation

```python
import numpy as np

def value_iteration(reward, transition, beta=0.95, tol=1e-6):
    """
    Solve dynamic programming problem using value iteration
    """
    n_states = len(reward)
    V = np.zeros(n_states)
    
    while True:
        V_new = np.max(reward + beta * transition @ V, axis=1)
        if np.max(np.abs(V_new - V)) < tol:
            break
        V = V_new
    
    return V
```

## Application

This method is used in:
- Optimal growth models
- Job search theory
- Asset pricing

```{admonition} Key Insight
Dynamic programming is powerful for sequential decision making.
```
```

Create `lectures/_toc.yml`:

```yaml
format: jb-book
root: intro
chapters:
  - file: advanced
```

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
          target-repo: 'quantecon/test-translation-sync.zh-cn'
          target-language: 'zh-cn'
          docs-folder: 'lectures/'
          source-language: 'en'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.PAT_TRANSLATION_SYNC }}
          pr-labels: 'translation-sync,automated,test'
          pr-reviewers: 'mmcky'
```

Create `README.md`:

```markdown
# Test Translation Sync (Source)

Test repository for translation-sync GitHub Action.

**DO NOT** use for production - this is for testing only.

## Purpose

Test bed for `quantecon/action-translation-sync` development.

## Structure

- `lectures/` - Test lecture content
- `.github/workflows/` - Translation sync workflow

## Target Repository

Translations sync to: `quantecon/test-translation-sync.zh-cn`

## Testing

1. Make changes to files in `lectures/`
2. Create PR
3. Merge PR
4. Watch action run
5. Check target repo for translation PR
```

Push to GitHub:

```bash
git add .
git commit -m "Initial test repository setup"
git branch -M main

# Create on GitHub
gh repo create quantecon/test-translation-sync --public --source=. --remote=origin --push
```

### Step 2: Create Target Repository

Create `quantecon/test-translation-sync.zh-cn`:

```bash
# Create local directory
mkdir test-translation-sync.zh-cn
cd test-translation-sync.zh-cn

# Initialize
mkdir -p lectures
git init
```

Create `lectures/.gitkeep`:

```bash
touch lectures/.gitkeep
```

Create `README.md`:

```markdown
# Test Translation Sync (Chinese Target)

Test repository for Chinese translations.

**DO NOT** use for production - this is for testing only.

## Purpose

Target repository for testing `quantecon/action-translation-sync`.

## Structure

- `lectures/` - Translated lecture content (auto-generated)

## Source Repository

Translations come from: `quantecon/test-translation-sync`

## Process

1. Source repo PR merged → Action runs
2. Action creates PR in this repo with translations
3. Review translation quality
4. Merge or iterate
```

Push to GitHub:

```bash
git add .
git commit -m "Initial target repository setup"
git branch -M main

# Create on GitHub
gh repo create quantecon/test-translation-sync.zh-cn --public --source=. --remote=origin --push
```

---

## Step 3: Configure Secrets

In the **source repository** (`test-translation-sync`):

1. Go to: `https://github.com/quantecon/test-translation-sync/settings/secrets/actions`

2. Add secrets:
   - **`ANTHROPIC_API_KEY`**: Your Claude API key from https://console.anthropic.com/
   - **`PAT_TRANSLATION_SYNC`**: GitHub Personal Access Token
     - Scopes needed: `repo`, `workflow`
     - Create at: https://github.com/settings/tokens

---

## Testing Scenarios

### Test 0: Initial Sync (Manual Trigger)

**Goal**: Sync all existing files for the first time

Since the target repo is empty, you can manually trigger the workflow to do an initial sync:

**Steps**:
1. Go to https://github.com/quantecon/test-translation-sync/actions
2. Click "Sync Translations" workflow in left sidebar
3. Click "Run workflow" button (top right)
4. Leave "file-path" empty to sync all files
5. Click green "Run workflow" button
6. Watch the workflow run in real-time

**Alternative - Sync specific file**:
1. Follow steps 1-3 above
2. Enter file path: `lectures/intro.md`
3. Click "Run workflow"

**Expected**:
- ✅ Workflow runs without PR trigger
- ✅ Detects all .md files in lectures/
- ✅ Translates both intro.md and advanced.md
- ✅ Shows translations in logs
- ❌ PR creation fails (not implemented in v0.1.x)

**Verification**:
- Check workflow logs for translation quality
- Verify glossary terms are used
- Check both files were processed

---

### Test 1: Simple Text Change

**Goal**: Verify basic diff translation

```bash
cd test-translation-sync
git checkout main
git pull

# Create feature branch
git checkout -b test/simple-change

# Edit intro.md - change a few words in "Basic Concepts" section
vim lectures/intro.md

# Commit and push
git add lectures/intro.md
git commit -m "test: update basic concepts section"
git push origin test/simple-change
```

**On GitHub**:
1. Create PR: `test/simple-change` → `main`
2. Merge the PR
3. Go to Actions tab
4. Watch "Sync Translations" workflow run
5. Check `test-translation-sync.zh-cn` for new PR

**Expected**:
- ✅ Workflow detects changed file
- ✅ Translates only changed section
- ✅ Creates PR in target repo
- ✅ PR contains proper translation

### Test 2: New File

**Goal**: Verify full file translation

```bash
# Create new lecture
cat > lectures/new-topic.md << 'EOF'
---
jupytext:
  text_representation:
    extension: .md
    format_name: myst
---

# New Topic

This is a completely new lecture.

## Introduction

Testing full file translation mode.

$$
E = mc^2
$$

```python
print("Hello, World!")
```
EOF

# Commit
git add lectures/new-topic.md
git commit -m "test: add new topic lecture"
git push origin test/new-file
```

Create and merge PR → Check result

**Expected**:
- ✅ Full file translation (not diff mode)
- ✅ Proper MyST syntax preserved
- ✅ Math and code unchanged

### Test 3: Multiple Files

**Goal**: Verify batch processing

```bash
# Edit multiple files
vim lectures/intro.md       # Change something
vim lectures/advanced.md    # Change something

git commit -am "test: update multiple lectures"
git push origin test/multiple-files
```

**Expected**:
- ✅ All changed files processed
- ✅ Single PR with all translations
- ✅ Proper file organization

### Test 4: Math and Code Preservation

**Goal**: Verify special content handling

Edit file to add complex math and code, then merge PR.

**Expected**:
- ✅ Math equations unchanged
- ✅ Code blocks unchanged
- ✅ Only text translated

---

## Verification Checklist

After each test, verify:

- [ ] Workflow completed successfully
- [ ] PR created in target repo
- [ ] Translation quality (use glossary terms)
- [ ] MyST syntax valid
- [ ] Math equations preserved
- [ ] Code blocks preserved
- [ ] Directives preserved
- [ ] No extra/missing content

---

## Monitoring

### Check Workflow Logs

```bash
# List recent workflow runs
gh run list --repo quantecon/test-translation-sync

# View specific run
gh run view <run-id> --repo quantecon/test-translation-sync --log
```

### Check Claude API Usage

Monitor costs at: https://console.anthropic.com/

**Typical Costs**:
- intro.md (full): ~$0.05
- intro.md (diff): ~$0.02
- advanced.md (full): ~$0.08

### Check Translation Quality

Review PRs in target repo:
```bash
gh pr list --repo quantecon/test-translation-sync.zh-cn
gh pr view <pr-number> --repo quantecon/test-translation-sync.zh-cn
```

---

## Debugging

### Workflow Fails

```bash
# Check action logs
gh run view <run-id> --log --repo quantecon/test-translation-sync

# Common issues:
# 1. Missing secrets → Add ANTHROPIC_API_KEY and PAT_TRANSLATION_SYNC
# 2. Wrong model → Check claude-model parameter
# 3. API rate limit → Wait and retry
# 4. Invalid syntax → Check MyST in source file
```

### Translation Quality Issues

1. **Check glossary coverage**: See `glossary/zh-cn.json`
2. **Review prompt**: Check translator.ts for prompt structure
3. **Try different model**: Set `claude-model: 'claude-opus-4-20250514'`

### PR Not Created

**Note**: PR creation is **not implemented yet** in v0.1.x!

You can verify translations work by checking workflow logs:
```bash
gh run view <run-id> --log | grep "translated"
```

---

## Cleanup

### Delete Test Data

```bash
# Delete all PRs in target repo
gh pr list --repo quantecon/test-translation-sync.zh-cn --state all \
  | awk '{print $1}' \
  | xargs -I {} gh pr close {} --repo quantecon/test-translation-sync.zh-cn --delete-branch

# Reset target repo
cd test-translation-sync.zh-cn
git checkout main
git pull
git reset --hard origin/main
rm -rf lectures/*
touch lectures/.gitkeep
git add lectures/.gitkeep
git commit -m "Reset test data"
git push
```

### Archive Test Repositories

When done testing:

```bash
# Archive on GitHub (makes read-only)
gh repo archive quantecon/test-translation-sync
gh repo archive quantecon/test-translation-sync.zh-cn
```

### Delete Test Repositories

If no longer needed:

```bash
# WARNING: Permanent deletion!
gh repo delete quantecon/test-translation-sync --yes
gh repo delete quantecon/test-translation-sync.zh-cn --yes
```

---

## Advantages Over Production Testing

| Aspect | Test Repos | Production Repos |
|--------|-----------|------------------|
| **Risk** | Zero risk | High risk |
| **Cleanup** | Easy to reset | Messy PR history |
| **Speed** | Fast iteration | Careful, slow |
| **Cost** | Minimal content | Large files, expensive |
| **Focus** | Test features | Real content matters |

---

## Next Steps

After testing with test repos:

1. ✅ Verify all features work
2. ✅ Gather metrics (costs, speed, quality)
3. ✅ Fix any bugs found
4. ✅ Update documentation
5. → Then consider production rollout

---

## Quick Setup Script

Save time with this setup script:

```bash
#!/bin/bash
# setup-test-repos.sh

echo "Setting up test repositories..."

# Source repo
gh repo create quantecon/test-translation-sync --public
git clone https://github.com/quantecon/test-translation-sync.git
cd test-translation-sync

# Create structure
mkdir -p lectures .github/workflows
# ... (copy files from above)

git add .
git commit -m "Initial setup"
git push origin main

# Target repo
cd ..
gh repo create quantecon/test-translation-sync.zh-cn --public
git clone https://github.com/quantecon/test-translation-sync.zh-cn.git
cd test-translation-sync.zh-cn

mkdir lectures
touch lectures/.gitkeep
# ... (create README)

git add .
git commit -m "Initial setup"
git push origin main

echo "✅ Test repositories created!"
echo "Next: Add secrets to test-translation-sync"
```

---

**Ready to test!** Follow the steps above to create isolated test repositories.
