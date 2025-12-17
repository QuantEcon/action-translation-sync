/**
 * Triage Module for Phase 3: File-Centric Diagnostics
 * 
 * Scans all files in a repository and produces a prioritized
 * list of files needing attention.
 */

import * as path from 'path';
import { 
  FileAnalyzer, 
  extractRepoName, 
  sortByPriority,
  Thresholds,
  DEFAULT_THRESHOLDS 
} from './file-analyzer';
import { 
  TriageResult, 
  FileDiagnostic, 
  FileAction,
  TriageOptions 
} from './types';

const VERSION = '0.2.0';

export interface TriageProgress {
  current: number;
  total: number;
  file: string;
}

export type ProgressCallback = (progress: TriageProgress) => void;

export class Triage {
  private analyzer: FileAnalyzer;

  constructor(thresholds: Thresholds = DEFAULT_THRESHOLDS) {
    this.analyzer = new FileAnalyzer(thresholds);
  }

  /**
   * Triage all files in a repository
   */
  async triageRepository(
    options: TriageOptions,
    onProgress?: ProgressCallback
  ): Promise<TriageResult> {
    const { source, target, docsFolder } = options;

    // Discover files
    const sourceFiles = this.analyzer.getMarkdownFiles(source, docsFolder);
    const targetFiles = this.analyzer.getMarkdownFiles(target, docsFolder);
    
    // Combine unique files
    const allFiles = [...new Set([...sourceFiles, ...targetFiles])].sort();

    // Analyze each file
    const files: FileDiagnostic[] = [];
    
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      
      if (onProgress) {
        onProgress({ current: i + 1, total: allFiles.length, file });
      }

      const diagnostic = await this.analyzer.analyzeFile(
        source,
        target,
        docsFolder,
        file
      );
      files.push(diagnostic);
    }

    // Sort by priority
    const sortedFiles = sortByPriority(files);

    // Filter files needing attention
    const filesNeedingAttention = sortedFiles.filter(
      f => f.action !== 'ok' || f.priority !== 'ok'
    );

    // Count by action
    const byAction = this.countByAction(files);

    // Build result
    const result: TriageResult = {
      metadata: {
        sourceRepo: extractRepoName(source),
        sourcePath: path.resolve(source),
        targetPath: path.resolve(target),
        docsFolder,
        generatedAt: new Date().toISOString(),
        version: VERSION,
      },
      summary: {
        totalFiles: files.length,
        ok: byAction['ok'] || 0,
        needsAttention: files.length - (byAction['ok'] || 0),
        byAction,
      },
      files: sortedFiles,
      filesNeedingAttention,
    };

    return result;
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(
    source: string,
    target: string,
    docsFolder: string,
    filename: string
  ): Promise<FileDiagnostic> {
    return this.analyzer.analyzeFile(source, target, docsFolder, filename);
  }

  /**
   * Count files by action type
   */
  private countByAction(files: FileDiagnostic[]): Record<FileAction, number> {
    const counts: Record<FileAction, number> = {
      'ok': 0,
      'resync': 0,
      'review-code': 0,
      'review-quality': 0,
      'retranslate': 0,
      'create': 0,
      'diverged': 0,
    };

    for (const file of files) {
      counts[file.action]++;
    }

    return counts;
  }
}

/**
 * Convenience function for quick triage
 */
export async function triageRepository(
  options: TriageOptions,
  thresholds?: Thresholds,
  onProgress?: ProgressCallback
): Promise<TriageResult> {
  const triage = new Triage(thresholds);
  return triage.triageRepository(options, onProgress);
}
