# GitHub Copilot Instructions

## Project Overview

**action-translation-sync** is a GitHub Action that automatically translates MyST Markdown documents from English to Chinese using Claude AI (Anthropic). It uses a **section-based approach** for robust, maintainable translation.

**Core Architecture**: Section-based translation (not block-based)
**Current Version**: v0.4.3 (Production-Ready)
**Test Coverage**: 121 tests, all passing
**Code Size**: ~1,200 lines core logic across 6 modules

## Key Design Principles

1. **Section-Based, Not Block-Based**: Documents are structured into `## Section` blocks. Translations operate at the section level, not individual paragraphs or blocks.

2. **Position-Based Matching**: Sections match by position (1st → 1st), not by content matching. This works across languages.

3. **Heading-Map System**: Maps English heading IDs to Chinese headings for language-independent section matching.

4. **Subsection Support**: `### Subsections` are parsed from translated content and integrated into heading-maps (v0.4.0+).

5. **Simple Line-by-Line Parsing**: No AST, no `unified`/`remark`. Just split on `##` headings.

6. **Incremental Translation**: Only translate changed sections (UPDATE mode), not entire documents.

## Core Concepts

### Section Structure

```typescript
interface Section {
  heading: string;        // "## Economic Models"
  level: number;          // 2, 3, 4, etc.
  id: string;            // "economic-models"
  content: string;        // Full content (WITHOUT subsections as of v0.4.3)
  startLine: number;      // Source line number
  endLine: number;        // End line number
  subsections: Section[]; // Nested subsections (### headings)
}
```

### Critical: Subsection Handling (v0.4.3 Fix)

**Problem**: Subsections can duplicate if not handled carefully.

**Solution**:
- `parseTranslatedSubsections()` returns BOTH:
  - `subsections`: Array of subsection objects
  - `contentWithoutSubsections`: Content stripped of subsections
- Use `contentWithoutSubsections` when reconstructing
- Append subsections from `section.subsections` array

**Why**: Prevents duplication (subsections in both content and array).

### Heading-Map System

```yaml
---
heading-map:
  introduction: "介绍"
  background: "背景"
  economic-models: "经济模型"
  household-problem: "家庭问题"  # Subsection
---
```

**Purpose**: Maps English IDs to Chinese headings for section matching.

**Features**:
- Flat structure (no nesting)
- Includes sections AND subsections
- Auto-populated on first translation
- Self-maintaining

### Translation Modes

**UPDATE Mode** (incremental):
- For MODIFIED sections
- Provides: old English, new English, current Chinese
- Maintains translation consistency
- Faster than full re-translation

**NEW Mode** (full):
- For ADDED sections or new files
- Provides: English content + glossary
- Full translation with glossary support

## Code Organization

### Module Structure

```
src/
├── index.ts             # GitHub Actions entry point (118 lines)
├── parser.ts            # MyST Markdown parser (172 lines)
├── diff-detector.ts     # Change detection (178 lines)
├── translator.ts        # Claude API integration (257 lines)
├── file-processor.ts    # Translation orchestration (244 lines)
├── heading-map.ts       # Heading-map system (200 lines)
├── inputs.ts            # Action inputs
└── types.ts             # TypeScript types
```

### Module Responsibilities

**parser.ts**:
- Split MyST on `## ` headings (line-by-line)
- Extract subsections (`### `) recursively
- Generate heading IDs from text
- Basic MyST validation

**diff-detector.ts**:
- Detect ADDED/MODIFIED/DELETED sections
- Position-based matching with ID fallback
- Preamble change detection

**translator.ts**:
- Claude API integration (Sonnet 4.5)
- UPDATE mode (incremental)
- NEW mode (full translation)
- Glossary support

**file-processor.ts**:
- Orchestrate translation workflow
- Parse subsections from translated content
- Reconstruct documents
- Critical: Use `contentWithoutSubsections` to prevent duplication

**heading-map.ts**:
- Extract map from frontmatter
- Update map with new translations
- Inject map back into frontmatter
- Recursive subsection processing

**index.ts**:
- GitHub Actions entry point
- Detect changed files in merged PR
- Create translation PRs in target repo
- Handle root-level files (`docs-folder: '.'`)

## Important Implementation Details

### Root-Level File Support

**GitHub Actions Quirk**: Converts `docs-folder: '.'` to `docs-folder: '/'`

**Handling**:
```typescript
if (docsFolder === '.' || docsFolder === '/') {
  docsFolder = '';
}
```

**Filtering root-level files**:
```typescript
if (docsFolder === '') {
  // Root: .md files NOT in subdirectories
  return file.endsWith('.md') && !file.includes('/');
}
```

### No AST Parsing

**Why**: The old block-based approach used `unified` and `remark`:
- Added 700kB to bundle
- Complex AST traversal
- Many dependencies

**Current**: Simple line-by-line parsing:
- No dependencies
- Fast (~1000 lines/ms)
- Easy to debug

### Error Handling

- Parser errors → Include in PR as comment
- Translation errors → Retry with exponential backoff
- Missing frontmatter → Create new frontmatter

## Testing Strategy

**Two Testing Approaches**:

### 1. Local Unit/Integration Tests
**Purpose**: Fast, comprehensive testing of core logic
**Location**: `src/__tests__/*.test.ts`
**Run**: `npm test`
**Coverage**: 121 tests across 5 files

**Test Files**:
- `parser.test.ts` - MyST parsing, frontmatter (15 tests)
- `diff-detector.test.ts` - Change detection (15 tests)
- `file-processor.test.ts` - Section reconstruction (54 tests)
- `heading-map.test.ts` - Map updates (28 tests)
- `integration.test.ts` - End-to-end (9 tests)

