#!/bin/bash
# Unified script to setup/reset test repositories for action-translation-sync
# This script will:
# 1. Delete existing test repos (if they exist)
# 2. Create fresh English source repo with test content
# 3. Create fresh Chinese target repo with Chinese translations
# 4. Setup GitHub Actions workflow

set -e  # Exit on error

echo "🚀 Setting up test repositories for action-translation-sync"
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install with: brew install gh"
    exit 1
fi

# Configuration
ORG="quantecon"
SOURCE_REPO="test-translation-sync"
TARGET_REPO="test-translation-sync.zh-cn"
TEMP_DIR=$(mktemp -d)

echo "📁 Working in: $TEMP_DIR"
echo ""

################################################################################
# STEP 0: Check for existing repositories
################################################################################

echo "0️⃣  Checking for existing repositories..."
echo ""

if gh repo view ${ORG}/${SOURCE_REPO} &> /dev/null; then
    echo "⚠️  Repository ${ORG}/${SOURCE_REPO} already exists"
    echo "   Please delete it manually first:"
    echo "   https://github.com/${ORG}/${SOURCE_REPO}/settings"
    echo ""
    exit 1
fi

if gh repo view ${ORG}/${TARGET_REPO} &> /dev/null; then
    echo "⚠️  Repository ${ORG}/${TARGET_REPO} already exists"
    echo "   Please delete it manually first:"
    echo "   https://github.com/${ORG}/${TARGET_REPO}/settings"
    echo ""
    exit 1
fi

echo "✅ No existing repositories found - ready to create fresh repos"
echo ""

################################################################################
# STEP 1: Create English (source) repository
################################################################################

echo "1️⃣  Creating source repository: ${SOURCE_REPO}"
echo ""

cd "$TEMP_DIR"
mkdir ${SOURCE_REPO}
cd ${SOURCE_REPO}

# Initialize git
git init
git branch -M main

# Create directory structure
mkdir -p lectures .github/workflows

# Create intro.md (English)
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

# Create advanced.md (English)
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

# Create translation sync workflow
cat > .github/workflows/translation-sync.yml << 'EOF'
name: Translation Sync

on:
  pull_request:
    types: [closed]
    branches:
      - main
  workflow_dispatch:

jobs:
  sync-translations:
    if: github.event_name == 'workflow_dispatch' || github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Sync to Chinese
        uses: quantecon/action-translation-sync@main
        with:
          target-repo: quantecon/test-translation-sync.zh-cn
          target-language: zh-cn
          github-token: \${{ secrets.QUANTECON_SERVICES_PAT }}
          anthropic-api-key: \${{ secrets.ANTHROPIC_API_KEY }}
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

## Testing

