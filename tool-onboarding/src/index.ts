#!/usr/bin/env node
/**
 * tool-onboarding - Simple translation alignment checker
 * 
 * Compares SOURCE (English) and TARGET (translated) documents
 * using Claude to determine if translations are aligned.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';
import { Command } from 'commander';
import chalk from 'chalk';

// ============================================================================
// TYPES
// ============================================================================

interface FileResult {
  file: string;
  status: 'translate' | 'suggest' | 'aligned' | 'review' | 'error';
  analysis?: string;
  codeAnalysis?: CodeAnalysisResult;
  error?: string;
  sourceDate?: string;
  targetDate?: string;
}

interface CodeBlock {
  index: number;
  language: string;
  content: string;
  contentNormalized: string;
}

interface CodeBlockComparison {
  index: number;
  language: string;
  match: 'identical' | 'normalized-match' | 'i18n-only' | 'modified' | 'missing' | 'extra';
  sourceLines: number;
  targetLines: number;
  differences?: string[];
}

interface CodeAnalysisResult {
  sourceBlocks: number;
  targetBlocks: number;
  identical: number;
  normalizedMatch: number;
  i18nOnly: number;
  modified: number;
  missing: number;
  extra: number;
  score: number;
  comparisons: CodeBlockComparison[];
}

// ============================================================================
// LANGUAGE LOOKUP
// ============================================================================

const LANGUAGE_NAMES: Record<string, string> = {
  'zh-cn': 'Simplified Chinese',
  'zh-tw': 'Traditional Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'pt': 'Portuguese',
  'pt-br': 'Brazilian Portuguese',
  'ru': 'Russian',
  'ar': 'Arabic',
  'fa': 'Persian (Farsi)',
  'hi': 'Hindi',
  'it': 'Italian',
  'nl': 'Dutch',
  'pl': 'Polish',
  'tr': 'Turkish',
  'vi': 'Vietnamese',
  'th': 'Thai',
  'id': 'Indonesian',
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] || code;
}

// ============================================================================
// FILE DISCOVERY
// ============================================================================

function getMarkdownFiles(repoRoot: string, docsFolder: string): string[] {
  const docsPath = docsFolder ? path.join(repoRoot, docsFolder) : repoRoot;
  
  if (!fs.existsSync(docsPath)) {
    return [];
  }

  return fs.readdirSync(docsPath)
    .filter(f => f.endsWith('.md'))
    .sort();
}

function discoverFiles(source: string, target: string, docsFolder: string) {
  const sourceFiles = getMarkdownFiles(source, docsFolder);
  const targetFiles = getMarkdownFiles(target, docsFolder);
  
  return {
    sourceOnly: sourceFiles.filter(f => !targetFiles.includes(f)),
    targetOnly: targetFiles.filter(f => !sourceFiles.includes(f)),
    both: sourceFiles.filter(f => targetFiles.includes(f)),
  };
}

// ============================================================================
// GIT DATES
// ============================================================================

function getGitLastModified(repoRoot: string, docsFolder: string, file: string): string | undefined {
  const filePath = docsFolder ? path.join(docsFolder, file) : file;
  try {
    const result = execSync(
      `git log -1 --format=%ci -- "${filePath}"`,
      { cwd: repoRoot, encoding: 'utf-8' }
    ).trim();
    if (result) {
      // Return just the date part (YYYY-MM-DD)
      return result.split(' ')[0];
    }
  } catch {
    // File not in git or other error
  }
  return undefined;
}

function getUpdateDirection(sourceDate?: string, targetDate?: string): string {
  if (!sourceDate || !targetDate) return '?';
  
  const src = new Date(sourceDate);
  const tgt = new Date(targetDate);
  
  if (src > tgt) {
    return '→'; // Source newer, update target
  } else if (tgt > src) {
    return '←'; // Target newer, check if intentional
  }
  return '='; // Same date
}

// ============================================================================
// CODE BLOCK EXTRACTION & ANALYSIS (Deterministic - no Claude)
// ============================================================================

/**
 * Extract code blocks from MyST markdown content
 * Only extracts {code-cell} directives and standard markdown code blocks
 */
