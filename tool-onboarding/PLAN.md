# tool-onboarding: Plan & Implementation Notes

**Last Updated**: December 18, 2025  
**Status**: Active Development  
**Location**: `/tool-onboarding/`

---

## Overview

`tool-onboarding` is a CLI tool for assessing translation alignment between source and target repositories. It uses a **hybrid analysis approach**:

1. **Code Analysis**: Deterministic comparison (fast, 100% accurate)
2. **Prose Analysis**: Claude AI evaluation (nuanced understanding)

This tool prepares existing translation repositories for the `action-translation` sync workflow.

---

## Current State (v1.0)

### Architecture

Single-file implementation: `src/index.ts` (~830 lines)

```
┌─────────────────────────────────────────────────────────────────┐
│                     tool-onboarding                             │
├─────────────────────────────────────────────────────────────────┤
│  Code Analysis (Deterministic)      │  Prose Analysis (Claude)  │
│  ─────────────────────────────────  │  ────────────────────────│
│  • Extract code blocks              │  • Section comparison     │
│  • Normalize comments/strings       │  • Translation accuracy   │
│  • Position-based comparison        │  • Math notation check    │
│  • i18n pattern detection           │  • Missing content        │
│  • Score: identical/match/modified  │  • Score: aligned/drift   │
└─────────────────────────────────────────────────────────────────┘
```

### Features Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Code block extraction | ✅ | `{code-cell}` and markdown fences |
| Code normalization | ✅ | Strings → `"<< STRING >>"`, comments → `# << COMMENT >>` |
| i18n detection | ✅ | CJK font config recognized as acceptable |
| Position-based matching | ✅ | Block N compared to block N |
| Git date retrieval | ✅ | Shows last-modified for sync direction |
| Sync direction hints | ✅ | → Source newer / ← Target newer |
| Action checkboxes | ✅ | Sync / Backport / Manual |
| Single file analysis | ✅ | `-f filename` flag |
| Limit files | ✅ | `--limit N` for testing |

### Code Block Status Types

| Status | Icon | Meaning |
|--------|------|---------|
| IDENTICAL | 🟢 | Exact match |
| MATCH | 🟢 | Same after normalizing comments/strings |
| i18n | 🟢 | Only CJK font configuration added |
| MODIFIED | 🟡 | Code logic differs |
| MISSING | 🔴 | Block missing in target |
| EXTRA | 🔵 | Extra block in target |

### i18n Detection Patterns

Automatically recognized as acceptable changes:
- Font imports (`import matplotlib as mpl`)
- Font path configuration
- Font manager registration
- rcParams font settings
- Unicode minus settings
- CJK font families (SimHei, SimSun, PingFang, etc.)

---

## Design Decisions

### Why Hybrid Analysis?

**Problem discovered during development**: Claude sometimes hallucinates about code. For example, it incorrectly reported a function as "truncated" when both files had complete implementations.

**Solution**: 
- Code is analyzed deterministically (100% accurate)
- Claude focuses on prose only (its strength)

### Why Position-Based Block Matching?

**Alternatives considered**:
1. Content-based matching (hash blocks, match by content)
2. LCS algorithm (longest common subsequence)

**Decision**: Keep position-based because:
- Translation workflows rarely insert/delete code blocks mid-document
- Different block counts already flags "review needed"
- Simpler implementation, fewer edge cases
- tool-alignment (reference implementation) also uses position-based

**Limitation documented**: Warning displayed when block counts differ:
```
> ⚠️ **Block count mismatch**: Comparison is position-based. When counts differ, blocks may be misaligned.
```

### Why Single Status Model?

**Previous model**: `needs-work` vs `suggestion` distinction
- Confusing - what's the difference?
- Hard to actionize

**Current model**: Single `review` status with checkboxes
- Clear: Something needs attention
- Actionable: Choose direction (Sync / Backport / Manual)
- File dates help decide direction

---

## Known Limitations

1. **Position-based matching**: If a block is inserted mid-document, all subsequent blocks misalign
2. **No recursive directory scanning**: Only top-level files in docs folder
3. **No parallel API calls**: Files processed sequentially
4. **No caching**: Re-analyzes everything each run

---

## Next Steps (Future Work)

### High Priority

1. **Full repository analysis** - Run on complete lecture-intro series
2. **Batch reporting** - Summary statistics across all files
3. **Export formats** - CSV for tracking in spreadsheet

### Medium Priority

4. **Content-based matching fallback** - When block counts differ significantly
5. **Parallel API calls** - Speed up multi-file analysis
6. **Caching** - Skip unchanged files on re-run

### Low Priority

7. **Recursive directory support** - Handle nested folder structures
8. **Progress persistence** - Resume interrupted runs
9. **Web UI** - Interactive report viewer

---

## Relationship to Other Tools

### tool-alignment (DEPRECATED)

`tool-alignment` was the previous attempt at this problem. It:
- Had more complex architecture (separate files for structural analysis)
- Also used position-based matching (same limitation)
- Had useful code integrity analysis that informed tool-onboarding

**Status**: Retained for reference only. All development moved to tool-onboarding.

### action-translation (Main Project)

`tool-onboarding` is a **companion tool** to `action-translation`:

1. **tool-onboarding**: Assess existing repos before enabling sync
2. **action-translation**: Automated sync on PR merge events

**Workflow**:
```
1. Run tool-onboarding → Generate alignment report
2. Review report → Fix major divergences manually
3. Enable action-translation → Automated incremental sync
```

### tool-bulk-translator

`tool-bulk-translator` creates initial translations from scratch.

**Use case difference**:
- bulk-translator: No target exists, translate everything
- tool-onboarding: Target exists, assess alignment

---

## Usage Patterns

### Single File Deep-Dive

```bash
node dist/index.js -s ~/source -t ~/target -f problematic-file.md -o report.md
```

### Quick Repository Scan

```bash
node dist/index.js -s ~/source -t ~/target --limit 5 -o quick-scan.md
```

### Full Repository Analysis

```bash
node dist/index.js -s ~/source -t ~/target -o full-report.md
```

---

## Testing Notes

### Test Repositories

- Source: `lecture-python-intro` (English)
- Target: `lecture-intro.zh-cn` (Chinese)
- Docs folder: `lectures`

### Test Files Used

1. `cagan_adaptive.md` - Good test case with code/prose divergence
2. `about.md` - Simple file for baseline
3. First 5 files - Quick iteration testing

### Cost Estimate

Per file: ~$0.04 (Sonnet 4.5)
Full lecture series (51 files): ~$2.20

---

## Changelog

### 2025-12-18

- Removed unused `describeCodeBlock` function
- Changed table format: `Block | Lines | Status | Notes`
- Added block count mismatch warning
- Updated README with full documentation
- Generated baseline reports for `cagan_adaptive` and first 5 lectures

### 2025-12-17

- Added deterministic code analysis (ported from tool-alignment)
- Added i18n detection for CJK font config
- Split code/prose analysis into separate report sections
- Changed status model to single `review` with checkboxes

### 2025-12-16

- Initial implementation
- Claude-only analysis (prose + code together)
- Basic file discovery and report generation
