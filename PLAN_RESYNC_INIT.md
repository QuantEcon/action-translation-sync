# Resync & Initial Alignment: Implementation Plan

**Document Status**: Implementation Planning  
**Last Updated**: December 2025  
**Version**: Draft v0.1

This document provides a focused implementation plan for two related features:
1. **Initial Alignment** - Onboard existing translation repos (one-time setup)
2. **Resync** - Detect and fix divergence over time (periodic maintenance)

**Design Principle**: Simple, low-complexity approach with clear phases.

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

### Phase 1: Diagnostics Tool

#### Milestone 1.1: Structural Analyzer

**Goal**: Parse and compare document structure across repos.

**Deliverables**:
- [ ] `analyzeStructure(sourceContent, targetContent)` function
- [ ] Section count comparison
- [ ] Heading hierarchy comparison  
- [ ] Code/math block counting
- [ ] Content length ratio calculation

**Output Type**:
```typescript
interface StructuralAnalysis {
  file: string;
  source: {
    sections: number;
    subsections: number;
    codeBlocks: number;
    mathBlocks: number;
    wordCount: number;
  };
  target: {
    sections: number;
    subsections: number;
    codeBlocks: number;
    mathBlocks: number;
    charCount: number;
  };
  comparison: {
    sectionMatch: boolean;
    structureScore: number;  // 0-100
    contentRatio: number;    // target chars / source words
    hasHeadingMap: boolean;
  };
  classification: 'aligned' | 'likely-aligned' | 'needs-review' | 'diverged' | 'missing';
}
```

**Reusable Code**:
- `parser.ts:parseSections()` - Parse both repos
- `parser.ts:parseDocumentComponents()` - Get structure breakdown
- `heading-map.ts:extractHeadingMap()` - Check if map exists

---

#### Milestone 1.2: Translation Comparator

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

#### Milestone 1.3: Report Generator

**Goal**: Generate actionable reports from analysis.

**Deliverables**:
- [ ] Markdown report generator
- [ ] JSON data output
- [ ] Summary statistics
- [ ] Per-file recommendations
- [ ] Quality assessment summary

**Report Structure**:
```markdown
# Alignment Diagnostic Report

**Source**: QuantEcon/lecture-intro  
**Target**: QuantEcon/lecture-intro.zh-cn  
**Date**: 2025-01-15  
**Files Analyzed**: 12

## Summary

### Alignment Status
| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Aligned | 8 | 67% |
| ⚠️ Needs Review | 3 | 25% |
| ❌ Diverged | 1 | 8% |

### Translation Quality
| Quality | Count | Percentage |
|---------|-------|------------|
| 🟢 High | 5 | 42% |
| 🟡 Acceptable | 4 | 33% |
| 🟠 Needs Improvement | 2 | 17% |
| 🔴 Poor | 1 | 8% |

## Aligned Files (Ready for Sync)

| File | Sections | Structure | Quality | Action |
|------|----------|-----------|---------|--------|
| intro.md | 8/8 | 95% | 🟢 High (92%) | Generate heading-map |
| python_by_example.md | 12/12 | 98% | 🟡 Acceptable (78%) | Generate heading-map |

## Files Needing Review

| File | Issue | Quality | Recommendation |
|------|-------|---------|----------------|
| oop_intro.md | Target has 1 extra section | 🟢 High | Review localization |
| functions.md | 5 sections missing | 🟠 Needs work | Translate missing sections |

## Quality Issues Found

| File | Section | Issue Type | Details |
|------|---------|------------|---------|
| functions.md | loops | Error | Incorrect terminology |
| advanced.md | intro | Omission | Missing code explanation |

## Diverged Files

| File | Issue | Recommendation |
|------|-------|----------------|
| advanced.md | Major structure mismatch (15 vs 8) | Manual merge required |
```

---

### Phase 2: Sync Strategies

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

### Phase 3: CLI & Integration

#### Milestone 3.1: Standalone CLI Tool

**Goal**: `tool-alignment/` for local diagnostics and testing.

```bash
# Run diagnostics only
npm run diagnose -- \
  --source QuantEcon/lecture-intro \
  --target QuantEcon/lecture-intro.zh-cn \
  --output reports/alignment-report.md

# Run diagnostics + translation comparison
npm run diagnose -- \
  --source QuantEcon/lecture-intro \
  --target QuantEcon/lecture-intro.zh-cn \
  --compare-translations \
  --output reports/alignment-report.md

# Apply alignment (generate heading-maps)
npm run align -- \
  --config alignment.json \
  --apply
```

---

#### Milestone 3.2: GitHub Action Modes (Future)

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

1. [ ] Review and finalize this plan
2. [ ] Implement Milestone 1.1: Structural Analyzer
3. [ ] Test on `lecture-intro` repos
4. [ ] Implement Milestone 1.2: Translation Comparator
5. [ ] Implement Milestone 1.3: Report Generator
6. [ ] Run full diagnostic on `lecture-intro`
7. [ ] Implement Phase 2 based on diagnostic results

---

**Document Maintainer**: QuantEcon Team  
**Related**: [PLAN-FUTURE-FEATURES.md](docs/PLAN-FUTURE-FEATURES.md) Section 1
