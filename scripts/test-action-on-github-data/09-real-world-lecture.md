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

### Basic Properties

Vector spaces satisfy several key properties:
- Closure under addition and scalar multiplication
- Existence of additive identity (zero vector)  
- Existence of additive inverses
- Associativity and commutativity of addition

These properties ensure that vector spaces behave predictably under mathematical operations, making them ideal for representing economic choice sets.

## Matrix Operations

Matrices are rectangular arrays of numbers that represent linear transformations. They are fundamental tools in economic modeling and data analysis, from input-output tables to covariance matrices in portfolio theory.

Matrix multiplication allows us to compose linear transformations efficiently. For matrices $A$ and $B$, the product $AB$ represents applying transformation $B$ followed by transformation $A$. This composition property is essential for analyzing multi-stage economic processes.

### Applications in Economics

Economic models extensively use matrices to represent:
- Input-output relationships in production (Leontief systems)
- Transition probabilities in Markov chains (dynamic programming)
- Coefficient matrices in linear equation systems (CGE models)
- Covariance structures in econometric models

## Eigenvalues and Eigenvectors

Eigenvalues and eigenvectors reveal important properties of linear transformations and dynamic systems. An eigenvector $v$ of matrix $A$ satisfies $Av = \lambda v$, where $\lambda$ is the eigenvalue.

These concepts are essential for analyzing:
- Stability of dynamic economic systems
- Long-run behavior of Markov processes  
- Principal component analysis in empirical work
- Optimal growth paths in dynamic models

The dominant eigenvalue determines the long-run growth rate in many economic models.
