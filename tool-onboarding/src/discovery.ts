/**
 * File discovery and pairing between source and target repositories
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// =============================================================================
// FILE DISCOVERY
// =============================================================================

/**
 * Get all markdown files in a docs folder
 */
export function getMarkdownFiles(repoRoot: string, docsFolder: string): string[] {
  const fullPath = path.join(repoRoot, docsFolder);
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  
  return fs.readdirSync(fullPath)
    .filter(f => f.endsWith('.md'))
    .sort();
}

/**
 * Discover and pair files between source and target repositories
 */
export function discoverFiles(
  source: string, 
  target: string, 
  docsFolder: string
): {
  sourceFiles: string[];
  targetFiles: string[];
  paired: string[];
  sourceOnly: string[];
  targetOnly: string[];
} {
  const sourceFiles = getMarkdownFiles(source, docsFolder);
  const targetFiles = getMarkdownFiles(target, docsFolder);
  
  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);
  
  const paired = sourceFiles.filter(f => targetSet.has(f));
  const sourceOnly = sourceFiles.filter(f => !targetSet.has(f));
  const targetOnly = targetFiles.filter(f => !sourceSet.has(f));
  
  return { sourceFiles, targetFiles, paired, sourceOnly, targetOnly };
}

// =============================================================================
// GIT METADATA
// =============================================================================

/**
 * Get the last modified date of a file from git history
 */
export function getGitLastModified(
  repoRoot: string, 
  docsFolder: string, 
  file: string
): string | undefined {
  try {
    const filePath = docsFolder ? path.join(docsFolder, file) : file;
    const result = execSync(
      `git log -1 --format="%ai" -- "${filePath}"`,
      { cwd: repoRoot, encoding: 'utf8' }
    ).trim();
    
    if (result) {
      // Parse "2024-07-19 10:30:00 -0400" format
      return result.split(' ')[0]; // Return just the date part
    }
  } catch {
    // Git command failed, return undefined
  }
  return undefined;
}

/**
 * Determine update direction based on dates
 * @returns '→' if source is newer, '←' if target is newer, '=' if same/unknown
 */
export function getUpdateDirection(
  sourceDate?: string, 
  targetDate?: string
): '→' | '←' | '=' {
  if (!sourceDate || !targetDate) return '=';
  
  const srcTime = new Date(sourceDate).getTime();
  const tgtTime = new Date(targetDate).getTime();
  
  if (srcTime > tgtTime) return '→';  // Source newer
  if (tgtTime > srcTime) return '←';  // Target newer
  return '=';
}

/**
 * Get human-readable direction description
 */
export function getDirectionDescription(direction: '→' | '←' | '='): string {
  switch (direction) {
    case '→': return 'Source newer';
    case '←': return 'Target newer';
    case '=': return 'Same date';
  }
}

// =============================================================================
// FILE CONTENT
// =============================================================================

/**
 * Read file content safely
 */
export function readFileContent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Get full path to a file in a repository's docs folder
 */
export function getFilePath(repoRoot: string, docsFolder: string, file: string): string {
  return path.join(repoRoot, docsFolder, file);
}
