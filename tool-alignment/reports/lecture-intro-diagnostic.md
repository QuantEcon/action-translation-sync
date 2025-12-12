# Alignment Diagnostic Report

**Source**: `/Users/mmcky/work/quantecon/lecture-python-intro`  
**Target**: `/Users/mmcky/work/quantecon/lecture-intro.zh-cn`  
**Docs Folder**: `lectures`  
**Generated**: 2025-12-11T05:55:06.574Z  
**Tool Version**: 0.1.0

## Summary

### Alignment Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Aligned | 37 | 71% |
| 🟡 Likely Aligned | 8 | 15% |
| ⚠️ Needs Review | 1 | 2% |
| ❌ Diverged | 3 | 6% |
| 📄 Missing | 2 | 4% |
| ➕ Extra | 1 | 2% |

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

| File | Sections | Subsections | Code | Math | Score | Heading Map |
|------|----------|-------------|------|------|-------|-------------|
| ✅ `about.md` | 3/3 | 0/0 | 0/0 | 0/0 | 100% | ❌ |
| 🟡 `ar1_processes.md` | 5/5 | 3/3 | 31/34 | 10/10 | 85% | ❌ |
| ✅ `business_cycle.md` | 6/6 | 3/3 | 24/24 | 0/0 | 100% | ❌ |
| ✅ `cagan_ree.md` | 4/4 | 9/9 | 9/9 | 23/23 | 100% | ❌ |
| ✅ `cobweb.md` | 6/6 | 0/0 | 33/33 | 8/8 | 100% | ❌ |
| ✅ `commod_price.md` | 6/6 | 3/3 | 7/7 | 12/12 | 100% | ❌ |
| 🟡 `complex_and_trig.md` | 4/4 | 8/8 | 15/16 | 24/24 | 85% | ❌ |
| ✅ `cons_smooth.md` | 6/6 | 11/11 | 25/25 | 22/22 | 100% | ❌ |
| ✅ `eigen_I.md` | 8/8 | 17/17 | 46/46 | 15/15 | 100% | ❌ |
| ✅ `eigen_II.md` | 2/2 | 7/7 | 25/25 | 11/11 | 100% | ❌ |
| ✅ `french_rev.md` | 7/7 | 0/0 | 22/22 | 1/1 | 100% | ❌ |
| 🟡 `geom_series.md` | 6/6 | 9/9 | 24/25 | 35/35 | 85% | ❌ |
| ✅ `greek_square.md` | 9/9 | 0/0 | 18/18 | 45/45 | 100% | ❌ |
| ✅ `heavy_tails.md` | 8/8 | 18/18 | 56/56 | 15/15 | 100% | ❌ |
| ✅ `inequality.md` | 5/5 | 12/12 | 67/67 | 4/4 | 100% | ❌ |
| 🟡 `inflation_history.md` | 3/3 | 4/4 | 25/26 | 0/0 | 85% | ❌ |
| ✅ `input_output.md` | 8/8 | 4/4 | 28/28 | 32/32 | 100% | ❌ |
| ✅ `intro.md` | 0/0 | 0/0 | 1/1 | 0/0 | 100% | ❌ |
| ✅ `laffer_adaptive.md` | 8/8 | 1/1 | 11/11 | 10/10 | 100% | ❌ |
| ✅ `lake_model.md` | 4/4 | 5/5 | 16/16 | 10/10 | 100% | ❌ |
| 🟡 `linear_equations.md` | 6/6 | 15/15 | 75/76 | 31/31 | 85% | ❌ |
| ✅ `lln_clt.md` | 5/5 | 8/8 | 34/34 | 13/13 | 100% | ❌ |
| ✅ `long_run_growth.md` | 5/5 | 7/7 | 25/25 | 0/0 | 100% | ❌ |
| ✅ `lp_intro.md` | 5/5 | 6/6 | 38/38 | 13/13 | 100% | ❌ |
| ✅ `markov_chains_I.md` | 7/7 | 18/18 | 55/55 | 19/19 | 100% | ❌ |
| ✅ `markov_chains_II.md` | 4/4 | 5/5 | 33/33 | 10/10 | 100% | ❌ |
| ✅ `mle.md` | 5/5 | 3/3 | 33/33 | 10/10 | 100% | ❌ |
| ✅ `money_inflation.md` | 9/9 | 4/4 | 26/26 | 45/45 | 100% | ❌ |
| 🟡 `money_inflation_nonlinear.md` | 7/7 | 1/1 | 10/11 | 7/7 | 85% | ❌ |
| ✅ `monte_carlo.md` | 5/5 | 14/14 | 32/32 | 13/13 | 100% | ❌ |
| ✅ `olg.md` | 8/8 | 12/12 | 56/56 | 4/4 | 100% | ❌ |
| ✅ `prob_dist.md` | 3/3 | 18/18 | 63/63 | 20/20 | 100% | ❌ |
| ✅ `pv.md` | 7/7 | 0/0 | 20/20 | 18/18 | 100% | ❌ |
| ✅ `scalar_dynam.md` | 5/5 | 9/9 | 30/30 | 8/8 | 100% | ❌ |
| ✅ `schelling.md` | 4/4 | 3/3 | 18/18 | 0/0 | 100% | ❌ |
| ✅ `short_path.md` | 5/5 | 2/2 | 23/23 | 2/2 | 100% | ❌ |
| 🟡 `simple_linear_regression.md` | 2/2 | 0/0 | 46/41 | 20/20 | 85% | ❌ |
| ✅ `solow.md` | 4/4 | 0/0 | 39/39 | 6/6 | 100% | ❌ |
| ✅ `status.md` | 0/0 | 0/0 | 3/3 | 0/0 | 100% | ❌ |
| 🟡 `supply_demand_heterogeneity.md` | 5/5 | 5/5 | 11/11 | 19/18 | 85% | ❌ |
| ✅ `supply_demand_multiple_goods.md` | 8/8 | 14/14 | 29/29 | 40/40 | 100% | ❌ |
| ✅ `time_series_with_matrices.md` | 6/6 | 0/0 | 34/34 | 17/17 | 100% | ❌ |
| ✅ `troubleshooting.md` | 2/2 | 0/0 | 2/2 | 0/0 | 100% | ❌ |
| ✅ `unpleasant.md` | 8/8 | 1/1 | 12/12 | 22/22 | 100% | ❌ |
| ✅ `zreferences.md` | 0/0 | 0/0 | 1/1 | 0/0 | 100% | ❌ |

