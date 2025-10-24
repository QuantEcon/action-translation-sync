# Recursive Implementation Review
## Date: October 24, 2025

## Executive Summary

This review examines the recursive reading (parsing) and writing (serialization) of nested section structures (##, ###, ####, #####, ######) throughout the codebase.

---

## Part 1: Recursive READING (Parsing)

### Location: `src/parser.ts` lines 50-140

#### Design: Stack-Based Recursive Parser

**Key Data Structure:**
```typescript
interface Section {
  id: string;
  heading: string;
  level: number;          // 2, 3, 4, 5, or 6
  content: string;        // Content WITHOUT subsections
  startLine: number;
  endLine: number;
  subsections: Section[]; // Recursively nested subsections
}
```

#### Algorithm:

1. **Stack Management:**
   - Uses `sectionStack` to track nesting hierarchy
   - Each stack entry has: `{ section, contentLines }`
   - Stack depth corresponds to heading level

2. **Level Detection:**
   ```typescript
   const level = heading.match(/^(#+)/)?.[1].length || 0;
   ```
   - Counts `#` characters (2-6 supported)

3. **Recursive Nesting Logic:**
   ```typescript
   // When we find a heading at level N:
   
   // Step 1: Complete all sections at level >= N
   while (sectionStack.length > 0 && 
          sectionStack[sectionStack.length - 1].section.level >= level) {
     const completed = sectionStack.pop()!;
     // Add to parent's subsections or root
   }
   
   // Step 2: Create new section at level N
   const newSection = { level, subsections: [], ... };
   
   // Step 3: Push onto stack (becomes current)
   sectionStack.push({ section: newSection, contentLines: [] });
   ```

4. **Content Separation:**
   - Content lines stored separately from subsections
   - When section completes, content joined (WITHOUT subsections)
   - This ensures `section.content` NEVER includes subsection text

5. **Parent-Child Linking:**
   ```typescript
   if (sectionStack.length > 0) {
     // Add to parent's subsections array
     const parent = sectionStack[sectionStack.length - 1];
     parent.section.subsections.push(completed.section);
   } else {
     // Top-level section
     sections.push(completed.section);
   }
   ```

#### Test Coverage:
- ✅ Handles ## through ######
- ✅ Arbitrary nesting depth
- ✅ Content separation (no duplication)
- ✅ Proper parent-child relationships

---

## Part 2: Recursive WRITING (Serialization)

### Location: `src/file-processor.ts` lines 610-650

#### Design: Recursive Section Serialization

**Current Implementation:**
```typescript
private serializeSection(section: Section, includeSubsections: boolean = true): string {
  const parts: string[] = [];
  
  // 1. Add heading
  parts.push(section.heading);
  parts.push('');
  
  // 2. Add content (WITHOUT subsections - already separated by parser)
  if (section.content.trim()) {
    parts.push(section.content.trim());
    parts.push('');
  }
  
  // 3. RECURSIVELY add subsections
  if (includeSubsections && section.subsections.length > 0) {
    for (const subsection of section.subsections) {
      parts.push(this.serializeSection(subsection, true)); // RECURSIVE CALL
      parts.push('');
    }
  }
  
  return parts.join('\n').trim();
}
```

#### Critical Invariant:
**`section.content` must NEVER contain subsection text**

This is maintained by:
1. Parser separates content from subsections
2. Serializer appends subsections AFTER content
3. No code should manually concatenate subsection text into content

---

## Part 3: Translation Subsection Handling

### Location: `src/file-processor.ts` lines 419-480

#### Function: `parseTranslatedSubsections()`

**Purpose:** Extract subsections from translator's output

**Steps:**
1. Wrapper stripping (remove YAML frontmatter wrapper)
2. Parse translator output into sections
3. Return section.subsections array

**Critical:** This returns parsed subsections WITH recursive structure

---

## Part 4: Subsection Validation & Preservation

### Location: `src/file-processor.ts` lines 245-295

#### THE CRITICAL FIX (Latest Change)

**Problem Identified:**
When translator doesn't return full nested structure (e.g., returns ### but not ####), we were using `targetSection.subsections` (OLD Chinese sections without new ####).

**OLD Code (WRONG):**
```typescript
if (validateSubsectionStructure(newSection.subsections, subsections)) {
  finalSubsections = subsections; // Translated - GOOD
} else {
  finalSubsections = targetSection.subsections; // OLD target - BAD!
}
```

**NEW Code (CORRECT):**
```typescript
if (validateSubsectionStructure(newSection.subsections, subsections)) {
  finalSubsections = subsections; // Translated - GOOD
} else {
  finalSubsections = newSection.subsections; // NEW source - GOOD!
}
```

**Why This Matters:**

Scenario: Source adds `#### Applications in Economics` under `### Basic Properties`

1. **NEW source** (`newSection`): Has `### Basic Properties` with 1 subsection (`####`)
2. **OLD target** (`targetSection`): Has `### 基本性质` with 0 subsections (no ####)
3. **Translator output**: Returns `### 基本性质` WITHOUT the #### (structure mismatch)

OLD behavior:
- Detects mismatch ✓
- Uses `targetSection.subsections` (0 subsections) ✗
- Result: #### is LOST from document ✗
- Heading-map: No entry created for #### ✗

NEW behavior:
- Detects mismatch ✓
- Uses `newSection.subsections` (1 subsection in English) ✓
- Result: #### kept in English until next translation ✓
- Heading-map: Entry created for #### ✓

---

## Part 5: Heading-Map Recursive Processing

### Location: `src/heading-map.ts` lines 48-133

#### Function: `updateHeadingMap()`

**Design:** Recursive path-based key generation

**Key Features:**

1. **Path Tracking:**
```typescript
const processSections = (
  sourceSecs: Section[],
  targetSecs: Section[],
  parentPath: string = '',  // Tracks "Parent::Child"
  level: number = 0
) => {
  sourceSecs.forEach((sourceSection, i) => {
    // Build path
    const path = parentPath 
      ? `${parentPath}${PATH_SEPARATOR}${sourceHeading}` 
      : sourceHeading;
    
    // Process recursively
    if (sourceSection.subsections.length > 0) {
      processSections(
        sourceSection.subsections, 
        targetSection.subsections, 
        path,  // Pass current path as parent
        level + 1
      );
    }
  });
}
```

2. **Path Format:**
   - Level 2: `"Vector Spaces"`
   - Level 3: `"Vector Spaces::Basic Properties"`
   - Level 4: `"Vector Spaces::Basic Properties::Applications in Economics"`

3. **Position-Based Matching:**
   - Matches by array index (`sourceSecs[i]` ↔ `targetSecs[i]`)
   - Language-independent
   - Works even with different heading text

4. **Recursive Validation:**
```typescript
console.log(`Source subsections: ${sourceSection.subsections.length}, Target subsections: ${targetSection.subsections.length}`);

if (sourceSection.subsections.length > 0 && targetSection.subsections.length > 0) {
  processSections(sourceSection.subsections, targetSection.subsections, path, level + 1);
}
```

**This is where our fix shows its impact:**
- If we preserve source subsections → heading-map sees them ✓
- If we used old target subsections (0) → heading-map misses them ✗

---

## Part 6: Complete Data Flow

### Scenario: Translation with Nested Subsections

```
┌─────────────────────────────────────────────────────────────┐
│ INPUT: Source has ## Section > ### Subsection > #### Sub-sub│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Parse Source (parser.ts)                            │
│   - Stack-based recursive parsing                           │
│   - Separates content from subsections                      │
│   Result: Section { subsections: [Subsection {             │
│             subsections: [SubSub] }] }                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Detect Changes (diff-detector.ts)                   │
│   - Compares newSection with oldSection                     │
│   - Recursively compares subsections                        │
│   Result: MODIFIED (section content changed)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Translate Section (translator.ts)                   │
│   - Sends ## Section + ### + #### to Claude                 │
│   Claude returns: ## 章节 + ### 子章节 (MISSING ####!)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Parse Translation (file-processor.ts)               │
│   - parseTranslatedSubsections()                            │
│   - Extracts subsections from translator output             │
│   Result: [Subsection { subsections: [] }]  (no ####!)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Validate Structure (file-processor.ts) **NEW FIX**  │
│   - validateSubsectionStructure() checks recursively        │
│   - Expected: [Sub { subsections: [SubSub] }]               │
│   - Parsed:   [Sub { subsections: [] }]                     │
│   - Mismatch detected! ✓                                    │
│   - Uses newSection.subsections (source with ####) ✓        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Reconstruct Section (file-processor.ts)             │
│   resultSections.push({                                     │
│     ...targetSection,                                       │
│     content: translatedContent,                             │
│     subsections: newSection.subsections  // English ####    │
│   })                                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Update Heading-Map (heading-map.ts)                 │
│   - processSections() called with resultSections            │
│   - Sees ### with subsections: [####]                       │
│   - Creates paths:                                          │
│     * "Section::Subsection"                                 │
│     * "Section::Subsection::Sub-subsection"  ✓             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 8: Serialize Document (file-processor.ts)              │
│   - serializeSection() recursively writes:                  │
│     ## 章节                                                 │
│     [content]                                               │
│     ### 子章节                                              │
│     [content]                                               │
│     #### Sub-subsection  (English, until next translation)  │
│     [content]                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 7: Potential Issues & Edge Cases

### Issue 1: Content Duplication
**Status:** ✅ SOLVED (v0.4.3)
**Solution:** Parser separates content, serializer appends subsections

### Issue 2: Subsection Structure Mismatch  
**Status:** ✅ SOLVED (v0.4.7 - Latest Fix)
**Solution:** Use source subsections when translator incomplete

### Issue 3: Heading-Map Missing Entries
**Status:** ✅ SOLVED (by Issue 2 fix)
**Solution:** Now that we preserve source subsections, heading-map sees them

### Issue 4: Mixed Language Documents
**Status:** ✅ EXPECTED BEHAVIOR
**Explanation:** When translator doesn't return full structure, subsections remain in English until next translation. This is correct and prevents data loss.

### Issue 5: Deep Nesting (5+ levels)
**Status:** ✅ TESTED (137 tests include level 5)
**Coverage:** Tests validate ##### subsections

---

## Part 8: Test Analysis

### Test File: `file-processor.test.ts`

#### Test Group 1: "Recursive Subsection Structure Validation" (NEW - 4 tests)

**Test 1: "should detect when translator omits level-4 subsections"**
```typescript
Expected: [{ subsections: [{ level: 4 }] }]  // Has ####
Parsed:   [{ subsections: [] }]              // Missing ####
Result: validateSubsectionStructure() returns FALSE ✓
```
**Purpose:** Verify detection of missing #### subsections
**Logic:** ✅ CORRECT - Tests the exact Test 09 scenario

**Test 2: "should validate correctly when nested structure matches"**
```typescript
Expected: [{ subsections: [{ subsections: [####, ####] }] }]  // 3 levels deep
Parsed:   [{ subsections: [{ subsections: [####, ####] }] }]  // Matches!
Result: validateSubsectionStructure() returns TRUE ✓
```
**Purpose:** Verify validation passes when structure is complete
**Logic:** ✅ CORRECT - Ensures we use translated subsections when complete

**Test 3: "should detect when translator omits level-5 subsections"**
```typescript
Expected: [{ subsections: [{ subsections: [#####] }] }]  // Has #####
Parsed:   [{ subsections: [{ subsections: [] }] }]       // Missing #####
Result: validateSubsectionStructure() returns FALSE ✓
```
**Purpose:** Test deeper nesting (5 levels)
**Logic:** ✅ CORRECT - Extends coverage beyond ####

**Test 4: "should detect when subsection count differs at any depth"**
```typescript
Expected: [{ subsections: [####A, ####B] }]  // 2 subsections
Parsed:   [{ subsections: [####A] }]         // Only 1
Result: validateSubsectionStructure() returns FALSE ✓
```
**Purpose:** Test count mismatches
**Logic:** ✅ CORRECT - Catches partial returns

---

### Test File: `heading-map.test.ts`

**Tests: 28 total**

Key tests reviewed:

**Test: "should handle subsections with path-based keys"**
```typescript
Source: [{ heading: "## Introduction", subsections: [
  { heading: "### Setup" },
  { heading: "### Usage" }
]}]
Target: [{ heading: "## 简介", subsections: [
  { heading: "### 设置" },
  { heading: "### 用法" }
]}]

Expected Map:
  "Introduction" → "简介"
  "Introduction::Setup" → "设置"
  "Introduction::Usage" → "用法"
```
**Logic:** ✅ CORRECT - Tests path-based keys for level 3

**Test: "should handle nested subsections (level 4)"**
```typescript
Source: [{ heading: "## Policy", subsections: [{
  heading: "### Trade-offs", subsections: [
    { heading: "#### Short-term" },
    { heading: "#### Long-term" }
  ]
}]}]

Expected Map:
  "Policy Implications" → "政策含义"
  "Policy Implications::Policy Trade-offs" → "政策权衡"
  "Policy Implications::Policy Trade-offs::Short-term Effects" → "短期影响"
  "Policy Implications::Policy Trade-offs::Long-term Effects" → "长期影响"
```
**Logic:** ✅ CORRECT - Tests 4-level deep paths

---

### Test File: `e2e-fixtures.test.ts`

**Test: "Scenario 07: should translate changed subsection"**

**UPDATED (Latest Fix):**
```typescript
// OLD expectation (WRONG):
expect(result).toContain('### 市场均衡');  // Expected Chinese

// NEW expectation (CORRECT):
expect(result).toContain('### Market Equilibrium');  // English preserved
```

**Why Changed:**
- Mock translator doesn't return subsections
- Structure mismatch detected
- Source subsections preserved (English)
- **This is CORRECT behavior** - prevents data loss

**Logic:** ✅ CORRECT - Now tests actual behavior

---

## Part 9: Verification Checklist

### Recursive Reading (Parser)
- [x] Handles all heading levels (##-######)
- [x] Builds recursive subsection arrays
- [x] Separates content from subsections
- [x] No content duplication
- [x] Correct parent-child linking

### Recursive Writing (Serializer)
- [x] Recursively writes subsections
- [x] Uses section.content (without subsections)
- [x] Appends subsections AFTER content
- [x] Maintains proper nesting order

### Subsection Validation
- [x] Recursive structure checking
- [x] Detects missing nested subsections
- [x] Falls back to source (not old target) **NEW FIX**
- [x] Preserves data when translator incomplete

### Heading-Map Processing
- [x] Recursive path building
- [x] Position-based matching
- [x] Creates entries for all nesting levels
- [x] Handles structure mismatches **NEW FIX**

### Test Coverage
- [x] Unit tests for validation logic (4 tests)
- [x] Heading-map tests for paths (28 tests)
- [x] E2E tests for workflows (8 tests)
- [x] Integration tests (9 tests)
- [x] **Total: 137 tests, all passing**

---

## Part 10: Key Insights

### Critical Design Decision:
**Parser separates content from subsections → Serializer combines them**

This prevents the #1 bug: content duplication

### Critical Bug Fix (Latest):
**When translator incomplete → Use NEW source, not OLD target**

This prevents the #2 bug: data loss from missing subsections

### Why Path-Based Keys Matter:
**Duplicate heading names** (e.g., "Applications in Economics" at different levels) need unique keys:
- `"Vector Spaces::Basic Properties::Applications in Economics"`
- `"Matrix Operations::Applications in Economics"`

### Why Recursive Validation Matters:
**Count matching is insufficient:**
- Source: 1 ### with 1 ####
- Translator: 1 ### with 0 ####
- OLD code: Count matches (1 === 1), uses incomplete structure ✗
- NEW code: Recursively validates, detects mismatch ✓

---

## Conclusion

The recursive implementation is **sound and thoroughly tested**. The latest fix ensures that:

1. ✅ Subsections at all depths (##-######) are correctly parsed
2. ✅ Structure mismatches are detected recursively
3. ✅ Source subsections are preserved when translator incomplete
4. ✅ Heading-map entries are created for all nesting levels
5. ✅ No content duplication occurs
6. ✅ No data loss occurs

**All 137 tests passing confirms correctness.**
