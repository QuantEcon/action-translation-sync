# Structure Alignment Report

**Source**: `/Users/mmcky/work/quantecon/lecture-python-intro`  
**Target**: `/Users/mmcky/work/quantecon/lecture-intro.zh-cn`  
**Docs Folder**: `.`  
**Generated**: 2025-12-15T03:09:16.782Z  
**Tool Version**: 0.1.0

## Summary

### Alignment Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Aligned | 38 | 69% |
| 🟡 Likely Aligned | 8 | 15% |
| ⚠️ Needs Review | 2 | 4% |
| ❌ Diverged | 3 | 5% |
| 📄 Missing | 2 | 4% |
| ➕ Extra | 2 | 4% |

### Scoring Methodology

The **Structure Score** is calculated as follows:

```
Base Score = 100

Penalties:
  - Section count mismatch:     -20 per missing/extra section
  - Subsection count mismatch:  -10 per missing/extra subsection
  - Code block count mismatch:  -15 (if counts differ)
  - Math block count mismatch:  -15 (if counts differ)

Classification:
  - aligned:        100% (perfect match)
  - likely-aligned: 85-99% (minor differences, e.g., code blocks)
  - needs-review:   55-84% (structural differences need attention)
  - diverged:       <55% OR section ratio <50%
```

### Config Files

| File | Status | Issues |
|------|--------|--------|
| `environment.yml` | 🟡 structure-match | - |

## Aligned Files (Ready for Sync)

