# Bug Analysis: v0.4.0 Live Testing Results

**Date:** October 17, 2025  
**Test:** Comprehensive v0.4.0 test with PR #14  
**Action Run:** https://github.com/QuantEcon/test-translation-sync/actions  
**Chinese PR:** https://github.com/QuantEcon/test-translation-sync.zh-cn/pull/14

## Executive Summary

Live testing of v0.4.0 revealed **5 critical bugs** in the section-based translation system. While the heading-map system is partially working (created 12 entries in frontmatter), the position-based fallback mechanism is fundamentally broken, causing:

- Missing sections (2 new sections not translated)
- Duplicate content (old + new versions of same sections)
- Incorrect section ordering
- Incomplete heading-map (missing subsections)
- Position calculation errors when target has fewer sections than source

## Test Setup

### English Source Document (PR #14)
- **Changes:** 4 new sections, 7 modified sections, 1 preamble change
- **Total sections:** 11 (up from 6)
- **Subsections:** 16+ across all sections
- **Size:** ~250 lines

### Expected Chinese Output
- **Sections:** 11 (matching English)
- **Heading-map:** 16+ entries (all sections + subsections)
- **Order:** Match English structure
- **Content:** No duplicates, all sections present

## Bugs Discovered

### Bug #8: Missing Sections (CRITICAL)

**Severity:** CRITICAL  
**Impact:** Data loss - entire sections not translated

**Symptoms:**
1. "Overview" section (new, position 0) - **MISSING**
2. "Market Equilibrium" section (new, position 2) - **MISSING**

**Log Evidence:**
```
[FileProcessor] Processing ADDED section: ## Overview
[Translator] Translating new section, mode=new
[Translator] en section length: 484
[Translator] Translated section length: 155
[FileProcessor] Inserted new section at position 0

[FileProcessor] Processing ADDED section: ## Market Equilibrium
[Translator] Translating new section, mode=new
[Translator] en section length: 466
[Translator] Translated section length: 153
[FileProcessor] Inserted new section at position 2
```

**Analysis:**
- Translation happened (155 and 153 characters generated)
- Insertion claimed success
- But sections not in final output
- **Root cause:** Position-based insertion likely overwritten by subsequent operations

---

### Bug #9: Duplicate Content (MAJOR)

**Severity:** MAJOR  
**Impact:** Confusing output with old + new content mixed

**Symptoms:**

1. **"Basic Concepts" section has TWO "Key Terms" subsections:**
   - First occurrence (lines 28-36): New translation with 4 terms including "均衡"
   - Second occurrence (lines 59-63): Old translation with 3 terms, no "均衡"

2. **"References" section appears TWICE:**
   - First occurrence (line 125): Old 3 references
   - Second occurrence (lines 161-166): New 5 references

3. **"Summary" section appears TWICE:**
   - First occurrence (lines 116-120): New comprehensive summary (5 points)
   - Second occurrence (lines 150-152): Old short summary (3 points)

**Log Evidence:**
```
[FileProcessor] Processing MODIFIED section: ## Basic Concepts
[FileProcessor] Using position-based fallback: 0
[Translator] Old en length: 259
[Translator] New en length: 530
[Translator] Current zh-cn length: 155
```

**Analysis:**
- Modified sections supposed to replace existing content
- Instead, new content appended or inserted wrong position
- Old content retained in different position
- **Root cause:** Position-based update not replacing correctly

---

### Bug #10: Incomplete Heading-Map (MAJOR)

**Severity:** MAJOR  
**Impact:** Subsections not tracked, future updates will fail

**Current Heading-Map (12 entries):**
```yaml
heading-map:
  Overview: 概述
  Basic Concepts: 基本概念
  Key Terms: 关键术语
  Market Equilibrium: 市场均衡
  Mathematical Example: 数学示例
  Code Example: 代码示例
  MyST Directives: MyST 指令
  Empirical Applications: 实证应用
  Summary: 总结
  Exercises: 练习
  References: 参考文献
  Further Reading: 延伸阅读
```

**Missing Subsections:**
1. Core Principles (subsection of Overview)
2. Equilibrium (subsection of Basic Concepts)
3. Equilibrium Conditions (subsection of Market Equilibrium)
4. Comparative Statics (subsection of Market Equilibrium)
5. Returns to Scale (subsection of Mathematical Example)
6. Data Analysis (subsection of Empirical Applications)
7. Computational Methods (subsection of Empirical Applications)
8. Problem 1, 2, 3 (subsections of Exercises)

**Expected:** ~20 entries (all sections + subsections with headings)  
**Actual:** 12 entries (only top-level sections)

