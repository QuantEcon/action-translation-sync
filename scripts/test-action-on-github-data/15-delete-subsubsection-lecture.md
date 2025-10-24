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

This lecture introduces fundamental concepts in linear algebra that are essential for quantitative economics. We'll explore vector spaces, matrices, and their applications to economic problems, with updated examples from recent research.

## Vector Spaces

A vector space is a collection of objects called vectors, which can be added together and multiplied by scalars. Understanding vector spaces is crucial for modern economic analysis, particularly in general equilibrium theory.

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

These properties ensure that vector spaces behave predictably under mathematical operations, making them ideal for representing economic choice sets.

The sum of two vectors $\mathbf{u}$ and $\mathbf{v}$ is defined component-wise:

```{math}
\mathbf{u} + \mathbf{v} = \begin{bmatrix} u_1 + v_1 \\ u_2 + v_2 \\ \vdots \\ u_n + v_n \end{bmatrix}
```

## Matrix Operations

Matrices are rectangular arrays of numbers that represent linear transformations. They are fundamental tools in economic modeling and data analysis, from input-output tables to covariance matrices in portfolio theory.

A general $m \times n$ matrix has the form:

$$
A = \begin{bmatrix}
a_{11} & a_{12} & \cdots & a_{1n} \\
a_{21} & a_{22} & \cdots & a_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
a_{m1} & a_{m2} & \cdots & a_{mn}
\end{bmatrix}
$$

Matrix multiplication allows us to compose linear transformations efficiently. For matrices $A$ and $B$, the product $AB$ represents applying transformation $B$ followed by transformation $A$. This composition property is essential for analyzing multi-stage economic processes.

Let's demonstrate matrix operations with an economic application:

```{code-cell} python
# Create a simple input-output matrix for a 3-sector economy
# Sectors: Agriculture, Manufacturing, Services
input_output = np.array([
    [0.2, 0.3, 0.1],  # Agriculture inputs
    [0.3, 0.2, 0.2],  # Manufacturing inputs
    [0.1, 0.2, 0.3]   # Services inputs
])

# Final demand vector (in billions)
final_demand = np.array([100, 150, 200])

# Calculate total output using Leontief inverse: x = (I - A)^{-1} * d
I = np.eye(3)
leontief_inverse = np.linalg.inv(I - input_output)
total_output = leontief_inverse @ final_demand

print("Input-Output Matrix:")
print(input_output)
print("\nLeontief Inverse:")
print(np.round(leontief_inverse, 3))
print("\nTotal Output Required (billions):")
print(np.round(total_output, 2))
```

### Applications in Economics

Economic models extensively use matrices to represent:
- Input-output relationships in production (Leontief systems)
- Transition probabilities in Markov chains (dynamic programming)
- Coefficient matrices in linear equation systems (CGE models)
- Covariance structures in econometric models

The Leontief inverse $(I - A)^{-1}$ is particularly important, where $I$ is the identity matrix and $A$ is the input-output coefficient matrix.

## Eigenvalues and Eigenvectors

Eigenvalues and eigenvectors reveal important properties of linear transformations and dynamic systems. An eigenvector $v$ of matrix $A$ satisfies:

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

These concepts are essential for analyzing:
- Stability of dynamic economic systems
- Long-run behavior of Markov processes  
- Principal component analysis in empirical work
- Optimal growth paths in dynamic models

The dominant eigenvalue determines the long-run growth rate in many economic models.

The power iteration method can be used to find the dominant eigenvalue:

$$
\lambda_1 = \lim_{k \to \infty} \frac{\|A^k \mathbf{v}_0\|}{\|A^{k-1} \mathbf{v}_0\|}
$$
