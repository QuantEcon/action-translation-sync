# Resync & Initial Alignment: Implementation Plan

**Document Status**: Phase 1 + 1b + 2 + 3.1 Complete  
**Last Updated**: 18 December 2025  
**Version**: v0.12

This document provides a focused implementation plan for two related features:
1. **Initial Alignment** - Onboard existing translation repos (one-time setup)
2. **Resync** - Detect and fix divergence over time (periodic maintenance)

**Design Principle**: Simple, low-complexity approach with clear phases.

---

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | Structural Diagnostics - CLI tool with reports |
| **Phase 1b** | ✅ Complete | Code Block Integrity Check (zero-cost enhancement) |
| **Phase 2** | ✅ Complete | Translation Quality Assessment via Claude |
| **Phase 3** | � **In Progress** | **File-Centric Refactor** - Milestone 3.1 complete |
| **Phase 4** | 🔲 Planned | Heading-Map Generator |
| **Phase 5** | 🔲 Planned | Interactive Alignment PR |
| **Phase 6** | 🔲 Planned | GitHub Action Integration |

### Next Development Actions

1. **Phase 3.2**: Action Recommendation Engine - configurable thresholds for calibration
2. **Phase 3.3**: Threshold Calibration - create gold-standard test set
3. **Phase 2 Testing Program** - Calibrate quality scoring thresholds (can run in parallel)

### Phase 3.1 Complete (18 Dec 2025)

**Feature**: File-Centric Triage & Diagnostics  
**Tests**: 18 new tests (117 total in tool-alignment)

| Feature | Implementation |
|---------|----------------|
| `triage` command | Series-level scan with prioritized action list |
| `file` command | Single-file detailed diagnostic |
| Output structure | `status/<repo-name>/_triage.md` + individual file reports |
| File-level analysis | Combines structure + code dimensions |
| Action recommendations | ok, resync, review-code, review-quality, retranslate, create, diverged |
| Priority sorting | critical → high → medium → low → ok |
| Default behavior | Only generate reports for files needing attention |
| `--all` flag | Generate reports for ALL files (debug mode) |

**New CLI Commands**:
```bash
# Triage entire series
npm run diagnose -- triage \
  --source /path/to/lecture-python-intro \
  --target /path/to/lecture-intro.zh-cn \
  --docs-folder lectures

# Diagnose single file
npm run diagnose -- file cobweb.md \
  --source /path/to/lecture-python-intro \
  --target /path/to/lecture-intro.zh-cn \
  --docs-folder lectures
```

**Output Files**:
- `status/<repo-name>/_triage.md` - Series summary with prioritized action list
- `status/<repo-name>/<file>.md` - Individual file diagnostics

**Initial Results** (lecture-python-intro → lecture-intro.zh-cn):
| Metric | Count |
|--------|-------|
| Total Files | 52 |
| ✅ OK | 9 (17%) |
| ⚠️ Needs Attention | 43 (83%) |
| 📄 Create (missing) | 2 |
| ⚠️ Diverged | 12 |
| 🔧 Review code | 15 |
| 🔄 Resync | 14 |

### Phase 2 Complete (17 Dec 2025)

**Feature**: Translation Quality Assessment via Claude  
**Tests**: 11 new tests (99 total in tool-alignment)

| Feature | Implementation |
|---------|----------------|
| Quality scoring | Per-section accuracy, fluency, terminology, completeness |
| Multi-model support | Haiku 3.5, Haiku 4.5, Sonnet 4.5 (configurable via `--model`) |
| Score calculation | Weighted average: accuracy 40%, fluency 25%, terminology 20%, completeness 15% |
| Quality flags | `inaccurate`, `awkward`, `terminology`, `omission`, `addition`, `formatting` |
| Flagging threshold | Score < 80% (configurable, requires calibration) |
| Cost estimation | Pre-flight estimate with cost confirmation prompt |
| Report generation | `*-quality-{model}.md` reports with recommendations |
| Glossary support | Full glossary (357 terms) sent for accurate terminology checking |

**Model Options**:
| Model | ID | Cost (input/output per MTK) |
|-------|----|-----------------------------|
| `haiku3_5` | claude-3-5-haiku-20241022 | $0.25 / $1.25 |
| `haiku4_5` | claude-haiku-4-5-20251001 | $1.00 / $5.00 |
| `sonnet4_5` | claude-sonnet-4-5-20250929 | $3.00 / $15.00 |

**CLI Usage**:
```bash
npm run diagnose -- assess <structure-report> \
  --source ../lecture-python-intro \
  --target ../lecture-intro.zh-cn \
  --target-language zh-cn \
  --glossary ../glossary/zh-cn.json \
  --model haiku3_5 \
  -y  # Skip cost confirmation
```

**Report Structure**:
1. **Summary** - Overall quality, files assessed, sections flagged
2. **Score Breakdown** - Average accuracy, fluency, terminology, completeness
3. **Files Requiring Attention** - Sorted by score with recommendations:
   - 🔴 **Retranslate** (score < 60%)
   - 🟠 Review all sections (60-70%)
   - 🟡 Review flagged sections (70-80%)
   - ✓ Minor issues only (≥80%)
4. **File Details** - Per-section scores with flagged section notes in collapsible details

**Score Display** (4-tier color scheme):
- 🟢 90-100%: Excellent
- 🟡 80-89%: Good/Acceptable  
- 🟠 50-79%: Needs Improvement (flagged)
- 🔴 <50%: Poor (flagged)

**Assessment Results** (lecture-intro, 233 sections):
| Model | Overall | Cost | Time |
|-------|---------|------|------|
| Haiku 3.5 | 94% | $0.31 | ~5 min |
| Haiku 4.5 | 83% | $1.34 | ~8 min |
| Sonnet 4.5 | 86% | $3.89 | ~12 min |

### Phase 2 Future Work: Threshold Calibration

**Current State**: Flagging threshold is set to score < 80%, but this needs validation.

**Testing Program** (TODO):
1. Create gold-standard test set:
   - Select ~20 sections across quality spectrum
   - Have human expert rate each section (needs retranslation / acceptable / good)
2. Run assessments with each model
3. Compare AI scores against human judgment
4. Calibrate threshold to maximize:
   - True positives: flagging sections that actually need work
   - True negatives: not flagging acceptable sections
5. Document optimal threshold and model recommendation

**Research Questions**:
- Does Haiku 3.5's higher overall scores (94%) indicate it's too lenient?
- Are Sonnet 4.5's detailed notes worth 10x the cost?
- What threshold best separates "needs retranslation" from "acceptable"?

---

