---
title: 代码完整性测试
---

# 代码完整性测试

## 基本 Python

简单的 Python 代码应该保持不变：

```python
import numpy as np
x = np.array([1, 2, 3])
print(x)
```

## 带注释

带注释的代码可能在翻译中被删除：

```python
# 这是一个注释
import pandas as pd
# 创建一个数据框
df = pd.DataFrame({'a': [1, 2], 'b': [3, 4]})
print(df)
```

## JavaScript 示例

多语言支持：

```javascript
// JavaScript 注释
const x = [1, 2, 3];
console.log(x);
```

## 修改的代码

此代码在目标中将有所不同：

```python
modified_function()
y = 2
```
