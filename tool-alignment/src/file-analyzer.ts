/**
 * File Analyzer for Phase 3: File-Centric Diagnostics
 * 
 * Analyzes a single file across all dimensions (structure + code)
 * and returns a consolidated FileDiagnostic with action recommendation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { StructuralAnalyzer } from './structural-analyzer';
import { 
  FileDiagnostic, 
  FileAction, 
  Priority,
  MarkdownAnalysis 
} from './types';

// ============================================================================
// THRESHOLDS (configurable for calibration)
// ============================================================================

export interface Thresholds {
  structure: {
    ok: number;           // >= this = structure OK
    diverged: number;     // < this = diverged
  };
  code: {
    ok: number;           // >= this = code OK
    reviewNeeded: number; // < this = needs code review
  };
  quality: {
    ok: number;           // >= this = quality OK
    reviewNeeded: number; // >= this = needs quality review
    retranslate: number;  // < this = needs retranslation
  };
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  structure: {
    ok: 100,       // Perfect structure match required
    diverged: 80,  // Below this = diverged
  },
  code: {
    ok: 90,        // 90%+ = code OK
    reviewNeeded: 80, // Below 80% = needs review
  },
  quality: {
    ok: 80,           // 80%+ = quality OK
    reviewNeeded: 60, // 60-79% = needs review
    retranslate: 60,  // < 60% = retranslate
  },
};

// ============================================================================
// FILE ANALYZER
// ============================================================================

export class FileAnalyzer {
  private structuralAnalyzer: StructuralAnalyzer;
  private thresholds: Thresholds;

  constructor(thresholds: Thresholds = DEFAULT_THRESHOLDS) {
    this.structuralAnalyzer = new StructuralAnalyzer();
    this.thresholds = thresholds;
  }

  /**
   * Analyze a single file and return a consolidated diagnostic
   */
  async analyzeFile(
    sourceRoot: string,
    targetRoot: string,
    docsFolder: string,
    filename: string
  ): Promise<FileDiagnostic> {
    // Resolve paths
    const sourceBase = docsFolder === '.' || docsFolder === '' 
      ? sourceRoot 
      : path.join(sourceRoot, docsFolder);
    const targetBase = docsFolder === '.' || docsFolder === '' 
      ? targetRoot 
      : path.join(targetRoot, docsFolder);

    // Get the existing markdown analysis
    const analysis = await this.structuralAnalyzer.analyzeMarkdownFile(
      sourceBase,
      targetBase,
      filename
    );

    // Convert to FileDiagnostic
    return this.convertToFileDiagnostic(analysis);
  }

  /**
   * Convert MarkdownAnalysis to FileDiagnostic with action recommendation
   */
  private convertToFileDiagnostic(analysis: MarkdownAnalysis): FileDiagnostic {
    const diagnostic: FileDiagnostic = {
      file: analysis.file,
      sourceExists: analysis.source !== null,
      targetExists: analysis.target !== null,
      structure: null,
      code: null,
      action: 'ok',
      priority: 'ok',
      reason: '',
    };

    // Handle missing/extra files first
    if (!diagnostic.sourceExists && diagnostic.targetExists) {
      diagnostic.action = 'ok'; // Extra file in target is fine (localization)
      diagnostic.priority = 'ok';
      diagnostic.reason = 'File exists only in target (localization file)';
      return diagnostic;
    }

    if (diagnostic.sourceExists && !diagnostic.targetExists) {
      diagnostic.action = 'create';
      diagnostic.priority = 'critical';
      diagnostic.reason = 'File missing in target - needs translation';
      return diagnostic;
    }

    if (!diagnostic.sourceExists && !diagnostic.targetExists) {
      // Shouldn't happen, but handle gracefully
      diagnostic.action = 'ok';
      diagnostic.priority = 'ok';
      diagnostic.reason = 'File does not exist in either repository';
      return diagnostic;
    }

    // Both files exist - analyze structure and code
    if (analysis.source && analysis.target && analysis.comparison) {
      // Structure dimension
      diagnostic.structure = {
        score: analysis.comparison.structureScore,
        sectionMatch: analysis.comparison.sectionMatch,
        subsectionMatch: analysis.comparison.subsectionMatch,
        sourceSections: analysis.source.sections,
        targetSections: analysis.target.sections,
        sourceSubsections: analysis.source.subsections,
        targetSubsections: analysis.target.subsections,
        hasHeadingMap: analysis.target.hasHeadingMap,
        issues: analysis.issues.filter(i => 
          i.includes('section') || i.includes('subsection') || i.includes('heading-map')
        ),
      };

      // Code dimension
      if (analysis.codeIntegrity) {
        const ci = analysis.codeIntegrity;
        diagnostic.code = {
          score: ci.score,
          sourceBlocks: ci.sourceBlocks,
          targetBlocks: ci.targetBlocks,
          matchedBlocks: ci.matchedBlocks,
          modifiedBlocks: ci.modifiedBlocks,
          missingBlocks: ci.missingBlocks,
          extraBlocks: ci.extraBlocks,
          hasLocalizationChanges: ci.localizationNote !== undefined,
          issues: ci.issues,
        };
      }
    }

    // Determine action and priority
    const recommendation = this.recommendAction(diagnostic);
    diagnostic.action = recommendation.action;
    diagnostic.priority = recommendation.priority;
    diagnostic.reason = recommendation.reason;

    return diagnostic;
  }

  /**
   * Determine action recommendation based on structure + code scores
   */
  private recommendAction(diagnostic: FileDiagnostic): {
    action: FileAction;
    priority: Priority;
    reason: string;
  } {
    const { structure, code } = diagnostic;

    // No analysis available
    if (!structure) {
      return {
        action: 'ok',
        priority: 'ok',
        reason: 'No analysis available',
      };
    }

    const structureScore = structure.score;
    const codeScore = code?.score ?? 100; // Default to 100 if no code blocks

    // Decision matrix
    
    // 1. Structure diverged = always diverged action
    if (structureScore < this.thresholds.structure.diverged) {
      return {
        action: 'diverged',
        priority: 'critical',
        reason: `Structure diverged (${structureScore}%) - manual alignment needed`,
      };
    }

    // 2. Structure not perfect but acceptable
    if (structureScore < this.thresholds.structure.ok) {
      return {
        action: 'diverged',
        priority: 'high',
        reason: `Structure mismatch (${structureScore}%) - sections: ${structure.sourceSections}→${structure.targetSections}`,
      };
    }

    // 3. Structure OK - check code
    if (codeScore < this.thresholds.code.reviewNeeded) {
      // Check if it's just localization changes
      if (code?.hasLocalizationChanges && code.modifiedBlocks <= 2) {
        return {
          action: 'review-code',
          priority: 'low',
          reason: `Code modified (${codeScore}%) - localization changes detected`,
        };
      }
      return {
        action: 'review-code',
        priority: 'medium',
        reason: `Code integrity ${codeScore}% - ${code?.modifiedBlocks ?? 0} modified blocks`,
      };
    }

    if (codeScore < this.thresholds.code.ok) {
      return {
        action: 'ok',
        priority: 'low',
        reason: `Minor code differences (${codeScore}%) - likely acceptable`,
      };
    }

    // 4. Check heading-map
    if (!structure.hasHeadingMap) {
      return {
        action: 'resync',
        priority: 'low',
        reason: 'Missing heading-map - can be auto-generated',
      };
    }

    // 5. All good!
    return {
      action: 'ok',
      priority: 'ok',
      reason: `Structure ${structureScore}%, Code ${codeScore}% - ready for sync`,
    };
  }

  /**
   * Get markdown files from a repository
   */
  getMarkdownFiles(rootPath: string, docsFolder: string): string[] {
    return this.structuralAnalyzer.getMarkdownFiles(rootPath, docsFolder);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract repository name from path
 */
export function extractRepoName(sourcePath: string): string {
  // Normalize and get absolute path
  const normalized = path.resolve(sourcePath);
  // Get the last directory component
  return path.basename(normalized);
}

/**
 * Get icon for file action
 */
export function getActionIcon(action: FileAction): string {
  switch (action) {
    case 'ok': return '✅';
    case 'resync': return '🔄';
    case 'review-code': return '🔧';
    case 'review-quality': return '📝';
    case 'retranslate': return '🔴';
    case 'create': return '📄';
    case 'diverged': return '⚠️';
  }
}

/**
 * Get icon for priority
 */
export function getPriorityIcon(priority: Priority): string {
  switch (priority) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    case 'ok': return '✅';
  }
}

/**
 * Sort files by priority (critical first, ok last)
 */
export function sortByPriority(files: FileDiagnostic[]): FileDiagnostic[] {
  const priorityOrder: Record<Priority, number> = {
    'critical': 0,
    'high': 1,
    'medium': 2,
    'low': 3,
    'ok': 4,
  };

  return [...files].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    // Secondary sort by filename
    return a.file.localeCompare(b.file);
  });
}
