/**
 * Decision generation from analysis results
 * Converts raw analysis into actionable decisions with recommendations
 */

import { 
  DecisionItem, 
  FileDecisions, 
  ActionType, 
  CodeAnalysisResult, 
  CodeBlock,
  Thresholds 
} from './types';

// =============================================================================
// CODE ANALYSIS TO DECISIONS
// =============================================================================

/**
 * Convert code analysis mappings to decision items
 * @param direction - '→' source newer, '←' target newer, '=' same
 */
export function codeAnalysisToDecisions(
  codeAnalysis: CodeAnalysisResult,
  sourceBlocks: CodeBlock[],
  targetBlocks: CodeBlock[],
  direction: string
): DecisionItem[] {
  const decisions: DecisionItem[] = [];
  
  for (const mapping of codeAnalysis.mappings) {
    const srcBlock = mapping.srcIdx !== null ? sourceBlocks[mapping.srcIdx] : null;
    const tgtBlock = mapping.tgtIdx !== null ? targetBlocks[mapping.tgtIdx] : null;
    
    const id = mapping.srcIdx !== null 
      ? `code-block-${mapping.srcIdx}` 
      : `code-block-t${mapping.tgtIdx}`;
    
    const region = mapping.srcIdx !== null 
      ? `Code Block ${mapping.srcIdx}` 
      : `Code Block T${mapping.tgtIdx}`;
    
    // Get startLine for document ordering (prefer source, fallback to target)
    const startLine = srcBlock?.startLine ?? tgtBlock?.startLine ?? 0;
    
    // Determine status
    let status: DecisionItem['status'];
    if (mapping.status === 'aligned') {
      status = 'aligned';
    } else if (mapping.status === 'missing') {
      status = 'missing';
    } else if (mapping.status === 'inserted' || mapping.status === 'inserted-i18n') {
      status = 'inserted';
    } else {
      status = 'differs';
    }
    
    // Determine recommendation based on mapping type AND direction
    let recommendation: ActionType | undefined;
    if (status === 'aligned') {
      recommendation = undefined; // No action needed
    } else if (mapping.status === 'inserted-i18n') {
      recommendation = 'ACCEPT LOCALISATION';
    } else if (mapping.status === 'inserted') {
      // Extra block in target
      if (direction === '←') {
        recommendation = 'BACKPORT'; // Target newer, likely improvement
      } else {
        recommendation = 'MANUAL REVIEW';
      }
    } else if (mapping.status === 'missing') {
      // Block missing in target - needs SYNC
      recommendation = 'SYNC';
    } else if (mapping.status === 'modified') {
      // Check notes for clues
      const notes = mapping.notes || [];
      const hasFuncDiff = notes.some(n => n.includes('Function names'));
      const hasI18n = notes.some(n => n.includes('i18n'));
      
      if (hasI18n && !hasFuncDiff) {
        recommendation = 'ACCEPT LOCALISATION';
      } else if (direction === '→') {
        recommendation = 'SYNC'; // Source newer, update target
      } else if (direction === '←') {
        recommendation = 'BACKPORT'; // Target newer, review for backport
      } else {
        recommendation = 'MANUAL REVIEW';
      }
    }
    
    // Build issue description
    let issue = mapping.notes?.join('; ') || '';
    if (mapping.status === 'missing') {
      issue = 'Block exists in source but not in target';
    } else if (mapping.status === 'inserted') {
      issue = 'Block exists in target but not in source';
    } else if (mapping.status === 'inserted-i18n') {
      issue = 'Localization setup block (fonts, locale config)';
    }
    
    decisions.push({
      id,
      region,
      type: 'code',
      status,
      startLine,
      sourceContent: srcBlock?.content,
      targetContent: tgtBlock?.content,
      issue,
      recommendation,
      notes: mapping.notes,
      srcIdx: mapping.srcIdx,
      tgtIdx: mapping.tgtIdx,
    });
  }
  
  return decisions;
}

// =============================================================================
// FILE-LEVEL DECISIONS
// =============================================================================

/**
 * Build complete file decisions from code and prose analysis
 */
export function buildFileDecisions(
  file: string,
  codeDecisions: DecisionItem[],
  proseDecisions: DecisionItem[],
  sourceDate?: string,
  targetDate?: string,
  codeScore?: number,
  thresholds?: Thresholds
): FileDecisions {
  // Merge and sort all decisions by document order (startLine)
  const allDecisions = [...codeDecisions, ...proseDecisions]
    .sort((a, b) => a.startLine - b.startLine);
  
  // Count actions
  const counts = {
    sync: 0,
    backport: 0,
    accept: 0,
    manual: 0,
    aligned: 0,
  };
  
  for (const d of allDecisions) {
    if (d.status === 'aligned') {
      counts.aligned++;
    } else {
      switch (d.recommendation) {
        case 'SYNC': counts.sync++; break;
        case 'BACKPORT': counts.backport++; break;
        case 'ACCEPT LOCALISATION': counts.accept++; break;
        case 'MANUAL REVIEW': counts.manual++; break;
      }
    }
  }
  
  // Determine overall file status
  let status: FileDecisions['status'];
  const hasIssues = allDecisions.some(d => d.status !== 'aligned');
  const threshold = thresholds?.code.aligned ?? 90;
  
  if (!hasIssues && (codeScore === undefined || codeScore >= threshold)) {
    status = 'aligned';
  } else if (counts.manual > 0 || (codeScore !== undefined && codeScore < 70)) {
    status = 'review';
  } else {
    status = 'review';
  }
  
  return {
    file,
    status,
    sourceDate,
    targetDate,
    decisions: allDecisions,
    counts,
  };
}

// =============================================================================
// RECOMMENDATION LOGIC
// =============================================================================

/**
 * Get file-level recommendation based on direction and status
 */
export function getFileRecommendation(
  direction: string,
  hasManual: boolean,
  hasSync: boolean,
  hasBackport: boolean
): string {
  if (hasManual) {
    return 'MANUAL REVIEW (complex changes detected)';
  }
  
  if (direction === '←' && hasBackport) {
    return 'BACKPORT (target is newer - review for improvements)';
  }
  
  if (direction === '→' && hasSync) {
    return 'SYNC (source is newer - update target)';
  }
  
  if (hasSync || hasBackport) {
    return 'REVIEW (mixed changes detected)';
  }
  
  return 'ALIGNED';
}

/**
 * Get date-based guidance text
 */
export function getDateGuidance(
  sourceDate?: string, 
  targetDate?: string, 
  direction?: string
): string | null {
  if (!sourceDate || !targetDate) return null;
  
  if (direction === '←') {
    return `📅 **Target is newer** (${targetDate} vs ${sourceDate}) - translation may contain improvements`;
  } else if (direction === '→') {
    return `📅 **Source is newer** (${sourceDate} vs ${targetDate}) - translation may be outdated`;
  }
  
  return null;
}