**Key Regression Tests** (v0.4.3):
- Subsection duplication prevention
- Heading-map completeness
- Root-level file handling

### 2. GitHub Repository Tests
**Purpose**: Real-world validation with actual PRs and GitHub Actions
**Script**: `scripts/test-action-on-github.sh`
**Repositories**: `quantecon-test/lectures` → `quantecon-test/lectures-zh-cn`
**Features**:
- 9 automated test scenarios
- Automated setup and reset
- TEST mode (no API calls)
- Cross-repo PR creation validation

**Test Scenarios**:
1. New file (full translation)
2. Single section update
3. Multiple section updates
4. Section added
5. Section deleted
6. Preamble update
7. Subsection content update
8. Heading-map integration
9. Root-level file support

**See**: `docs/TEST-REPOSITORIES.md` for detailed GitHub testing guide

## Common Tasks

### Adding a New Test

1. Choose appropriate test file based on module
2. Follow existing test patterns
3. Use realistic fixtures (from `fixtures/` or inline)
4. Run `npm test` to verify

### Modifying Parser

**Remember**: 
- Line-by-line parsing (no AST)
- Subsections extracted recursively
- Generate IDs consistently

### Modifying Translation

**Remember**:
- Two modes: UPDATE and NEW
- Use glossary for key terms
- Preserve MyST syntax

### Modifying Reconstruction

**CRITICAL**:
- Use `contentWithoutSubsections` (not `content`)
- Append subsections from `section.subsections` array
- Test for duplication!

## Documentation

**Structure**:
```
docs/
├── INDEX.md              # Documentation hub
├── QUICKSTART.md         # Getting started
├── ARCHITECTURE.md       # System architecture
├── IMPLEMENTATION.md     # Technical implementation
├── PROJECT-DESIGN.md     # Design decisions
├── TESTING.md            # Testing guide
├── HEADING-MAPS.md       # Heading-map system
├── TODO.md               # Roadmap
├── STATUS-REPORT.md      # Project status
├── TEST-REPOSITORIES.md  # GitHub test setup guide
└── releases/             # Release notes
    ├── v0.4.3.md
    └── v0.4.4.md
```

**Always Update**:
- Test counts when adding tests
- Release notes for new features/fixes
- Status report for major changes
- README.md for user-facing changes

**IMPORTANT - Do NOT**:
❌ **Never create separate SUMMARY.md or CHANGELOG.md files**
❌ **Never create standalone documentation files for changes**
✅ **Always update existing documentation in place** (STATUS-REPORT.md, TODO.md, release notes)
✅ **Update README.md for user-facing changes**

## What NOT to Do

❌ **Don't use AST parsing** - Keep line-by-line approach
❌ **Don't use block-based approach** - Sections, not blocks
❌ **Don't append subsections from content** - Use array to prevent duplication
❌ **Don't match sections by content** - Use position/ID
❌ **Don't translate entire documents** - Only changed sections

## Helpful Context

### Why Section-Based?

**Problems with block-based**:
- Can't match paragraphs across languages
- Lost context (isolated blocks)
- Complex logic, error-prone
- Fragile (breaks with structure differences)

**Section-based solutions**:
- Position matching (language-independent)
- Full context (Claude sees entire sections)
- Simple logic (add/update/delete sections)
- Robust (works with structural differences)

### Why Heading-Maps?

**Problem**:
```
English: "## Introduction" → ID: "introduction"
Chinese: "## 介绍" → ID: "介绍"  (different!)
```

Can't match by ID alone.

**Solution**: Heading-map bridges the gap:
```yaml
heading-map:
  introduction: "介绍"
```

Now we can match!

### Why Parse Subsections?

**Problem**: Translator returns full content including subsections, but we need to:
1. Track subsections separately
2. Include them in heading-map
3. Prevent duplication in output

**Solution**: Parse translated content to extract subsections, strip them from content, store in array.

## Version History

- **v0.1.0** (May 2024) - Initial development
- **v0.2.2** (July 2024) - Block-based prototype
- **v0.3.0** (Aug 2024) - Section-based rewrite (43% code reduction)
- **v0.4.0** (Nov 2024) - Heading-map system
- **v0.4.1** (Dec 2024) - Subsection parsing
- **v0.4.2** (Dec 2024) - Heading-map subsection integration
- **v0.4.3** (Oct 2025) - Subsection duplication fix, GitHub testing, root-level support ✅

## Quick Reference

**Local Testing**:
- `npm test` - Run all unit tests
- `npm test -- parser.test.ts` - Run specific test file
- `npm test -- --watch` - Watch mode for development
- `npm test -- --coverage` - Generate coverage report

**GitHub Testing**:
- `./scripts/test-action-on-github.sh` - Run all 9 GitHub test scenarios
- Uses TEST mode (no Claude API calls)
- Automatically resets test repositories
- See `docs/TEST-REPOSITORIES.md` for details

**Build**:
- `npm run build` - Compile TypeScript
- `npm run package` - Bundle for distribution

**Key files to check when modifying**:
- Subsection handling → `file-processor.ts:parseTranslatedSubsections`
- Translation → `translator.ts:translateSection`
- Parsing → `parser.ts:parseSections`
- Change detection → `diff-detector.ts:detectSectionChanges`
- Heading-maps → `heading-map.ts:updateHeadingMap`

---

**Last Updated**: October 24, 2025