See [action-translation-sync documentation](https://github.com/quantecon/action-translation-sync/blob/main/docs/TEST-REPOSITORIES.md) for testing guide.
EOF

# Commit
git add .
git commit -m "Initial test repository setup

Test repository for translation-sync action development.

Content:
- lectures/intro.md - Basic economics with math/code
- lectures/advanced.md - Dynamic programming
- lectures/_toc.yml - Table of contents
- .github/workflows/ - Translation sync workflow

This is a testing repository - not for production use."

# Create GitHub repository
echo "   Creating GitHub repository..."
gh repo create ${ORG}/${SOURCE_REPO} --public --source=. --remote=origin --push

echo "   ✅ Source repository created"
echo ""

# Continue in next part due to length...

################################################################################
# STEP 2: Create Chinese (target) repository
################################################################################

echo "2️⃣  Creating target repository: ${TARGET_REPO}"
echo ""

cd "$TEMP_DIR"
mkdir ${TARGET_REPO}
cd ${TARGET_REPO}

# Initialize git
git init
git branch -M main

# Create directory structure
mkdir -p lectures .github/workflows

# Create intro.md (Chinese)
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

# 经济学导论

这是一个用于测试翻译同步操作的讲座。

## 基本概念

经济学是研究社会如何配置稀缺资源的学科。

### 关键术语

- **稀缺性**：有限的资源
- **机会成本**：次优选择的价值
- **供给与需求**：决定价格的市场力量

## 数学示例

生产函数：

$$
Y = A K^{\alpha} L^{1-\alpha}
$$

其中：
- $Y$ 是产出
- $K$ 是资本
- $L$ 是劳动力
- $A$ 是全要素生产率

## 代码示例

```python
def calculate_gdp(capital, labor, productivity=1.0, alpha=0.3):
    """
    使用柯布-道格拉斯生产函数计算GDP
    
    参数：
    -----------
    capital : float
        资本存量
    labor : float
        劳动力
    productivity : float
        全要素生产率（默认：1.0）
    alpha : float
        资本份额（默认：0.3）
        
    返回：
    --------
    float : 计算的GDP
    """
    return productivity * (capital ** alpha) * (labor ** (1 - alpha))

# 使用示例
gdp = calculate_gdp(capital=100, labor=50)
print(f"GDP: {gdp:.2f}")
```

## MyST 指令

```{note}
这是关于经济理论的重要说明。
```

```{warning}
小心经济模型中的假设！
```

```{tip}
始终根据实际数据验证模型的预测。
```

## 总结

本讲座涵盖：
1. 基本经济概念
2. 生产函数
3. 计算方法

## 参考文献

- Smith, Adam. "The Wealth of Nations" (1776)
- Keynes, John Maynard. "The General Theory of Employment, Interest and Money" (1936)
- Solow, Robert M. "A Contribution to the Theory of Economic Growth" (1956)
EOF

# Create advanced.md (Chinese)
cat > lectures/advanced.md << 'EOF'
---
jupytext:
  text_representation:
    extension: .md
    format_name: myst
---

# 高级经济理论

本讲座涵盖经济理论中更高级的主题。

## 动态规划

值迭代的贝尔曼方程：

$$
V(s) = \max_{a \in A(s)} \left\{ r(s,a) + \beta \sum_{s' \in S} P(s'|s,a) V(s') \right\}
$$

其中：
- $V(s)$ 是值函数
- $s$ 是当前状态
- $a$ 是行动
- $r(s,a)$ 是奖励函数
- $\beta$ 是折现因子
- $P(s'|s,a)$ 是转移概率

## 实现

```python
import numpy as np

def value_iteration(reward, transition, beta=0.95, tol=1e-6, max_iter=1000):
    """
    使用值迭代求解动态规划问题
    
    参数：
    -----------
    reward : ndarray
        奖励矩阵 (n_states x n_actions)
    transition : ndarray  
        转移概率矩阵 (n_states x n_actions x n_states)
    beta : float
        折现因子（默认：0.95）
    tol : float
        收敛容忍度（默认：1e-6）
    max_iter : int
        最大迭代次数（默认：1000）
        
    返回：
    --------
    V : ndarray
        最优值函数
    policy : ndarray
        最优策略
    """
    n_states, n_actions = reward.shape
    V = np.zeros(n_states)
    
    for iteration in range(max_iter):
        V_new = np.zeros(n_states)
        
        for s in range(n_states):
            q_values = reward[s] + beta * np.dot(transition[s], V)
            V_new[s] = np.max(q_values)
        
        if np.max(np.abs(V_new - V)) < tol:
            print(f"在 {iteration} 次迭代后收敛")
            break
            
        V = V_new
    
    # 提取最优策略
    policy = np.zeros(n_states, dtype=int)
    for s in range(n_states):
        q_values = reward[s] + beta * np.dot(transition[s], V)
        policy[s] = np.argmax(q_values)
    
    return V, policy
```

## 应用

动态规划是以下领域的基础：

1. **最优增长模型** - 确定最优储蓄和消费
2. **工作搜索理论** - 寻找最优保留工资
3. **资产定价** - 评估金融工具价值
4. **库存管理** - 优化库存水平

```{admonition} 关键见解
:class: important

动态规划将复杂的序列决策问题分解为更简单的子问题。
这种"最优性原理"是使DP如此强大的原因。
```

## 计算考虑

```{note}
值迭代以速率 $\beta$ 几何收敛。可以通过以下方法实现更快的收敛：
- 策略迭代
- 修改策略迭代
- 线性规划方法
```
EOF

# Create _toc.yml (same as English)
cat > lectures/_toc.yml << 'EOF'
format: jb-book
root: intro
chapters:
  - file: advanced
EOF

# Create translation sync workflow (same as English)
cat > .github/workflows/translation-sync.yml << 'EOF'
name: Translation Sync

on:
  pull_request:
    types: [closed]
    branches:
      - main
  workflow_dispatch:

jobs:
  sync-translations:
    if: github.event_name == 'workflow_dispatch' || github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Sync to Chinese
        uses: quantecon/action-translation-sync@main
        with:
          target-repo: quantecon/test-translation-sync.zh-cn
          target-language: zh-cn
          github-token: \${{ secrets.QUANTECON_SERVICES_PAT }}
          anthropic-api-key: \${{ secrets.ANTHROPIC_API_KEY }}
EOF

# Create README
cat > README.md << 'EOF'
# 测试翻译同步（目标）

**⚠️ 测试仓库 - 不用于生产环境**

此仓库用于测试 `quantecon/action-translation-sync` GitHub 操作。

## 目的

翻译同步操作开发和验证的测试平台。

## 结构

- `lectures/` - MyST Markdown 格式的测试讲座内容
  - `intro.md` - 基本概念与数学和代码
  - `advanced.md` - 动态规划等高级主题
  - `_toc.yml` - 目录
- `.github/workflows/` - 翻译同步工作流

## 源仓库

翻译从以下仓库同步：[`quantecon/test-translation-sync`](https://github.com/quantecon/test-translation-sync)

## 工作流程

1. 源仓库发生更改
2. 创建并合并拉取请求
3. 操作自动运行
4. 在此仓库中检查翻译PR

## 测试

有关测试指南，请参阅 [action-translation-sync 文档](https://github.com/quantecon/action-translation-sync/blob/main/docs/TEST-REPOSITORIES.md)。
EOF

# Commit
git add .
git commit -m "Initial test repository setup (Chinese)

Test repository for translation-sync action development.

Content:
- lectures/intro.md - 经济学导论（中文）
- lectures/advanced.md - 高级经济理论（中文）
- lectures/_toc.yml - 目录
- .github/workflows/ - Translation sync workflow

This is a testing repository - not for production use."

# Create GitHub repository
echo "   Creating GitHub repository..."
gh repo create ${ORG}/${TARGET_REPO} --public --source=. --remote=origin --push

echo "   ✅ Target repository created"
echo ""

################################################################################
# STEP 3: Verification and Cleanup
################################################################################

echo "3️⃣  Verification"
echo ""

echo "   Checking source repository..."
SOURCE_FILES=$(gh api repos/${ORG}/${SOURCE_REPO}/contents/lectures --jq '.[].name' | wc -l)
echo "   Source repo has ${SOURCE_FILES} files in lectures/"

echo "   Checking target repository..."
TARGET_FILES=$(gh api repos/${ORG}/${TARGET_REPO}/contents/lectures --jq '.[].name' | wc -l)
echo "   Target repo has ${TARGET_FILES} files in lectures/"

if [ "$SOURCE_FILES" -eq "$TARGET_FILES" ]; then
    echo "   ✅ File counts match"
else
    echo "   ⚠️  File counts differ"
fi

echo ""
echo "   Cleaning up temporary directory..."
cd /
rm -rf "$TEMP_DIR"
echo "   ✅ Cleanup complete"
echo ""

################################################################################
# Done
################################################################################

echo "✅ Test repositories created successfully!"
echo ""
echo "📊 Summary:"
echo "   Source: https://github.com/${ORG}/${SOURCE_REPO}"
echo "   Target: https://github.com/${ORG}/${TARGET_REPO}"
echo ""
echo "📝 Next steps:"
echo ""
echo "   1. Add secrets to source repository:"
echo "      - QUANTECON_SERVICES_PAT (GitHub PAT with repo access)"
echo "      - ANTHROPIC_API_KEY (Claude API key)"
echo ""
echo "   2. Test the workflow:"
echo "      cd /path/to/${SOURCE_REPO}"
echo "      # Make a change to lectures/intro.md"
echo "      git add lectures/intro.md"
echo "      git commit -m 'test: add new content'"
echo "      git push"
echo "      # Create and merge PR"
echo "      gh pr create --title 'Test translation sync' --body 'Testing'"
echo "      gh pr merge --merge"
echo ""
echo "   3. Check target repository for translation PR:"
echo "      gh pr list --repo ${ORG}/${TARGET_REPO}"
echo ""
echo "🎯 Repositories are synchronized and ready for testing!"
