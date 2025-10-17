# Heading Maps Guide

**Version:** 0.4.0  
**Feature:** Language-independent section matching using heading maps

## Overview

The **heading-map system** is a simple, robust solution for matching sections across language versions of documents. Instead of relying on fragile position-based matching, heading-maps store explicit English→Translation pairs in the document frontmatter.

## The Problem

When translating documents, we need to match sections between the English source and translated versions:

```markdown
# English                    # Chinese
## Introduction      →       ## 简介
## Economic Model    →       ## 经济模型
## Python Setup      →       ## Python 设置
```

**Without heading-maps**, we rely on:
1. **Position matching** - Fragile if sections are reordered
2. **ID matching** - Doesn't work across languages
3. **Content similarity** - Expensive and unreliable

**With heading-maps**, we have explicit mappings that survive reordering, renaming, and restructuring.

## How It Works

### 1. Initial Population (Bootstrap)

When the heading-map doesn't exist in the target document, it's **automatically created** using position-based matching:

**Before (Chinese document):**
```markdown
---
title: 动态规划
kernelspec:
  display_name: Python 3
---

简介内容

## 简介

内容...

## 经济模型

内容...
```

**After first translation action:**
```markdown
---
title: 动态规划
kernelspec:
  display_name: Python 3
heading-map:
  Introduction: 简介
  Economic Model: 经济模型
---

简介内容

## 简介

Updated content...

## 经济模型

内容...
```

The action:
1. Extracts heading-map (finds none, returns empty map)
2. Processes changes using position fallback
3. Updates map with new English→Chinese pairs (matched by position)
4. Injects updated map into frontmatter

### 2. Subsequent Runs (With Existing Map)

Once the heading-map exists, it's used for robust matching:

**Scenario: Section reordered in English**
```markdown
# English v2             # Chinese (with heading-map)
## Python Setup         ---
## Introduction         heading-map:
## Economic Model         Introduction: 简介
                          Economic Model: 经济模型
                          Python Setup: Python 设置
                        ---
                        ## 简介
                        ## 经济模型
                        ## Python 设置
```

The action uses the heading-map to find "Introduction" → "简介" **regardless of position**!

### 3. Automatic Updates

The heading-map is automatically maintained:

- **New sections added** → Added to map (by position on first occurrence)
- **Sections modified** → Map unchanged (mappings preserved)
- **Sections deleted** → Removed from map
- **Sections renamed** → Map updated with new translation

## Heading-Map Format

### In Frontmatter (YAML)

```yaml
---
title: Dynamic Programming
kernelspec:
  display_name: Python 3
heading-map:
  Introduction: 简介
  Economic Model: 经济模型
  Bellman Equation: 贝尔曼方程
  Python Setup: Python 设置
  Advanced Topics: 高级主题
---
```

### Structure

- **Key**: English heading text (without `##` markers)
- **Value**: Translated heading text (without `##` markers)
- **Flat structure**: All headings (both `##` and `###`) in one map
- **Location**: Always in YAML frontmatter

## Implementation Details

### Core Functions

#### `extractHeadingMap(content: string): Map<string, string>`

Extracts heading-map from frontmatter.

```typescript
const map = extractHeadingMap(content);
// Returns: Map { 'Introduction' => '简介', 'Overview' => '概述' }
```

**Returns:**
- Populated Map if heading-map exists in frontmatter
- Empty Map if no frontmatter or no heading-map

#### `updateHeadingMap(existing, source, target): Map<string, string>`

Updates heading-map with new translations.

```typescript
const updated = updateHeadingMap(
  existingMap,         // Current map (may be empty)
  englishSections,     // Sections from English PR
  chineseSections      // Current Chinese sections
);
```

**Logic:**
1. Preserves all existing mappings
2. Adds new sections (matches by position if not in map)
3. Removes deleted sections from map
4. Handles subsections recursively

#### `serializeHeadingMap(map: Map): string`

Converts Map to YAML format.

```typescript
const yaml = serializeHeadingMap(map);
// Returns: "heading-map:\n  Introduction: 简介\n  Overview: 概述"
```

