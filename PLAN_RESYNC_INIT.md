# Resync & Initial Alignment: Implementation Plan

**Document Status**: Phase 1 Complete  
**Last Updated**: 11 December 2025  
**Version**: v0.4

This document provides a focused implementation plan for two related features:
1. **Initial Alignment** - Onboard existing translation repos (one-time setup)
2. **Resync** - Detect and fix divergence over time (periodic maintenance)

**Design Principle**: Simple, low-complexity approach with clear phases.

---

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | Structural Diagnostics - CLI tool with reports |
| **Phase 2** | 🔲 Not Started | Heading-Map Generator |
| **Phase 3** | 🔲 Not Started | Interactive Alignment PR |
| **Phase 4** | 🔲 Not Started | GitHub Action Integration |

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

## Key Decisions (v0.4)

| Decision | Choice | Rationale |
|----------|--------|----------|
| Diagnostics approach | Structural first | Zero cost, instant feedback; add translation comparison later if needed |
| Tool location | `tool-alignment/` | Single tool for alignment + resync (keeps related functionality together) |
| Testing strategy | Local fixtures + real repos | 13 test fixtures + validation against `lecture-intro` repos |
| File scope | `.md` + `_toc.yml` + `_config.yml` + `environment.yml` | Include all Jupyter Book structure files |
| Alignment workflow | Interactive PR | PR with quality table + checkboxes for selective re-translation |
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

### Phase 2: Heading-Map Generator 🔲 NOT STARTED

#### Milestone 2.1: Heading-Map Generator

**Goal**: Auto-generate heading-maps for aligned files.

**Deliverables**:
- [ ] `generateHeadingMap(sourceFile, targetFile)` function
- [ ] Position-based section matching
- [ ] Recursive subsection handling
- [ ] Frontmatter injection

**Logic**:
```
For aligned files (same section count):
  1. Match sections by position (1st → 1st, 2nd → 2nd)
  2. Extract: English heading ID → Chinese heading text
  3. Build heading-map object
  4. Inject into target file frontmatter
```

**Reusable Code**:
- `heading-map.ts:updateHeadingMap()` - Update maps
- `heading-map.ts:injectHeadingMap()` - Write to frontmatter

---

#### Milestone 2.2: Divergence & Quality Resolver

**Goal**: Provide strategies for different divergence types and quality levels.

| Issue Type | Strategy |
|------------|----------|
| **Alignment Issues** | |
| Target missing sections | Option: Translate & append |
| Target has extra sections | Keep extras, update heading-map |
| Major restructure | Create issue for manual review |
| Content drift (same structure) | Option: Re-translate sections |
| **Quality Issues** | |
| Poor quality (< 50%) | Recommend full re-translation |
| Needs improvement (50-70%) | Flag for review, generate heading-map |
| Acceptable/High (> 70%) | Generate heading-map, enable sync |

**Deliverables**:
- [ ] Strategy selection logic
- [ ] GitHub issue creation for complex cases
- [ ] Optional auto-translation for missing sections
- [ ] Quality-based re-translation recommendations

---

### Phase 3: Interactive Alignment PR

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

### Phase 1: Structural Diagnostics (CLI)
1. [x] Review and finalize this plan
2. [ ] Set up `tool-alignment/` directory structure
3. [ ] Implement Milestone 1.1: Structural Analyzer
4. [ ] Test on `test-translation-sync` repos (local)
5. [ ] Implement Milestone 1.3: Report Generator
6. [ ] Run diagnostics on `lecture-intro` repos

### Phase 2: Translation Quality Assessment
7. [ ] Assess if structural diagnostics are sufficient
8. [ ] Implement Milestone 1.2: Translation Comparator
9. [ ] Per-section quality scoring

### Phase 3: Interactive Alignment PR
10. [ ] Implement Milestone 3.1: Alignment PR Generator
11. [ ] Create PR with heading-maps + quality table
12. [ ] Implement Milestone 3.2: Re-translation Workflow
13. [ ] `/update-translations` comment trigger
14. [ ] Test interactive workflow end-to-end

### Phase 4: GitHub Action Integration
15. [ ] Add `mode: align` to GitHub Action
16. [ ] Add `mode: resync` to GitHub Action
17. [ ] Add `mode: retranslate` for PR workflow

---

**Document Maintainer**: QuantEcon Team  
**Related**: [PLAN-FUTURE-FEATURES.md](docs/PLAN-FUTURE-FEATURES.md) Section 1