| File | Sections | Subsections | Code Blocks | Math Blocks | Structure | Heading Map |
|------|----------|-------------|-------------|-------------|-----------|-------------|
| ✅ `_notebook_repo/README.md` | 0/0 | 0/0 | 0/0 | 0/0 | 100% | ❌ |
| ✅ `lectures/about.md` | 3/3 | 0/0 | 0/0 | 0/0 | 100% | ❌ |
| 🟡 `lectures/ar1_processes.md` | 5/5 | 3/3 | 31/34 | 10/10 | 85% | ❌ |
| ✅ `lectures/business_cycle.md` | 6/6 | 3/3 | 24/24 | 0/0 | 100% | ❌ |
| ✅ `lectures/cagan_ree.md` | 4/4 | 9/9 | 9/9 | 23/23 | 100% | ❌ |
| ✅ `lectures/cobweb.md` | 6/6 | 0/0 | 33/33 | 8/8 | 100% | ❌ |
| ✅ `lectures/commod_price.md` | 6/6 | 3/3 | 7/7 | 12/12 | 100% | ❌ |
| 🟡 `lectures/complex_and_trig.md` | 4/4 | 8/8 | 15/16 | 24/24 | 85% | ❌ |
| ✅ `lectures/cons_smooth.md` | 6/6 | 11/11 | 25/25 | 22/22 | 100% | ❌ |
| ✅ `lectures/eigen_I.md` | 8/8 | 17/17 | 46/46 | 15/15 | 100% | ❌ |
| ✅ `lectures/eigen_II.md` | 2/2 | 7/7 | 25/25 | 11/11 | 100% | ❌ |
| ✅ `lectures/french_rev.md` | 7/7 | 0/0 | 22/22 | 1/1 | 100% | ❌ |
| 🟡 `lectures/geom_series.md` | 6/6 | 9/9 | 24/25 | 35/35 | 85% | ❌ |
| ✅ `lectures/greek_square.md` | 9/9 | 0/0 | 18/18 | 45/45 | 100% | ❌ |
| ✅ `lectures/heavy_tails.md` | 8/8 | 18/18 | 56/56 | 15/15 | 100% | ❌ |
| ✅ `lectures/inequality.md` | 5/5 | 12/12 | 67/67 | 4/4 | 100% | ❌ |
| 🟡 `lectures/inflation_history.md` | 3/3 | 4/4 | 25/26 | 0/0 | 85% | ❌ |
| ✅ `lectures/input_output.md` | 8/8 | 4/4 | 28/28 | 32/32 | 100% | ❌ |
| ✅ `lectures/intro.md` | 0/0 | 0/0 | 1/1 | 0/0 | 100% | ❌ |
| ✅ `lectures/laffer_adaptive.md` | 8/8 | 1/1 | 11/11 | 10/10 | 100% | ❌ |
| ✅ `lectures/lake_model.md` | 4/4 | 5/5 | 16/16 | 10/10 | 100% | ❌ |
| 🟡 `lectures/linear_equations.md` | 6/6 | 15/15 | 75/76 | 31/31 | 85% | ❌ |
| ✅ `lectures/lln_clt.md` | 5/5 | 8/8 | 34/34 | 13/13 | 100% | ❌ |
| ✅ `lectures/long_run_growth.md` | 5/5 | 7/7 | 25/25 | 0/0 | 100% | ❌ |
| ✅ `lectures/lp_intro.md` | 5/5 | 6/6 | 38/38 | 13/13 | 100% | ❌ |
| ✅ `lectures/markov_chains_I.md` | 7/7 | 18/18 | 55/55 | 19/19 | 100% | ❌ |
| ✅ `lectures/markov_chains_II.md` | 4/4 | 5/5 | 33/33 | 10/10 | 100% | ❌ |
| ✅ `lectures/mle.md` | 5/5 | 3/3 | 33/33 | 10/10 | 100% | ❌ |
| ✅ `lectures/money_inflation.md` | 9/9 | 4/4 | 26/26 | 45/45 | 100% | ❌ |
| 🟡 `lectures/money_inflation_nonlinear.md` | 7/7 | 1/1 | 10/11 | 7/7 | 85% | ❌ |
| ✅ `lectures/monte_carlo.md` | 5/5 | 14/14 | 32/32 | 13/13 | 100% | ❌ |
| ✅ `lectures/olg.md` | 8/8 | 12/12 | 56/56 | 4/4 | 100% | ❌ |
| ✅ `lectures/prob_dist.md` | 3/3 | 18/18 | 63/63 | 20/20 | 100% | ❌ |
| ✅ `lectures/pv.md` | 7/7 | 0/0 | 20/20 | 18/18 | 100% | ❌ |
| ✅ `lectures/scalar_dynam.md` | 5/5 | 9/9 | 30/30 | 8/8 | 100% | ❌ |
| ✅ `lectures/schelling.md` | 4/4 | 3/3 | 18/18 | 0/0 | 100% | ❌ |
| ✅ `lectures/short_path.md` | 5/5 | 2/2 | 23/23 | 2/2 | 100% | ❌ |
| 🟡 `lectures/simple_linear_regression.md` | 2/2 | 0/0 | 46/41 | 20/20 | 85% | ❌ |
| ✅ `lectures/solow.md` | 4/4 | 0/0 | 39/39 | 6/6 | 100% | ❌ |
| ✅ `lectures/status.md` | 0/0 | 0/0 | 3/3 | 0/0 | 100% | ❌ |
| 🟡 `lectures/supply_demand_heterogeneity.md` | 5/5 | 5/5 | 11/11 | 19/18 | 85% | ❌ |
| ✅ `lectures/supply_demand_multiple_goods.md` | 8/8 | 14/14 | 29/29 | 40/40 | 100% | ❌ |
| ✅ `lectures/time_series_with_matrices.md` | 6/6 | 0/0 | 34/34 | 17/17 | 100% | ❌ |
| ✅ `lectures/troubleshooting.md` | 2/2 | 0/0 | 2/2 | 0/0 | 100% | ❌ |
| ✅ `lectures/unpleasant.md` | 8/8 | 1/1 | 12/12 | 22/22 | 100% | ❌ |
| ✅ `lectures/zreferences.md` | 0/0 | 0/0 | 1/1 | 0/0 | 100% | ❌ |

## Files Needing Review

| File | Issue | Structure Score |
|------|-------|-----------------|
| ⚠️ `README.md` | Target has 4 extra subsection(s) | 55% |
| ⚠️ `lectures/equalizing_difference.md` | Target has 1 extra section(s) | 60% |

