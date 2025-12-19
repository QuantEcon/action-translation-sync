# tool-onboarding: Implementation Design

**Last Updated**: December 2025  
**Status**: Phase 1 Complete (Core Analysis)  
**Code Size**: ~2,300 lines across 10 modules  
**Test Coverage**: 84 tests

---

## Overview

**Purpose**: Compare two repositories (SOURCE and TARGET) to identify alignment status and generate actionable reports for bringing them into sync.

**Key Constraint**: SOURCE and TARGET are not tracked by `action-translation`, so no sync state assumptions can be made. Every comparison is a fresh analysis.

**Output**: Structured reports that follow document order, enabling human review and future automated sync actions.

---

## Architecture

### Module Structure

```
src/
├── index.ts              # CLI entry point & orchestration (329 lines)
├── types.ts              # TypeScript interfaces (147 lines)
├── constants.ts          # Thresholds, patterns, prompts (167 lines)
├── discovery.ts          # File discovery & git metadata (139 lines)
├── extraction.ts         # Code block extraction (199 lines)
├── analysis/
│   ├── index.ts         # Analysis module exports (7 lines)
│   ├── code.ts          # Deterministic code comparison (283 lines)
│   ├── prose.ts         # AI-powered prose analysis (215 lines)
│   └── config.ts        # Config file comparison (218 lines)
├── decision.ts           # Convert analysis to decisions (232 lines)
└── report.ts             # Report generation (388 lines)
```