#### `lookupTargetHeading(heading: string, map: Map): string | undefined`

Finds translation for a heading.

```typescript
const translated = lookupTargetHeading('## Introduction', map);
// Returns: '简介'
```

**Features:**
- Strips `##`, `###` markers automatically
- Handles whitespace variations
- Returns `undefined` if not found

#### `injectHeadingMap(content: string, map: Map): string`

Adds/updates heading-map in frontmatter.

```typescript
const updated = injectHeadingMap(content, map);
// Result has heading-map in frontmatter
```

**Behavior:**
- Creates frontmatter if none exists
- Adds heading-map if not present
- Replaces existing heading-map
- Removes heading-map if map is empty
- Preserves all other frontmatter

### Integration with File Processor

#### Finding Target Sections

```typescript
// In file-processor.ts processFile()

// 1. Extract heading map from target document
const headingMap = extractHeadingMap(targetContent);

// 2. Find target section using heading-map
const targetSectionIndex = this.findTargetSectionIndex(
  updatedSections,
  change.oldSection,
  headingMap  // Uses map for lookup, falls back to position
);
```

#### Matching Strategy

```typescript
// In file-processor.ts findTargetSectionIndex()

private findTargetSectionIndex(
  targetSections: Section[],
  sourceSection: Section | undefined,
  headingMap: HeadingMap
): number {
  if (!sourceSection) return -1;

  // Strategy 1: Use heading-map (PREFERRED)
  const targetHeading = lookupTargetHeading(sourceSection.heading, headingMap);
  if (targetHeading) {
    const index = targetSections.findIndex(
      s => s.heading.includes(targetHeading)
    );
    if (index !== -1) {
      return index;  // Found via heading-map!
    }
  }

  // Strategy 2: Fallback to position-based matching
  // (Used when heading-map doesn't have this section)
  return targetSections.findIndex(s => s.id === sourceSection.id);
}
```

#### Updating After Processing

```typescript
// In file-processor.ts processFile()

// 4. Update heading map with new/changed sections
const updatedHeadingMap = updateHeadingMap(
  headingMap,
  await (await this.parser.parseSections(newContent, filepath)).sections,
  updatedSections
);

// 5. Reconstruct document
const reconstructed = this.reconstructFromSections(...);

// 6. Inject updated heading map
return injectHeadingMap(reconstructed, updatedHeadingMap);
```

## Edge Cases

### 1. Section Renamed in English

**Scenario:**
```
English: "Overview" → "Introduction and Overview"
Chinese: "概述" (has map: Overview → 概述)
```

**Behavior:**
- Heading-map lookup fails (key changed)
- Falls back to position-based matching
- Updates map with new key: `Introduction and Overview: 概述`
- Next run will use updated map

### 2. Sections Reordered

**Scenario:**
```
English: [Intro, Setup, Model] → [Setup, Intro, Model]
Chinese: [简介, 设置, 模型] (original order)
```

**Behavior:**
- Heading-map finds sections regardless of position
- "Setup" in position 0 matches to "设置" wherever it is
- Document is correctly reordered

### 3. Subsections

**Scenario:**
```markdown
## Introduction
### Historical Background
### Modern Applications
```

