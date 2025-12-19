# cagan_adaptive.md

| Property | Value |
|----------|-------|
| Source | `lecture-python-intro` |
| Target | `lecture-intro.zh-cn` |
| Source Date | 2024-07-19 |
| Target Date | 2025-03-12 |
| Direction | ← Target newer |
| Status | ⚠️ Review |
| Recommendation | MANUAL REVIEW (complex changes detected) |

---

## Summary

**8 aligned, 12 issues in 4 sections**

| Section | Type | Status | Issue | Links |
|---------|------|--------|-------|-------|
| §1 | Section | ✅ | - | - |
| §2 | Section | ✅ | - | - |
| §3 | Section | ✅ | - | - |
| §4 | Title | ⚠️ DIFFERS | Differs | [View](#section-4-title) / [Action](#section-4-title-action) |
| §5 | Title | ⚠️ DIFFERS | Differs | [View](#section-5-title) / [Action](#section-5-title-action) |
| §5 | Content | ⚠️ DIFFERS | Differs | [View](#section-5-content) / [Action](#section-5-content-action) |
| §5 | Code B1 | ⚠️ DIFFERS | Function names | [View](#code-block-1) / [Action](#code-action) |
| §5 | Code B2 | ⚠️ DIFFERS | Code differs | [View](#code-block-2) / [Action](#code-action) |
| §5 | Code B3 | ⚠️ DIFFERS | Function names | [View](#code-block-3) / [Action](#code-action) |
| §6 | Code B4 | ⚠️ DIFFERS | Code differs | [View](#code-block-4) / [Action](#code-action) |
| §7 | Content | ⚠️ DIFFERS | Differs | [View](#section-7-content) / [Action](#section-7-content-action) |
| §7 | Code T7 | 🔵 INSERTED | Extra | [View](#code-block-t7) / [Action](#code-action) |
| §7 | Code B5 | ⚠️ DIFFERS | Code differs | [View](#code-block-5) / [Action](#code-action) |
| §7 | Code T8 | 🔵 INSERTED | Extra | [View](#code-block-t8) / [Action](#code-action) |
| §7 | Code B6 | ⚠️ DIFFERS | Code differs | [View](#code-block-6) / [Action](#code-action) |
| §8 | Section | ✅ | - | - |
| §9 | Section | ✅ | - | - |
| §10 | Section | ✅ | - | - |
| §11 | Section | ✅ | - | - |
| §12 | Section | ✅ | - | - |

<a id="code-action"></a>
### Code Action

| Source | Target | Status | Recommendation | Details |
|--------|--------|--------|----------------|---------|
| 1 | 1 | ⚠️ DIFFERS | BACKPORT | [View](#code-block-1) |
| 2 | 2 | ⚠️ DIFFERS | BACKPORT | [View](#code-block-2) |
| 3 | 3 | ⚠️ DIFFERS | BACKPORT | [View](#code-block-3) |
| 4 | 4 | ⚠️ DIFFERS | BACKPORT | [View](#code-block-4) |
| - | 7 | 🔵 INSERTED | BACKPORT | [View](#code-block-t7) |
| 5 | 5 | ⚠️ DIFFERS | BACKPORT | [View](#code-block-5) |
| - | 8 | 🔵 INSERTED | BACKPORT | [View](#code-block-t8) |
| 6 | 6 | ⚠️ DIFFERS | BACKPORT | [View](#code-block-6) |

> **Recommendation:** BACKPORT
>
> Target code appears improved. Review for backport to source.

**Action:**
- [ ] SYNC code from source
- [ ] BACKPORT improvements to source *(unanimous)*
- [ ] ACCEPT current target code
- [ ] MANUAL review needed

---

## Section Review

> 📅 **Target is newer** (2025-03-12 vs 2024-07-19) - translation may contain improvements

### §4 Harvesting insights from our matrix formulation

#### §4 Title: Harvesting insights from our matrix formulation → 求解模型
<a id="section-4-title"></a>

**Status:** ⚠️ DIFFERS | **Issue:** Differs

**Notes:**
- Issue: "Harvesting insights from our matrix formulation" is metaphorical and exploratory, while "求解模型" (Solving the model) is more direct and procedural, losing the nuance of extracting understanding from the mathematical structure
- Fix: Consider "从矩阵表达式中获得洞见" or "矩阵公式推导及求解" to better capture the original emphasis on gaining insights through the formulation process

<a id="section-4-title-action"></a>

**Action:**
- [ ] SYNC *(recommended)*
- [ ] BACKPORT
- [ ] ACCEPT
- [ ] MANUAL

### §5 Forecast errors and model computation

#### §5 Title: Forecast errors and model computation → 预期与实际通货膨胀的差异
<a id="section-5-title"></a>

**Status:** ⚠️ DIFFERS | **Issue:** Differs

**Notes:**
- Issue: "Forecast errors and model computation" encompasses both the conceptual issue of forecast errors and computational aspects, while "预期与实际通货膨胀的差异" (Differences between expected and actual inflation) focuses only on one aspect
- Fix: Use "预测误差与模型计算" to maintain both concepts

<a id="section-5-title-action"></a>

**Action:**
- [ ] SYNC
- [ ] BACKPORT
- [ ] ACCEPT
- [ ] MANUAL *(recommended)*

#### §5 Content: Forecast errors and model computation → 预期与实际通货膨胀的差异
<a id="section-5-content"></a>

**Status:** ⚠️ DIFFERS | **Issue:** Differs

**Notes:**
- Issue: Target adds extensive explanatory paragraphs (explaining adaptive expectations characteristics, contrasting with rational expectations) that are not present in the concise source text
- Fix: Remove the added interpretive paragraphs to match the source's brevity and direct transition to code

<a id="section-5-content-action"></a>

**Action:**
- [ ] SYNC
- [ ] BACKPORT
- [ ] ACCEPT
- [ ] MANUAL *(recommended)*

<a id="code-block-1"></a>
<details>
<summary><strong>Code Block 1</strong> - ⚠️ DIFFERS | Function names differ</summary>

**Source:**
```python
Cagan_Adaptive = namedtuple("Cagan_Adaptive", 
                        ["α", "m0", "Eπ0", "T", "λ"])

def create_cagan_adaptive_model(α = 5, m0 = 1, Eπ0 = 0.5, T=80, λ = 0.9):
    return Cagan_Adaptive(α, m0, Eπ0, T, λ)

md = create_cagan_adaptive_model()
```

**Target:**
```python
Cagan_Adaptive = namedtuple("Cagan_Adaptive", 
                        ["α", "m0", "Eπ0", "T", "λ"])

def create_cagan_model(α, m0, Eπ0, T, λ):
    return Cagan_Adaptive(α, m0, Eπ0, T, λ)
```

</details>

<a id="code-block-2"></a>
<details>
<summary><strong>Code Block 2</strong> - ⚠️ DIFFERS | Code logic differs</summary>

**Source:**
```python
def solve_cagan_adaptive(model, μ_seq):
    " Solve the Cagan model in finite time. "
    α, m0, Eπ0, T, λ = model
    
    A = np.eye(T+2, T+2) - λ*np.eye(T+2, T+2, k=-1)
    B = np.eye(T+2, T+1, k=-1)
    C = -α*np.eye(T+1, T+2) + α*np.eye(T+1, T+2, k=1)
    Eπ0_seq = np.append(Eπ0, np.zeros(T+1))

    # Eπ_seq is of length T+2
    Eπ_seq = np.linalg.solve(A - (1-λ)*B @ C, (1-λ) * B @ μ_seq + Eπ0_seq)

    # π_seq is of length T+1
    π_seq = μ_seq + C @ Eπ_seq

    D = np.eye(T+1, T+1) - np.eye(T+1, T+1, k=-1) # D is the coefficient matrix in Equation (14.8)
    m0_seq = np.append(m0, np.zeros(T))

    # m_seq is of length T+2
    m_seq = np.linalg.solve(D, μ_seq + m0_seq)
    m_seq = np.append(m0, m_seq)

    # p_seq is of length T+2
    p_seq = m_seq + α * Eπ_seq

    return π_seq, Eπ_seq, m_seq, p_seq
```

**Target:**
```python
# 参数
T = 80
T1 = 60
α = 5
λ = 0.9
m0 = 1

μ0 = 0.5
μ_star = 0

md = create_cagan_model(α=α, m0=m0, Eπ0=μ0, T=T, λ=λ)
```

</details>

<a id="code-block-3"></a>
<details>
<summary><strong>Code Block 3</strong> - ⚠️ DIFFERS | Function names differ</summary>

**Source:**
```python
def solve_and_plot(model, μ_seq):
    
    π_seq, Eπ_seq, m_seq, p_seq = solve_cagan_adaptive(model, μ_seq)
    
    T_seq = range(model.T+2)
    
    fig, ax = plt.subplots(5, 1, figsize=[5, 12], dpi=200)
    ax[0].plot(T_seq[:-1], μ_seq)
    ax[1].plot(T_seq[:-1], π_seq, label=r'$\pi_t$')
    ax[1].plot(T_seq, Eπ_seq, label=r'$\pi^{*}_{t}$')
    ax[2].plot(T_seq, m_seq - p_seq)
    ax[3].plot(T_seq, m_seq)
    ax[4].plot(T_seq, p_seq)
    
    y_labs = [r'$\mu$', r'$\pi$', r'$m - p$', r'$m$', r'$p$']
    subplot_title = [r'Money supply growth', r'Inflation', r'Real balances', r'Money supply', r'Price level']

    for i in range(5):
        ax[i].set_xlabel(r'$t$')
        ax[i].set_ylabel(y_labs[i])
        ax[i].set_title(subplot_title[i])

    ax[1].legend()
    plt.tight_layout()
    plt.show()
    
    return π_seq, Eπ_seq, m_seq, p_seq
```

**Target:**
```python
def solve(model, μ_seq):
    "在求解有限视界的凯根模型"
    
    model_params = model.α, model.m0, model.Eπ0, model.T, model.λ
    α, m0, Eπ0, T, λ = model_params
    
    A = np.eye(T+2, T+2) - λ*np.eye(T+2, T+2, k=-1)
    B = np.eye(T+2, T+1, k=-1)
    C = -α*np.eye(T+1, T+2) + α*np.eye(T+1, T+2, k=1)
    Eπ0_seq = np.append(Eπ0, np.zeros(T+1))

    # Eπ_seq 的长度为 T+2
    Eπ_seq = np.linalg.inv(A - (1-λ)*B @ C) @ ((1-λ) * B @ μ_seq + Eπ0_seq)

    # π_seq 的长度为 T+1
    π_seq = μ_seq + C @ Eπ_seq

    D = np.eye(T+1, T+1) - np.eye(T+1, T+1, k=-1)
    m0_seq = np.append(m0, np.zeros(T))

    # m_seq 的长度为 T+2
    m_seq = np.linalg.inv(D) @ (μ_seq + m0_seq)
    m_seq = np.append(m0, m_seq)

    # p_seq 的长度为 T+2
    p_seq = m_seq + α * Eπ_seq

    return π_seq, Eπ_seq, m_seq, p_seq
```

</details>

<a id="code-block-4"></a>
<details>
<summary><strong>Code Block 4</strong> - ⚠️ DIFFERS | Code logic differs</summary>

**Source:**
```python
print(np.abs((md.λ - md.α*(1-md.λ))/(1 - md.α*(1-md.λ))))
```

**Target:**
```python
def solve_and_plot(model, μ_seq):
    
    π_seq, Eπ_seq, m_seq, p_seq = solve(model, μ_seq)
    
    T_seq = range(model.T+2)
    
    fig, ax = plt.subplots(5, 1, figsize=[5, 12], dpi=200)
    ax[0].plot(T_seq[:-1], μ_seq)
    ax[1].plot(T_seq[:-1], π_seq, label=r'$\pi_t$')
    ax[1].plot(T_seq, Eπ_seq, label=r'$\pi^{*}_{t}$')
    ax[2].plot(T_seq, m_seq - p_seq)
    ax[3].plot(T_seq, m_seq)
    ax[4].plot(T_seq, p_seq)
    
    y_labs = [r'$\mu$', r'$\pi$', r'$m - p$', r'$m$', r'$p$']

    for i in range(5):
        ax[i].set_xlabel(r'$t$')
        ax[i].set_ylabel(y_labs[i])

    ax[1].legend()
    plt.tight_layout()
    plt.show()
    
    return π_seq, Eπ_seq, m_seq, p_seq
```

</details>

### §7 (Code block 2 - model creation)

#### §7 Content: (Code block 2 - model creation) → (Code block 2 - model creation with parameters)
<a id="section-7-content"></a>

**Status:** ⚠️ DIFFERS | **Issue:** Differs

**Notes:**
- Issue: Target version inserts additional explanatory code block defining parameters (T, T1, α, λ, m0, μ0, μ_star) and instantiating model with `md = create_cagan_model(...)` before the solve functions, while source shows model creation without parameter definitions at this point
- Fix: Remove the inserted parameter definition block to align with source structure where parameters appear later in the experiments section

<a id="section-7-content-action"></a>

**Action:**
- [ ] SYNC
- [ ] BACKPORT
- [ ] ACCEPT
- [ ] MANUAL *(recommended)*

<a id="code-block-t7"></a>
<details>
<summary><strong>Code Block T7</strong> - 🔵 INSERTED | Extra block in target</summary>

**Target:**
```python
μ_seq_1 = np.append(μ0*np.ones(T1), μ_star*np.ones(T+1-T1))

# 求解并绘图
π_seq_1, Eπ_seq_1, m_seq_1, p_seq_1 = solve_and_plot(md, μ_seq_1)
```

*This block exists only in target - not in source.*

</details>

<a id="code-block-5"></a>
<details>
<summary><strong>Code Block 5</strong> - ⚠️ DIFFERS | Code logic differs</summary>

**Source:**
```python
# Parameters for the experiment 1
T1 = 60
μ0 = 0.5
μ_star = 0

μ_seq_1 = np.append(μ0*np.ones(T1), μ_star*np.ones(md.T+1-T1))

# solve and plot
π_seq_1, Eπ_seq_1, m_seq_1, p_seq_1 = solve_and_plot(md, μ_seq_1)
```

**Target:**
```python
print(np.abs((λ - α*(1-λ))/(1 - α*(1-λ))))
```

</details>

<a id="code-block-t8"></a>
<details>
<summary><strong>Code Block T8</strong> - 🔵 INSERTED | Extra block in target</summary>

**Target:**
```python
# 参数
ϕ = 0.9
μ_seq_2 = np.array([ϕ**t * μ0 + (1-ϕ**t)*μ_star for t in range(T)])
μ_seq_2 = np.append(μ_seq_2, μ_star)


# 求解并绘图
π_seq_2, Eπ_seq_2, m_seq_2, p_seq_2 = solve_and_plot(md, μ_seq_2)
```

*This block exists only in target - not in source.*

</details>

<a id="code-block-6"></a>
<details>
<summary><strong>Code Block 6</strong> - ⚠️ DIFFERS | Code logic differs</summary>

**Source:**
```python
# parameters
ϕ = 0.9
μ_seq_2 = np.array([ϕ**t * μ0 + (1-ϕ**t)*μ_star for t in range(md.T)])
μ_seq_2 = np.append(μ_seq_2, μ_star)


# solve and plot
π_seq_2, Eπ_seq_2, m_seq_2, p_seq_2 = solve_and_plot(md, μ_seq_2)
```

**Target:**
```python
print(λ - α*(1-λ))
```

</details>
