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

This lecture introduces fundamental concepts in linear algebra that are essential for quantitative economics. We'll explore vector spaces, matrices, and their applications to economic problems.

## Vector Spaces

A vector space is a collection of objects called vectors, which can be added together and multiplied by scalars. Understanding vector spaces is crucial for modern economic analysis.

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

These properties ensure that vector spaces behave predictably under mathematical operations.

The sum of two vectors $\mathbf{u}$ and $\mathbf{v}$ is defined component-wise:

```{math}
\mathbf{u} + \mathbf{v} = \begin{bmatrix} u_1 + v_1 \\ u_2 + v_2 \\ \vdots \\ u_n + v_n \end{bmatrix}
```

## Eigenvalues and Eigenvectors

Eigenvalues and eigenvectors reveal important properties of linear transformations. An eigenvector $v$ of matrix $A$ satisfies:

```{math}
:label: eigenvalue-equation
Av = \lambda v
```

where $\lambda$ is the eigenvalue. This fundamental equation appears throughout economics, from growth theory to stability analysis.

For an $n \times n$ matrix $A$, the characteristic polynomial is:

$$
\det(A - \lambda I) = 0
$$

Solving this equation yields the eigenvalues. Let's compute eigenvalues for a transition matrix:

```{code-cell} python
# Create a transition matrix for a simple Markov chain
# States: Employed, Unemployed
transition_matrix = np.array([
    [0.95, 0.05],  # Employed -> (Employed, Unemployed)
    [0.20, 0.80]   # Unemployed -> (Employed, Unemployed)
])

# Calculate eigenvalues and eigenvectors
eigenvalues, eigenvectors = np.linalg.eig(transition_matrix)

print("Transition Matrix:")
print(transition_matrix)
print("\nEigenvalues:")
print(np.round(eigenvalues, 4))
print("\nEigenvectors:")
print(np.round(eigenvectors, 4))

# The eigenvector corresponding to eigenvalue 1 gives steady-state distribution
steady_state_index = np.argmax(eigenvalues)
steady_state = eigenvectors[:, steady_state_index]
steady_state = steady_state / steady_state.sum()  # Normalize

print("\nSteady-State Distribution:")
print(f"Employed: {steady_state[0]:.2%}")
print(f"Unemployed: {steady_state[1]:.2%}")
```

These concepts are essential for analyzing dynamic economic systems, such as growth models and stability analysis.

The power iteration method can be used to find the dominant eigenvalue:

$$
\lambda_1 = \lim_{k \to \infty} \frac{\|A^k \mathbf{v}_0\|}{\|A^{k-1} \mathbf{v}_0\|}
$$
