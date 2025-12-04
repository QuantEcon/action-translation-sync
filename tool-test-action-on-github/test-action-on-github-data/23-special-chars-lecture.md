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

# Programming for Economics

This lecture covers programming concepts and tools essential for modern economic analysis.

## Using `numpy` Arrays

The `numpy` library provides efficient array operations for numerical computing. Arrays are the foundation of scientific computing in Python.

NumPy arrays support vectorized operations, avoiding slow Python loops:

```python
import numpy as np
arr = np.array([1, 2, 3, 4, 5])
result = arr ** 2  # Vectorized squaring
```

### Creating Arrays with `np.arange()` and `np.linspace()`

Different array creation methods serve different purposes. The `np.arange()` function creates arrays with specified step sizes:

```python
x = np.arange(0, 10, 0.5)  # From 0 to 10, step 0.5
```

Meanwhile, `np.linspace()` creates arrays with a specified number of points:

```python
y = np.linspace(0, 1, 100)  # 100 points from 0 to 1
```

## Working with **Pandas DataFrames**

The **pandas** library provides powerful data manipulation capabilities. DataFrames are two-dimensional labeled data structures.

### Reading Data: `pd.read_csv()` vs `pd.read_excel()`

Different file formats require different reading functions:

- **CSV files**: Use `pd.read_csv('data.csv')`
- **Excel files**: Use `pd.read_excel('data.xlsx')`
- **JSON files**: Use `pd.read_json('data.json')`

## *Matplotlib* Visualization Basics

*Matplotlib* is the foundational plotting library for Python. It provides fine-grained control over plot appearance.

### The `plt.plot()` Function

Basic line plots are created with `plt.plot(x, y)`:

```python
import matplotlib.pyplot as plt
plt.plot([1, 2, 3], [4, 5, 6])
plt.xlabel('x-axis')
plt.ylabel('y-axis')
plt.title('Simple Plot')
plt.show()
```

## Using [QuantEcon](https://quantecon.org) Libraries

The [QuantEcon](https://quantecon.org) project provides specialized tools for economic modeling. Visit the [documentation](https://quanteconpy.readthedocs.io/) for details.

### Installing `quantecon` Package

Install via pip:

```bash
pip install quantecon
```

Or with conda:

```bash
conda install -c conda-forge quantecon
```

## Special Cases: $\LaTeX$ in Headings

Mathematical notation appears inline: $f(x) = x^2 + 2x + 1$.

### The $\beta$-Coefficient in Regression

The regression coefficient $\beta$ measures the relationship between variables:

$$
y = \alpha + \beta x + \epsilon
$$

### Computing $\mathbb{E}[X]$ (Expected Values)

Expected values $\mathbb{E}[X]$ represent average outcomes:

$$
\mathbb{E}[X] = \sum_{i} x_i P(X = x_i)
$$

## Questions & Answers

Common questions about Python for economics:

- **Q**: Which is faster: `numpy` or plain Python?
- **A**: `numpy` is typically 10-100x faster for numerical operations

- **Q**: Can I use `pandas` with large datasets?
- **A**: Yes, but consider `dask` for datasets larger than RAM

## "Edge Cases" and [Special] {Characters}

This section tests various special characters in headings.

### Using `matplotlib`'s `plt.subplot()` for Multiple Plots

The subplot function creates multiple plots in one figure:

```python
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
ax1.plot(x, y1)
ax2.plot(x, y2)
```

## Summary

Programming tools like **numpy**, *pandas*, and `matplotlib` are essential for modern economic research. Master these libraries to efficiently analyze data and visualize results.
