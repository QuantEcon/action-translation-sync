# Implementation Guide

This document explains how the Translation Sync Action works internally. For architecture overview, see [ARCHITECTURE.md](ARCHITECTURE.md). For design decisions, see [PROJECT-DESIGN.md](PROJECT-DESIGN.md).

**Version**: v0.5.1  
**Status**: Production-Ready

---

## Overview

The implementation is **simple by design** - ~1,300 lines of core code across 7 modules, no complex AST parsing, and straightforward position-based matching.

**Core Philosophy**: Keep it simple, maintainable, and easy to understand.

### Key Principles

1. **Section-Based Translation**: Translate entire `## Section` blocks for better context
2. **Position-Based Matching**: Match sections by position (1st → 1st), not content
3. **Recursive Structure**: Full support for nested headings at any depth (##-######)
4. **Language-Independent**: Heading-maps bridge language differences
5. **No AST Parsing**: Simple line-by-line parsing with stack-based recursion

---

## Core Modules

### 1. Entry Point (`src/index.ts` - 118 lines)

**Purpose**: GitHub Actions entry point that orchestrates the translation workflow.

**Key Responsibilities**:
- Read action inputs (repos, languages, API keys)
- Detect changed files in merged PR
- Orchestrate translation workflow via file-processor
- Create translation PRs in target repo

**Main Flow**:
```typescript
1. Get merged PR details from GitHub
2. Detect changed lecture files (*.md in docs-folder)
3. For each changed file:
   - Fetch source (English) and target (Chinese) content
   - Process file (translate via file-processor)
   - Create PR in target repo with translations
```

**Special Handling**:
- Root-level files: Handles `docs-folder: '.'` by filtering files not in subdirectories
- GitHub Actions quirk: Converts `'.'` to `'/'`, normalized to empty string

---

### 2. Parser (`src/parser.ts` - 172 lines)

**Purpose**: Parse MyST Markdown documents into `## Section` blocks using stack-based recursive parsing.

#### Key Functions

**`parseSections(content: string, filepath: string): Section[]`**

Main parser function. Uses stack-based algorithm to handle arbitrary nesting depth.

**Algorithm**:
```typescript
1. Initialize section stack
2. For each line:
   - If heading (##-######):
     - Complete all sections at same/deeper level
     - Create new section at current level
     - Push to stack
   - Else:
     - Add to current section's content
3. Complete remaining sections on stack
```

**Section Structure**:
```typescript
interface Section {
  id: string;              // "economic-models"
  heading: string;         // "## Economic Models"
  level: number;           // 2, 3, 4, 5, or 6
  content: string;         // Direct content (WITHOUT subsections)
  startLine: number;       // Source line number
  endLine: number;         // End line number
  subsections: Section[];  // Recursively nested subsections
}
```

**Critical Design Point**: Content separation
- `section.content` contains ONLY direct content
- Subsections stored separately in `section.subsections` array
- Prevents duplication when serializing

**ID Generation**:
```typescript
1. Extract text from heading (remove ##)
2. Convert to lowercase
3. Replace spaces with hyphens
4. Remove special characters
5. Trim leading/trailing hyphens
```

Example: `"## Economic Models"` → `"economic-models"`

**`generateHeadingId(heading: string): string`**

Generates consistent IDs for headings across languages.

**`extractFrontmatter(content: string): { frontmatter, body }`**

Extracts YAML frontmatter (between `---` delimiters) from document.

---

### 3. Diff Detector (`src/diff-detector.ts` - 178 lines)

**Purpose**: Detect what changed between source versions and determine translation needs.

#### Change Detection Strategy

**Multi-Strategy Matching** (in order):
1. **Position + ID Match**: Same position AND same ID → MODIFIED (content check)
2. **Position-Only Match**: Same position, different ID → MODIFIED (likely renamed)
3. **ID-Only Match**: Different position, same ID → MODIFIED (section moved)
4. **No Match**: Section not found → ADDED or DELETED

#### Key Functions

**`detectSectionChanges(oldSections, newSections, targetSections, headingMap)`**

Main function. Returns array of changes with type (ADDED/MODIFIED/DELETED).

**Change Types**:
```typescript
type ChangeType = 'ADDED' | 'MODIFIED' | 'DELETED';

interface SectionChange {
  type: ChangeType;
  newSection?: Section;        // For ADDED, MODIFIED
  oldSection?: Section;        // For MODIFIED, DELETED
  targetSection?: Section;     // For MODIFIED (current target)
}
```

**Recursive Comparison**:
- Compares sections at all nesting levels
- Uses `areSectionsEqual()` to detect content changes
- Checks subsection count to prevent data loss

**Position-Based Matching**:
```typescript
// Match by position (language-independent)
const oldSection = oldSections[i];
const newSection = newSections[i];
const targetSection = targetSections[i];

// Position matching works even if headings are in different languages!
```

**Heading-Map Usage**:
```typescript
// Find target section by English ID
const englishId = newSection.id;
const chineseHeading = headingMap[englishId];
const targetId = generateHeadingId(chineseHeading);
const targetSection = findSectionById(targetSections, targetId);
```

#### Special Cases

**Preamble Changes**: Content before first `##` heading
```typescript
if (oldPreamble !== newPreamble) {
  // Create synthetic change for preamble
  changes.unshift({
    type: 'MODIFIED',
    isPreamble: true,
    oldPreamble,
    newPreamble,
    currentPreamble
  });
}
```

**Section Reordering**: 
- Position-based matching handles reordering naturally
- Same section at different position → MODIFIED
- Heading-map ensures correct target section found

---

### 4. Translator (`src/translator.ts` - 257 lines)

**Purpose**: Interface with Claude API for translation with language-specific configuration.

#### Translation Modes

**UPDATE Mode** (for MODIFIED sections):
```typescript
{
  mode: 'UPDATE',
  oldEnglish: "...",      // Previous English version
  newEnglish: "...",      // New English version
  currentTranslation: "..." // Current target language version
}
```

Prompt includes all three versions to maintain consistency and context.

**NEW Mode** (for ADDED sections or new files):
```typescript
{
  mode: 'NEW',
  english: "...",
  glossary: {...}
}
```

Full translation with glossary support.

#### Key Functions

**`translateSection(request: SectionTranslationRequest): Promise<string>`**

Main translation function with retry logic and language configuration.

**Language Configuration** (v0.5.1):
```typescript
interface LanguageConfig {
  code: string;
  name: string;
  translationRules: {
    preserveEnglishPunctuation?: string[];
    convertPunctuation?: Record<string, string>;
    specialInstructions?: string;
  };
}
```

Example (Chinese):
```typescript
{
  code: 'zh-cn',
  translationRules: {
    convertPunctuation: {
      ',': '，',
      ':': '：',
      ';': '；'
    },
    preserveEnglishPunctuation: ['code blocks', 'math equations'],
    specialInstructions: 'Use simplified Chinese characters'
  }
}
```

**Prompt Construction**:
- Includes glossary terms for consistency
- Specifies MyST markdown preservation requirements
- Adds language-specific rules
- Provides context (old/new/current for UPDATE mode)

**Error Handling**:
- Exponential backoff retry (max 3 attempts)
- Clear error messages with context
- Preserves original on failure

---

### 5. File Processor (`src/file-processor.ts` - 244 lines)

**Purpose**: Orchestrate the translation workflow for a single file.

#### Main Workflow

**`processFile(sourceContent, targetContent, filepath): Promise<string>`**

```typescript
1. Parse source (new English)
2. Parse old source (previous English) 
3. Parse target (current Chinese)
4. Extract heading-map from target
5. Detect changes
6. Translate changed sections
7. Reconstruct target document
8. Update heading-map
9. Return new target content
```

#### Key Functions

**`translateChangedSections(changes: SectionChange[]): Promise<void>`**

Translates each changed section and stores result.

**`reconstructTargetDocument(targetSections, changes): string`**

Critical function that rebuilds the document with translations.

**Reconstruction Logic**:
```typescript
For each target section:
  1. Check if there's a translation for this section
  2. If yes:
     - Use translated content
     - Parse subsections from translation
     - Merge with target subsections (preserve untranslated)
  3. If no:
     - Keep existing section unchanged
  4. Recursively serialize section (content + subsections)
```

**Subsection Preservation** (v0.4.7):
```typescript
// If translator returns incomplete structure:
if (translatedSubsections.length < targetSection.subsections.length) {
  // Preserve untranslated subsections
  for (let i = translatedSubsections.length; i < targetSection.subsections.length; i++) {
    translatedSubsections.push(targetSection.subsections[i]);
  }
}
```

**`serializeSection(section: Section): string`**

Recursively serializes section with all nested subsections:
```typescript
private serializeSection(section: Section): string {
  const parts: string[] = [];
  
  // Add direct content (heading + body, WITHOUT subsections)
  parts.push(section.content);
  
  // Add subsections recursively
  for (const subsection of section.subsections) {
    parts.push(''); // Empty line
    parts.push(this.serializeSection(subsection)); // RECURSIVE
  }
  
  return parts.join('\n');
}
```

**CRITICAL**: Uses `section.content` (not full content with subsections) to prevent duplication.

---

### 6. Heading-Map System (`src/heading-map.ts` - 200 lines)

**Purpose**: Maintain mapping between English IDs and translated headings.

#### Heading-Map Format

```yaml
---
heading-map:
  introduction: "介绍"
  economic-models: "经济模型"
  theory: "理论"
  household-problem: "家庭问题"  # Subsection
  firm-problem: "企业问题"        # Subsection
---
```

**Key Properties**:
- Flat structure (no nesting)
- Includes sections AND subsections
- Maps English ID → Target heading text
- Self-maintaining (auto-populated)

#### Key Functions

**`extractHeadingMap(frontmatter): Record<string, string>`**

Extracts heading-map from YAML frontmatter.

**`updateHeadingMap(map, sections, language): Record<string, string>`**

Updates map with new sections (recursively processes subsections).

**Recursive Processing** (v0.4.7):
```typescript
function updateHeadingMap(map, sections, language) {
  for (const section of sections) {
    // Add this section
    const englishId = section.id;
    const targetHeading = extractHeadingText(section.heading);
    map[englishId] = targetHeading;
    
    // Process subsections recursively
    if (section.subsections.length > 0) {
      updateHeadingMap(map, section.subsections, language); // RECURSIVE
    }
  }
  return map;
}
```

**`injectHeadingMap(frontmatter, map): string`**

Injects updated heading-map back into frontmatter YAML.

---

### 7. Language Configuration (`src/language-config.ts` - 66 lines)

**Purpose**: Language-specific translation rules (v0.5.1).

#### Configuration Structure

```typescript
interface LanguageConfig {
  code: string;              // 'zh-cn', 'ja', 'es'
  name: string;              // 'Simplified Chinese'
  translationRules: {
    preserveEnglishPunctuation?: string[];
    convertPunctuation?: Record<string, string>;
    specialInstructions?: string;
  };
}
```

#### Built-in Languages

**Simplified Chinese** (`zh-cn`):
```typescript
{
  code: 'zh-cn',
  name: 'Simplified Chinese',
  translationRules: {
    convertPunctuation: {
      ',': '，',  // ASCII comma → full-width
      ':': '：',
      ';': '；',
      '!': '！',
      '?': '？'
    },
    preserveEnglishPunctuation: [
      'code blocks',
      'math equations',
      'URLs',
      'inline code'
    ],
    specialInstructions: 'Use simplified Chinese characters. Preserve English terms when commonly used in academic context.'
  }
}
```

#### Adding New Languages

```typescript
// Example: Japanese
export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    code: 'ja',
    name: 'Japanese',
    translationRules: {
      convertPunctuation: {
        ',': '、',
        '.': '。'
      },
      specialInstructions: 'Use polite form. Preserve kanji for technical terms.'
    }
  }
];
```

---

## Recursive Implementation Details

### Stack-Based Parser

The parser uses a **stack-based algorithm** to handle arbitrary nesting depth without explicit recursion limits.

**Why Stack-Based?**
- Handles any nesting depth (##-######)
- No recursion depth limits
- Simple and efficient (O(n) where n = lines)

**Algorithm Flow**:

```typescript
const sectionStack: Array<{section: Section, contentLines: string[]}> = [];

for (const line of lines) {
  if (isHeading(line)) {
    const level = getHeadingLevel(line); // 2-6
    
    // Step 1: Complete all sections at level >= current
    while (sectionStack.length > 0 && 
           sectionStack[sectionStack.length - 1].section.level >= level) {
      const completed = sectionStack.pop()!;
      completed.section.content = completed.contentLines.join('\n');
      
      // Add to parent's subsections or root
      if (sectionStack.length > 0) {
        const parent = sectionStack[sectionStack.length - 1];
        parent.section.subsections.push(completed.section);
      } else {
        sections.push(completed.section);
      }
    }
    
    // Step 2: Create new section at current level
    const newSection: Section = {
      level,
      heading: line,
      subsections: [],
      // ...other fields
    };
    
    // Step 3: Push to stack
    sectionStack.push({
      section: newSection,
      contentLines: []
    });
  } else {
    // Add line to current section's content
    if (sectionStack.length > 0) {
      sectionStack[sectionStack.length - 1].contentLines.push(line);
    }
  }
}

// Complete remaining sections
while (sectionStack.length > 0) {
  // ... same completion logic
}
```

**Key Insight**: The stack depth corresponds to the nesting level. When we encounter a heading at level N, we pop all sections at level >= N before creating the new section.

### Content Separation

**Critical Design Decision**: Store content WITHOUT subsections.

**Why?**
- Prevents duplication when serializing
- Allows independent subsection manipulation
- Clear separation of concerns

**How?**
```typescript
// During parsing:
section.content = directContentLines.join('\n');  // WITHOUT subsection text
section.subsections = [...];                       // Separate array

// During serialization:
serialize(section) {
  return section.content +                         // Direct content
         section.subsections.map(serialize);       // Recursive subsections
}
```

**What NOT to do**:
```typescript
// ❌ WRONG - Causes duplication
serialize(section) {
  return section.content +        // Already includes subsections!
         section.subsections;     // Duplicates them!
}
```

### Recursive Comparison

**Purpose**: Detect changes at any nesting depth.

**Algorithm**:
```typescript
function areSectionsEqual(sec1: Section, sec2: Section): boolean {
  // Compare direct content
  if (sec1.content !== sec2.content) return false;
  
  // Compare subsection count (prevents data loss)
  if (sec1.subsections.length !== sec2.subsections.length) return false;
  
  // Recursively compare each subsection
  for (let i = 0; i < sec1.subsections.length; i++) {
    if (!areSectionsEqual(sec1.subsections[i], sec2.subsections[i])) {
      return false;
    }
  }
  
  return true;
}
```

**Benefits**:
- Detects changes at ####, #####, or ###### levels
- Prevents data loss (subsection count validation)
- Language-independent (compares structure, not text)

---

## Data Flow Example

### Scenario: Modified Section with Subsection

**Source PR** (English):
```markdown
## Economic Models  ← MODIFIED (content changed)

New introduction paragraph...

### Household Problem  ← Unchanged
...

### Firm Problem  ← Unchanged
...
```

**Target File** (Chinese):
```markdown
## 经济模型

Old introduction paragraph...

### 家庭问题
...

### 企业问题
...
```

**Processing Flow**:

```typescript
// 1. Parse
sourceNew = [{
  id: "economic-models",
  heading: "## Economic Models",
  content: "New introduction paragraph...",
  subsections: [
    { id: "household-problem", heading: "### Household Problem", ... },
    { id: "firm-problem", heading: "### Firm Problem", ... }
  ]
}]

target = [{
  id: "经济模型",  // Chinese ID
  heading: "## 经济模型",
  content: "Old introduction paragraph...",
  subsections: [
    { id: "家庭问题", heading: "### 家庭问题", ... },
    { id: "企业问题", heading: "### 企业问题", ... }
  ]
}]

// 2. Extract heading-map
headingMap = {
  "economic-models": "经济模型",
  "household-problem": "家庭问题",
  "firm-problem": "企业问题"
}

// 3. Detect changes
changes = [{
  type: 'MODIFIED',
  newSection: sourceNew[0],      // English with new content
  oldSection: sourceOld[0],      // English with old content
  targetSection: target[0]        // Chinese with old content
}]

// 4. Translate (UPDATE mode)
translation = await translateSection({
  mode: 'UPDATE',
  oldEnglish: "Old introduction paragraph...",
  newEnglish: "New introduction paragraph...",
  currentTranslation: "Old introduction paragraph...",
  glossary: {...}
})
// Returns: "New introduction paragraph... (in Chinese)"

// 5. Reconstruct
// Parse translation to extract subsections
translatedSection = parseSection(translation)

// Merge with target subsections
if (translatedSection.subsections.length < targetSection.subsections.length) {
  // Preserve untranslated subsections
  translatedSection.subsections.push(...targetSection.subsections.slice(translatedSection.subsections.length));
}

// Serialize recursively
result = serializeSection(translatedSection)
```

**Result**:
```markdown
## 经济模型

New introduction paragraph... (in Chinese)

### 家庭问题  ← Preserved
...

### 企业问题  ← Preserved
...
```

---

## Key Design Decisions

### 1. Section-Based Translation (Not Block-Based)

**Why?**
- Better context for LLM
- Language-independent matching (position)
- Simpler logic (add/update/delete sections)

**Trade-offs**:
- Larger chunks sent to Claude
- Can't translate individual paragraphs
- **Winner**: Better quality and robustness

### 2. Position-Based Matching (Not Content-Based)

**Why?**
- Works across languages
- Survives reordering
- No fuzzy matching needed

**Example**:
```
English: "## Introduction" (position 0)
Chinese: "## 介绍" (position 0)
→ Matched by position, not text!
```

### 3. No AST Parsing (Line-by-Line)

**Why?**
- Simple and maintainable
- Fast (~1ms per file)
- No dependencies on unified/remark

**Trade-offs**:
- Can't handle complex nested structures
- Assumes well-formed MyST
- **Winner**: Simplicity and speed

### 4. Heading-Map System (Not ID Matching)

**Why?**
- Bridges language differences
- Self-maintaining
- Visible in frontmatter (debuggable)

**Alternative considered**: Try to match by content similarity
**Why not**: Unreliable across languages

### 5. Recursive Structure (Full Nesting)

**Why?**
- Handles real-world documents
- Detects changes at any depth
- Future-proof (supports ######)

**Complexity**: Worth it for robustness

---

## Performance Characteristics

### Parser
- **Complexity**: O(n) where n = number of lines
- **Memory**: O(s) where s = number of sections
- **Typical**: <10ms for lecture-sized files (~1000 lines)

### Diff Detector
- **Complexity**: O(s) where s = number of sections
- **Memory**: O(s) for section storage
- **Typical**: <5ms for lecture-sized files

### Translator
- **Complexity**: Limited by Claude API latency
- **Memory**: O(content size) for prompt construction
- **Typical**: 2-5 seconds per section (API call)

### File Processor
- **Complexity**: O(n) + O(API latency)
- **Memory**: O(file size) for document in memory
- **Typical**: 5-15 seconds per file depending on changes

**Bottleneck**: Claude API calls (can be parallelized in future)

---

## Error Handling

### Parse Errors
**Causes**:
- Invalid MyST syntax
- Unclosed code blocks or directives
- Malformed headings

**Action**: Fail workflow with error details, preserve original

### Translation Errors
**Causes**:
- Claude API failure (timeout, rate limit)
- Invalid API response
- Translation doesn't match expected format

**Action**: Retry with exponential backoff (max 3 attempts), then fail

### Validation Errors
**Causes**:
- Translated content has MyST syntax errors
- Sections missing after reconstruction
- Subsection count mismatch

**Action**: Fail workflow with detailed error, preserve original

### GitHub Errors
**Causes**:
- Can't fetch file content from PR
- Can't create PR in target repo
- Permission issues

**Action**: Fail workflow with GitHub API error details

---

## Testing Strategy

### Unit Tests (147 total)

**Parser Tests** (~15 tests):
- Section splitting at all levels (##-######)
- ID generation consistency
- Frontmatter extraction
- Subsection nesting
- Edge cases (empty sections, special characters)

**Diff Detector Tests** (~24 tests):
- Position matching
- ID fallback matching
- ADDED/MODIFIED/DELETED detection
- Preamble change detection
- Recursive subsection comparison (6 tests for nested changes)

**File Processor Tests** (~54 tests):
- Section reconstruction
- Subsection preservation
- Translation integration
- Heading-map updates
- Content serialization

**Heading-Map Tests** (~28 tests):
- Map extraction from frontmatter
- Map updates with new sections
- Recursive subsection processing
- Injection back into frontmatter

**Language Config Tests** (~7 tests):
- Punctuation conversion rules
- Language-specific prompts
- Configuration validation

**Integration Tests** (~9 tests):
- End-to-end file processing
- Real document structures
- Multiple change types
- Complex scenarios

### GitHub Integration Tests (24 scenarios)

Automated test suite using real GitHub repositories:

**Basic Changes** (01-08):
- Intro text updated
- Title changed
- Section content updated
- Sections reordered
- New section added
- Section deleted
- Subsection content updated
- Multiple elements changed

**Scientific Content** (09-16):
- Real-world lecture (code + math)
- Sub-subsection added (####)
- Sub-subsection changed
- Code cell modified
- Math equations changed
- Subsection deleted
- Sub-subsection deleted
- Pure section reorder

**Document Lifecycle** (17-20):
- New document added
- Document deleted
- Multiple files changed
- Document renamed

**Edge Cases** (21-24):
- Preamble-only change
- Deep nesting (##### and ######)
- Special characters in headings
- Empty sections

**Tool**: `tool-test-action-on-github/test-action-on-github.sh`

See [TEST-REPOSITORIES.md](TEST-REPOSITORIES.md) for setup details.

---

## Common Issues & Solutions

### Issue: Subsections Lost After Translation

**Symptom**: Subsections disappear from target document

**Cause**: Translator returns simplified content without subsections

**Solution**: Parse translated content, merge with target subsections
```typescript
// In reconstructTargetDocument:
const translatedSubsections = parseSubsections(translation);
if (translatedSubsections.length < targetSection.subsections.length) {
  translatedSubsections.push(...targetSection.subsections.slice(translatedSubsections.length));
}
```

### Issue: Heading-Map Out of Order

**Symptom**: Heading-map entries not in document order

**Cause**: Recursive subsection processing order

**Solution**: Process sections in document order (v0.4.7)
```typescript
// Flatten sections first, then update map
const flatSections = flattenSections(sections);
for (const section of flatSections) {
  headingMap[section.id] = section.heading;
}
```

### Issue: Duplicate Content in Output

**Symptom**: Subsections appear twice in serialized output

**Cause**: Using full content instead of direct content

**Solution**: Use `section.content` (without subsections) + append `section.subsections`
```typescript
// ✓ CORRECT
serialize(section) {
  return section.content + '\n\n' + section.subsections.map(serialize).join('\n\n');
}

// ✗ WRONG
serialize(section) {
  return section.fullContent + '\n\n' + section.subsections.map(serialize).join('\n\n');
}
```

### Issue: Section Not Detected as Changed

**Symptom**: Modified subsection not triggering UPDATE

**Cause**: Non-recursive comparison

**Solution**: Recursive `areSectionsEqual()` checks all nesting levels (v0.4.7)

---

## Dependencies

### Runtime Dependencies
- `@actions/core` - GitHub Actions toolkit
- `@actions/github` - GitHub API client
- `@anthropic-ai/sdk` - Claude API client
- `js-yaml` - YAML parsing (frontmatter)

### Development Dependencies
- `typescript` - Type checking and compilation
- `@vercel/ncc` - Bundle for distribution
- `jest` - Testing framework
- `@types/*` - TypeScript definitions

**Total Bundle Size**: ~1951kB (includes all dependencies)

---

## Deployment

### Build Process

```bash
# 1. Compile TypeScript
npm run build
# Output: dist/index.js

# 2. Bundle with dependencies
npm run package
# Output: dist/index.js (bundled, ready for GitHub Actions)
```

### GitHub Actions Distribution

The action is distributed via GitHub releases with the bundled `dist/index.js`:

```yaml
# In user's workflow
- uses: quantecon/action-translation-sync@v1
  with:
    target-repo: 'org/repo.zh-cn'
    target-language: 'zh-cn'
```

**Note**: `dist/index.js` is committed to the repository (exception to .gitignore for GitHub Actions)

---

## Monitoring & Debugging

### Logging

The action uses GitHub Actions Core logging:

```typescript
import * as core from '@actions/core';

core.info('Processing file: lecture.md');
core.warning('Section not found in target');
core.error('Translation failed');
core.debug('Section details: ' + JSON.stringify(section));
```

**Log Levels**:
- `info` - Normal progress updates
- `warning` - Non-fatal issues
- `error` - Fatal errors (workflow fails)
- `debug` - Detailed debugging (only when `ACTIONS_STEP_DEBUG=true`)

### Debug Mode

Enable detailed logging:

```yaml
- uses: quantecon/action-translation-sync@v1
  env:
    ACTIONS_STEP_DEBUG: true
```

### Common Debug Scenarios

**Check what was detected**:
```typescript
core.debug(`Detected ${changes.length} changes`);
changes.forEach(change => {
  core.debug(`${change.type}: ${change.newSection?.id || change.oldSection?.id}`);
});
```

**Verify heading-map**:
```typescript
core.debug(`Heading-map entries: ${JSON.stringify(headingMap, null, 2)}`);
```

**Inspect translated content**:
```typescript
core.debug(`Translation result: ${translation.substring(0, 200)}...`);
```

---

## Future Enhancements

### Potential Improvements

1. **Parallel Translation**: Translate multiple sections concurrently
2. **Caching**: Cache translations to reduce API calls for unchanged content
3. **Incremental Translation**: Only translate changed paragraphs within a section
4. **Quality Metrics**: Track translation quality over time
5. **Multi-Language**: Support multiple target languages in single workflow
6. **Custom Validators**: Pluggable validation for domain-specific requirements

### Not Planned

- **AST Parsing**: Keep line-by-line approach for simplicity
- **Fuzzy Matching**: Position-based matching is sufficient
- **Auto-Merge**: Human review remains important

---

## Related Documentation

- **[Architecture](ARCHITECTURE.md)** - System design overview
- **[Project Design](PROJECT-DESIGN.md)** - Design philosophy and decisions
- **[Heading Maps](HEADING-MAPS.md)** - Cross-language section matching
- **[Testing Guide](TESTING.md)** - Test suite details
- **[Quick Start](QUICKSTART.md)** - Getting started guide
- **[Status Report](STATUS-REPORT.md)** - Current project status

---

## Contributing

When modifying the implementation:

1. **Maintain simplicity** - Don't add unnecessary complexity
2. **Test thoroughly** - Add tests for new features
3. **Update docs** - Keep this guide in sync with code
4. **Preserve backward compatibility** - Don't break existing workflows

See [copilot-instructions.md](../.github/copilot-instructions.md) for detailed development guidelines.

---

**Last Updated**: November 6, 2025 (v0.5.1)
