# tool-onboarding: Project Plan

**Last Updated**: December 2025  
**Status**: Phase 1 Complete  
**Version**: 1.0.0

---

## Overview

`tool-onboarding` is a CLI tool for assessing translation alignment between source and target repositories **before enabling automated sync**.

### Use Case

A TARGET repository exists with **manual translations**. Before enabling `action-translation` for automated sync, we need to understand:

1. **What diverges?** - Where do source and target differ structurally?
2. **What needs action?** - Which differences must be resolved manually vs. can be synced?
3. **What's the path to sync?** - Clear guidance on getting repos in sync

### Approach

**Hybrid Analysis**:
- **Code Analysis**: Deterministic comparison - 100% accurate, no AI needed
- **Prose Analysis**: Claude AI evaluation - semantic understanding of translations

---

## Project Phases

### Phase 1: Core Analysis ✅ COMPLETE

**Goal**: Generate actionable alignment reports

**Deliverables**:
- [x] File discovery and pairing
- [x] Deterministic code block comparison
- [x] AI-powered prose analysis
- [x] Decision generation with recommendations
- [x] Report generation (summary + per-file)
- [x] Document order preservation
- [x] Issue type classification (TITLE, CONTENT)
- [x] Modular architecture (10 modules, ~2,300 lines)
- [x] Test suite (84 tests)

**Metrics**:
- Code: ~2,300 lines across 10 modules
- Tests: 84 tests, all passing
- Cost: ~$2.20 per 51-file series

### Phase 2: Enhanced Analysis (Planned)

**Goal**: Deeper content analysis

