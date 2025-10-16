#!/bin/bash
# Quick script to add initial Chinese translations to existing test-translation-sync.zh-cn repo

set -e

echo "🔧 Adding initial Chinese translations to test-translation-sync.zh-cn"
echo ""

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone the target repo
echo "📥 Cloning test-translation-sync.zh-cn..."
gh repo clone quantecon/test-translation-sync.zh-cn
cd test-translation-sync.zh-cn

# Create Chinese translations
echo "📝 Creating Chinese translations..."

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

这是用于翻译同步操作的测试讲座。

## 基本概念

经济学是研究社会如何分配稀缺资源的学科。

### 关键术语

- **稀缺性**：有限的资源
- **机会成本**：次优选择的价值
- **供需关系**：决定价格的市场力量

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
        全要素生产率（默认值：1.0）
    alpha : float
        资本份额（默认值：0.3）
        
    返回：
    --------
    float : 计算的GDP
    """
    return productivity * (capital ** alpha) * (labor ** (1 - alpha))

# 示例用法
gdp = calculate_gdp(capital=100, labor=50)
print(f"GDP: {gdp:.2f}")
```

## MyST 指令

```{note}
这是关于经济理论的重要说明。
```

```{warning}
在经济模型中要小心假设！
```

```{tip}
始终根据实际数据验证模型的预测。
```

## 总结

本讲座涵盖了：
1. 基本经济概念
2. 生产函数
3. 计算方法

## 参考文献

- Smith, Adam. "The Wealth of Nations" (1776)
- Keynes, John Maynard. "The General Theory of Employment, Interest and Money" (1936)
- Solow, Robert M. "A Contribution to the Theory of Economic Growth" (1956)
EOF

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

价值迭代的贝尔曼方程：

$$
V(s) = \max_{a \in A(s)} \left\{ r(s,a) + \beta \sum_{s' \in S} P(s'|s,a) V(s') \right\}
$$

其中：
- $V(s)$ 是价值函数
- $s$ 是当前状态
- $a$ 是行动
- $r(s,a)$ 是奖励函数
- $\beta$ 是折扣因子
- $P(s'|s,a)$ 是转移概率

## 实现

```python
import numpy as np

def value_iteration(reward, transition, beta=0.95, tol=1e-6, max_iter=1000):
    """
    使用价值迭代求解动态规划问题
    
    参数：
    -----------
    reward : ndarray
        奖励矩阵（n_states x n_actions）
    transition : ndarray  
        转移概率矩阵（n_states x n_actions x n_states）
    beta : float
        折扣因子（默认值：0.95）
    tol : float
        收敛容差（默认值：1e-6）
    max_iter : int
        最大迭代次数（默认值：1000）
        
    返回：
    --------
    V : ndarray
        最优价值函数
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
2. **求职理论** - 寻找最优保留工资  
3. **资产定价** - 金融工具估值
4. **库存管理** - 优化库存水平

```{admonition} 关键见解
:class: important

动态规划将复杂的序列决策问题分解为更简单的子问题。
这种"最优性原理"是动态规划如此强大的原因。
```

## 计算考虑

```{note}
价值迭代以 $\beta$ 的速率几何收敛。可以通过以下方法实现更快的收敛：
- 策略迭代
- 修正策略迭代
- 线性规划方法
```
EOF

cat > lectures/_toc.yml << 'EOF'
format: jb-book
root: intro
chapters:
  - file: advanced
EOF

# Remove .gitkeep if it exists
rm -f lectures/.gitkeep

# Commit and push
echo "💾 Committing changes..."
git add lectures/
git commit -m "Add initial Chinese translations for testing

Includes Chinese translations of:
- lectures/intro.md - 经济学导论
- lectures/advanced.md - 高级经济理论
- lectures/_toc.yml - 目录

This allows testing of diff-based translation updates."

echo "📤 Pushing to GitHub..."
git push origin main

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Initial Chinese translations added!"
echo ""
echo "🧪 Now you can test the translation sync action by:"
echo "   1. Making changes to files in test-translation-sync"
echo "   2. Creating and merging a PR"
echo "   3. Watching the action create a translation update PR"
echo ""