### Phase 3: File-Centric Refactor (Proposed)

**Planned**: December 2025

#### Problem Statement

The current tool generates three comprehensive reports:
1. Structure report (`*-structure.md`) - 52 files
2. Code report (`*-code.md`) - 52 files  
3. Quality report (`*-quality-{model}.md`) - 45 files

**Pain Points**:
- **Information overload**: Three reports × 50+ files = overwhelming
- **No clear action**: Must mentally cross-reference 3 reports per file
- **Hard to prioritize**: Which file should I work on first?
- **Decision paralysis**: Good data, but no clear "what do I do next?"

#### Solution: File-Centric Diagnostics

Refactor from **series-level analysis** to **file-level actionable diagnostics**.

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIAGE (Series-level)                    │
│  Quick scan all files → Prioritized list by urgency         │
│  "Here are the 5 files that need attention, in order"       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  DIAGNOSE (File-level)                      │
│  All 3 dimensions for ONE file → ONE action recommendation  │
│  "For intro.md: RESYNC - structure aligned, code OK"        │
└─────────────────────────────────────────────────────────────┘
```

#### New CLI Design

```bash
# Series Triage: Quick overview, prioritized list
npm run diagnose -- triage \
  --source /path/to/english \
  --target /path/to/chinese

# Output: Prioritized list of files needing attention
# 1. 🔴 missing_file.md    - MISSING (needs translation)
# 2. 🔴 diverged_file.md   - DIVERGED (major structural issues)
# 3. 🟠 low_quality.md     - QUALITY 65% (needs review)
# 4. 🟡 code_modified.md   - CODE 75% (verify changes)
# 5. ✅ 47 files OK

# File Diagnose: Deep dive on single file
npm run diagnose -- file intro.md \
  --source /path/to/english \
  --target /path/to/chinese \
  --glossary ../glossary/zh-cn.json

# Output: Complete diagnosis + recommended action
```

#### File-Level Output Format

```markdown
# 📄 File Diagnostic: intro.md

## Quick Summary
| Dimension    | Status | Score | Details |
|-------------|--------|-------|---------|
| Structure   | ✅ Aligned | 100% | 5/5 sections, 12/12 subsections |
| Code        | ⚠️ Modified | 85% | 2 blocks modified (i18n) |
| Quality     | 🟢 Good | 94% | No flagged sections |

## 🎯 Recommended Action: OK ✅
All dimensions pass thresholds. File is ready for automated sync.

---

## Detailed Analysis

### Structure
- Sections: 5/5 matched ✅
- Subsections: 12/12 matched ✅
- Heading-map: Present and complete ✅
- Config alignment: N/A (file-level)

### Code Integrity (85%)
| Block | Line | Status | Notes |
|-------|------|--------|-------|
| 1 | 45 | ✅ Identical | |
| 2 | 78 | 📍 i18n | CJK font config added |
| 3 | 112 | ⚠️ Modified | Variable renamed |

<details><summary>Block 3 diff</summary>

\`\`\`diff
- result = compute_value(x)
+ resultado = compute_value(x)  # Changed variable name
\`\`\`

</details>

### Translation Quality (94%)
| Section | Score | Flags | Notes |
|---------|-------|-------|-------|
| Introduction | 96% | - | Excellent |
| Background | 92% | - | Good |
| Model | 94% | - | Good |
| Results | 95% | - | Excellent |
| Conclusion | 93% | - | Good |

No sections flagged for review.
```

#### Action Categories

| Action | Icon | Conditions | What to Do |
|--------|------|------------|------------|
| **OK** | ✅ | All dimensions ≥80% | Ready for sync, no action needed |
| **RESYNC** | 🔄 | Structure aligned, quality OK, minor code drift | Run action-translation to sync |
| **REVIEW CODE** | 🔧 | Code integrity <80% | Verify code changes are intentional |
| **REVIEW QUALITY** | 📝 | Quality <80% | Review flagged sections |
| **RETRANSLATE** | 🔴 | Quality <60% or major issues | Full retranslation needed |
| **CREATE** | 📄 | Missing in target | New translation needed |
| **DIVERGED** | ⚠️ | Structure mismatch >20% | Manual structural alignment needed |

#### Decision Matrix

```
                    Quality Score
                    ≥80%        60-79%      <60%
                ┌───────────┬───────────┬───────────┐
Structure    OK │    ✅     │    📝     │    🔴     │
Aligned         │    OK     │  REVIEW   │ RETRANS   │
                │           │  QUALITY  │  LATE     │
                ├───────────┼───────────┼───────────┤
Structure       │    ⚠️     │    ⚠️     │    ⚠️     │
Misaligned      │ DIVERGED  │ DIVERGED  │ DIVERGED  │
                └───────────┴───────────┴───────────┘

Code Score overlay:
- If code <80%: Add "REVIEW CODE" to action
- If code is i18n only: Note but don't flag
```

#### Triage Output Format

```markdown
# 📊 Series Triage: lecture-intro

**Source**: lecture-python-intro/lectures (51 files)
**Target**: lecture-intro.zh-cn/lectures (50 files)
**Date**: 17 December 2025

## Priority Action List

| Priority | File | Action | Issue |
|----------|------|--------|-------|
| 🔴 1 | `new_lecture.md` | CREATE | Missing in target |
| 🔴 2 | `restructured.md` | DIVERGED | 3 sections mismatch |
| 🟠 3 | `poor_quality.md` | RETRANSLATE | Quality 52% |
| 🟠 4 | `needs_review.md` | REVIEW QUALITY | Quality 72% |
| 🟡 5 | `code_modified.md` | REVIEW CODE | Code 68% |

## Summary

| Status | Count | Files |
|--------|-------|-------|
| ✅ OK | 45 | Ready for sync |
| 🔴 Critical | 2 | Needs immediate attention |
| 🟠 Review | 2 | Needs quality review |
| 🟡 Verify | 1 | Verify code changes |

## Next Steps
1. Run `npm run diagnose -- file new_lecture.md ...` to diagnose missing file
2. Run `npm run diagnose -- file restructured.md ...` to see structure diff
3. Work through priority list top to bottom
```

#### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Triage cost** | Structure + Code only (zero cost) | Start with free checks; add quality assessment only if over-flagging occurs |
| **i18n code changes** | Note but don't flag | Valid localization changes (CJK fonts, etc.) are acceptable modifications |
| **Thresholds** | TBD via testing program | Need human-validated test cases to calibrate cutoffs |
| **Triage scope** | All files | Must check every file to ensure complete sync readiness |

#### Threshold Calibration Program