## Files Needing Review

| File | Issue | Structure Score |
|------|-------|-----------------|
| ⚠️ `equalizing_difference.md` | Target has 1 extra section(s) | 60% |

## Diverged Files

| File | Source Sections | Target Sections | Issues |
|------|-----------------|-----------------|--------|
| ❌ `cagan_adaptive.md` | 7 | 6 | Target is missing 1 section(s); Code block count mismatch: source=7, target=9; Target file is missing heading-map |
| ❌ `intro_supply_demand.md` | 7 | 6 | Target is missing 1 section(s); Code block count mismatch: source=41, target=39; Target file is missing heading-map |
| ❌ `networks.md` | 9 | 11 | Target has 2 extra section(s); Target is missing 1 subsection(s); Target file is missing heading-map |

## Missing Files (In Source Only)

| File | Source Sections | Action |
|------|-----------------|--------|
| 📄 `.virtual_documents/cobweb.md` | 0 | Translate |
| 📄 `tax_smooth.md` | 4 | Translate |

## Extra Files (In Target Only)

| File | Target Sections | Notes |
|------|-----------------|-------|
| ➕ `README.md` | 0 | May be localization content |

## Recommendations

| File | Status | Action | Details |
|------|--------|--------|---------|
| `.virtual_documents/cobweb.md` | 📄 | 🌐 Translate | File needs to be translated (0 sections) |
| `about.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `ar1_processes.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `business_cycle.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `cagan_adaptive.md` | ❌ | 🔧 Manual Merge | Major structure mismatch: Target is missing 1 section(s); Code block count mismatch: source=7, target=9; Target file is missing heading-map |
| `cagan_ree.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `cobweb.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `commod_price.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `complex_and_trig.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `cons_smooth.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `eigen_I.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `eigen_II.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `equalizing_difference.md` | ⚠️ | 👀 Review Structure | Target has 1 extra section(s); Target file is missing heading-map |
| `french_rev.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `geom_series.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `greek_square.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `heavy_tails.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `inequality.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `inflation_history.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `input_output.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `intro.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `intro_supply_demand.md` | ❌ | 🔧 Manual Merge | Major structure mismatch: Target is missing 1 section(s); Code block count mismatch: source=41, target=39; Target file is missing heading-map |
| `laffer_adaptive.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lake_model.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `linear_equations.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `lln_clt.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `long_run_growth.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `lp_intro.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `markov_chains_I.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `markov_chains_II.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `mle.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `money_inflation.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `money_inflation_nonlinear.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `monte_carlo.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `networks.md` | ❌ | 🔧 Manual Merge | Major structure mismatch: Target has 2 extra section(s); Target is missing 1 subsection(s); Target file is missing heading-map |
| `olg.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `prob_dist.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `pv.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `scalar_dynam.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `schelling.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `short_path.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `simple_linear_regression.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `solow.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `status.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `supply_demand_heterogeneity.md` | 🟡 | 🗺️ Generate Heading Map | Structure score 85%; review and generate heading-map |
| `supply_demand_multiple_goods.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `tax_smooth.md` | 📄 | 🌐 Translate | File needs to be translated (4 sections) |
| `time_series_with_matrices.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `troubleshooting.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `unpleasant.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `zreferences.md` | ✅ | 🗺️ Generate Heading Map | Structure aligned; generate heading-map to enable sync |
| `environment.yml` | 🟡 | ⚙️ Review Config | Structure matches but content differs; verify translations |

---
*Generated by tool-alignment*