function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const lines = content.split('\n');
  
  let inCodeBlock = false;
  let isCodeBlock = false;
  let currentLanguage = '';
  let blockContent: string[] = [];
  let blockIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for fence start
    if (!inCodeBlock && (line.startsWith('```') || line.startsWith('~~~'))) {
      inCodeBlock = true;
      blockContent = [];
      
      // Check for {code-cell} directive
      const codeCellMatch = line.match(/^(?:```|~~~)\{code-cell\}\s*(\w*)/i);
      if (codeCellMatch) {
        isCodeBlock = true;
        currentLanguage = codeCellMatch[1] || 'python';
        continue;
      }
      
      // Check for standard markdown code block
      const standardMatch = line.match(/^(?:```|~~~)(\w+)/);
      if (standardMatch && standardMatch[1]) {
        isCodeBlock = true;
        currentLanguage = standardMatch[1];
        continue;
      }
      
      // Other directive - not a code block we care about
      isCodeBlock = false;
      currentLanguage = '';
      
    } else if (inCodeBlock && (line.startsWith('```') || line.startsWith('~~~'))) {
      // End of block
      if (isCodeBlock) {
        const rawContent = blockContent.join('\n');
        blocks.push({
          index: blockIndex,
          language: currentLanguage,
          content: rawContent,
          contentNormalized: normalizeCodeContent(rawContent, currentLanguage),
        });
        blockIndex++;
      }
      
      inCodeBlock = false;
      isCodeBlock = false;
      currentLanguage = '';
      blockContent = [];
      
    } else if (inCodeBlock) {
      blockContent.push(line);
    }
  }
  
  return blocks;
}

/**
 * Normalize code content for comparison
 * Replaces comments and strings with placeholders so we compare logic, not translations
 */