**Analysis:**
- Heading-map extraction only captures top-level sections
- Subsections (###) not being added to map
- **Root cause:** `extractHeadingMap()` or `updateHeadingMap()` not processing subsections

---

### Bug #11: Section Ordering Incorrect (MAJOR)

**Severity:** MAJOR  
**Impact:** Document structure doesn't match source

**Expected Order:**
1. Preamble
2. Overview ← MISSING
3. Basic Concepts
4. Market Equilibrium ← MISSING
5. Mathematical Example
6. Code Example
7. MyST Directives
8. Empirical Applications
9. Summary
10. Exercises
11. References
12. Further Reading

**Actual Order:**
1. Preamble ✓
2. Basic Concepts (with duplicate Key Terms)
3. Mathematical Example (with Returns to Scale)
4. **Key Terms (duplicate - old version)**
5. Code Example ✓
6. MyST Directives ✓
7. **Summary (new version) - WRONG POSITION**
8. **References (old version) - WRONG POSITION**
9. Empirical Applications ✓
10. **Summary (old version) - WRONG POSITION**
11. Exercises ✓
12. **References (new version) - CORRECT POSITION**
13. Further Reading ✓

**Analysis:**
- New sections inserted at wrong positions
- Modified sections updated at wrong positions
- Old content not removed when updating
- **Root cause:** Position calculation broken when target document shorter than source

---

### Bug #12: Position-Based Fallback Failures (CRITICAL)

**Severity:** CRITICAL  
**Impact:** Core mechanism for section matching is broken

**Log Evidence - Every MODIFIED section uses fallback:**
```
[FileProcessor] Processing MODIFIED section: ## Basic Concepts
[FileProcessor] Using position-based fallback: 0

[FileProcessor] Processing MODIFIED section: ## Mathematical Example
[FileProcessor] Using position-based fallback: 1

[FileProcessor] Processing MODIFIED section: ## Code Example
[FileProcessor] Using position-based fallback: 2

[FileProcessor] Processing MODIFIED section: ## MyST Directives
[FileProcessor] Using position-based fallback: 3

[FileProcessor] Processing MODIFIED section: ## Summary
[FileProcessor] Using position-based fallback: 4

[FileProcessor] Processing MODIFIED section: ## References
[FileProcessor] Using position-based fallback: 5
```

**Problem Analysis:**

1. **Initial State:**
   - Source: 11 sections
   - Target: 6 sections
   - Position 0-5 valid in target

2. **After inserting "Overview" at position 0:**
   - Target now has 7 sections
   - Old position 0 (Basic Concepts) now at position 1
   - But code still uses position 0

3. **After inserting "Market Equilibrium" at position 2:**
   - Target now has 8 sections
   - Positions shifted again
   - But code still uses old positions

**Root Cause:**
Position-based fallback uses **source document positions** (0-5) to index into **target document**, but doesn't account for:
- Target having fewer sections initially
- Previously inserted sections shifting positions
- Need to track cumulative position shifts

**Code Location:** `src/file-processor.ts` - `findTargetSectionIndex()` method

---

## Root Cause Analysis

All bugs trace to **position-based fallback mechanism**:

```typescript
// Current broken logic (simplified):
private findTargetSectionIndex(
  change: SectionChange,
  targetSections: Section[]
): number {
  // Try heading-map lookup
  const headingMap = extractHeadingMap(this.targetFrontmatter);
  const targetHeading = lookupTargetHeading(change.newSection.heading, headingMap);
  
  if (targetHeading) {
    const index = targetSections.findIndex(s => s.heading === targetHeading);
    if (index !== -1) return index;
  }
  
  // FALLBACK: Use source position directly
  // BUG: Doesn't account for:
  // - Target having fewer sections
  // - Previously inserted sections
  // - Position shifts
  const position = change.oldSection?.index ?? change.position;
  core.info(`Using position-based fallback: ${position}`);
  return position;
}
```

**Why This Fails:**

1. **For MODIFIED sections:** Uses old source position, but target may have different structure
2. **For ADDED sections:** Inserts at position, but subsequent operations use stale positions
3. **No position tracking:** Doesn't maintain map of source → target positions after insertions

## Impact Summary

| Bug | Severity | Impact | Affects |
|-----|----------|--------|---------|
| #8 | CRITICAL | Data loss - sections missing | New sections |
| #9 | MAJOR | Duplicate content | Modified sections |
| #10 | MAJOR | Missing subsections in map | Future updates |
| #11 | MAJOR | Wrong document structure | All sections |
| #12 | CRITICAL | Core mechanism broken | Position-based matching |

**Overall Status:** v0.4.0 is **NOT PRODUCTION READY**

## Recommended Fixes

### Priority 1: Fix Position-Based Fallback (Bug #12)

**Strategy:** Track position shifts during document reconstruction

```typescript
interface PositionMap {
  sourceIndex: number;
  currentTargetIndex: number;
}

class FileProcessor {
  private positionMap: PositionMap[] = [];
  
  // Update map after each insertion
  private recordInsertion(sourcePos: number, targetPos: number) {
    this.positionMap.push({ sourceIndex: sourcePos, currentTargetIndex: targetPos });
    
    // Shift all subsequent positions
    for (let i = 0; i < this.positionMap.length - 1; i++) {
      if (this.positionMap[i].currentTargetIndex >= targetPos) {
        this.positionMap[i].currentTargetIndex++;
      }
    }
  }
  
  // Look up current target position for source section
  private getTargetPosition(sourceIndex: number): number {
    const entry = this.positionMap.find(m => m.sourceIndex === sourceIndex);
    return entry?.currentTargetIndex ?? sourceIndex;
  }
}
```

### Priority 2: Fix Heading-Map Subsections (Bug #10)

**Strategy:** Extract and track all heading levels (## and ###)

```typescript
export function extractHeadingMap(frontmatter: Record<string, any>): Map<string, string> {
  const map = new Map<string, string>();
  const headingMap = frontmatter['heading-map'];
  
  if (!headingMap || typeof headingMap !== 'object') {
    return map;
  }
  
  // Extract ALL headings (sections and subsections)
  for (const [source, target] of Object.entries(headingMap)) {
    if (typeof target === 'string') {
      map.set(source, target);
    }
  }
  
  return map;
}

// When updating map, include subsections
export function updateHeadingMap(
  map: Map<string, string>,
  section: Section
): void {
  // Add section
  const sourceHeading = section.heading.replace(/^#+\s*/, '');
  const targetHeading = section.content.match(/^#+\s*(.+)$/m)?.[1];
  
  if (sourceHeading && targetHeading) {
    map.set(sourceHeading, targetHeading);
  }
  
  // Add subsections
  for (const subsection of section.subsections) {
    const subSourceHeading = subsection.heading.replace(/^#+\s*/, '');
    const subTargetHeading = subsection.content.match(/^#+\s*(.+)$/m)?.[1];
    
    if (subSourceHeading && subTargetHeading) {
      map.set(subSourceHeading, subTargetHeading);
    }
  }
}
```

### Priority 3: Fix Section Reconstruction (Bugs #8, #9, #11)

**Strategy:** Build new document array instead of modifying in place

```typescript
async processChanges(
  changes: SectionChange[],
  targetSections: Section[],
  targetFrontmatter: Record<string, any>
): Promise<ReconstructedDocument> {
  // Build new sections array
  const newSections: Section[] = [];
  let targetIndex = 0;
  
  for (const change of changes) {
    if (change.type === 'ADDED') {
      // Translate and insert new section
      const translated = await this.translateNewSection(change.newSection);
      newSections.splice(change.position, 0, translated);
      
    } else if (change.type === 'MODIFIED') {
      // Find target section via heading-map
      const targetIdx = this.findTargetSectionIndex(change, targetSections);
      const oldTarget = targetSections[targetIdx];
      
      // Translate update
      const translated = await this.translateUpdate(
        change.oldSection!,
        change.newSection,
        oldTarget
      );
      
      // Replace in new array
      newSections[targetIdx] = translated;
    }
  }
  
  return {
    sections: newSections,
    frontmatter: this.updateHeadingMapFrontmatter(targetFrontmatter, newSections)
  };
}
```

## Testing Requirements

Before v0.4.1 release:

1. **Unit tests for position tracking:**
   - Insert at beginning, middle, end
   - Multiple insertions
   - Track position shifts correctly

2. **Unit tests for heading-map subsections:**
   - Extract subsections from sections
   - Update map with subsections
   - Match subsections in target

3. **Integration test with comprehensive document:**
   - Same as current test (4 new, 7 modified)
   - Verify all sections present
   - Verify no duplicates
   - Verify correct order
   - Verify complete heading-map

4. **Regression tests:**
   - Simple 1-section addition
   - Simple 1-section modification
   - Preamble-only change

## Next Steps

1. ✅ Document bugs (this file)
2. Create unit tests that expose bugs
3. Implement Priority 1 fix (position tracking)
4. Implement Priority 2 fix (subsection heading-map)
5. Implement Priority 3 fix (reconstruction logic)
6. Verify all tests pass
7. Run comprehensive live test again
8. Release v0.4.1 if successful

## Timeline Estimate

- **Bug fixes:** 4-6 hours
- **Testing:** 2-3 hours
- **Live validation:** 1 hour
- **Total:** 1 day of focused work

---

**Status:** Bugs documented, ready to begin fixes  
**Next Action:** Create failing unit tests for Bug #12