### Pipeline Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  File       │ --> │  Content     │ --> │  Analysis   │ --> │  Report      │
│  Discovery  │     │  Extraction  │     │  Engine     │     │  Generation  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
     │                    │                    │                    │
 discovery.ts        extraction.ts       analysis/*.ts          report.ts
                                              │
                                         decision.ts
```

### Module Responsibilities

| Module | Purpose |
|--------|---------|
| **types.ts** | All TypeScript interfaces and type definitions |
| **constants.ts** | DEFAULT_THRESHOLDS, LANGUAGE_NAMES, I18N_PATTERNS, PROSE_PROMPT |
| **discovery.ts** | File discovery, pairing, git metadata, update direction |
| **extraction.ts** | Code block extraction, normalization, i18n detection |
| **analysis/code.ts** | Deterministic block comparison with divergence mapping |
| **analysis/prose.ts** | Claude API integration for prose analysis |
| **analysis/config.ts** | Config file comparison (_toc.yml, _config.yml) |
| **decision.ts** | Convert analysis results to actionable decisions |
| **report.ts** | Generate summary and per-file markdown reports |
| **index.ts** | CLI setup (Commander), orchestration, file processing |

---

## Data Structures

### Core Types

```typescript
// Action types - simplified to 4 clear actions
type ActionType = 'SYNC' | 'BACKPORT' | 'ACCEPT LOCALISATION' | 'MANUAL REVIEW';

// Region status in document
type RegionStatus = 'aligned' | 'differs' | 'missing' | 'inserted';

// Code block status
type BlockStatus = 'aligned' | 'modified' | 'inserted' | 'inserted-i18n' | 'missing';

// Extracted code block
interface CodeBlock {
  content: string;
  contentNormalized: string;  // Comments/strings stripped
  language: string;
  startLine: number;
  endLine: number;
}

// Block mapping result
interface BlockMapping {
  srcIdx: number | null;      // null = inserted in target
  tgtIdx: number | null;      // null = missing from target
  status: BlockStatus;
  sourceLines: number;
  targetLines: number;
  language: string;
  notes?: string[];
}

// Code analysis result
interface CodeAnalysisResult {
  sourceBlocks: number;
  targetBlocks: number;
  aligned: number;
  modified: number;
  inserted: number;
  insertedI18n: number;
  missing: number;
  score: number;              // 0-100 alignment score
  mappings: BlockMapping[];
}

// Decision item for report
interface DecisionItem {
  id: string;                 // e.g., "section-2" or "code-block-1"
  region: string;             // Display name
  type: 'prose' | 'code';
  status: RegionStatus;
  startLine: number;          // For document order sorting
  sourceHeading?: string;
  targetHeading?: string;
  issue?: string;
  issueType?: string;         // TITLE, CONTENT, or "TITLE, CONTENT"
  recommendation?: ActionType;
  notes?: string[];
}

// Per-file aggregated decisions
interface FileDecisions {
  file: string;
  status: 'aligned' | 'review' | 'translate' | 'suggest' | 'error';
  sourceDate?: string;
  targetDate?: string;
  decisions: DecisionItem[];
  counts: {
    sync: number;
    backport: number;
    accept: number;
    manual: number;
    aligned: number;
  };
}
```

### Configurable Thresholds

```typescript
interface Thresholds {
  code: {
    aligned: number;    // >= this = code aligned (default: 90)
    review: number;     // >= this = needs review (default: 70)
  };
  prose: {
    aligned: number;    // >= this = prose aligned (default: 90)
    review: number;     // >= this = needs review (default: 70)
  };
}
```

---

## Analysis Engine

### 1. Code Analysis (Deterministic)

**Location**: `src/analysis/code.ts`

No AI required - fully deterministic comparison.

**Algorithm (Divergence Mapping)**:
```
1. Extract all code blocks from source and target
2. Normalize content (strip comments, whitespace, i18n patterns)
3. Map blocks using look-ahead algorithm:
   - Match identical/normalized blocks → 'aligned'
   - Detect i18n-only blocks → 'inserted-i18n'
   - Look ahead for shifted matches → 'inserted' or 'missing'
   - Remaining unmatched → 'modified'
4. Calculate alignment score
```

**i18n Patterns** (expected in translations):
```typescript
const I18N_LINE_PATTERNS = [
  /plt\.rcParams\[.*font.*\]/,
  /rcParams\[.*font.*\]/,
  /matplotlib\.font_manager/,
  /fm\.FontProperties/,
  /set_.*fontproperties/,
];
```

### 2. Prose Analysis (AI-Powered)

**Location**: `src/analysis/prose.ts`

Uses Claude for semantic understanding of prose sections.

**Prompt Structure**:
```
Compare English source with translation.
For each section:
- Is the heading accurately translated? (TITLE)
- Is the content accurately translated? (CONTENT)
- Score 0-100 based on alignment

Output structured table with Status, Issue, Score columns.
```

**Issue Classification**:
- `TITLE` - Heading translation has diverged
- `CONTENT` - Body text has diverged
- `TITLE, CONTENT` - Both have issues
- `-` - No issue (aligned)

### 3. Config Analysis (Optional)

**Location**: `src/analysis/config.ts`

Compares repository configuration files:
- `_toc.yml` - Table of contents structure
- `_config.yml` - Jupyter Book configuration
- `environment.yml` - Dependencies

---

## Decision Logic

**Location**: `src/decision.ts`

### Recommendation Algorithm

```typescript
function determineRecommendation(
  status: RegionStatus,
  direction: '→' | '←' | '=',
  score: number
): ActionType {
  // Missing from target = sync from source
  if (status === 'missing') return 'SYNC';
  
  // Extra in target
  if (status === 'inserted') {
    if (isI18nBlock) return 'ACCEPT LOCALISATION';
    if (direction === '←') return 'BACKPORT';
    return 'MANUAL REVIEW';
  }
  
  // Differs - use score and direction
  if (status === 'differs') {
    if (score >= 85) {
      return direction === '→' ? 'SYNC' : 'BACKPORT';
    }
    return 'MANUAL REVIEW';
  }
  
  return undefined;  // Aligned, no action
}
```

---

## Report Generation

**Location**: `src/report.ts`

### Output Structure

```
reports/
└── {source}↔{target}/
    ├── summary.md          # Aggregate stats, file table
    ├── file1.md            # Per-file decisions
    └── ...
```

### Per-File Report Format

```markdown
# filename.md

| Property | Value |
|----------|-------|
| Source | `lecture-python-intro` |
| Target | `lecture-intro.zh-cn` |
| Source Date | 2024-07-19 |
| Target Date | 2025-03-12 |
| Direction | ← Target newer |
| Status | ⚠️ Review |

## Summary

| Region | Type | Status | Issue | Action |
|--------|------|--------|-------|--------|
| Section 1 | prose | ✅ ALIGNED | - | - |
| Code Block 0 | code | ⚠️ DIFFERS | - | [Decision](#code-block-0) |

## Decisions Required

### Code Block 0
<a id="code-block-0"></a>

**Status:** ⚠️ DIFFERS
**Issue:** Function names differ

**Action:**
- [ ] SYNC
- [ ] BACKPORT *(recommended)*
- [ ] ACCEPT LOCALISATION
- [ ] MANUAL REVIEW
```

---

## Testing

**Location**: `src/__tests__/`

### Test Structure

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `extraction.test.ts` | 19 | Code extraction, normalization, i18n |
| `code-analysis.test.ts` | 13 | Block comparison, scoring |
| `constants.test.ts` | 22 | Thresholds, patterns, icons |
| `discovery.test.ts` | 14 | File pairing, git dates |
| `types.test.ts` | 16 | Type definitions |

**Total**: 84 tests, all passing

### Running Tests

```bash
npm test              # All tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

---

## Implementation Checklist

### Phase 1: Core Analysis ✅
- [x] File discovery and pairing
- [x] Code block extraction and comparison
- [x] Prose section analysis with Claude
- [x] Decision generation with recommendations
- [x] Report generation (summary + per-file)
- [x] Document order preservation
- [x] Issue type classification (TITLE, CONTENT)
- [x] Date-based direction detection
- [x] Configurable thresholds
- [x] Config file analysis (optional)
- [x] Modular architecture refactor
- [x] Test suite (84 tests)

### Phase 2: Enhanced Analysis
- [ ] Subsection-level prose analysis
- [ ] Cross-reference validation (links, citations)
- [ ] Math equation comparison
- [ ] Image/figure tracking

### Phase 3: Sync Actions
- [ ] SYNC action implementation
- [ ] BACKPORT PR generation
- [ ] Sync state tracking
- [ ] Incremental analysis (only changed files)

### Phase 4: PR Generation
- [ ] Parse completed reports for ACTION selections
- [ ] SYNC PR generation (target repo via `gh pr create`)
- [ ] BACKPORT PR generation (source repo via `gh pr create`)
- [ ] Batch PR creation (group related changes)

---

## Key Design Decisions

### 1. Four Action Types

Simplified from complex priority/effort scoring to four clear actions:

| Action | Direction | When |
|--------|-----------|------|
| SYNC | → | Source newer, update target |
| BACKPORT | ← | Target improvements, update source |
| ACCEPT LOCALISATION | = | i18n-specific (fonts, locale) |
| MANUAL REVIEW | ? | Complex conflict |

### 2. Hybrid Analysis

| Aspect | Code | Prose |
|--------|------|-------|
| Method | Deterministic | Claude AI |
| Accuracy | 100% | Good |
| Speed | Instant | ~2-3s/file |
| Cost | Free | ~$0.04/file |

### 3. Document Order

Reports maintain document order by tracking `startLine` for each region and sorting decisions before rendering.

### 4. Modular Architecture

Split from 1,873-line monolith into 10 focused modules (~230 lines average) for:
- Testability
- Maintainability
- Clear separation of concerns

---

## Relationship to Other Tools

```
┌─────────────────────────────────────────────────────────────────┐
│                     Translation Workflow                         │
├─────────────────────────────────────────────────────────────────┤
│  1. INITIAL: Manual translation exists                          │
│  2. ASSESSMENT: Run tool-onboarding → Generate reports          │
│  3. REMEDIATION: Fix issues (SYNC/BACKPORT/ACCEPT)             │
│  4. ENABLE SYNC: Turn on action-translation                     │
└─────────────────────────────────────────────────────────────────┘
```

- **tool-bulk-translator**: Creates initial translations from scratch
- **tool-onboarding**: Assesses existing manual translations (this tool)
- **action-translation**: Automated sync on PR merge (main project)

---

*Last Updated: December 2025*
