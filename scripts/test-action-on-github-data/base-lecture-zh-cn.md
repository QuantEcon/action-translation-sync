---
jupytext:
  text_representation:
    extension: .md
    format_name: myst
kernelspec:
  display_name: Python 3
  language: python
  name: python3
heading-map:
  Vector Spaces: 向量空间
  Basic Properties: 基本性质
  Matrix Operations: 矩阵运算
  Applications in Economics: 经济学应用
  Eigenvalues and Eigenvectors: 特征值与特征向量
---

# 线性代数基础

本讲座介绍了对定量经济学至关重要的线性代数基本概念。我们将探讨向量空间、矩阵及其在经济问题中的应用。

## 向量空间

向量空间是称为向量的对象的集合，这些对象可以相加并与标量相乘。理解向量空间对现代经济分析至关重要。

### 基本性质

向量空间满足几个关键性质：
- 加法和标量乘法下的封闭性
- 加法单位元（零向量）的存在
- 加法逆元的存在

这些性质确保向量空间在数学运算下表现可预测。

## 矩阵运算

矩阵是表示线性变换的数字矩形数组。它们是经济建模和数据分析的基本工具。

矩阵乘法允许我们组合线性变换。对于矩阵 $A$ 和 $B$，乘积 $AB$ 表示先应用变换 $B$，然后应用变换 $A$。

### 经济学应用

经济模型经常使用矩阵来表示：
- 生产中的投入产出关系
- 马尔可夫链中的转移概率
- 线性方程组中的系数矩阵

## 特征值与特征向量

特征值和特征向量揭示了线性变换的重要性质。矩阵 $A$ 的特征向量 $v$ 满足 $Av = \lambda v$，其中 $\lambda$ 是特征值。

这些概念对于分析动态经济系统（如增长模型和稳定性分析）至关重要。