function normalizeCodeContent(content: string, language: string): string {
  let normalized = content;
  
  // Step 1: Normalize strings to placeholders (handles translated labels)
  // Triple-quoted strings first (Python docstrings)
  normalized = normalized.replace(/"""[\s\S]*?"""/g, '"""<< STRING >>"""');
  normalized = normalized.replace(/'''[\s\S]*?'''/g, "'''<< STRING >>'''");
  // f-strings (Python)
  normalized = normalized.replace(/f"[^"]*"/g, 'f"<< STRING >>"');
  normalized = normalized.replace(/f'[^']*'/g, "f'<< STRING >>'");
  // Regular strings
  normalized = normalized.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '"<< STRING >>"');
  normalized = normalized.replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "'<< STRING >>'");
  
  // Step 2: Normalize MyST frontmatter captions
  normalized = normalized.replace(/^(\s*caption:\s*).*$/gm, '$1<< CAPTION >>');
  
  // Step 3: Replace comments with placeholders
  const lang = language.toLowerCase();
  const useHashComments = lang.startsWith('python') || lang.startsWith('ipython') || 
                          lang.startsWith('julia') || lang.startsWith('r') ||
                          ['py', 'jl', 'rb', 'ruby', 'sh', 'bash', 'shell', 'zsh'].includes(lang);
  const useSlashComments = lang.startsWith('javascript') || lang.startsWith('typescript') ||
                           ['js', 'ts', 'java', 'c', 'cpp', 'cs', 'go', 'rust', 'rs'].includes(lang);
  
  if (useHashComments) {
    normalized = normalized.replace(/^(\s*)#.*$/gm, '$1# << COMMENT >>');
    normalized = normalized.replace(/([^#])#(?!\s*<< COMMENT >>).*$/gm, '$1# << COMMENT >>');
  } else if (useSlashComments) {
    normalized = normalized.replace(/^(\s*)\/\/.*$/gm, '$1// << COMMENT >>');
    normalized = normalized.replace(/([^/])\/\/(?!\s*<< COMMENT >>).*$/gm, '$1// << COMMENT >>');
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '/* << COMMENT >> */');
  }
  
  // Step 4: Normalize whitespace
  normalized = normalized
    .split('\n')
    .map(line => line.trim().replace(/\s+/g, ' '))
    .filter(line => line !== '')
    .join('\n')
    .trim();
  
  return normalized;
}

/**
 * Check if changes between source and target are i18n-only (CJK font config, etc.)
 * These changes are expected and should count as "matched"
 */
function isI18nOnlyChange(sourceContent: string, targetContent: string): { isI18nOnly: boolean; patterns: string[] } {
  // Known i18n patterns - lines typically added for CJK/localization support
  const I18N_PATTERNS = [
    // Font configuration
    { pattern: /^\s*import matplotlib as mpl\s*$/m, name: 'mpl import' },
    { pattern: /^\s*FONTPATH\s*=\s*["'][^"']+["']\s*$/m, name: 'font path' },
    { pattern: /^\s*mpl\.font_manager\.fontManager\.addfont\s*\(/m, name: 'font registration' },
    { pattern: /^\s*plt\.rcParams\['font\./m, name: 'rcParams font' },
    { pattern: /^\s*plt\.rcParams\['axes\.unicode_minus'\]/m, name: 'unicode minus' },
    { pattern: /^\s*mpl\.rcParams\[/m, name: 'mpl rcParams' },
    { pattern: /^\s*matplotlib\.rc\s*\(/m, name: 'matplotlib rc' },
    { pattern: /^\s*from matplotlib import font_manager/m, name: 'font_manager import' },
    { pattern: /^\s*font_manager\./m, name: 'font_manager usage' },
    // CJK font families
    { pattern: /SimHei|SimSun|Microsoft YaHei|STHeiti|PingFang|Noto Sans/i, name: 'CJK font' },
    // Data loading for name translations
    { pattern: /^\s*\w+_cn\s*=\s*pd\.read_csv\s*\(/m, name: 'i18n name mapping' },
    { pattern: /^\s*\w+_names?\s*=\s*{/m, name: 'i18n name dict' },
  ];

  // Get lines that are in target but not in source
  const sourceLines = new Set(sourceContent.split('\n').map(l => l.trim()).filter(l => l));
  const targetLines = targetContent.split('\n').map(l => l.trim()).filter(l => l);
  const addedLines = targetLines.filter(l => !sourceLines.has(l));

  if (addedLines.length === 0) {
    return { isI18nOnly: false, patterns: [] };
  }

  // Check if ALL added lines match i18n patterns
  const detectedPatterns: string[] = [];
  for (const line of addedLines) {
    let matchedAny = false;
    for (const { pattern, name } of I18N_PATTERNS) {
      if (pattern.test(line)) {
        if (!detectedPatterns.includes(name)) {
          detectedPatterns.push(name);
        }
        matchedAny = true;
        break;
      }
    }
    
    // If this added line doesn't match any i18n pattern, there are real changes
    if (!matchedAny) {
      return { isI18nOnly: false, patterns: detectedPatterns };
    }
  }

  // All added lines are i18n patterns
  return { isI18nOnly: detectedPatterns.length > 0, patterns: detectedPatterns };
}

/**
 * Compare code blocks between source and target (deterministic)
 */
function compareCodeBlocks(sourceBlocks: CodeBlock[], targetBlocks: CodeBlock[]): CodeAnalysisResult {
  const comparisons: CodeBlockComparison[] = [];
  let identical = 0;
  let normalizedMatch = 0;
  let i18nOnly = 0;
  let modified = 0;
  let missing = 0;
  let extra = 0;
  
  // Compare by position (same as section matching)
  const maxLen = Math.max(sourceBlocks.length, targetBlocks.length);
  
  for (let i = 0; i < maxLen; i++) {
    const source = sourceBlocks[i];
    const target = targetBlocks[i];
    
    if (source && target) {
      // Both exist - compare
      if (source.content === target.content) {
        identical++;
        comparisons.push({
          index: i + 1,
          language: source.language,
          match: 'identical',
          sourceLines: source.content.split('\n').length,
          targetLines: target.content.split('\n').length,
        });
      } else if (source.contentNormalized === target.contentNormalized) {
        normalizedMatch++;
        comparisons.push({
          index: i + 1,
          language: source.language,
          match: 'normalized-match',
          sourceLines: source.content.split('\n').length,
          targetLines: target.content.split('\n').length,
          differences: ['Comments/strings differ (translated)'],
        });
      } else {
        // Check if changes are i18n-only (CJK fonts, etc.)
        const i18nCheck = isI18nOnlyChange(source.content, target.content);
        
        if (i18nCheck.isI18nOnly) {
          i18nOnly++;
          comparisons.push({
            index: i + 1,
            language: source.language,
            match: 'i18n-only',
            sourceLines: source.content.split('\n').length,
            targetLines: target.content.split('\n').length,
            differences: [`i18n: ${i18nCheck.patterns.join(', ')}`],
          });
        } else {
          modified++;
          const differences: string[] = [];
          
          // Note i18n patterns if present (but not the only change)
          if (i18nCheck.patterns.length > 0) {
            differences.push(`Has i18n additions (${i18nCheck.patterns.join(', ')})`);
          }
          
          // Function name changes
          const srcFuncs = source.content.match(/def\s+(\w+)/g) || [];
          const tgtFuncs = target.content.match(/def\s+(\w+)/g) || [];
          if (srcFuncs.length !== tgtFuncs.length || srcFuncs.join() !== tgtFuncs.join()) {
            differences.push('Function names differ');
          }
          
          // Variable patterns
          if (source.content.includes('np.linalg.solve') && target.content.includes('np.linalg.inv')) {
            differences.push('Uses np.linalg.inv instead of np.linalg.solve');
          }
          
          if (differences.length === 0) {
            differences.push('Code logic differs');
          }
          
          comparisons.push({
            index: i + 1,
            language: source.language,
            match: 'modified',
            sourceLines: source.content.split('\n').length,
            targetLines: target.content.split('\n').length,
            differences,
          });
        }
      }
    } else if (source && !target) {
      missing++;
      comparisons.push({
        index: i + 1,
        language: source.language,
        match: 'missing',
        sourceLines: source.content.split('\n').length,
        targetLines: 0,
        differences: ['Missing in target'],
      });
    } else if (!source && target) {
      extra++;
      comparisons.push({
        index: i + 1,
        language: target.language,
        match: 'extra',
        sourceLines: 0,
        targetLines: target.content.split('\n').length,
        differences: ['Extra in target'],
      });
    }
  }
  
  // Score: percentage of source blocks that match (identical, normalized, or i18n-only)
  // i18n-only changes are expected for translations, so they count as matched
  const matchedBlocks = identical + normalizedMatch + i18nOnly;
  const score = sourceBlocks.length > 0 
    ? Math.round((matchedBlocks / sourceBlocks.length) * 100)
    : 100;
  
  return {
    sourceBlocks: sourceBlocks.length,
    targetBlocks: targetBlocks.length,
    identical,
    normalizedMatch,
    i18nOnly,
    modified,
    missing,
    extra,
    score,
    comparisons,
  };
}

/**
 * Generate code analysis section for report (deterministic - no Claude)
 */
function generateCodeAnalysisSection(codeAnalysis: CodeAnalysisResult): string {
  const lines: string[] = [];
  
  // Score with color indicator
  const scoreIcon = codeAnalysis.score === 100 ? '🟢' : 
                    codeAnalysis.score >= 90 ? '🟢' : 
                    codeAnalysis.score >= 70 ? '🟡' : '🔴';
  
  lines.push('### Code Analysis (Deterministic)', '');
  lines.push(`**Score:** ${scoreIcon} ${codeAnalysis.score}% | Source: ${codeAnalysis.sourceBlocks} blocks | Target: ${codeAnalysis.targetBlocks} blocks`);
  lines.push('');
  
  // Warning if block counts differ
  if (codeAnalysis.sourceBlocks !== codeAnalysis.targetBlocks) {
    lines.push(`> ⚠️ **Block count mismatch**: Comparison is position-based. When counts differ, blocks may be misaligned.`);
    lines.push('');
  }
  
  lines.push('| Block | Lines | Status | Notes |');
  lines.push('|-------|-------|--------|-------|');
  
  for (const comp of codeAnalysis.comparisons) {
    const statusIcon = comp.match === 'identical' ? '🟢 IDENTICAL' :
                       comp.match === 'normalized-match' ? '🟢 MATCH' :
                       comp.match === 'i18n-only' ? '🟢 i18n' :
                       comp.match === 'modified' ? '🟡 MODIFIED' :
                       comp.match === 'missing' ? '🔴 MISSING' :
                       comp.match === 'extra' ? '🔵 EXTRA' : comp.match;
    const linesCol = comp.sourceLines === comp.targetLines 
      ? `${comp.sourceLines}` 
      : `${comp.sourceLines} → ${comp.targetLines}`;
    const notes = comp.differences?.join('; ') || '-';
    lines.push(`| ${comp.index} | ${linesCol} | ${statusIcon} | ${notes} |`);
  }
  
  lines.push('');
  lines.push('> **Legend:** 🟢 Identical/Match/i18n (same logic) | 🟡 Modified (code differs) | 🔴 Missing | 🔵 Extra');
  lines.push('');
  lines.push('> **Note:** "MATCH" = same after normalizing comments/strings. "i18n" = only CJK font config added (expected).');
  
  return lines.join('\n');
}

// ============================================================================
// CLAUDE COMPARISON (Prose only)
// ============================================================================

const PROMPT = `Compare this English source document with its translation.

Analyze PROSE SECTIONS only. Code blocks are analyzed separately by a deterministic tool.

For each section heading, determine if the translation accurately reflects the source.

Be lenient about:
- Phrasing differences (normal for translation)
- Minor formatting variations

Flag substantive issues:
- Missing sections or paragraphs
- Added content not in source
- Meaning changes in prose
- Mathematical notation differences

Format your response as follows:

## Overall: ALIGNED
or
## Overall: REVIEW

## Section Analysis

| Section | Source Heading | Target Heading | Status | Score |
|---------|---------------|----------------|--------|-------|
| 1 | [heading] | [translation] | ALIGNED/DRIFT/MISSING | 🟢/🟡/🔴 0-100 |
| 2 | [heading] | [translation] | ALIGNED/DRIFT/MISSING | 🟢/🟡/🔴 0-100 |

**Status codes:**
- ALIGNED: Translation accurate
- DRIFT: Differences in meaning/structure
- MISSING: Section not found in target
- EXTRA: Section only in target

**Score colors:** 🟢 90-100 (good) | 🟡 70-89 (minor issues) | 🔴 <70 (needs attention)

## Issues and Recommendations

List specific prose/translation problems found and how to fix them.
Focus on translation quality, not code (code is analyzed separately).

========== SOURCE DOCUMENT (English) ==========
{SOURCE}
========== END SOURCE DOCUMENT ==========

========== TARGET DOCUMENT (Translation) ==========
{TARGET}
========== END TARGET DOCUMENT ==========`;

async function compareDocuments(
  client: Anthropic,
  sourceContent: string,
  targetContent: string,
  targetLanguage: string,
  model: string
): Promise<{ status: 'aligned' | 'review'; analysis: string }> {
  
  const languageName = getLanguageName(targetLanguage);
  
  const prompt = PROMPT
    .replace('{SOURCE}', sourceContent)
    .replace('{TARGET}', targetContent)
    .replace('Translation', `${languageName} translation`);

  const response = await client.messages.create({
    model: model,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const status = text.includes('## Overall: ALIGNED') ? 'aligned' : 'review';
  
  return { status, analysis: text };
}

// ============================================================================
// REPORT
// ============================================================================

function generateReport(options: any, results: FileResult[]): string {
  const lines: string[] = [
    '# Onboarding Report',
    '',
    `| Property | Value |`,
    `|----------|-------|`,
    `| Source | \`${path.basename(options.source)}\` |`,
    `| Target | \`${path.basename(options.target)}\` |`,
    `| Docs Folder | \`${options.docsFolder}\` |`,
  ];
  
  if (options.file) {
    lines.push(`| File Filter | \`${options.file}\` |`);
  }
  
  lines.push(
    `| Generated | ${new Date().toISOString()} |`,
    '',
  );

  const aligned = results.filter(r => r.status === 'aligned');
  const review = results.filter(r => r.status === 'review');
  const translate = results.filter(r => r.status === 'translate');
  const suggest = results.filter(r => r.status === 'suggest');

  // File listing with status - the main summary
  lines.push('## File Summary', '');
  lines.push('| File | Status | Code | Source Date | Target Date | Direction |');
  lines.push('|------|--------|------|-------------|-------------|-----------|');
  
  for (const result of results) {
    const statusIcon = result.status === 'aligned' ? '✅ Aligned' :
                       result.status === 'review' ? '📋 Review' :
                       result.status === 'translate' ? '📄 Translate' :
                       result.status === 'suggest' ? '🎯 Target-only' :
                       result.status === 'error' ? '❌ Error' : result.status;
    
    // Code score
    const codeScore = result.codeAnalysis 
      ? `${result.codeAnalysis.score}%` 
      : '-';
    
    // Direction: for source-only → (needs translation), for target-only ← (consider backport)
    let dirLabel: string;
    if (result.status === 'translate') {
      dirLabel = '→';  // Source exists, needs translation to target
    } else if (result.status === 'suggest') {
      dirLabel = '←';  // Target exists, consider backporting to source
    } else {
      const direction = getUpdateDirection(result.sourceDate, result.targetDate);
      dirLabel = direction === '→' ? '→' :
                 direction === '←' ? '←' :
                 direction === '=' ? '=' : '-';
    }
    
    lines.push(`| ${result.file} | ${statusIcon} | ${codeScore} | ${result.sourceDate || '-'} | ${result.targetDate || '-'} | ${dirLabel} |`);
  }
  lines.push('');
  lines.push('**Status:** ✅ Ready for sync | 📋 Needs review | 📄 Needs translation | 🎯 Target-only');
  lines.push('');
  lines.push('**Direction:** `→` Source newer | `←` Target newer | `=` Same date');
  lines.push('');

  if (review.length > 0) {
    lines.push('## Files for Review', '');
    lines.push('> Drift detected - human decision required on sync direction', '');
    for (const result of review) {
      const dateInfo = result.sourceDate && result.targetDate 
        ? ` (Source: ${result.sourceDate}, Target: ${result.targetDate})`
        : '';
      const direction = getUpdateDirection(result.sourceDate, result.targetDate);
      const hint = direction === '→' ? ' *(Source newer)*' :
                   direction === '←' ? ' *(Target newer)*' : '';
      lines.push(`### ${result.file}${dateInfo}`, '');
      lines.push('**Action:**');
      lines.push(`- [ ] Sync from SOURCE → Update target translation${direction === '→' ? ' (recommended)' : ''}`);
      lines.push(`- [ ] Backport from TARGET → Merge improvements to source${direction === '←' ? ' (recommended)' : ''}`);
      lines.push('- [ ] Manual → Complex changes requiring both directions');
      lines.push('');
      
      // Add code analysis (deterministic)
      if (result.codeAnalysis) {
        lines.push(generateCodeAnalysisSection(result.codeAnalysis));
        lines.push('');
      }
      
      // Add prose analysis (Claude)
      lines.push('### Prose Analysis (Claude)', '');
      lines.push(result.analysis || 'No analysis available');
      lines.push('', '---', '');
    }
  }

  if (aligned.length > 0) {
    lines.push('## Aligned Files', '');
    lines.push('<details>');
    lines.push('<summary>Click to expand detailed analysis</summary>', '');
    for (const result of aligned) {
      const dateInfo = result.sourceDate && result.targetDate 
        ? ` (Source: ${result.sourceDate}, Target: ${result.targetDate})`
        : '';
      lines.push(`### ${result.file}${dateInfo}`, '');
      lines.push(result.analysis || 'No analysis available');
      lines.push('', '---', '');
    }
    lines.push('</details>', '');
  }

  return lines.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function runOnboard(options: {
  source: string;
  target: string;
  docsFolder: string;
  language: string;
  model: string;
  output?: string;
  file?: string;
  limit?: number;
}): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('Error: ANTHROPIC_API_KEY required'));
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const languageName = getLanguageName(options.language);
  
  console.log(chalk.blue('\n🚀 Onboarding Analysis\n'));
  console.log(`Source: ${options.source}`);
  console.log(`Target: ${options.target}`);
  console.log(`Docs: ${options.docsFolder}`);
  console.log(`Language: ${languageName} (${options.language})`);
  console.log(`Model: ${options.model}\n`);

  const { sourceOnly, targetOnly, both } = discoverFiles(
    options.source, 
    options.target, 
    options.docsFolder
  );

  const results: FileResult[] = [];

  // Apply file filter if specified
  let filteredSourceOnly = sourceOnly;
  let filteredTargetOnly = targetOnly;
  let filteredBoth = both;

  if (options.file) {
    filteredSourceOnly = sourceOnly.filter(f => f === options.file);
    filteredTargetOnly = targetOnly.filter(f => f === options.file);
    filteredBoth = both.filter(f => f === options.file);
  }

  // Source-only → TRANSLATE
  for (const file of filteredSourceOnly) {
    const sourceDate = getGitLastModified(options.source, options.docsFolder, file);
    results.push({ file, status: 'translate', sourceDate });
  }

  // Target-only → SUGGEST
  for (const file of filteredTargetOnly) {
    const targetDate = getGitLastModified(options.target, options.docsFolder, file);
    results.push({ file, status: 'suggest', targetDate });
  }

  // Both → Compare
  const toCompare = options.limit ? filteredBoth.slice(0, options.limit) : filteredBoth;
  
  for (let i = 0; i < toCompare.length; i++) {
    const file = toCompare[i];
    process.stdout.write(`\rComparing: ${i + 1}/${toCompare.length} ${file}`.padEnd(60));
    
    try {
      const sourcePath = path.join(options.source, options.docsFolder, file);
      const targetPath = path.join(options.target, options.docsFolder, file);
      
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
      const targetContent = fs.readFileSync(targetPath, 'utf-8');
      
      // Get git dates for both files
      const sourceDate = getGitLastModified(options.source, options.docsFolder, file);
      const targetDate = getGitLastModified(options.target, options.docsFolder, file);
      
      // Step 1: Deterministic code analysis (fast, accurate)
      const sourceBlocks = extractCodeBlocks(sourceContent);
      const targetBlocks = extractCodeBlocks(targetContent);
      const codeAnalysis = compareCodeBlocks(sourceBlocks, targetBlocks);
      
      // Step 2: Claude prose analysis
      const { status, analysis } = await compareDocuments(
        client, sourceContent, targetContent, options.language, options.model
      );
      
      results.push({ file, status, analysis, codeAnalysis, sourceDate, targetDate });
    } catch (err) {
      results.push({ 
        file, 
        status: 'error', 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  }
  
  console.log('\r' + ' '.repeat(60) + '\r');

  const report = generateReport(options, results);
  
  if (options.output) {
    fs.writeFileSync(options.output, report);
    console.log(chalk.green(`📄 Report: ${options.output}`));
  } else {
    console.log(report);
  }

  // Summary
  console.log(chalk.blue('\n📊 Summary:'));
  console.log(`  ✅ Aligned: ${results.filter(r => r.status === 'aligned').length}`);
  console.log(`  📋 Review: ${results.filter(r => r.status === 'review').length}`);
  console.log(`  📄 Translate: ${results.filter(r => r.status === 'translate').length}`);
  console.log(`  🎯 Target-only: ${results.filter(r => r.status === 'suggest').length}`);
}

// ============================================================================
// CLI
// ============================================================================

const program = new Command();

program
  .name('onboard')
  .description('Check translation alignment')
  .requiredOption('-s, --source <path>', 'Source repository')
  .requiredOption('-t, --target <path>', 'Target repository')
  .option('-d, --docs-folder <folder>', 'Docs folder', 'lectures')
  .option('-l, --language <code>', 'Target language ISO code (e.g., zh-cn, ja, es)', 'zh-cn')
  .option('-m, --model <model>', 'Claude model to use', 'claude-sonnet-4-5-20250929')
  .option('-o, --output <path>', 'Output report path')
  .option('-f, --file <filename>', 'Analyze only this specific file')
  .option('--limit <n>', 'Limit files to compare', parseInt)
  .action(runOnboard);

program.parse();
