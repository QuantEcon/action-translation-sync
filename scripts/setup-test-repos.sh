#!/bin/bash
# Setup script for test translation sync repositories

set -e  # Exit on error

echo "🚀 Setting up test repositories for action-translation-sync"
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install with: brew install gh"
    exit 1
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "📁 Working in: $TEMP_DIR"

#
# SOURCE REPOSITORY
#
echo ""
echo "1️⃣  Creating source repository: test-translation-sync"

cd "$TEMP_DIR"
mkdir test-translation-sync
cd test-translation-sync

# Initialize git
git init
git branch -M main

# Create directory structure
mkdir -p lectures .github/workflows

# Create intro.md
cat > lectures/intro.md << 'EOF'
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

This is a test lecture for translation sync action.

## Basic Concepts

Economics is the study of how societies allocate scarce resources.

### Key Terms

- **Scarcity**: Limited resources
- **Opportunity cost**: The value of the next best alternative
- **Supply and demand**: Market forces that determine prices

## Mathematical Example

The production function:

$$
Y = A K^{\alpha} L^{1-\alpha}
$$

where:
- $Y$ is output
- $K$ is capital  
- $L$ is labor
- $A$ is total factor productivity

## Code Example

```python
def calculate_gdp(capital, labor, productivity=1.0, alpha=0.3):
    """
    Calculate GDP using Cobb-Douglas production function
    
    Parameters:
    -----------
    capital : float
        Capital stock
    labor : float
        Labor force
    productivity : float
        Total factor productivity (default: 1.0)
    alpha : float
        Capital share (default: 0.3)
        
    Returns:
    --------
    float : Calculated GDP
    """
    return productivity * (capital ** alpha) * (labor ** (1 - alpha))

# Example usage
gdp = calculate_gdp(capital=100, labor=50)
print(f"GDP: {gdp:.2f}")
```

## MyST Directives

```{note}
This is an important note about economic theory.
```

```{warning}
Be careful with assumptions in economic models!
```

```{tip}
Always verify your model's predictions against real data.
```

## Summary

This lecture covered:
1. Basic economic concepts
2. Production functions
3. Computational methods

## References

- Smith, Adam. "The Wealth of Nations" (1776)
- Keynes, John Maynard. "The General Theory of Employment, Interest and Money" (1936)
- Solow, Robert M. "A Contribution to the Theory of Economic Growth" (1956)
EOF

# Create advanced.md
cat > lectures/advanced.md << 'EOF'
---
jupytext:
  text_representation:
    extension: .md
    format_name: myst
---

# Advanced Economic Theory

This lecture covers more advanced topics in economic theory.

## Dynamic Programming

The Bellman equation for value iteration:

