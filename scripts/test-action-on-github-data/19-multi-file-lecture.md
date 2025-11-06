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

# Linear Algebra Foundations

This lecture introduces fundamental concepts in linear algebra that are essential for quantitative economics and data science. We'll explore vector spaces, matrices, eigenvalues, and their applications to economic problems.

## Vector Spaces

A vector space is a collection of objects called vectors, which can be added together and multiplied by scalars. Understanding vector spaces is crucial for modern economic analysis and machine learning applications.

Mathematically, a vector $\mathbf{v} \in \mathbb{R}^n$ can be represented as:

$$
\mathbf{v} = \begin{bmatrix} v_1 \\ v_2 \\ \vdots \\ v_n \end{bmatrix}
$$

Let's create and visualize some vectors in Python:

```{code-cell} python
import numpy as np
import matplotlib.pyplot as plt

# Create two vectors  
v1 = np.array([2, 3])
v2 = np.array([1, 4])

# Visualize vectors
fig, ax = plt.subplots(figsize=(8, 6))
ax.quiver(0, 0, v1[0], v1[1], angles='xy', scale_units='xy', scale=1, color='blue', label='v1')
ax.quiver(0, 0, v2[0], v2[1], angles='xy', scale_units='xy', scale=1, color='red', label='v2')
ax.set_xlim(-1, 5)
ax.set_ylim(-1, 5)
ax.set_xlabel('x-axis')
ax.set_ylabel('y-axis')
ax.set_title('Vector Representation in 2D Space')
ax.legend()
ax.grid(True)
plt.show()
```

### Basic Properties

Vector spaces satisfy several key properties:
- Closure under addition and scalar multiplication
- Existence of additive identity (zero vector)
- Existence of additive inverses
- Associativity and commutativity of addition

These properties ensure that vector spaces behave predictably under mathematical operations, forming the foundation for linear transformations.

####Applications in Economics

Vector space properties are fundamental in economic modeling. The closure property ensures that combinations of feasible allocations remain feasible, while the existence of inverses allows us to model debts and obligations.

The sum of two vectors $\mathbf{u}$ and $\mathbf{v}$ is defined component-wise:

```{math}
\mathbf{u} + \mathbf{v} = \begin{bmatrix} u_1 + v_1 \\ u_2 + v_2 \\ \vdots \\ u_n + v_n \end{bmatrix}
```

## Matrix Operations

Matrices are rectangular arrays of numbers that represent linear transformations. They are fundamental tools in economic modeling, data analysis, and optimization problems.

A general $m \times n$ matrix has the form:

$$
A = \begin{bmatrix}
a_{11} & a_{12} & \cdots & a_{1n} \\
a_{21} & a_{22} & \cdots & a_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
a_{m1} & a_{m2} & \cdots & a_{mn}
\end{bmatrix}
$$

### Eigenvalues and Eigenvectors

Eigenvalues and eigenvectors reveal important structural properties of linear transformations. For a square matrix $A$, an eigenvector $\mathbf{v}$ and corresponding eigenvalue $\lambda$ satisfy:

$$
A\mathbf{v} = \lambda \mathbf{v}
$$

These concepts are crucial for understanding dynamic systems, stability analysis, and dimensionality reduction techniques like PCA.
