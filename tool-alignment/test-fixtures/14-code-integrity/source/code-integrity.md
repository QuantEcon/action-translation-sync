---
title: Code Integrity Test
---

# Code Integrity Test

## Basic Python

Simple Python code that should be preserved:

```python
import numpy as np
x = np.array([1, 2, 3])
print(x)
```

## With Comments

Code with comments that might be stripped in translation:

```python
# This is a comment
import pandas as pd
# Create a dataframe
df = pd.DataFrame({'a': [1, 2], 'b': [3, 4]})
print(df)
```

## JavaScript Example

Multi-language support:

```javascript
// JavaScript comment
const x = [1, 2, 3];
console.log(x);
```

## Modified Code

This code will be different in target:

```python
original_function()
x = 1
```

## Missing Code

This code block will be missing in target:

```python
missing_code = True
```
