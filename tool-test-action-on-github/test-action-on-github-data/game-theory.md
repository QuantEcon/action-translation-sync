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

# Game Theory Basics

This lecture introduces fundamental concepts in game theory and their applications to economic decision-making. We'll explore strategic interactions, Nash equilibrium, and common game structures.

## Introduction to Strategic Thinking

Game theory provides a framework for analyzing situations where multiple decision-makers interact strategically. Each player's optimal choice depends on what others choose, creating complex interdependencies.

In economic markets, firms competing on prices or quantities engage in strategic games. Understanding these interactions helps predict market outcomes and design better mechanisms.

## The Prisoner's Dilemma

The classic Prisoner's Dilemma illustrates why rational individuals might not cooperate, even when cooperation benefits everyone. Two suspects are interrogated separately and must decide whether to confess or remain silent.

The payoff matrix captures the strategic structure:

|                | Cooperate    | Defect      |
|----------------|-------------|-------------|
| **Cooperate**  | (-1, -1)    | (-3, 0)     |
| **Defect**     | (0, -3)     | (-2, -2)    |

Each player has a dominant strategy to defect, leading to a suboptimal outcome for both.

### Real-World Applications

The Prisoner's Dilemma structure appears in many economic contexts:
- Price competition between firms
- Public goods provision
- Environmental protection agreements
- Arms races and military spending

Understanding this game helps explain market failures and the need for regulation or cooperation mechanisms.

## Nash Equilibrium

A Nash equilibrium is a strategy profile where no player can improve their payoff by unilaterally changing strategy. It represents a stable outcome where each player's strategy is optimal given others' strategies.

Mathematically, for players $i = 1, \ldots, n$ with strategy sets $S_i$ and payoff functions $u_i$, a strategy profile $(s_1^*, \ldots, s_n^*)$ is a Nash equilibrium if:

$$
u_i(s_i^*, s_{-i}^*) \geq u_i(s_i, s_{-i}^*) \quad \forall s_i \in S_i, \forall i
$$

Let's compute Nash equilibria for a simple game in Python:

```{code-cell} python
import numpy as np
import nashpy as nash

# Define a simple 2x2 game
# Player 1's payoff matrix
A = np.array([[3, 0],
              [5, 1]])

# Player 2's payoff matrix  
B = np.array([[3, 5],
              [0, 1]])

# Create game
game = nash.Game(A, B)

# Find Nash equilibria
equilibria = list(game.support_enumeration())

print("Nash Equilibria:")
for eq in equilibria:
    print(f"Player 1: {eq[0]}, Player 2: {eq[1]}")
    print(f"Payoffs: ({np.dot(eq[0], A @ eq[1])}, {np.dot(eq[0], B.T @ eq[1])})")
    print()
```

### Mixed Strategies

When no pure strategy Nash equilibrium exists, players may randomize over strategies. These mixed strategy equilibria require indifference conditions where players are willing to randomize.

The mixed strategy equilibrium probabilities can be computed by solving:

```{math}
\begin{align}
p \cdot u_1(\text{Strategy 1}) &= p \cdot u_1(\text{Strategy 2}) \\
q \cdot u_2(\text{Strategy 1}) &= q \cdot u_2(\text{Strategy 2})
\end{align}
```

## Sequential Games

In sequential games, players move in a specific order and observe previous actions. These games are analyzed using backward induction, working from the end of the game tree to the beginning.

The key insight is subgame perfection: at each decision node, players choose optimally given future play. This eliminates non-credible threats that rational players wouldn't execute.

### Stackelberg Competition

A classic application is Stackelberg competition, where one firm (leader) chooses quantity first, and another firm (follower) observes this choice before deciding.

The leader anticipates the follower's reaction function and chooses optimally:

$$
\max_{q_L} \pi_L(q_L, R(q_L))
$$

where $R(q_L)$ is the follower's best response to the leader's quantity $q_L$.

Let's solve a Stackelberg game numerically:

```{code-cell} python
from scipy.optimize import minimize_scalar

# Market parameters
a = 100  # Demand intercept
c = 10   # Marginal cost

# Follower's reaction function: q_F = (a - c - q_L) / 2
def follower_response(q_L):
    return (a - c - q_L) / 2

# Leader's profit given follower's response
def leader_profit(q_L):
    q_F = follower_response(q_L)
    price = a - q_L - q_F
    return -(price - c) * q_L  # Negative for minimization

# Find leader's optimal quantity
result = minimize_scalar(leader_profit, bounds=(0, a-c), method='bounded')
q_L_optimal = result.x
q_F_optimal = follower_response(q_L_optimal)

print(f"Leader quantity: {q_L_optimal:.2f}")
print(f"Follower quantity: {q_F_optimal:.2f}")
print(f"Market price: {a - q_L_optimal - q_F_optimal:.2f}")
print(f"Leader profit: {-result.fun:.2f}")
```

## Repeated Games

When games are played repeatedly, new equilibria emerge through reputation and punishment mechanisms. The Folk Theorem shows that many outcomes can be sustained as equilibria when players are sufficiently patient.

The key mechanism is the threat of reversion to non-cooperative play if anyone deviates from the cooperative path. This requires:

1. Players value future payoffs (discount factor $\delta < 1$)
2. Deviations are observable
3. Punishment threats are credible

### Trigger Strategies

A common enforcement mechanism is the grim trigger strategy: cooperate until someone defects, then defect forever. This strategy can sustain cooperation when:

$$
\frac{1}{1-\delta} \cdot \pi_{\text{coop}} \geq \pi_{\text{deviate}} + \frac{\delta}{1-\delta} \cdot \pi_{\text{punish}}
$$

The left side is the payoff from perpetual cooperation, while the right side is the gain from deviating followed by perpetual punishment.

## Exercises

1. **Computing Equilibria**: Find all Nash equilibria (pure and mixed) for the following game:
   
   |           | Left  | Right |
   |-----------|-------|-------|
   | **Up**    | (3,2) | (1,3) |
   | **Down**  | (0,1) | (2,4) |

2. **Repeated Games**: Calculate the minimum discount factor needed to sustain cooperation in an infinitely repeated Prisoner's Dilemma using grim trigger strategies.

3. **Sequential Games**: Solve for the subgame perfect equilibrium in a three-stage entry game where firms decide sequentially whether to enter a market.

4. **Mixed Strategies**: Verify that the mixed strategy equilibrium you computed for Exercise 1 makes both players indifferent between their pure strategies.