**Problem**: The action categories depend on score thresholds (e.g., ≥80% = OK, <60% = RETRANSLATE). These thresholds are currently arbitrary and need validation.

**Testing Program**:

1. **Create Gold-Standard Test Set**
   - Select ~20-30 file pairs across the quality spectrum
   - Include: excellent translations, acceptable translations, poor translations, structural mismatches
   - Have human expert classify each file into action categories

2. **Run Tool Analysis**
   - Execute structure + code analysis on test set
   - Record scores for each dimension

3. **Compare & Calibrate**
   - Compare tool recommendations vs human classifications
   - Identify optimal thresholds that maximize:
     - **True positives**: Correctly flagging files that need work
     - **True negatives**: Not flagging files that are OK
   - Minimize false positives (over-flagging) and false negatives (missing issues)

4. **Iterate**
   - If structure + code thresholds produce too many false positives → adjust thresholds
   - If still over-flagging → consider adding quality assessment to triage
   - Document final thresholds with justification

**Test Case Categories**:
| Category | Expected Action | Example Characteristics |
|----------|-----------------|------------------------|
| Perfect alignment | ✅ OK | 100% structure, 100% code |
| Minor code drift | ✅ OK or 🔧 REVIEW CODE | 100% structure, 85-95% code (i18n only) |
| Significant code changes | 🔧 REVIEW CODE | 100% structure, <80% code (logic changes) |
| Missing sections | ⚠️ DIVERGED | <80% structure match |
| Extra sections | ⚠️ DIVERGED | Target has sections not in source |
| Missing file | 📄 CREATE | File in source only |
| Quality issues only | 📝 REVIEW QUALITY | 100% structure, 100% code, <80% quality |

**Success Criteria**:
- ≥90% agreement between tool recommendations and human classifications
- Clear threshold values with documented rationale
- Edge cases identified and handled

#### Implementation Plan

**Milestone 3.1: Refactor Core Analysis** ✅ Complete (18 Dec 2025)
- [x] Create `file-analyzer.ts` - Single file analysis combining all dimensions
- [x] Create `triage.ts` - Series-level quick scan (structure + code only)
- [x] Refactor CLI to support `triage` and `file` subcommands
- [x] Update types for file-level results
- [x] Create `triage-report.ts` - Combined report generation
- [x] Add 18 tests for Phase 3 modules

**Milestone 3.2: Action Recommendation Engine**
- [x] Integrated into `file-analyzer.ts` (`recommendAction()` method)
- [x] Handle edge cases (missing files, i18n patterns)
- [ ] Make thresholds configurable (for calibration testing)
- [ ] Add confidence scoring for recommendations

**Milestone 3.3: Threshold Calibration**
- [ ] Create gold-standard test set (20-30 file pairs)
- [ ] Run calibration tests
- [ ] Document optimal thresholds
- [ ] Decide if quality assessment needed in triage

**Milestone 3.4: Report Generators** ✅ Complete
- [x] Create `triage-report.ts` - Series-level triage report
- [x] Create file report generation (integrated in `triage-report.ts`)
- [ ] Deprecate or simplify existing report generators

**Milestone 3.5: Testing & Migration**
- [x] Add test fixtures for file-level analysis (using existing fixtures)
- [x] Add 18 new tests (117 total)
- [ ] Document migration from series-level to file-level workflow
- [x] Validate against lecture-intro repos

#### Benefits

| Benefit | Description |
|---------|-------------|
| **Actionable** | Each file gets ONE clear recommendation |
| **Focused** | Work on one file at a time, all info in one place |
| **Prioritized** | Triage tells you what to fix first |
| **Workflow-friendly** | Natural progression: triage → diagnose → fix → verify |
| **Reduced cognitive load** | No cross-referencing 3 reports |
| **Zero-cost triage** | Structure + code analysis is free; quality only when needed |

#### Migration Path

1. **Keep existing commands** working during transition
2. **Add new `triage` and `file` subcommands** alongside existing `diagnose`
3. **Deprecate series-level reports** once file-level is validated
4. **Update documentation** with new workflow

---

### Phase 1b Results (15 Dec 2025)

**Feature**: Code Block Integrity Check  
**Tests**: 51 tests (88 total in tool-alignment, now 99 with Phase 2)

| Feature | Implementation |
|---------|----------------|
| Code extraction | `{code-cell}` directives + standard markdown code blocks with language |
| String normalization | `"<< STRING >>"` placeholder (handles translated labels) |
| Comment normalization | `# << COMMENT >>` placeholder (preserves structure) |
| Caption normalization | `caption: << CAPTION >>` placeholder (handles translated captions) |
| Exact matching | Detects identical code blocks |
| Normalized matching | Detects blocks differing only in strings/comments/whitespace |
| Modified detection | Identifies blocks with actual logic changes |
| Missing/extra | Detects blocks present in only one file |
| Integrity score | 0-100% based on matched vs total blocks |
| Localization detection | Flags CJK font config patterns with 📍 i18n note |
| LCS diff algorithm | Accurate line-by-line diff showing only code logic changes |

**Normalization Strategy** (compares logical code structure):
1. String literals → `"<< STRING >>"` (handles `label="estimate"` → `label="估计值"`)
2. Comments → `# << COMMENT >>` (handles `# text` → `# 中文`)
3. Captions → `caption: << CAPTION >>` (handles translated figure captions)
4. Whitespace → trimmed, multiple spaces collapsed, blank lines collapsed

**Score Display** (5-tier color scheme):
- ✅ 100% - Perfect match
- 🟨 90-99% - Minor differences
- 🟡 80-89% - Some modifications
- 🟠 60-79% - Significant differences
- 🔴 <60% - Major divergence

**Localization Patterns Detected**:
- `plt.rcParams['font.sans-serif']` - CJK font configuration  
- `SimHei`, `SimSun`, etc. - CJK font families
- `axes.unicode_minus` - Unicode minus handling

**Reports Generated**:
- `*-structure.md` - Structural alignment (sections, headings, config)
- `*-code.md` - Code block integrity with diffs

**Impact** (lecture-intro diagnostic):
| Metric | Value |
|--------|-------|
| Overall Score | 79% (717/906 blocks matched) |
| Modified Blocks | 186 |
| Missing Blocks | 3 |
| Extra Blocks | 4 |

| File Example | Score | Notes |
|------|-------|-------|
| greek_square.md | 🟨 92% | Minor differences |
| input_output.md | 🟨 94% | Minor differences |
| cobweb.md | 🟡 89% | i18n patterns |
| mle.md | 50% | 71% | +21% |
| input_output.md | 44% | 61% | +17% |
| ar1_processes.md | 40% | 53% | +13% + i18n note |

