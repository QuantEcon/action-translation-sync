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

# The Aiyagari Model

## Overview

The Aiyagari model is a canonical heterogeneous agent model that extends the neoclassical growth model to include incomplete markets and borrowing constraints.

Key features:

- Heterogeneous agents with idiosyncratic income shocks
- Incomplete markets (no insurance against income risk)
- Borrowing constraints
- Capital accumulation

## The Model

Households face an infinite horizon problem:

$$
\max E_0 \sum_{t=0}^{\infty} \beta^t u(c_t)
$$

subject to:

$$
c_t + a_{t+1} = w_t z_t + (1 + r_t) a_t
$$

where:
- $c_t$ is consumption
- $a_t$ is assets
- $z_t$ is the idiosyncratic productivity shock
- $w_t$ is the wage rate
- $r_t$ is the interest rate

## Implementation

Let's implement a simple version:

```{code-cell} python
import numpy as np
import matplotlib.pyplot as plt

def solve_household_problem(r, w, params):
    """
    Solve the household problem given prices.
    
    Parameters
    ----------
    r : float
        Interest rate
    w : float
        Wage rate
    params : dict
        Model parameters
    
    Returns
    -------
    policy : ndarray
        Policy function for assets
    """
    # Implementation here
    pass

# Set parameters
params = {
    'beta': 0.96,
    'gamma': 2.0,
    'borrowing_limit': 0.0
}

print("Model parameters:", params)
```

## Calibration

We use standard parameter values from the literature:

| Parameter | Value | Description |
|-----------|-------|-------------|
| $\beta$ | 0.96 | Discount factor |
| $\gamma$ | 2.0 | Risk aversion |
| $\delta$ | 0.08 | Depreciation rate |

## References

Aiyagari, S. Rao (1994). "Uninsured Idiosyncratic Risk and Aggregate Saving". *Quarterly Journal of Economics*, 109(3), 659-684.
