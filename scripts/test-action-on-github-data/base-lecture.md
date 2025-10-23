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

### Basic Properties

Vector spaces satisfy several key properties:
- Closure under addition and scalar multiplication
- Existence of additive identity (zero vector)
- Existence of additive inverses

These properties ensure that vector spaces behave predictably under mathematical operations.

## Matrix Operations

Matrices are rectangular arrays of numbers that represent linear transformations. They are fundamental tools in economic modeling and data analysis.

Matrix multiplication allows us to compose linear transformations. For matrices $A$ and $B$, the product $AB$ represents applying transformation $B$ followed by transformation $A$.

### Applications in Economics

Economic models often use matrices to represent:
- Input-output relationships in production
- Transition probabilities in Markov chains
- Coefficient matrices in linear equation systems

## Eigenvalues and Eigenvectors

Eigenvalues and eigenvectors reveal important properties of linear transformations. An eigenvector $v$ of matrix $A$ satisfies $Av = \lambda v$, where $\lambda$ is the eigenvalue.

These concepts are essential for analyzing dynamic economic systems, such as growth models and stability analysis.