**New Test Fixture**: `14-code-integrity/` covering all scenarios

### Phase 1 Results (11 Dec 2025)

**Tool**: `tool-alignment/` CLI  
**Tests**: 21 passing across 13 test fixtures  
**Real-world validation**: `lecture-python-intro` → `lecture-intro.zh-cn`

| Metric | Result |
|--------|--------|
| Files analyzed | 52 |
| ✅ Aligned | 37 (71%) |
| 🟡 Likely aligned | 8 (15%) |
| ⚠️ Needs review | 1 (2%) |
| ❌ Diverged | 3 (6%) |
| 📄 Missing | 2 (4%) |
| ➕ Extra | 1 (2%) |

**Key Finding**: 86% of files are structurally aligned and ready for heading-map generation.

---

## Quality Assessment Strategy (v0.5)

### Decision: Skip Heuristics, Use Haiku Directly

We evaluated building Level 0 heuristics (character ratio, glossary checks, sentence counts) before LLM quality scoring. **Decision: Skip heuristics layer.**

**Rationale**:
- Haiku cost is negligible (~$0.10 for 400 sections)
- Heuristics have high false positive rates (translation length varies naturally)
- Haiku provides better accuracy with context awareness
- Reduces codebase complexity

### Exception: Code Block Comparison

**Keep code block comparison as separate check.**

| Aspect | Rationale |
|--------|-----------|
| Different signal | Integrity (is code unchanged?) vs Quality (is translation good?) |
| Definitive | Code either matches or doesn't - no ambiguity |
| Haiku blind spot | LLMs sometimes gloss over subtle code differences |
| Zero cost | Can run on every commit without budget concerns |
| Useful for resync | Quick check if code drifted during manual edits |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1 + 1b: Structural + Code Integrity           FREE  │
│  ├── Section/subsection structure comparison               │
│  ├── Code block exact match (strip comments)               │
│  └── Output: Structure Score + Code Integrity Score        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Haiku Quality Assessment                  ~$0.10 │
│  ├── Per-section scoring (0-100)                           │
│  ├── Flag issues: accuracy, fluency, terminology           │
│  └── Output: Quality Score per section                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ (optional, only if needed)
┌─────────────────────────────────────────────────────────────┐
│  Phase 2b: Sonnet Detailed Analysis (optional)      ~$0.50 │
│  └── Deep comparison for flagged sections                  │
└─────────────────────────────────────────────────────────────┘
```

### Cost Estimate (lecture-intro: 52 files, ~233 sections)

| Phase | Cost | Notes |
|-------|------|-------|
| Phase 1 + 1b | $0 | Structural + code integrity |
| Phase 2 (Haiku 3.5) | ~$0.50 | Quality scoring all sections |
| Phase 2 (Haiku 4.5) | ~$2.00 | Higher quality, 4x cost |
| Phase 2 (Sonnet 4.5) | ~$6.00 | Detailed notes, 12x cost |
| **Typical Total** | **~$0.50** | Using Haiku 3.5 for cost-effective assessment |

---

## Key Decisions (v0.5)

| Decision | Choice | Rationale |
|----------|--------|----------|
| Diagnostics approach | Structural first | Zero cost, instant feedback |
| Quality assessment | Haiku direct | Skip heuristics - Haiku is cheap (~$0.10/repo) and more accurate |
| Code integrity | Separate check | Different signal (integrity vs quality), zero cost, definitive |
| Tool location | `tool-alignment/` | Single tool for alignment + resync |
| Testing strategy | Local fixtures + real repos | 13 test fixtures + validation against `lecture-intro` repos |
| File scope | `.md` + `_toc.yml` + `_config.yml` + `environment.yml` | Include all Jupyter Book structure files |
| Development approach | CLI-first | Local testing and reports first; GitHub Action integration later |

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Use Cases](#2-use-cases)
3. [Strategy Comparison](#3-strategy-comparison)
4. [Recommended Approach](#4-recommended-approach)
5. [Implementation Plan](#5-implementation-plan)
6. [Technical Design](#6-technical-design)
7. [Open Questions](#7-open-questions)
8. [Appendix: Configuration Reference](#appendix-configuration-reference)

---

## 1. Problem Statement

### Initial Alignment

**Scenario**: A source repository and its translation exist independently. The translation may have been created by human translators, automated tools, or a combination. We want to enable automated sync going forward.

**Example**: QuantEcon's `lecture-python-intro` series exists in both English and Chinese (`lecture-intro.zh-cn`). Now we want to bring these repos under automated sync management.

**Challenge**: Before enabling automation, we must:
- Understand how aligned the repos currently are
- Assess translation quality objectively
- Identify which files can auto-sync vs. need manual attention
- Generate heading-maps for all files
- Establish a clean baseline

**Risk**: Without proper alignment, the action will detect "massive changes" and create huge, confusing PRs. Whether the existing translations are high-quality or need improvement, we need diagnostics first.

### Resync (Periodic Maintenance)

**Scenario**: The sync action runs on PR merge events. But occasionally:
- Direct commits to main (emergency fixes)
- GitHub web UI quick edits
- Automated commits (bots)

These bypass the PR workflow and cause gradual divergence.

**Frequency**: ~99% of changes go through PRs. ~1% edge cases accumulate over time.

---

## 2. Use Cases

### Use Case 1: Initial Alignment (`mode: align`)

**When**: Onboarding an existing translation repo to automated sync.

**Input**: 
- Source repo (English): `QuantEcon/lecture-intro`
- Target repo (Chinese): `QuantEcon/lecture-intro.zh-cn`

**Output**:
1. **Alignment Report** (`alignment-report.md`) - Human-readable summary
2. **Alignment Data** (`alignment.json`) - Machine-readable results
3. **Generated Heading-Maps** - For aligned files
4. **Recommendations** - Per-file action items

**Frequency**: Once per project (or when significant structural changes occur).

### Use Case 2: Resync (`mode: resync`)

**When**: Periodic check for divergence, or after known non-PR changes.

**Input**:
- Source repo and target repo (already synced)
- Optional: last known sync point

**Output**:
1. **Divergence Report** - What's out of sync
2. **Sync PRs** - Automatic or manual fix

**Frequency**: Weekly scheduled, or on-demand.

---

## 3. Strategy Comparison

### Strategy A: Structural Analysis Only (Fast, Cheap)

**Approach**: Compare document structure without translation.

```
For each file:
  1. Parse English sections
  2. Parse Chinese sections  
  3. Compare:
     - Section count match?
     - Subsection structure similar?
     - Code blocks present?
     - Math blocks present?
  4. Classify: ALIGNED / BEHIND / AHEAD / DIVERGED