$$
V(s) = \max_{a \in A(s)} \left\{ r(s,a) + \beta \sum_{s' \in S} P(s'|s,a) V(s') \right\}
$$

where:
- $V(s)$ is the value function
- $s$ is the current state
- $a$ is the action
- $r(s,a)$ is the reward function
- $\beta$ is the discount factor
- $P(s'|s,a)$ is the transition probability

## Implementation

```python
import numpy as np

def value_iteration(reward, transition, beta=0.95, tol=1e-6, max_iter=1000):
    """
    Solve dynamic programming problem using value iteration
    
    Parameters:
    -----------
    reward : ndarray
        Reward matrix (n_states x n_actions)
    transition : ndarray  
        Transition probability matrix (n_states x n_actions x n_states)
    beta : float
        Discount factor (default: 0.95)
    tol : float
        Convergence tolerance (default: 1e-6)
    max_iter : int
        Maximum iterations (default: 1000)
        
    Returns:
    --------
    V : ndarray
        Optimal value function
    policy : ndarray
        Optimal policy
    """
    n_states, n_actions = reward.shape
    V = np.zeros(n_states)
    
    for iteration in range(max_iter):
        V_new = np.zeros(n_states)
        
        for s in range(n_states):
            q_values = reward[s] + beta * np.dot(transition[s], V)
            V_new[s] = np.max(q_values)
        
        if np.max(np.abs(V_new - V)) < tol:
            print(f"Converged in {iteration} iterations")
            break
            
        V = V_new
    
    # Extract optimal policy
    policy = np.zeros(n_states, dtype=int)
    for s in range(n_states):
        q_values = reward[s] + beta * np.dot(transition[s], V)
        policy[s] = np.argmax(q_values)
    
    return V, policy
```

## Applications

Dynamic programming is fundamental to:

1. **Optimal growth models** - Determining optimal savings and consumption
2. **Job search theory** - Finding optimal reservation wages  
3. **Asset pricing** - Valuing financial instruments
4. **Inventory management** - Optimizing stock levels

```{admonition} Key Insight
:class: important

Dynamic programming breaks complex sequential decision problems into simpler subproblems.
This "principle of optimality" is what makes DP so powerful.
```

## Computational Considerations

```{note}
Value iteration converges geometrically at rate $\beta$. Faster convergence can be achieved with:
- Policy iteration
- Modified policy iteration
- Linear programming methods
```
EOF

# Create _toc.yml
cat > lectures/_toc.yml << 'EOF'
format: jb-book
root: intro
chapters:
  - file: advanced
EOF

# Create workflow
cat > .github/workflows/sync-translations.yml << 'EOF'
name: Sync Translations

on:
  pull_request:
    types: [closed]
    paths:
      - 'lectures/**/*.md'
  workflow_dispatch:
    inputs:
      file-path:
        description: 'Specific file to sync (optional, e.g., lectures/intro.md)'
        required: false
        default: ''

jobs:
  sync-to-chinese:
    if: github.event_name == 'workflow_dispatch' || github.event.pull_request.merged == true
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
          github-token: ${{ secrets.QUANTECON_SERVICES_PAT }}
          pr-labels: 'translation-sync,automated,test'
          pr-reviewers: 'mmcky'
EOF

# Create README
cat > README.md << 'EOF'
# Test Translation Sync (Source)

**⚠️ Testing Repository - Not for Production Use**

This repository is for testing the `quantecon/action-translation-sync` GitHub Action.

## Purpose

Test bed for translation sync action development and validation.

## Structure

- `lectures/` - Test lecture content in MyST Markdown
  - `intro.md` - Basic concepts with math and code
  - `advanced.md` - Advanced topics with dynamic programming
  - `_toc.yml` - Table of contents
- `.github/workflows/` - Translation sync workflow

## Target Repository

Translations are synced to: [`quantecon/test-translation-sync.zh-cn`](https://github.com/quantecon/test-translation-sync.zh-cn)

## Workflow

1. Make changes to lectures
2. Create pull request
3. Merge PR
4. Action runs automatically
5. Check target repo for translation PR

## Secrets Required

Add these secrets in repository settings:

- `ANTHROPIC_API_KEY` - Claude API key
- `PAT_TRANSLATION_SYNC` - GitHub Personal Access Token with `repo` scope

## Testing

See [action-translation-sync documentation](https://github.com/quantecon/action-translation-sync/blob/main/docs/TEST-REPOSITORIES.md) for testing guide.
EOF

# Commit and create repo
git add .
git commit -m "Initial test repository setup

Test repository for translation-sync action development.

Content:
- lectures/intro.md - Basic economics with math/code
- lectures/advanced.md - Dynamic programming
- .github/workflows/ - Translation sync workflow

This is a testing repository - not for production use."

echo "   Creating GitHub repository..."
gh repo create quantecon/test-translation-sync --public --source=. --remote=origin --push

echo "   ✅ Source repository created"

#
# TARGET REPOSITORY  
#
echo ""
echo "2️⃣  Creating target repository: test-translation-sync.zh-cn"

cd "$TEMP_DIR"
mkdir test-translation-sync.zh-cn
cd test-translation-sync.zh-cn

# Initialize
git init
git branch -M main
mkdir -p lectures

# Create .gitkeep
touch lectures/.gitkeep

# Create README
cat > README.md << 'EOF'
# Test Translation Sync (Chinese Target)

**⚠️ Testing Repository - Not for Production Use**

This repository receives automated Chinese translations from the source repository.

## Purpose

Target repository for testing Chinese translations generated by `quantecon/action-translation-sync`.

## Structure

- `lectures/` - Translated lecture content (auto-generated)

## Source Repository

Translations come from: [`quantecon/test-translation-sync`](https://github.com/quantecon/test-translation-sync)

## Process

1. PR merged in source repo → Translation action runs
2. Action generates Chinese translations
3. Action creates PR in this repo
4. Review translation quality
5. Merge or provide feedback

## Manual Setup

If translations need to be added manually:

```bash
# Add a translated file
# (Normally done automatically by the action)
```

## Testing

See [action-translation-sync documentation](https://github.com/quantecon/action-translation-sync/blob/main/docs/TEST-REPOSITORIES.md) for testing guide.
EOF

# Commit and create repo
git add .
git commit -m "Initial target repository setup

Target repository for Chinese translations.

This repository will receive automated translation PRs
from test-translation-sync via the action.

This is a testing repository - not for production use."

echo "   Creating GitHub repository..."
gh repo create quantecon/test-translation-sync.zh-cn --public --source=. --remote=origin --push

echo "   ✅ Target repository created"

#
# CLEANUP
#
echo ""
echo "🧹 Cleaning up..."
cd /
rm -rf "$TEMP_DIR"

#
# SUMMARY
#
echo ""
echo "✅ Setup complete!"
echo ""
echo "📦 Created repositories:"
echo "   1. https://github.com/quantecon/test-translation-sync (source)"
echo "   2. https://github.com/quantecon/test-translation-sync.zh-cn (target)"
echo ""
echo "🔑 Next steps:"
echo "   1. Add secrets to test-translation-sync:"
echo "      - ANTHROPIC_API_KEY"
echo "      - QUANTECON_SERVICES_PAT"
echo "   2. Make a test change and create PR"
echo "   3. Merge PR and watch action run"
echo ""
echo "📖 See docs/TEST-REPOSITORIES.md for detailed testing guide"
echo ""
