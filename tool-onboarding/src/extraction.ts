/**
 * Content extraction from markdown files
 * Extracts code blocks and section positions for analysis
 */

import { CodeBlock } from './types';
import { I18N_LINE_PATTERNS } from './constants';

// =============================================================================
// SECTION EXTRACTION
// =============================================================================

/**
 * Extract section positions (line numbers) from markdown content
 * Used for ordering decisions by document position
 */
export function extractSectionPositions(content: string): Map<number, number> {
  const positions = new Map<number, number>();
  const lines = content.split('\n');
  let sectionNum = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match ## headings (not ### or deeper for main sections)
    if (/^##\s+[^#]/.test(line)) {
      sectionNum++;
      positions.set(sectionNum, i + 1); // 1-indexed line number
    }
  }
  
  return positions;
}

// =============================================================================
// CODE BLOCK EXTRACTION
// =============================================================================

/**
 * Extract all code blocks from markdown content
 */
export function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const lines = content.split('\n');
  
  let inCodeBlock = false;
  let currentLanguage = '';
  let currentContent: string[] = [];
  let startLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for code fence start
    if (!inCodeBlock && /^```(\w*)/.test(line)) {
      const match = line.match(/^```(\w*)/);
      currentLanguage = match?.[1] || '';
      inCodeBlock = true;
      currentContent = [];
      startLine = i + 1; // 1-indexed
      continue;
    }
    
    // Check for code fence end
    if (inCodeBlock && line.startsWith('```')) {
      const rawContent = currentContent.join('\n');
      blocks.push({
        content: rawContent,
        contentNormalized: normalizeCodeContent(rawContent, currentLanguage),
        language: currentLanguage,
        startLine,
        endLine: i + 1,
      });
      
      inCodeBlock = false;
      currentLanguage = '';
      currentContent = [];
      continue;
    }
    
    // Accumulate content
    if (inCodeBlock) {
      currentContent.push(line);
    }
  }
  
  return blocks;
}

// =============================================================================
// CODE NORMALIZATION
// =============================================================================

/**
 * Normalize code content for comparison
 * Strips comments, whitespace, and i18n-specific patterns
 */
export function normalizeCodeContent(content: string, language: string): string {
  let normalized = content;
  
  // Language-specific comment removal
  if (language === 'python') {
    // Remove # comments (but keep strings)
    normalized = normalized.replace(/(?<!["'])#[^\n]*/g, '');
    // Remove docstrings
    normalized = normalized.replace(/"""[\s\S]*?"""/g, '""');
    normalized = normalized.replace(/'''[\s\S]*?'''/g, "''");
  } else if (language === 'javascript' || language === 'typescript') {
    // Remove // comments
    normalized = normalized.replace(/\/\/[^\n]*/g, '');
    // Remove /* */ comments
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
  }
  
  // Remove i18n patterns (font config, etc.)
  for (const pattern of I18N_LINE_PATTERNS) {
    normalized = normalized.replace(new RegExp(pattern.source, 'gim'), '');
  }
  
  // Normalize whitespace
  normalized = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  return normalized;
}

// =============================================================================
// i18n DETECTION
// =============================================================================

/**
 * Check if a code block is purely i18n setup (font config, etc.)
 */
export function isI18nBlock(block: CodeBlock): boolean {
  const lines = block.content.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length === 0) return false;
  
  // Check if ALL lines are i18n patterns
  for (const line of lines) {
    const matchesI18n = I18N_LINE_PATTERNS.some(p => p.test(line));
    if (!matchesI18n) return false;
  }
  return true;
}

/**
 * Detect if the difference between two code blocks is only i18n additions
 */
export function isI18nOnlyChange(
  sourceContent: string, 
  targetContent: string
): { isI18nOnly: boolean; patterns: string[] } {
  const sourceLines = new Set(
    sourceContent.split('\n').map(l => l.trim()).filter(l => l)
  );
  const targetLines = targetContent.split('\n').map(l => l.trim()).filter(l => l);
  
  const addedLines: string[] = [];
  for (const line of targetLines) {
    if (!sourceLines.has(line)) {
      addedLines.push(line);
    }
  }
  
  if (addedLines.length === 0) {
    return { isI18nOnly: false, patterns: [] };
  }
  
  // Check if all added lines match i18n patterns
  const patterns: string[] = [];
  for (const line of addedLines) {
    let matched = false;
    for (const { name, pattern } of getNamedI18nPatterns()) {
      if (pattern.test(line)) {
        if (!patterns.includes(name)) {
          patterns.push(name);
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      return { isI18nOnly: false, patterns: [] };
    }
  }
  
  return { isI18nOnly: true, patterns };
}

/**
 * Get named i18n patterns (imported from constants but defined here for isolation)
 */
function getNamedI18nPatterns(): { name: string; pattern: RegExp }[] {
  // Import from constants when used
  const { I18N_NAMED_PATTERNS } = require('./constants');
  return I18N_NAMED_PATTERNS;
}
