# GitHub Copilot Instructions

This file provides context and guidelines for GitHub Copilot when assisting with the Translation Sync Action project.

## Project Overview

This is a GitHub Action that automatically synchronizes translations across repositories using Claude Sonnet 4.5. It monitors merged PRs in a source repository (e.g., English lecture notes) and creates translated PRs in target repositories (e.g., Chinese, Japanese versions).

**Current Status**: Development Phase - v0.1.x releases  
**Target**: v1.0 release after thorough testing with QuantEcon lecture series

## Core Principles

### 1. SIMPLICITY & MAINTAINABILITY 🎯

**Priority #1**: Keep the codebase simple and easy to maintain.

- Favor straightforward solutions over clever optimizations
- Write clear, readable code with descriptive variable names
- Avoid over-engineering and premature optimization
- Keep functions small and focused on single responsibilities
- Minimize dependencies where possible
- Document WHY, not just WHAT

### 2. No Backward Compatibility (Until v1.0)

We are in active development (v0.1.x) and **not bound by backward compatibility**.

- Breaking changes are acceptable and expected
- Focus on getting the design right, not preserving old APIs
- Refactor aggressively when needed
- Update documentation as we change interfaces
- Will stabilize API before v1.0 release

### 3. Documentation Updates, Not Summaries

**DO NOT** create new summary files for changes.  
**DO** update existing documentation in place.

- When making changes, update relevant docs in `docs/` folder
- Modify existing sections rather than creating new files
- Keep `docs/TODO.md` current with progress
- Update `docs/STATUS-REPORT.md` with project status changes
- Revise `docs/IMPLEMENTATION.md` when adding features

## Project Structure

```
action-translation-sync/
├── README.md                  # Main user documentation
├── docs/                      # All detailed documentation
│   ├── INDEX.md              # Documentation navigation
│   ├── QUICKSTART.md         # Developer onboarding
│   ├── PROJECT-DESIGN.md     # Design decisions
│   ├── ARCHITECTURE.md       # System architecture
│   ├── IMPLEMENTATION.md     # Implementation details
│   ├── TODO.md               # Development roadmap
│   └── STATUS-REPORT.md      # Project status
├── src/                       # TypeScript source code
│   ├── index.ts              # Main entry point
│   ├── types.ts              # Type definitions
│   ├── parser.ts             # MyST Markdown parser
│   ├── diff-detector.ts      # Change detection
│   ├── translator.ts         # Claude integration
│   └── file-processor.ts     # Orchestration
├── glossary/                  # Built-in translation glossaries
│   ├── README.md             # Glossary documentation
│   ├── zh-cn.json            # Simplified Chinese (342 terms)
│   ├── ja.json               # Japanese (future)
│   └── es.json               # Spanish (future)
├── examples/                  # Example configurations
└── .github/                   # GitHub configuration
```

## Technical Context

### Technologies

- **Language**: TypeScript 5.3 (strict mode)
- **Runtime**: Node.js 20
- **AI Model**: Claude Sonnet 4.5 (`claude-sonnet-4.5-20241022`)
- **Parser**: unified + remark ecosystem
- **Bundler**: @vercel/ncc
- **Testing**: Jest

### Key Components

1. **MyST Parser** (`src/parser.ts`)
   - Parses MyST Markdown into semantic blocks
   - Uses remark/unified for AST manipulation
   - Preserves structure and metadata

2. **Diff Detector** (`src/diff-detector.ts`)
   - Detects changes between document versions
   - Multi-strategy block matching (exact, structural, fuzzy)
   - Maps changes to target documents

3. **Translation Service** (`src/translator.ts`)
   - Integrates with Claude Sonnet 4.5 (`claude-sonnet-4.5-20241022`)
   - Two modes: diff (incremental) and full (new files)
   - Uses glossaries for consistency

4. **File Processor** (`src/file-processor.ts`)
   - Orchestrates the translation workflow
   - Validates MyST syntax
   - Reconstructs documents with translations

## Coding Standards

### TypeScript Style