```

**Metrics**:
| Metric | How |
|--------|-----|
| Section count | `englishSections.length === chineseSections.length` |
| Structure match | Compare heading levels recursively |
| Content ratio | Chinese chars / English words ≈ 0.6 |
| Code preservation | Same number of code blocks |

**Pros**:
- ✅ Fast (no API calls)
- ✅ Free (no translation costs)
- ✅ Simple implementation

**Cons**:
- ❌ Can't detect semantic divergence
- ❌ Structure match ≠ translation quality
- ❌ May miss subtle issues

**Best for**: Quick initial assessment, periodic resync checks.

---

### Strategy B: Full Translation & Compare (Accurate, Expensive)

**Approach**: Translate English fresh, compare with existing translation section-by-section.

```
For each file:
  1. Parse English content into sections
  2. Translate each section (NEW mode)
  3. Compare AI translation with existing translation
  4. Score similarity (structural + semantic)
  5. Assess translation quality
  6. Classify based on scores

**Quality & Similarity Assessment** (use Claude):
```
Assess the existing translation against the English source and a fresh AI translation.

English: ${englishSection}
Existing Translation: ${existingTranslation}
Fresh AI Translation: ${freshAITranslation}

Rate on 1-10:
1. Structural similarity (headings, paragraphs, lists match?)
2. Semantic accuracy (meaning correctly conveyed?)
3. Translation quality (fluency, terminology, completeness)
4. Overall alignment score

Notes: Flag any quality concerns (errors, omissions, inconsistencies)
```

**Pros**:
- ✅ Accurate semantic comparison
- ✅ Catches subtle divergence
- ✅ Objective quality assessment of existing translations
- ✅ Identifies errors, omissions, and inconsistencies

**Cons**:
- ❌ Expensive (full corpus translation)
- ❌ Slower
- ❌ AI style differs from human style (may flag stylistic differences)

**Best for**: Initial alignment (one-time cost acceptable).

---

### Strategy Comparison Matrix

| Factor | Structural Only | Full Translation |
|--------|-----------------|------------------|
| Speed | ✅ Fast | ⚠️ Slow |
| Cost | ✅ Free | ⚠️ ~$1-2 per corpus |
| Accuracy | ⚠️ Surface-level | ✅ Deep |
| Complexity | ✅ Low | ⚠️ Medium |
| Best Use Case | Resync checks | Initial alignment |

---

## 4. Recommended Approach

### Two-Phase Design (Simple)

Given the preference for **simplicity**, we recommend:

```
┌─────────────────────────────────────────────────────────┐
│           Phase 1: DIAGNOSTICS                          │
│                                                         │
│  Understand current state of alignment                  │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────┐            │
│  │   Structural    │ +  │   Translation   │  (optional) │
│  │    Analysis     │    │   Comparison    │            │
│  └────────┬────────┘    └────────┬────────┘            │
│           │                      │                      │
│           └──────────┬───────────┘                      │
│                      ▼                                  │
│              ┌───────────────┐                          │
│              │    Report     │                          │
│              │  + JSON data  │                          │
│              └───────────────┘                          │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│           Phase 2: SYNC STRATEGY                        │
│                                                         │
│  Apply fixes based on diagnostic output                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  For each file, based on classification:         │   │
│  │                                                  │   │
│  │  ALIGNED      → Generate heading-map            │   │
│  │  LIKELY_ALIGNED → Generate heading-map + review │   │
│  │  NEEDS_REVIEW → Create GitHub issue             │   │
│  │  DIVERGED     → Manual intervention required    │   │
│  │  MISSING      → Translate (if desired)          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### For Initial Alignment (one-time):
1. Run **full diagnostic** with translation comparison
2. Classify files into clear categories  
3. Generate heading-maps for aligned files
4. Create GitHub issues for diverged files

### For Resync (periodic):
1. Run **structural analysis only** (fast, free)
2. If structure matches → assume aligned
3. If structure differs → flag for review or auto-translate

This keeps complexity low while ensuring quality where it matters most (initial setup).

---

## 5. Implementation Plan

### Development Approach: CLI-First

Build as a standalone CLI tool in `tool-alignment/` for local development and testing:

```bash
# Example usage
cd tool-alignment

# Run structural diagnostics
npm run diagnose -- \
  --source ../test-translation-sync \
  --target ../test-translation-sync.zh-cn \
  --output reports/diagnostic-report.md

# Or with local paths
npm run diagnose -- \
  --source /path/to/lecture-intro \
  --target /path/to/lecture-intro.zh-cn \
  --output reports/alignment-report.md