**Behavior:**
- All headings (## and ###) are in the map
- Subsection mappings preserved independently
- Works recursively for deep nesting

### 4. Multiple Sections with Same Name

**Scenario:**
```markdown
## Introduction
## Methods
## Results
## Introduction  (again)
```

**Limitation:**
- Heading-map stores last occurrence only
- First match wins during lookup
- **Recommendation**: Use unique section headings

### 5. Empty Map After Deletions

**Scenario:**
All sections deleted, map becomes empty.

**Behavior:**
- `serializeHeadingMap()` returns empty string
- `injectHeadingMap()` removes heading-map from frontmatter
- Next run bootstraps fresh map if sections added

## Benefits

### ✅ Robust Matching
- Survives section reordering
- Works across language differences
- Independent of document structure changes

### ✅ Self-Maintaining
- Automatically populated on first run
- Auto-updates with each translation
- No manual configuration needed

### ✅ Human-Readable
- Stored in YAML frontmatter (visible to editors)
- Easy to inspect and debug
- Can be manually corrected if needed

### ✅ Simple Implementation
- ~200 lines of code
- No external dependencies (uses js-yaml)
- Minimal performance overhead

### ✅ Graceful Fallback
- Position-based matching when map unavailable
- Recovers from inconsistencies automatically
- Never fails completely

## Testing

Comprehensive test suite covering:

### Unit Tests (20 tests)
- `extractHeadingMap`: Parsing from frontmatter
- `updateHeadingMap`: Adding, preserving, removing mappings
- `serializeHeadingMap`: YAML output formatting
- `lookupTargetHeading`: Matching with various formats
- `injectHeadingMap`: Frontmatter manipulation

### Integration Tests (8 tests)
- Bootstrap workflow (no map → map created)
- Update workflow (existing map → map updated)
- Reordering scenarios
- Subsection handling
- Edge cases

Run tests:
```bash
npm test -- heading-map.test.ts
```

## Debugging

### View Current Heading-Map

Check the frontmatter in the translated document:

```bash
head -20 your-chinese-document.md
```

Look for:
```yaml
heading-map:
  Introduction: 简介
  Overview: 概述
```

### Enable Logging

The file processor logs heading-map operations:

```
Loaded heading map with 5 entries
...processing...
Updated heading map to 6 entries
```

### Manual Correction

If the heading-map has errors, you can manually edit the frontmatter:

```yaml
heading-map:
  Introduction: 简介      # Correct this
  Overview: 错误翻译       # Fix wrong translation
  New Section: 新章节     # Add missing entries
```

The action will use your corrected map and maintain it going forward.

## Migration from v0.3.0

### Automatic Migration

**No action needed!** When v0.4.0 runs on documents without heading-maps:

1. Extracts empty map
2. Processes changes using position fallback (same as v0.3.0)
3. Creates heading-map based on current document structure
4. Future runs use the map for robust matching

### For Existing Translations

First run after upgrade:
- Uses position-based matching (same behavior as v0.3.0)
- Creates initial heading-map in frontmatter
- Subsequent runs use the map

**No manual intervention required.**

## Performance

### Memory
- Map stored in memory during processing
- Typical size: 5-20 entries (~1KB)
- Negligible overhead

### Speed
- Map lookup: O(1)
- Map building: O(n) where n = section count
- Total overhead: <10ms per document

### Frontmatter Size
- Average: 10-30 lines YAML
- Typical increase: 300-600 bytes
- No impact on rendering performance

## Future Enhancements

Potential improvements (not planned for v0.4.0):

1. **Conflict resolution**: Handle duplicate section names better
2. **History tracking**: Track heading changes over time
3. **Multi-level maps**: Separate maps for sections vs subsections
4. **Validation**: Warn about missing or stale mappings
5. **Auto-correction**: Detect and fix obvious mapping errors

## Comparison to Alternatives

### vs. Position-Based Matching
- ✅ Survives reordering
- ✅ More maintainable
- ⚠️ Requires frontmatter storage

### vs. Content Hashing
- ✅ Much simpler
- ✅ Human-readable
- ✅ Manually editable
- ⚠️ Needs bootstrap phase

### vs. Full AST System
- ✅ 200 lines vs 1000+ lines
- ✅ No complex reconciliation
- ✅ Easier to debug
- ⚠️ Less sophisticated

## Summary

The heading-map system provides **robust, language-independent section matching** with:

- **Automatic population** - No setup required
- **Self-maintenance** - Updates on every run  
- **Human-readable** - Stored in visible frontmatter
- **Simple design** - ~200 lines, easy to understand
- **Graceful fallback** - Never breaks completely

Perfect for maintaining translated lecture notes across language versions! 🎯

---

**Next:** [Live Testing Guide](TEST-REPOSITORIES.md)  
**See also:** [Implementation Details](IMPLEMENTATION.md)
