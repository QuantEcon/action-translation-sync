/**
 * Config file analysis for repository configuration
 * Compares _toc.yml, _config.yml, environment.yml
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ConfigAnalysis } from '../types';

// =============================================================================
// CONFIG FILE ANALYSIS
// =============================================================================

/**
 * Analyze all config files between source and target
 */
export function analyzeConfigFiles(
  sourceRoot: string, 
  targetRoot: string, 
  docsFolder: string
): ConfigAnalysis[] {
  const configFiles = ['_toc.yml', '_config.yml', 'environment.yml'];
  return configFiles.map(file => 
    analyzeConfigFile(sourceRoot, targetRoot, docsFolder, file)
  );
}

/**
 * Analyze a single config file
 */
export function analyzeConfigFile(
  sourceRoot: string, 
  targetRoot: string, 
  docsFolder: string, 
  filename: string
): ConfigAnalysis {
  // Try docs folder first, then root
  const sourcePaths = [
    path.join(sourceRoot, docsFolder, filename),
    path.join(sourceRoot, filename),
  ];
  const targetPaths = [
    path.join(targetRoot, docsFolder, filename),
    path.join(targetRoot, filename),
  ];
  
  let sourcePath: string | null = null;
  let targetPath: string | null = null;
  
  for (const p of sourcePaths) {
    if (fs.existsSync(p)) {
      sourcePath = p;
      break;
    }
  }
  
  for (const p of targetPaths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }
  
  const sourceExists = sourcePath !== null;
  const targetExists = targetPath !== null;
  
  // Handle missing files
  if (!sourceExists && !targetExists) {
    return {
      file: filename,
      sourceExists: false,
      targetExists: false,
      status: 'missing',
    };
  }
  
  if (!sourceExists) {
    return {
      file: filename,
      sourceExists: false,
      targetExists: true,
      status: 'extra',
    };
  }
  
  if (!targetExists) {
    return {
      file: filename,
      sourceExists: true,
      targetExists: false,
      status: 'missing',
    };
  }
  
  // Both exist - compare content
  const sourceContent = fs.readFileSync(sourcePath!, 'utf8');
  const targetContent = fs.readFileSync(targetPath!, 'utf8');
  
  // For _toc.yml, count entries
  const isToc = filename === '_toc.yml';
  const sourceEntries = isToc ? countTocEntries(sourceContent) : undefined;
  const targetEntries = isToc ? countTocEntries(targetContent) : undefined;
  
  // Compare
  if (sourceContent === targetContent) {
    return {
      file: filename,
      sourceExists: true,
      targetExists: true,
      status: 'identical',
      sourceEntries,
      targetEntries,
    };
  }
  
  // Content differs - analyze differences
  const fileType = isToc ? 'toc' : 'config';
  const differences = compareYamlContent(sourceContent, targetContent, fileType);
  
  return {
    file: filename,
    sourceExists: true,
    targetExists: true,
    status: 'differs',
    differences,
    sourceEntries,
    targetEntries,
  };
}

// =============================================================================
// YAML PARSING
// =============================================================================

/**
 * Parse YAML file safely
 */
export function parseYamlFile(filePath: string): unknown | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch {
    return null;
  }
}

/**
 * Count entries in a _toc.yml file
 */
export function countTocEntries(content: string): number {
  // Count lines that look like TOC entries (- file: or - glob:)
  const matches = content.match(/^\s*-\s+(file|glob):/gm);
  return matches ? matches.length : 0;
}

/**
 * Compare YAML content and describe differences
 */
export function compareYamlContent(
  sourceContent: string, 
  targetContent: string, 
  fileType: 'toc' | 'config'
): string[] {
  const differences: string[] = [];
  
  try {
    const sourceYaml = yaml.load(sourceContent) as Record<string, unknown>;
    const targetYaml = yaml.load(targetContent) as Record<string, unknown>;
    
    if (fileType === 'toc') {
      // For TOC, compare structure
      const sourceEntries = countTocEntries(sourceContent);
      const targetEntries = countTocEntries(targetContent);
      
      if (sourceEntries !== targetEntries) {
        differences.push(`Entry count: source ${sourceEntries}, target ${targetEntries}`);
      }
      
      // Check for root-level format
      if (sourceYaml.format !== targetYaml.format) {
        differences.push(`Format differs: ${sourceYaml.format} vs ${targetYaml.format}`);
      }
      
      // Check root
      if (sourceYaml.root !== targetYaml.root) {
        differences.push(`Root differs: ${sourceYaml.root} vs ${targetYaml.root}`);
      }
    } else {
      // For config files, check key differences
      const allKeys = new Set([
        ...Object.keys(sourceYaml || {}),
        ...Object.keys(targetYaml || {}),
      ]);
      
      for (const key of allKeys) {
        const sourceVal = sourceYaml?.[key];
        const targetVal = targetYaml?.[key];
        
        if (sourceVal === undefined) {
          differences.push(`Key '${key}' only in target`);
        } else if (targetVal === undefined) {
          differences.push(`Key '${key}' only in source`);
        } else if (JSON.stringify(sourceVal) !== JSON.stringify(targetVal)) {
          // Don't report minor differences for certain keys
          const skipKeys = ['title', 'author', 'description'];
          if (!skipKeys.includes(key)) {
            differences.push(`Key '${key}' differs`);
          }
        }
      }
    }
  } catch (e) {
    differences.push('YAML parse error');
  }
  
  return differences;
}