```typescript
// ✅ GOOD: Clear, simple, descriptive
async function translateChangedBlocks(
  changes: ChangeBlock[],
  glossary: Glossary
): Promise<string[]> {
  const results: string[] = [];
  
  for (const change of changes) {
    const translation = await this.translateBlock(change, glossary);
    results.push(translation);
  }
  
  return results;
}

// ❌ AVOID: Overly clever, hard to maintain
async function translateChangedBlocks(c: ChangeBlock[], g: Glossary) {
  return Promise.all(c.map(x => this.translateBlock(x, g)));
}
```

### Prefer Clarity Over Cleverness

```typescript
// ✅ GOOD: Easy to understand and debug
function findMatchingBlock(block: Block, candidates: Block[]): Block | undefined {
  // Try exact ID match first
  for (const candidate of candidates) {
    if (candidate.id && candidate.id === block.id) {
      return candidate;
    }
  }
  
  // Fall back to structural match
  for (const candidate of candidates) {
    if (candidate.parentHeading === block.parentHeading &&
        candidate.type === block.type) {
      return candidate;
    }
  }
  
  return undefined;
}

// ❌ AVOID: Clever but hard to maintain
const findMatchingBlock = (b: Block, cs: Block[]) =>
  cs.find(c => c.id === b.id) || 
  cs.find(c => c.parentHeading === b.parentHeading && c.type === b.type);
```

### Error Handling

Keep error messages clear and actionable:

```typescript
// ✅ GOOD: Helpful error messages
if (!targetFile) {
  throw new Error(
    `Could not find target file ${filename} in repository ${targetRepo}. ` +
    `This file may need to be created manually.`
  );
}

// ❌ AVOID: Cryptic errors
if (!targetFile) {
  throw new Error('File not found');
}
```

### Comments

Focus on WHY, not WHAT:

```typescript
// ✅ GOOD: Explains reasoning
// Use fuzzy matching as fallback because structural changes
// in the document may have altered parent headings
const match = this.fuzzyMatch(block, candidates);

// ❌ AVOID: States the obvious
// Call fuzzy match function
const match = this.fuzzyMatch(block, candidates);
```

## Testing Philosophy

### Keep Tests Simple

```typescript
// ✅ GOOD: Clear test cases
describe('DiffDetector', () => {
  it('should detect modified paragraphs', async () => {
    const oldContent = '# Title\n\nOld text.';
    const newContent = '# Title\n\nNew text.';
    
    const changes = await detector.detectChanges(oldContent, newContent, 'test.md');
    
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('modified');
  });
});

// ❌ AVOID: Overly complex test setup
describe('DiffDetector', () => {
  let fixture: TestFixture;
  let mockParser: jest.Mocked<Parser>;
  
  beforeEach(() => {
    fixture = createComplexFixture();
    mockParser = createMockParser(fixture);
  });
  // ... 50 lines of setup ...
});
```

## Common Tasks

### Adding a New Feature

1. Update `docs/TODO.md` - mark as in-progress
2. Implement the feature (keep it simple!)
3. Update relevant documentation in `docs/`
4. Add/update tests
5. Update `docs/TODO.md` - mark as complete
6. Update `docs/IMPLEMENTATION.md` if significant

### Fixing a Bug

1. Write a failing test that reproduces the bug
2. Fix the bug with the simplest solution
3. Verify the test passes
4. Update docs if behavior changed

### Refactoring

Remember: We're in v0.1.x - breaking changes are OK!

1. Make the code simpler and clearer
2. Update type definitions if needed
3. Update tests to match new structure
4. Update documentation

## What to Avoid

### ❌ Don't Create Summary Files

When making changes, update existing docs rather than creating:
- `CHANGES.md`
- `UPDATE_SUMMARY.md`
- `FEATURE_COMPLETE.md`
- etc.

Instead, update:
- `docs/TODO.md` (progress)
- `docs/IMPLEMENTATION.md` (features)
- `docs/STATUS-REPORT.md` (status)

### ❌ Don't Over-Engineer

We favor simplicity over flexibility until we understand requirements better.