## Diverged Files

| File | Source Sections | Target Sections | Issues |
|------|-----------------|-----------------|--------|
| ❌ `lectures/cagan_adaptive.md` | 7 | 6 | Target is missing 1 section(s); Code block count mismatch: source=7, target=9; Target file is missing heading-map; 6 code block(s) have been modified; 2 extra code block(s) in target |
| ❌ `lectures/intro_supply_demand.md` | 7 | 6 | Target is missing 1 section(s); Code block count mismatch: source=41, target=39; Target file is missing heading-map; 1 code block(s) have been modified |
| ❌ `lectures/networks.md` | 9 | 11 | Target has 2 extra section(s); Target is missing 1 subsection(s); Target file is missing heading-map; 4 code block(s) have been modified |

## Missing Files (In Source Only)

| File | Source Sections | Action |
|------|-----------------|--------|
| 📄 `lectures/.virtual_documents/cobweb.md` | 0 | Translate |
| 📄 `lectures/tax_smooth.md` | 4 | Translate |

## Extra Files (In Target Only)

| File | Target Sections | Notes |
|------|-----------------|-------|
| ➕ `.pytest_cache/README.md` | 0 | May be localization content |
| ➕ `lectures/README.md` | 0 | May be localization content |

## Recommendations

| File | Status | Action | Details |
|------|--------|--------|---------|
| `README.md` | ⚠️ | 👀 Review Structure | Target has 4 extra subsection(s); Code block count mismatch: source=0, target=2; Target file is missing heading-map; 2 extra code block(s) in target |
| `_notebook_repo/README.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/.virtual_documents/cobweb.md` | 📄 | 🌐 Translate | File needs to be translated (0 sections) |
| `lectures/about.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/ar1_processes.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `lectures/business_cycle.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/cagan_adaptive.md` | ❌ | 🔧 Manual Merge | Major structure mismatch: Target is missing 1 section(s); Code block count mismatch: source=7, target=9; Target file is missing heading-map; 6 code block(s) have been modified; 2 extra code block(s) in target |
| `lectures/cagan_ree.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/cobweb.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/commod_price.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/complex_and_trig.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `lectures/cons_smooth.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/eigen_I.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/eigen_II.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/equalizing_difference.md` | ⚠️ | 👀 Review Structure | Target has 1 extra section(s); Target file is missing heading-map; 10 code block(s) have been modified |
| `lectures/french_rev.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/geom_series.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `lectures/greek_square.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/heavy_tails.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/inequality.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/inflation_history.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `lectures/input_output.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/intro.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/intro_supply_demand.md` | ❌ | 🔧 Manual Merge | Major structure mismatch: Target is missing 1 section(s); Code block count mismatch: source=41, target=39; Target file is missing heading-map; 1 code block(s) have been modified |
| `lectures/laffer_adaptive.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/lake_model.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/linear_equations.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `lectures/lln_clt.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/long_run_growth.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/lp_intro.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/markov_chains_I.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/markov_chains_II.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/mle.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/money_inflation.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/money_inflation_nonlinear.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `lectures/monte_carlo.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/networks.md` | ❌ | 🔧 Manual Merge | Major structure mismatch: Target has 2 extra section(s); Target is missing 1 subsection(s); Target file is missing heading-map; 4 code block(s) have been modified |
| `lectures/olg.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/prob_dist.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/pv.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/scalar_dynam.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/schelling.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/short_path.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/simple_linear_regression.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `lectures/solow.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/status.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/supply_demand_heterogeneity.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `lectures/supply_demand_multiple_goods.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/tax_smooth.md` | 📄 | 🌐 Translate | File needs to be translated (4 sections) |
| `lectures/time_series_with_matrices.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/troubleshooting.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/unpleasant.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lectures/zreferences.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `environment.yml` | 🟡 | ⚙️ Review Config | Structure matches but content differs; verify translations |

---
*Generated by tool-alignment*