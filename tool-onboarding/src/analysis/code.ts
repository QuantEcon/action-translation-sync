/**
 * Deterministic code block analysis
 * Compares code blocks between source and target without AI
 */

import { CodeBlock, BlockMapping, CodeAnalysisResult } from '../types';
import { isI18nBlock, isI18nOnlyChange } from '../extraction';

// =============================================================================
// CODE BLOCK COMPARISON
// =============================================================================

/**
 * Compare code blocks between source and target using divergence mapping
 * Maps ALL blocks to understand structural differences
 */
export function compareCodeBlocks(
  sourceBlocks: CodeBlock[], 
  targetBlocks: CodeBlock[]
): CodeAnalysisResult {
  const mappings: BlockMapping[] = [];
  let aligned = 0;
  let modified = 0;
  let inserted = 0;
  let insertedI18n = 0;
  let missing = 0;
  
  let srcIdx = 0;
  let tgtIdx = 0;
  
  // Iterate through ALL blocks in both documents
  while (srcIdx < sourceBlocks.length || tgtIdx < targetBlocks.length) {
    const source = sourceBlocks[srcIdx];
    const target = targetBlocks[tgtIdx];
    
    if (!source) {
      // Source exhausted - remaining target blocks are INSERTED
      if (isI18nBlock(target)) {
        insertedI18n++;
        mappings.push({
          srcIdx: null,
          tgtIdx,
          status: 'inserted-i18n',
          sourceLines: 0,
          targetLines: target.content.split('\n').length,
          language: target.language,
          notes: ['i18n setup block'],
        });
      } else {
        inserted++;
        mappings.push({
          srcIdx: null,
          tgtIdx,
          status: 'inserted',
          sourceLines: 0,
          targetLines: target.content.split('\n').length,
          language: target.language,
          notes: ['Extra block in target'],
        });
      }
      tgtIdx++;
    } else if (!target) {
      // Target exhausted - remaining source blocks are MISSING
      missing++;
      mappings.push({
        srcIdx,
        tgtIdx: null,
        status: 'missing',
        sourceLines: source.content.split('\n').length,
        targetLines: 0,
        language: source.language,
        notes: ['Missing from target'],
      });
      srcIdx++;
    } else {
      // Both exist - check if they align
      const srcNorm = source.contentNormalized;
      const tgtNorm = target.contentNormalized;
      
      // Check for exact or normalized match
      if (source.content === target.content || srcNorm === tgtNorm) {
        aligned++;
        const notes: string[] = [];
        if (source.content !== target.content) {
          notes.push('Comments/strings translated');
        }
        // Also check for i18n additions that don't change logic
        const i18nCheck = isI18nOnlyChange(source.content, target.content);
        if (i18nCheck.isI18nOnly) {
          notes.push(`i18n: ${i18nCheck.patterns.join(', ')}`);
        }
        mappings.push({
          srcIdx,
          tgtIdx,
          status: 'aligned',
          sourceLines: source.content.split('\n').length,
          targetLines: target.content.split('\n').length,
          language: source.language,
          notes: notes.length > 0 ? notes : undefined,
        });
        srcIdx++;
        tgtIdx++;
      } else {
        // Not a direct match - try to find where they diverged
        // Look ahead in target to find source match
        const targetMatch = lookAheadMatch(srcNorm, targetBlocks, tgtIdx + 1);
        // Look ahead in source to find target match  
        const sourceMatch = lookAheadMatch(tgtNorm, sourceBlocks, srcIdx + 1);
        
        if (targetMatch !== null && (sourceMatch === null || targetMatch - tgtIdx <= sourceMatch - srcIdx)) {
          // Target has extra blocks before match - mark as inserted
          while (tgtIdx < targetMatch) {
            if (isI18nBlock(targetBlocks[tgtIdx])) {
              insertedI18n++;
              mappings.push({
                srcIdx: null,
                tgtIdx,
                status: 'inserted-i18n',
                sourceLines: 0,
                targetLines: targetBlocks[tgtIdx].content.split('\n').length,
                language: targetBlocks[tgtIdx].language,
                notes: ['i18n setup block'],
              });
            } else {
              inserted++;
              mappings.push({
                srcIdx: null,
                tgtIdx,
                status: 'inserted',
                sourceLines: 0,
                targetLines: targetBlocks[tgtIdx].content.split('\n').length,
                language: targetBlocks[tgtIdx].language,
                notes: ['Extra block in target'],
              });
            }
            tgtIdx++;
          }
        } else if (sourceMatch !== null) {
          // Source has blocks that are missing in target
          while (srcIdx < sourceMatch) {
            missing++;
            mappings.push({
              srcIdx,
              tgtIdx: null,
              status: 'missing',
              sourceLines: sourceBlocks[srcIdx].content.split('\n').length,
              targetLines: 0,
              language: sourceBlocks[srcIdx].language,
              notes: ['Missing from target'],
            });
            srcIdx++;
          }
        } else {
          // No match found - these blocks are modified versions of each other
          modified++;
          const notes = detectModificationType(source, target);
          mappings.push({
            srcIdx,
            tgtIdx,
            status: 'modified',
            sourceLines: source.content.split('\n').length,
            targetLines: target.content.split('\n').length,
            language: source.language,
            notes,
          });
          srcIdx++;
          tgtIdx++;
        }
      }
    }
  }
  
  // Calculate score
  const total = sourceBlocks.length;
  const score = total > 0 
    ? Math.round((aligned / total) * 100)
    : 100;
  
  return {
    sourceBlocks: sourceBlocks.length,
    targetBlocks: targetBlocks.length,
    aligned,
    modified,
    inserted,
    insertedI18n,
    missing,
    score,
    mappings,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Look ahead in blocks to find a match for the given normalized content
 * Scans ALL remaining blocks to find any match
 */
function lookAheadMatch(
  normalizedContent: string, 
  blocks: CodeBlock[], 
  startIdx: number
): number | null {
  for (let i = startIdx; i < blocks.length; i++) {
    if (blocks[i].contentNormalized === normalizedContent) {
      return i;
    }
  }
  return null;
}

/**
 * Detect what type of modification occurred between two code blocks
 */
function detectModificationType(source: CodeBlock, target: CodeBlock): string[] {
  const notes: string[] = [];
  
  // Check for function name differences
  const srcFuncs = extractFunctionNames(source.content);
  const tgtFuncs = extractFunctionNames(target.content);
  
  if (srcFuncs.length > 0 && tgtFuncs.length > 0) {
    const srcSet = new Set(srcFuncs);
    const tgtSet = new Set(tgtFuncs);
    const different = srcFuncs.some(f => !tgtSet.has(f)) || tgtFuncs.some(f => !srcSet.has(f));
    if (different) {
      notes.push('Function names differ');
    }
  }
  
  // Check for i18n additions
  const i18nCheck = isI18nOnlyChange(source.content, target.content);
  if (i18nCheck.isI18nOnly) {
    notes.push(`i18n: ${i18nCheck.patterns.join(', ')}`);
  }
  
  // If no specific issues found, note general difference
  if (notes.length === 0) {
    notes.push('Code logic differs');
  }
  
  return notes;
}

/**
 * Extract function names from code
 */
function extractFunctionNames(content: string): string[] {
  const names: string[] = [];
  
  // Python: def function_name(
  const pyMatches = content.matchAll(/def\s+(\w+)\s*\(/g);
  for (const match of pyMatches) {
    names.push(match[1]);
  }
  
  // JavaScript: function name( or const name = function
  const jsMatches = content.matchAll(/function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:async\s+)?function/g);
  for (const match of jsMatches) {
    names.push(match[1] || match[2]);
  }
  
  return names;
}

// =============================================================================
// SCORING
// =============================================================================

/**
 * Calculate alignment score for code blocks
 */
export function calculateCodeScore(result: CodeAnalysisResult): number {
  return result.score;
}

/**
 * Determine if code analysis indicates alignment
 */
export function isCodeAligned(result: CodeAnalysisResult, threshold: number): boolean {
  return result.score >= threshold;
}