```

**Benefits**:
- Fast iteration during development
- Easy local testing with test repos
- Reports viewable locally before any GitHub operations
- GitHub Action integration can come later (Phase 4)

---

### Phase 1: Structural Diagnostics (No API Cost) ✅ COMPLETE

**Goal**: Understand divergence without translation API calls.

**Completed**: 11 December 2025

#### Milestone 1.1: Structural Analyzer ✅

**Goal**: Parse and compare document structure across repos.

**Deliverables**:
- [x] `analyzeMarkdownFile(source, target, file)` function
- [x] Section count comparison
- [x] Subsection count comparison
- [x] Heading hierarchy comparison  
- [x] Code/math block counting
- [x] Heading-map detection
- [x] Config file analysis (`_toc.yml`, `_config.yml`, `environment.yml`)

**Scoring Formula** (documented in reports):
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

**Output Types**: See `tool-alignment/src/types.ts` for `MarkdownAnalysis` and `ConfigAnalysis` interfaces.

---

#### Milestone 1.2: Translation Comparator ⏸️ DEFERRED

> **Note**: Deferred to Phase 2. Structural diagnostics proved sufficient for confident alignment decisions (86% of files aligned).

**Goal**: Compare existing translation with fresh AI translation, section-by-section. Assess quality objectively.

**Deliverables**:
- [ ] `translateForComparison(englishContent)` - Translate sections
- [ ] `assessTranslation(existing, ai, english)` - Score quality & similarity via Claude
- [ ] Per-section and aggregate scoring
- [ ] Quality flags (errors, omissions, issues)

**Output Type**:
```typescript
interface TranslationComparison {
  file: string;
  sections: {
    id: string;
    englishHeading: string;
    structuralScore: number;   // 0-100 (structure alignment)
    semanticScore: number;     // 0-100 (meaning accuracy)
    qualityScore: number;      // 0-100 (fluency, terminology)
    overallScore: number;      // 0-100 (combined)
    qualityFlags: string[];    // ['error', 'omission', 'inconsistency']
    notes: string[];
  }[];
  aggregate: {
    avgStructural: number;
    avgSemantic: number;
    avgQuality: number;
    avgOverall: number;
  };
  qualityAssessment: 'high' | 'acceptable' | 'needs-improvement' | 'poor';
}
```

**Reusable Code**:
- `translator.ts:translateSection()` - Fresh translations
- New: Claude prompt for comparison scoring

---

#### Milestone 1.3: Report Generator ✅

**Goal**: Generate actionable reports from analysis.

**Deliverables**:
- [x] Markdown report generator
- [x] JSON data output
- [x] Summary statistics
- [x] Per-file recommendations
- [x] Scoring methodology documentation
- [x] Code/math block details in tables

**Sample Output**: See `tool-alignment/reports/lecture-intro-diagnostic.md`

---

### Phase 2: Translation Quality Assessment 🔲 NEXT

**Goal**: Per-section translation quality scoring using Claude Haiku (~$0.15 for lecture-intro). Assesses accuracy, fluency, terminology, and completeness.

#### Why Haiku?

| Factor | Haiku | Sonnet |
|--------|-------|--------|
| Cost per 1M tokens | $0.25 input / $1.25 output | $3 input / $15 output |
| Speed | ~2x faster | - |
| Quality scoring accuracy | Excellent for structured assessment | Overkill for scoring |
| Estimated cost (400 sections) | ~$0.10-0.15 | ~$1-2 |

Haiku provides **excellent accuracy for quality scoring tasks** at a fraction of the cost.

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1 + 1b: Structural + Code Integrity           FREE  │
│  ├── Section/subsection alignment                          │
│  ├── Code block integrity (51 tests)                       │
│  └── Output: Structure Score + Code Integrity Score        │
│                                                            │
│  Files classified: ALIGNED (38), LIKELY (8), REVIEW (2),   │
│                    DIVERGED (3), MISSING (2), EXTRA (2)    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ (only aligned/likely-aligned files)
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Quality Assessment                        ~$0.15 │
│  ├── Per-section scoring via Haiku                         │
│  ├── Assess: accuracy, fluency, terminology, completeness  │
│  └── Output: Quality Score per section + flagged issues    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Combined Report                                           │
│  ├── Structure alignment (from Phase 1)                    │
│  ├── Code integrity (from Phase 1b)                        │
│  └── Translation quality (from Phase 2) ← NEW              │
└─────────────────────────────────────────────────────────────┘
```

#### Scope: Which Files to Assess?

**Assess**: Files with status `aligned` or `likely-aligned`  
**Skip**: Files with status `diverged`, `needs-review`, `missing`, `extra`

**Rationale**: Quality assessment makes sense for structurally aligned files. Diverged files need structural fixes first.

For `lecture-intro`:
- **Assess**: 46 files (38 aligned + 8 likely-aligned)
- **Skip**: 9 files (3 diverged + 2 needs-review + 2 missing + 2 extra)

#### Milestone 2.1: Quality Scorer Module

**New File**: `tool-alignment/src/quality-scorer.ts`

**Interface**:
```typescript
interface QualityAssessment {
  overallScore: number;        // 0-100 aggregate
  sectionCount: number;        // Total sections assessed
  flaggedCount: number;        // Sections with issues
  cost: {
    inputTokens: number;
    outputTokens: number;
    totalUSD: number;
  };
  sections: SectionQuality[];
}

interface SectionQuality {
  sectionId: string;           // e.g., "introduction"
  heading: string;             // English heading
  translatedHeading: string;   // Target heading
  
  // Scores (0-100)
  accuracyScore: number;       // Meaning preserved?
  fluencyScore: number;        // Natural language?
  terminologyScore: number;    // Correct terms used?
  completenessScore: number;   // Nothing omitted?
  overallScore: number;        // Weighted average
  
  // Issues
  flags: QualityFlag[];        // Specific issues found
  notes: string;               // Assessor notes
}

type QualityFlag = 
  | 'inaccurate'      // Meaning changed or wrong
  | 'awkward'         // Unnatural phrasing
  | 'terminology'     // Wrong technical term
  | 'omission'        // Content missing
  | 'addition'        // Extra content added
  | 'formatting';     // MyST formatting issues
```

#### Milestone 2.2: Haiku Integration

**Prompt Design** (key to accuracy):
```
You are a translation quality assessor. Evaluate this translation from English to ${targetLanguage}.

## English Source
${englishContent}

## Translation
${translatedContent}

## Glossary (required terminology)
${glossaryTerms}

## Assess on these criteria (0-100 each):

1. **Accuracy** - Is the meaning preserved correctly?
   - 90-100: Perfect/near-perfect accuracy
   - 70-89: Minor inaccuracies, meaning clear
   - 50-69: Some meaning lost or changed
   - <50: Significant errors

2. **Fluency** - Does it read naturally in ${targetLanguage}?
   - 90-100: Native-level fluency
   - 70-89: Readable with minor awkwardness
   - 50-69: Understandable but unnatural
   - <50: Difficult to read

3. **Terminology** - Are technical terms translated correctly per glossary?
   - 90-100: All terms correct
   - 70-89: Most terms correct
   - 50-69: Some terms wrong
   - <50: Many terms wrong

4. **Completeness** - Is all content translated?
   - 90-100: Complete
   - 70-89: Minor omissions
   - 50-69: Some content missing
   - <50: Significant omissions

## Output JSON:
{
  "accuracy": <number>,
  "fluency": <number>,
  "terminology": <number>,
  "completeness": <number>,
  "overall": <number>,  // weighted: accuracy 40%, fluency 25%, terminology 20%, completeness 15%
  "flags": ["<flag1>", "<flag2>"],  // only if score <80 in any category
  "notes": "<brief explanation of any issues>"
}
```

#### Milestone 2.3: Quality Report Generator

**New Report Type**: `*-quality.md`

**Sample Output**:
```markdown
# Translation Quality Report

**Source**: lecture-python-intro
**Target**: lecture-intro.zh-cn
**Language**: zh-cn
**Generated**: 2025-12-20
**API Cost**: $0.12 (48,000 input tokens, 12,000 output tokens)

## Summary

| Metric | Score |
|--------|-------|
| **Overall Quality** | 87% |
| Files Assessed | 46 |
| Sections Assessed | 312 |
| Sections Flagged | 18 (6%) |

### Score Breakdown

| Category | Average | Min | Max |
|----------|---------|-----|-----|
| Accuracy | 89% | 65% | 100% |
| Fluency | 85% | 58% | 100% |
| Terminology | 91% | 72% | 100% |
| Completeness | 88% | 70% | 100% |

## Flagged Sections (Need Attention)

| File | Section | Score | Flags |
|------|---------|-------|-------|
| `mle.md` | Maximum Likelihood | 65% | inaccurate, terminology |
| `cobweb.md` | Dynamics | 72% | awkward |
| `solow.md` | Steady State | 70% | omission |
```