**Planned Features**:
- [ ] Subsection-level prose analysis (### and deeper)
- [ ] Cross-reference validation (links, citations)
- [ ] Math equation comparison (LaTeX/KaTeX)
- [ ] Image/figure tracking
- [ ] Parallel API calls for speed

### Phase 3: Sync Actions (Planned)

**Goal**: Implement sync operations

**Planned Features**:
- [ ] SYNC action implementation (update target from source)
- [ ] BACKPORT action implementation (update source from target)
- [ ] Sync state tracking (remember what's been synced)
- [ ] Incremental analysis (only process changed files)

### Phase 4: PR Generation (Planned)

**Goal**: Automated PR creation from reports

**Planned Features**:
- [ ] Parse completed reports for ACTION checkbox selections
- [ ] SYNC PR generation (target repo via `gh pr create`)
- [ ] BACKPORT PR generation (source repo via `gh pr create`)
- [ ] Batch PR creation (group related changes)
- [ ] Integration with `action-translation` sync logic

---

## Key Design Decisions

### 1. Four Action Types

**Previous**: Complex priority/effort scoring  
**Current**: Four clear actions focused on **getting to sync**

| Action | Direction | When to Use |
|--------|-----------|-------------|
| **SYNC** | SOURCE → TARGET | Source is newer, update target |
| **BACKPORT** | TARGET → SOURCE | Target has improvements for source |
| **ACCEPT LOCALISATION** | Keep target | i18n-specific change (fonts, locale) |
| **MANUAL REVIEW** | Human decision | Conflict too complex |

**Recommendation Logic**:
- Source newer (→) → SYNC
- Target newer (←) → BACKPORT
- i18n block → ACCEPT LOCALISATION
- Unknown/complex → MANUAL REVIEW

### 2. Hybrid Code/Prose Analysis

| Aspect | Code Blocks | Prose Sections |
|--------|-------------|----------------|
| **Method** | Deterministic | Claude AI |
| **Accuracy** | 100% | Good |
| **Speed** | Instant | ~2-3s per file |
| **Cost** | Free | ~$0.04/file |

**Why separate?**: Claude can hallucinate about code (reporting issues that don't exist). Deterministic code analysis eliminates this.

### 3. Document Order Organization

**Problem**: Reports listed all code first, then all prose.  
**Solution**: Track `startLine` for each region, sort by document position.

**Result**: Report walks through document top-to-bottom.

### 4. Modular Architecture

**Before**: 1,873-line monolith (`src/index.ts`)  
**After**: 10 focused modules (~230 lines average)

**Benefits**:
- Each module has single responsibility
- Testable in isolation
- Clear data flow
- Easier to maintain and extend

---

## CLI Usage

```bash
# Full analysis with Claude
node dist/index.js \
  --source ~/repos/lecture-python-intro \
  --target ~/repos/lecture-intro.zh-cn \
  --docs-folder lectures \
  --language zh-cn \
  --output reports

# Code-only (no API calls, fast)
node dist/index.js \
  --source ~/repos/lecture-python-intro \
  --target ~/repos/lecture-intro.zh-cn \
  --docs-folder lectures \
  --language zh-cn \
  --code-only

# Single file analysis
node dist/index.js \
  --source ~/repos/lecture-python-intro \
  --target ~/repos/lecture-intro.zh-cn \
  --docs-folder lectures \
  --language zh-cn \
  --file cagan_adaptive.md
```

---

## Testing Strategy

### Unit Tests

**Location**: `src/__tests__/`

| Test File | Tests | Module Covered |
|-----------|-------|----------------|
| `extraction.test.ts` | 19 | Code extraction, normalization |
| `code-analysis.test.ts` | 13 | Block comparison, scoring |
| `constants.test.ts` | 22 | Thresholds, patterns |
| `discovery.test.ts` | 14 | File pairing, git dates |
| `types.test.ts` | 16 | Type definitions |

**Total**: 84 tests

### Integration Tests

**Test repositories**:
- **Source**: `lecture-python-intro` (English)
- **Target**: `lecture-intro.zh-cn` (Simplified Chinese)

**Key test files**:
| File | Why Useful |
|------|------------|
| `cagan_adaptive.md` | Code divergence, function renames, i18n blocks |
| `about.md` | Simple baseline, minimal code |
| `intro.md` | Prose-heavy, section structure |

---

## Cost Estimates

| Scope | API Calls | Estimated Cost |
|-------|-----------|----------------|
| Single file | 1 | ~$0.04 |
| 5 files | 5 | ~$0.20 |
| Full series (51 files) | 51 | ~$2.20 |

Use `--code-only` for free testing during development.

---

## Known Limitations

1. **No recursive scanning**: Only top-level files in docs folder
2. **Sequential API calls**: No parallelization yet
3. **No caching**: Re-analyzes everything each run
4. **Prose accuracy**: Claude occasionally misses subtle differences

---

## Relationship to Other Tools

```
┌─────────────────────────────────────────────────────────────────┐
│                     Translation Workflow                         │
├─────────────────────────────────────────────────────────────────┤
│  1. INITIAL STATE: Manual translation exists                    │
│     └── Target repo has human-translated content                │
│                                                                  │
│  2. ASSESSMENT: Run tool-onboarding                             │
│     └── Generate alignment reports                              │
│     └── Identify divergences requiring action                   │
│                                                                  │
│  3. REMEDIATION: Fix issues from reports                        │
│     └── SYNC: Apply source changes to target                    │
│     └── BACKPORT: Merge target improvements to source           │
│     └── ACCEPT: Keep locale-specific changes                    │
│                                                                  │
│  4. ENABLE SYNC: Turn on action-translation                     │
│     └── Automated sync on PR merge events                       │
│     └── Incremental section-based updates                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Changelog

### December 2025 - v1.0.0 (Phase 1 Complete)

**Architecture Refactor**
- Split 1,873-line monolith into 10 modules
- Created comprehensive test suite (84 tests)
- Clear separation of concerns

**Module Structure**:
- `types.ts` - TypeScript interfaces
- `constants.ts` - Thresholds, patterns, prompts
- `discovery.ts` - File discovery, git metadata
- `extraction.ts` - Code block extraction
- `analysis/code.ts` - Deterministic comparison
- `analysis/prose.ts` - Claude prose analysis
- `analysis/config.ts` - Config file comparison
- `decision.ts` - Decision generation
- `report.ts` - Report generation
- `index.ts` - CLI entry point

**Features**:
- Document order organization
- Issue type classification (TITLE, CONTENT)
- Configurable thresholds
- Config file analysis

---

*Last Updated: December 2025*
