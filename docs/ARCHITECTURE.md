# Architecture

## Overview

This action uses a **section-based approach** to translate MyST Markdown documents.

**Core Principle**: Documents are structured into sections (## headings). Translations operate at the section level, not on individual blocks.

## Why Section-Based?

### Problems with Block-Based Approach
- **Language mismatch**: Can't match paragraphs across English/Chinese
- **Lost context**: Translating isolated blocks loses meaning
- **Complex logic**: Block matching and insertion was error-prone
- **Fragile**: Broke when structure differed

### Section-Based Solutions
- **Position matching**: 1st section → 1st section (language-independent)
- **Full context**: Claude sees entire sections
- **Simple logic**: Add, update, or delete sections
- **Robust**: Works with structural differences

## Architecture Flow

```
PR Merged (English)
       ↓
index.ts: Detect changed files
       ↓
file-processor.ts: Orchestrate
       ↓
   ┌──────────────┬──────────────┐
   │              │              │
Existing File  New File      
       ↓              ↓
diff-detector  translator
   ↓              (full doc)
detectSectionChanges
   ↓
translator.ts
   ├─ UPDATE: old EN + new EN + current CN → updated CN
   └─ NEW: EN section → CN section
       ↓
Reconstruct document
       ↓
Create PR (Chinese)
```

## Components

### 1. Parser (parser.ts)
- Stack-based recursive section parser
- Handles all heading levels (##-######)
- Preserves exact content with subsections
- **282 lines**

### 2. Diff Detector (diff-detector.ts)
- Position-based matching with recursive comparison
- Detects: added, modified, deleted sections
- **195 lines**

### 3. Translator (translator.ts)
- Two modes: UPDATE and NEW
- Uses Claude Sonnet 4.5 with language-specific rules
- **273 lines**

### 4. File Processor (file-processor.ts)
- Orchestrates translation workflow
- Complex section operations with heading-map integration
- **739 lines**

### 5. Heading-Map (heading-map.ts)
- Language-independent section matching
- Recursive subsection support
- **246 lines**

### 6. Language Config (language-config.ts)
- Language-specific translation rules
- Extensible for multiple languages
- Input validation (language codes)
- **102 lines**

### 7. Index (index.ts)
- GitHub Actions entry point
- PR and file processing
- **543 lines**

## Data Structures

### Section
```typescript
{
  heading: "## Economic Models",
  level: 2,
  id: "economic-models",
  content: "## Economic Models\n\n...",
  startLine: 45,
  endLine: 78,
  subsections: [...]  // Nested sections (### headings)
}
```

**Subsection Support** (v0.4.3+):
- Sections can contain subsections (level 3, 4, etc.)
- Subsections are parsed from translated content
- Subsections included in heading-map for incremental updates
- See [HEADING-MAPS.md](HEADING-MAPS.md) for details

### SectionChange
```typescript
{
  type: 'added' | 'modified' | 'deleted',
  oldSection?: Section,
  newSection?: Section,
  position?: { index, afterSectionId }
}
```

## Example Flow

**Scenario**: Add "## Economic Models" to English lecture

1. **Diff Detection**
   - Parse old: 5 sections
   - Parse new: 6 sections
   - Detect: ADDED at position 2

2. **Translation** (NEW mode)
   - Input: English section
   - Output: "## 经济模型\n\n..."

3. **Reconstruction**
   - Parse Chinese: 5 sections
   - Insert at position 2
   - Reconstruct: 6 sections

4. **PR Creation**
   - Validate MyST
   - Create branch
   - Commit + open PR

## Key Benefits

- **43% less code** (976 vs 1586 lines)
- **28% smaller bundle** (1794kB vs 2492kB)
- **Simpler logic** - easy to understand
- **Better translations** - full context
- **More reliable** - position matching works

## Related Docs

- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Code details
- [PROJECT-DESIGN.md](PROJECT-DESIGN.md) - Design decisions
- [QUICKSTART.md](QUICKSTART.md) - Developer guide