#### Milestone 2.4: CLI Integration

**New Command Option**:
```bash
# Run quality assessment on aligned files
npm run diagnose -- \
  --source ../lecture-python-intro \
  --target ../lecture-intro.zh-cn \
  --report quality \
  --output reports/lecture-intro-quality.md

# Run all reports (structure + code + quality)
npm run diagnose -- \
  --source ../lecture-python-intro \
  --target ../lecture-intro.zh-cn \
  --report all \
  --output reports/lecture-intro
```

**Cost Confirmation** (since API costs money):
```
Quality assessment will analyze 46 files (312 sections).
Estimated cost: $0.12

Proceed? [Y/n]
```

#### Cost Estimates

| Repository | Sections | Est. Cost |
|------------|----------|-----------|
| lecture-intro (46 files) | ~312 | ~$0.08 |
| lecture-python (200 files) | ~1400 | ~$0.35 |
| Full QuantEcon suite | ~3000 | ~$0.75 |

#### Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/quality-scorer.ts` | Quality assessment logic |
| `src/haiku-client.ts` | Haiku API wrapper |
| `src/__tests__/quality-scorer.test.ts` | Unit tests |
| `src/index.ts` | Add `--report quality` option |
| `src/report-generator.ts` | Add quality report generation |
| `src/types.ts` | Add quality assessment types |
| `package.json` | Add `@anthropic-ai/sdk` dependency |

#### Timeline Estimate

| Milestone | Effort |
|-----------|--------|
| 2.1 Quality Scorer Module | 2-3 hours |
| 2.2 Haiku Integration | 1-2 hours |
| 2.3 Quality Report Generator | 2-3 hours |
| 2.4 CLI Integration | 1 hour |
| Testing & Refinement | 2-3 hours |
| **Total** | **~10-14 hours** |

#### Open Questions

1. **Batch vs. individual API calls?** - Current plan: One call per section
2. **Cache results?** - Store quality scores to avoid re-assessment?
3. **Threshold for flagging?** - Currently: Flag if any category < 80
4. **Include in default `--report all`?** - Cost concern: May need separate flag

---

### Phase 3: Heading-Map Generator 🔲 PLANNED

#### Milestone 3.1: Alignment PR Generator

**Goal**: Create PR in target repo with heading-maps and quality assessment table.

**PR Structure**:
```markdown
## Alignment PR: `intro.md`

### Summary
- **Structure Match**: ✅ 8/8 sections aligned
- **Overall Quality**: 🟡 78% (Acceptable)
- **Heading-map**: Generated and ready

### Section Quality Assessment

| # | Section | Quality | Action |
|---|---------|---------|--------|
| 1 | Introduction | 🟢 92% | - [ ] Re-translate |
| 2 | Getting Started | 🟢 88% | - [ ] Re-translate |
| 3 | Basic Concepts | 🟡 72% | - [x] Re-translate |
| 4 | Advanced Topics | 🟡 68% | - [x] Re-translate |
| 5 | Examples | 🟢 85% | - [ ] Re-translate |
| 6 | Best Practices | 🔴 45% | - [x] Re-translate |
| 7 | FAQ | 🟢 90% | - [ ] Re-translate |
| 8 | Conclusion | 🟢 95% | - [ ] Re-translate |

### Actions

To re-translate selected sections, comment: `/update-translations`

---
*Generated by action-translation alignment tool*
```

**Deliverables**:
- [ ] PR creation with heading-map changes
- [ ] Quality assessment table generation
- [ ] Pre-check low-quality sections (< 70%)
- [ ] Section-level quality indicators

---

#### Milestone 3.2: Interactive Re-translation Workflow

**Goal**: Allow selective re-translation via PR comment trigger.

**Workflow**:
```
┌─────────────────────────────────────────────────────────────┐
│  1. Alignment PR Created                                    │
│     - Heading-maps added to target files                    │
│     - Quality table with checkboxes in PR body              │
│     - Low-quality sections pre-checked                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Human Review                                            │
│     - Review quality scores                                 │
│     - Check/uncheck sections to re-translate                │
│     - Comment: /update-translations                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Re-translation Workflow Triggered                       │
│     - Parse checked sections from PR body                   │
│     - Re-translate selected sections via Claude             │
│     - Commit updates to PR branch                           │
│     - Re-assess quality, update PR body                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Iterate Until Satisfied                                 │
│     - Review new translations                               │
│     - Adjust checkboxes if needed                           │
│     - Repeat /update-translations or merge                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Merge When Ready                                        │
│     - All sections at acceptable quality                    │
│     - Heading-maps in place                                 │
│     - Target repo ready for ongoing sync                    │
└─────────────────────────────────────────────────────────────┘
```

**Technical Implementation**:
```yaml
# .github/workflows/update-translations.yml (in target repo)
name: Update Selected Translations

on:
  issue_comment:
    types: [created]

jobs:
  update-translations:
    if: |
      github.event.issue.pull_request &&
      contains(github.event.comment.body, '/update-translations')
    runs-on: ubuntu-latest
    steps:
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.issue.pull_request.head.ref }}
      
      - name: Parse selected sections from PR body
        id: parse
        # Extract checked boxes: - [x] Re-translate
        # Map to section IDs
      
      - name: Re-translate selected sections
        uses: QuantEcon/action-translation@v0.9
        with:
          mode: retranslate
          sections: ${{ steps.parse.outputs.sections }}
      
      - name: Commit to PR branch
        # Push updated translations
      
      - name: Update PR body with new scores
        # Re-assess and update quality table
```

**Deliverables**:
- [ ] `/update-translations` comment trigger
- [ ] PR body checkbox parser
- [ ] Section re-translation logic
- [ ] Quality re-assessment after translation
- [ ] PR body update with new scores

---

### Phase 4: GitHub Action Modes

#### Milestone 4.1: Align Mode

**Goal**: Integrate into main action as `mode: align` and `mode: resync`.