```typescript
// ❌ AVOID: Premature abstraction
interface TranslationStrategy {
  translate(content: string): Promise<string>;
}

class DiffTranslationStrategy implements TranslationStrategy { ... }
class FullTranslationStrategy implements TranslationStrategy { ... }
class CachedTranslationStrategy implements TranslationStrategy { ... }

// ✅ GOOD: Simple conditional
if (mode === 'diff') {
  return await this.translateDiff(content);
} else {
  return await this.translateFull(content);
}
```

### ❌ Don't Worry About Backward Compatibility

We're in v0.1.x - focus on getting it right:

```typescript
// ✅ GOOD: Change the interface if it improves clarity
interface Block {
  type: BlockType;
  content: string;
  metadata: BlockMetadata;  // Changed from individual fields
}

// ❌ AVOID: Keeping old interface for compatibility
interface Block {
  type: BlockType;
  content: string;
  id?: string;              // Deprecated, use metadata.id
  parentHeading?: string;   // Deprecated, use metadata.parent
  metadata?: BlockMetadata; // New preferred way
}
```

## AI Model Integration

When working with Claude API:

1. **Keep prompts simple and clear** - Don't over-engineer
2. **Handle errors gracefully** - API calls can fail
3. **Log token usage** - For debugging and cost tracking
4. **Preserve special content** - Code, math, directives should not be translated

Example prompt structure:
```typescript
const prompt = `
You are translating from ${source} to ${target}.

RULES:
1. Translate only the [CHANGED] section
2. Preserve code blocks and math unchanged
3. Use the glossary for consistency

GLOSSARY:
${glossaryTerms}

[CHANGED]
${content}
[/CHANGED]

Provide only the translation, no explanations.
`.trim();
```

## Documentation Guidelines

### When to Update Each Doc

- **README.md**: User-facing changes, new features, usage examples
- **docs/TODO.md**: Task status, what's next, blockers
- **docs/IMPLEMENTATION.md**: New components, significant refactors
- **docs/ARCHITECTURE.md**: Architectural changes, new patterns
- **docs/STATUS-REPORT.md**: Milestone completion, metrics
- **docs/QUICKSTART.md**: Developer workflow changes

### Keep Docs Current

Update documentation **as you code**, not after:

```typescript
// When adding a new public method:
// 1. Add JSDoc comment
// 2. Update relevant doc in docs/
// 3. Add to docs/TODO.md if it completes a task

/**
 * Validates MyST syntax in translated content
 * 
 * @param content - Translated markdown content
 * @param filepath - Original file path for context
 * @returns Validation result with any errors
 */
async validateMyST(content: string, filepath: string): Promise<ValidationResult> {
  // implementation
}
```

## Version Strategy

### Current Phase: v0.1.x (Development)

- **Breaking changes**: Freely allowed
- **API stability**: Not guaranteed
- **Focus**: Getting the core right
- **Testing**: Manual testing with sample files

### Future: v1.0 (Production)

- **Breaking changes**: Avoided
- **API stability**: Guaranteed
- **Focus**: Stability and reliability
- **Testing**: Comprehensive automated tests, real-world usage

Version bumps in v0.1.x:
- `0.1.0` → `0.1.1`: Bug fixes, small improvements
- `0.1.x` → `0.2.0`: New features, refactors
- `0.x.x` → `1.0.0`: Production ready, API frozen

## Getting Help

- **Design decisions**: See `docs/PROJECT-DESIGN.md`
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Current tasks**: See `docs/TODO.md`
- **How things work**: See `docs/IMPLEMENTATION.md`
- **Quick reference**: See `docs/QUICKSTART.md`

## Remember

1. **Simplicity first** - Simple code is maintainable code
2. **No backward compatibility** - We're in v0.1.x, make it right
3. **Update docs, don't summarize** - Keep existing docs current
4. **Clear over clever** - Future you will thank present you
5. **Test as you go** - But keep tests simple too

---

When in doubt, ask: "Is this the simplest solution that could work?"

If yes, do it. If no, simplify.