```yaml
# Initial alignment
- uses: QuantEcon/action-translation@v0.9
  with:
    mode: align
    source-repo: QuantEcon/lecture-intro
    target-repo: QuantEcon/lecture-intro.zh-cn
    compare-translations: true

# Periodic resync
- uses: QuantEcon/action-translation@v0.9
  with:
    mode: resync
    source-repo: QuantEcon/lecture-intro  
    target-repo: QuantEcon/lecture-intro.zh-cn
    strategy: report-only
```

---

## 6. Technical Design

### Classification Logic

```typescript
function classifyAlignment(
  structural: StructuralAnalysis,
  translation?: TranslationComparison
): AlignmentClass {
  
  // File missing in target
  if (!structural.target) return 'missing';
  
  // Major structural mismatch
  if (!structural.comparison.sectionMatch) {
    const diff = Math.abs(
      structural.source.sections - structural.target.sections
    );
    if (diff > 3) return 'diverged';
    return 'needs-review';
  }
  
  // Structure matches - check translation quality if available
  if (translation) {
    const score = translation.aggregate.avgOverall;
    if (score >= 85) return 'aligned';
    if (score >= 70) return 'likely-aligned';
    if (score >= 50) return 'needs-review';
    return 'diverged';
  }
  
  // Structure matches, no translation comparison
  const score = structural.comparison.structureScore;
  if (score >= 90) return 'likely-aligned';
  if (score >= 70) return 'needs-review';
  return 'diverged';
}

function classifyQuality(
  translation: TranslationComparison
): QualityClass {
  const score = translation.aggregate.avgQuality;
  
  if (score >= 85) return 'high';
  if (score >= 70) return 'acceptable';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}
```

### Action Recommendations

```typescript
function recommendAction(
  alignment: AlignmentClass,
  quality: QualityClass | null,
  structural: StructuralAnalysis
): AlignmentAction {
  
  // Handle alignment first
  switch (alignment) {
    case 'aligned':
    case 'likely-aligned':
      // Check quality - if poor, may need re-translation
      if (quality === 'poor') {
        return 'retranslate-file';  // Quality too low
      }
      if (quality === 'needs-improvement') {
        return 'generate-heading-map-and-flag';  // Setup sync, but flag for improvement
      }
      return 'generate-heading-map';  // Ready for sync
    
    case 'needs-review':
      if (structural.source.sections > structural.target.sections) {
        return 'translate-missing';  // Target behind
      }
      if (structural.source.sections < structural.target.sections) {
        return 'review-localization'; // Target has extras
      }
      return 'manual-review';
    
    case 'diverged':
      return 'manual-merge';
    
    case 'missing':
      return 'translate-file';
  }
}
```

---

## 7. Open Questions

### Q1: Start with CLI or Action mode?

**Options**:
- A) CLI tool first → allows local testing, then integrate into Action
- B) Build as Action mode from the start

**Recommendation**: **Option A** - CLI first for easier development and testing.

---

### Q2: Translation comparison cost acceptable?

**Estimate for lecture-intro**:
- ~12 files × ~8 sections = ~100 sections
- Translation: ~100 × $0.01 = ~$1.00
- Comparison scoring: ~100 × $0.005 = ~$0.50
- **Total**: ~$1.50 per full alignment run

**Recommendation**: Acceptable for one-time initial setup.

---

### Q3: How to handle diverged files?

**Options**:
- A) Report only - human decides
- B) Auto-create GitHub issues with recommendations
- C) Provide guided manual merge workflow

**Recommendation**: **Option B** - Create issues with context, let human decide.

---

### Q4: Is sync status tracking needed?

**Options**:
- A) Stateless - run fresh comparison each time
- B) Stateful - track last sync commit per file

**Recommendation**: **Option A (Stateless)** - simpler, good enough for periodic checks.

---

### Q5: Resync frequency?

**Options**:
- Weekly scheduled
- Monthly scheduled  
- On-demand only

**Recommendation**: Start with **on-demand only**. Add scheduled if divergence is frequent.

---

## Appendix: Configuration Reference

### Align Mode Inputs (Proposed)

```yaml
inputs:
  mode: 'align'
  source-repo:
    description: 'Source repository (owner/repo)'
    required: true
  target-repo:
    description: 'Target repository (owner/repo)'
    required: true
  target-language:
    description: 'Target language code (e.g., zh-cn)'
    required: true
  compare-translations:
    description: 'Run full translation comparison (slower, more accurate)'
    default: true
  output-format:
    description: 'markdown | json | both'
    default: 'both'
  apply:
    description: 'Apply changes (generate heading-maps)'
    default: false  # Dry-run by default
```

### Resync Mode Inputs (Proposed)

```yaml
inputs:
  mode: 'resync'
  source-repo:
    description: 'Source repository (owner/repo)'
    required: true
  target-repo:
    description: 'Target repository (owner/repo)'
    required: true
  strategy:
    description: 'report-only | auto-fix'
    default: 'report-only'
  notification:
    description: 'issue | comment | none'
    default: 'issue'
```

---

## Next Steps

### Phase 1: Structural Diagnostics (CLI) ✅
1. [x] Review and finalize this plan
2. [x] Set up `tool-alignment/` directory structure
3. [x] Implement Milestone 1.1: Structural Analyzer
4. [x] Test on `test-translation-sync` repos (local)
5. [x] Implement Milestone 1.3: Report Generator
6. [x] Run diagnostics on `lecture-intro` repos
7. [x] Implement Phase 1b: Code Block Integrity

### Phase 2: Translation Quality Assessment 🔲
8. [ ] Implement Milestone 2.1: Quality Scorer Module
9. [ ] Implement Milestone 2.2: Haiku Integration
10. [ ] Implement Milestone 2.3: Quality Report Generator
11. [ ] Implement Milestone 2.4: CLI Integration
12. [ ] Per-section quality scoring

### Phase 3: Heading-Map Generator 🔲
13. [ ] Implement heading-map generation for aligned files
14. [ ] Position-based section matching with recursive subsections
15. [ ] Frontmatter injection

### Phase 4: Interactive Alignment PR 🔲
16. [ ] Implement Milestone 4.1: Alignment PR Generator
17. [ ] Create PR with heading-maps + quality table
18. [ ] Implement Milestone 4.2: Re-translation Workflow
19. [ ] `/update-translations` comment trigger
20. [ ] Test interactive workflow end-to-end

### Phase 5: GitHub Action Integration 🔲
21. [ ] Add `mode: align` to GitHub Action
22. [ ] Add `mode: resync` to GitHub Action
23. [ ] Add `mode: retranslate` for PR workflow

---

**Document Maintainer**: QuantEcon Team  
**Related**: [PLAN-FUTURE-FEATURES.md](docs/PLAN-FUTURE-FEATURES.md) Section 1
