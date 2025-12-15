/**
 * Structural Analyzer for Translation Alignment
 * 
 * Analyzes the structure of source and target repositories without
 * performing any translation. Compares:
 * - Section counts and hierarchy
 * - Code blocks and math blocks
 * - Config file structure (_toc.yml, _config.yml, environment.yml)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MystParser } from '../../src/parser';
import { extractHeadingMap } from '../../src/heading-map';
import {
  MarkdownAnalysis,
  ConfigAnalysis,
  HeadingInfo,
  AlignmentStatus,
  ConfigStatus,
  Section,
  CodeBlock,
  CodeBlockComparison,
  CodeIntegrity,
  DiffLine,
} from './types';

export class StructuralAnalyzer {
  private parser: MystParser;

  constructor() {
    this.parser = new MystParser();
  }

  /**
   * Analyze a markdown file from both source and target repos
   */
  async analyzeMarkdownFile(
    sourceRoot: string,
    targetRoot: string,
    relativePath: string
  ): Promise<MarkdownAnalysis> {
    const sourcePath = path.join(sourceRoot, relativePath);
    const targetPath = path.join(targetRoot, relativePath);

    const sourceExists = fs.existsSync(sourcePath);
    const targetExists = fs.existsSync(targetPath);

    const analysis: MarkdownAnalysis = {
      file: relativePath,
      fileType: 'markdown',
      source: null,
      target: null,
      comparison: null,
      codeIntegrity: null,
      status: 'missing',
      issues: [],
    };

    // Analyze source file
    if (sourceExists) {
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
      const sourceParsed = await this.parser.parseSections(sourceContent, sourcePath);
      
      analysis.source = {
        exists: true,
        sections: sourceParsed.sections.length,
        subsections: this.countAllSubsections(sourceParsed.sections),
        codeBlocks: this.countCodeBlocks(sourceContent),
        mathBlocks: this.countMathBlocks(sourceContent),
        wordCount: this.countWords(sourceContent),
        headingHierarchy: this.buildHeadingHierarchy(sourceParsed.sections),
      };
    }

    // Analyze target file
    if (targetExists) {
      const targetContent = fs.readFileSync(targetPath, 'utf-8');
      const targetParsed = await this.parser.parseSections(targetContent, targetPath);
      
      // Check for heading-map (extractHeadingMap returns a Map)
      const headingMap = extractHeadingMap(targetContent);
      
      analysis.target = {
        exists: true,
        sections: targetParsed.sections.length,
        subsections: this.countAllSubsections(targetParsed.sections),
        codeBlocks: this.countCodeBlocks(targetContent),
        mathBlocks: this.countMathBlocks(targetContent),
        charCount: this.countChars(targetContent),
        headingHierarchy: this.buildHeadingHierarchy(targetParsed.sections),
        hasHeadingMap: headingMap.size > 0,
      };
    }

    // Compare if both exist
    if (analysis.source && analysis.target) {
      const sectionMatch = analysis.source.sections === analysis.target.sections;
      const subsectionMatch = analysis.source.subsections === analysis.target.subsections;
      const codeBlockMatch = analysis.source.codeBlocks === analysis.target.codeBlocks;
      const mathBlockMatch = analysis.source.mathBlocks === analysis.target.mathBlocks;

      // Calculate structure score
      let score = 0;
      if (sectionMatch) score += 40;
      if (subsectionMatch) score += 30;
      if (codeBlockMatch) score += 15;
      if (mathBlockMatch) score += 15;

      analysis.comparison = {
        sectionMatch,
        subsectionMatch,
        structureScore: score,
        codeBlockMatch,
        mathBlockMatch,
      };

      // Determine status
      analysis.status = this.classifyMarkdownAlignment(analysis);

      // Generate issues
      if (!sectionMatch) {
        const diff = analysis.source.sections - analysis.target.sections;
        if (diff > 0) {
          analysis.issues.push(`Target is missing ${diff} section(s)`);
        } else {
          analysis.issues.push(`Target has ${-diff} extra section(s)`);
        }
      }
      if (!subsectionMatch) {
        const diff = analysis.source.subsections - analysis.target.subsections;
        if (diff > 0) {
          analysis.issues.push(`Target is missing ${diff} subsection(s)`);
        } else {
          analysis.issues.push(`Target has ${-diff} extra subsection(s)`);
        }
      }
      if (!codeBlockMatch) {
        analysis.issues.push(`Code block count mismatch: source=${analysis.source.codeBlocks}, target=${analysis.target.codeBlocks}`);
      }
      if (!mathBlockMatch) {
        analysis.issues.push(`Math block count mismatch: source=${analysis.source.mathBlocks}, target=${analysis.target.mathBlocks}`);
      }
      if (!analysis.target.hasHeadingMap) {
        analysis.issues.push('Target file is missing heading-map');
      }

      // Phase 1b: Code block integrity check
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
      const targetContent = fs.readFileSync(targetPath, 'utf-8');
      analysis.codeIntegrity = this.analyzeCodeIntegrity(sourceContent, targetContent);
      
      // Add code integrity issues
      if (analysis.codeIntegrity.modifiedBlocks > 0) {
        analysis.issues.push(`${analysis.codeIntegrity.modifiedBlocks} code block(s) have been modified`);
      }
      if (analysis.codeIntegrity.missingBlocks > 0) {
        analysis.issues.push(`${analysis.codeIntegrity.missingBlocks} code block(s) missing in target`);
      }
      if (analysis.codeIntegrity.extraBlocks > 0) {
        analysis.issues.push(`${analysis.codeIntegrity.extraBlocks} extra code block(s) in target`);
      }
    } else if (analysis.source && !analysis.target) {
      analysis.status = 'missing';
      analysis.issues.push('File does not exist in target repository');
    } else if (!analysis.source && analysis.target) {
      analysis.status = 'extra';
      analysis.issues.push('File exists only in target repository (localization?)');
    }

    return analysis;
  }

  /**
   * Analyze a config file (_toc.yml, _config.yml, environment.yml)
   */
  async analyzeConfigFile(
    sourceRoot: string,
    targetRoot: string,
    filename: string
  ): Promise<ConfigAnalysis> {
    const sourcePath = path.join(sourceRoot, filename);
    const targetPath = path.join(targetRoot, filename);

    const sourceExists = fs.existsSync(sourcePath);
    const targetExists = fs.existsSync(targetPath);

    const fileType = this.getConfigFileType(filename);

    const analysis: ConfigAnalysis = {
      file: filename,
      fileType,
      source: null,
      target: null,
      comparison: null,
      status: 'missing',
      issues: [],
    };

    // Analyze source file
    if (sourceExists) {
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
      analysis.source = this.analyzeConfigContent(sourceContent, fileType);
    }

    // Analyze target file
    if (targetExists) {
      const targetContent = fs.readFileSync(targetPath, 'utf-8');
      analysis.target = this.analyzeConfigContent(targetContent, fileType);
    }

    // Compare if both exist
    if (analysis.source && analysis.target) {
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
      const targetContent = fs.readFileSync(targetPath, 'utf-8');
      
      const identical = sourceContent.trim() === targetContent.trim();
      const differences: string[] = [];

      // Check structure match (same keys/entries, possibly different values)
      let structureMatch = true;
      
      if (fileType === 'toc') {
        structureMatch = analysis.source.entries === analysis.target.entries;
        if (!structureMatch) {
          differences.push(`Entry count: source=${analysis.source.entries}, target=${analysis.target.entries}`);
        }
      } else if (fileType === 'config') {
        const sourceKeys = new Set(analysis.source.keys || []);
        const targetKeys = new Set(analysis.target.keys || []);
        const missingKeys = [...sourceKeys].filter(k => !targetKeys.has(k));
        const extraKeys = [...targetKeys].filter(k => !sourceKeys.has(k));
        
        if (missingKeys.length > 0) {
          structureMatch = false;
          differences.push(`Missing keys in target: ${missingKeys.join(', ')}`);
        }
        if (extraKeys.length > 0) {
          // Extra keys might be localization, not necessarily diverged
          differences.push(`Extra keys in target: ${extraKeys.join(', ')}`);
        }
      } else if (fileType === 'environment') {
        structureMatch = analysis.source.packages === analysis.target.packages;
        if (!structureMatch) {
          differences.push(`Package count: source=${analysis.source.packages}, target=${analysis.target.packages}`);
        }
      }

      analysis.comparison = {
        identical,
        structureMatch,
        differences,
      };

      // Determine status
      if (identical) {
        analysis.status = 'identical';
      } else if (structureMatch) {
        analysis.status = 'structure-match';
      } else {
        analysis.status = 'diverged';
      }

      // Generate issues
      if (!identical && differences.length > 0) {
        analysis.issues = differences;
      }
    } else if (analysis.source && !analysis.target) {
      analysis.status = 'missing';
      analysis.issues.push('Config file does not exist in target repository');
    } else if (!analysis.source && analysis.target) {
      analysis.status = 'extra';
      analysis.issues.push('Config file exists only in target repository');
    }

    return analysis;
  }

  /**
   * Get all markdown files in a directory (recursively)
   */
  getMarkdownFiles(rootPath: string, docsFolder: string): string[] {
    const basePath = docsFolder === '.' || docsFolder === '' 
      ? rootPath 
      : path.join(rootPath, docsFolder);
    
    if (!fs.existsSync(basePath)) {
      return [];
    }

    const files: string[] = [];
    this.walkDirectory(basePath, (filePath) => {
      if (filePath.endsWith('.md')) {
        // Get relative path from docs folder
        const relativePath = docsFolder === '.' || docsFolder === ''
          ? path.relative(rootPath, filePath)
          : path.relative(basePath, filePath);
        files.push(relativePath);
      }
    });

    return files.sort();
  }

  /**
   * Get config files that exist in either repo
   */
  getConfigFiles(sourceRoot: string, targetRoot: string): string[] {
    const configFiles = ['_toc.yml', '_config.yml', 'environment.yml'];
    const found: string[] = [];

    for (const file of configFiles) {
      if (fs.existsSync(path.join(sourceRoot, file)) || 
          fs.existsSync(path.join(targetRoot, file))) {
        found.push(file);
      }
    }

    return found;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private countAllSubsections(sections: Section[]): number {
    let count = 0;
    for (const section of sections) {
      count += this.countSubsectionsRecursive(section.subsections);
    }
    return count;
  }

  private countSubsectionsRecursive(subsections: Section[]): number {
    let count = subsections.length;
    for (const sub of subsections) {
      count += this.countSubsectionsRecursive(sub.subsections);
    }
    return count;
  }

  private countCodeBlocks(content: string): number {
    // Count fenced code blocks (``` or ~~~)
    const matches = content.match(/^(?:```|~~~)/gm);
    // Each code block has open and close, so divide by 2
    return matches ? Math.floor(matches.length / 2) : 0;
  }

  private countMathBlocks(content: string): number {
    // Count display math blocks ($$...$$)
    const matches = content.match(/^\$\$/gm);
    return matches ? Math.floor(matches.length / 2) : 0;
  }

  private countWords(content: string): number {
    // Simple word count for English
    const text = content.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
    const words = text.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }

  private countChars(content: string): number {
    // Character count (more meaningful for CJK languages)
    const text = content.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
    return text.replace(/\s/g, '').length;
  }

  private buildHeadingHierarchy(sections: Section[]): HeadingInfo[] {
    return sections.map(section => this.sectionToHeadingInfo(section));
  }

  private sectionToHeadingInfo(section: Section): HeadingInfo {
    return {
      level: section.level,
      id: section.id,
      text: section.heading.replace(/^#+\s+/, ''),
      subsections: section.subsections.map(sub => this.sectionToHeadingInfo(sub)),
    };
  }

  private classifyMarkdownAlignment(analysis: MarkdownAnalysis): AlignmentStatus {
    if (!analysis.comparison || !analysis.source || !analysis.target) return 'missing';

    const score = analysis.comparison.structureScore;
    
    // Check for major section mismatch (more than 50% difference)
    const sourceSections = analysis.source.sections;
    const targetSections = analysis.target.sections;
    if (sourceSections > 0 && targetSections > 0) {
      const ratio = Math.min(sourceSections, targetSections) / Math.max(sourceSections, targetSections);
      if (ratio < 0.5) {
        return 'diverged'; // Major structural difference
      }
    }
    
    // If one has sections and the other doesn't
    if ((sourceSections === 0) !== (targetSections === 0)) {
      return 'diverged';
    }

    if (score === 100) return 'aligned';
    if (score >= 85) return 'likely-aligned';
    if (score >= 55) return 'needs-review';
    return 'diverged';
  }

  private getConfigFileType(filename: string): 'toc' | 'config' | 'environment' {
    if (filename === '_toc.yml') return 'toc';
    if (filename === '_config.yml') return 'config';
    return 'environment';
  }

  private analyzeConfigContent(
    content: string, 
    fileType: 'toc' | 'config' | 'environment'
  ): { exists: boolean; entries?: number; keys?: string[]; packages?: number } {
    try {
      const parsed = yaml.load(content) as Record<string, unknown>;
      
      if (fileType === 'toc') {
        // Count chapters/parts in TOC
        const entries = this.countTocEntries(parsed);
        return { exists: true, entries };
      } else if (fileType === 'config') {
        // Get top-level keys
        const keys = Object.keys(parsed || {});
        return { exists: true, keys };
      } else {
        // Count dependencies in environment.yml
        const deps = (parsed as { dependencies?: unknown[] })?.dependencies || [];
        return { exists: true, packages: deps.length };
      }
    } catch {
      return { exists: true };
    }
  }

  private countTocEntries(toc: Record<string, unknown>): number {
    let count = 0;
    
    // Handle different TOC formats
    if (Array.isArray(toc)) {
      count = toc.length;
    } else if (toc && typeof toc === 'object') {
      // Check for chapters/parts arrays
      const chapters = (toc as { chapters?: unknown[] }).chapters;
      const parts = (toc as { parts?: unknown[] }).parts;
      
      if (Array.isArray(chapters)) {
        count += chapters.length;
      }
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part && typeof part === 'object') {
            const partChapters = (part as { chapters?: unknown[] }).chapters;
            if (Array.isArray(partChapters)) {
              count += partChapters.length;
            }
          }
        }
      }
    }
    
    return count;
  }

  private walkDirectory(dir: string, callback: (filePath: string) => void): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip common non-content directories
        if (!['node_modules', '.git', '_build', '__pycache__', '.ipynb_checkpoints'].includes(entry.name)) {
          this.walkDirectory(fullPath, callback);
        }
      } else if (entry.isFile()) {
        callback(fullPath);
      }
    }
  }

  // ============================================================================
  // CODE BLOCK INTEGRITY (Phase 1b)
  // ============================================================================

  /**
   * Analyze code block integrity between source and target
   */


  analyzeCodeIntegrity(sourceContent: string, targetContent: string): CodeIntegrity {
    // Extract only actual code blocks (code-cell directives and standard markdown code blocks)
    const sourceBlocks = this.extractCodeBlocks(sourceContent);
    const targetBlocks = this.extractCodeBlocks(targetContent);
    
    const comparisons: CodeBlockComparison[] = [];
    let matchedBlocks = 0;
    let modifiedBlocks = 0;
    let missingBlocks = 0;
    let extraBlocks = 0;
    const issues: string[] = [];

    // Compare blocks by position
    const maxBlocks = Math.max(sourceBlocks.length, targetBlocks.length);
    
    for (let i = 0; i < maxBlocks; i++) {
      const sourceBlock = sourceBlocks[i];
      const targetBlock = targetBlocks[i];
      
      if (sourceBlock && targetBlock) {
        const comparison = this.compareCodeBlock(sourceBlock, targetBlock, i);
        comparisons.push(comparison);
        
        if (comparison.match === 'identical' || comparison.match === 'normalized-match') {
          matchedBlocks++;
        } else {
          modifiedBlocks++;
          issues.push(`Code block ${i + 1} (${sourceBlock.language || 'unknown'}): modified`);
        }
      } else if (sourceBlock && !targetBlock) {
        missingBlocks++;
        comparisons.push({
          index: i,
          language: sourceBlock.language,
          sourceContent: sourceBlock.content,
          targetContent: '',
          sourceNormalized: sourceBlock.contentNormalized,
          targetNormalized: '',
          match: 'missing',
          differences: ['Block missing in target'],
        });
        issues.push(`Code block ${i + 1} (${sourceBlock.language || 'unknown'}): missing in target`);
      } else if (!sourceBlock && targetBlock) {
        extraBlocks++;
        comparisons.push({
          index: i,
          language: targetBlock.language,
          sourceContent: '',
          targetContent: targetBlock.content,
          sourceNormalized: '',
          targetNormalized: targetBlock.contentNormalized,
          match: 'extra',
          differences: ['Extra block in target'],
        });
        issues.push(`Code block ${i + 1} (${targetBlock.language || 'unknown'}): extra in target`);
      }
    }
    
    // Calculate score: 100% if all blocks match, decreases with modifications
    const score = sourceBlocks.length > 0 
      ? Math.round((matchedBlocks / sourceBlocks.length) * 100) 
      : 100;

    // Check for localization patterns that might explain score differences
    const localizationNote = this.detectLocalizationPatterns(targetBlocks, comparisons);

    return {
      sourceBlocks: sourceBlocks.length,
      targetBlocks: targetBlocks.length,
      matchedBlocks,
      modifiedBlocks,
      missingBlocks,
      extraBlocks,
      score,
      comparisons,
      issues,
      localizationNote,
    };
  }

  /**
   * Detect common localization patterns in target code blocks
   * Returns a note explaining potential score impact
   */
  private detectLocalizationPatterns(
    targetBlocks: CodeBlock[],
    comparisons: CodeBlockComparison[]
  ): string | undefined {
    const patterns: string[] = [];
    
    // Known localization patterns
    const LOCALIZATION_PATTERNS = [
      { pattern: /plt\.rcParams\['font\./i, name: 'Chinese/CJK font configuration' },
      { pattern: /matplotlib\.rc\('font'/i, name: 'matplotlib font settings' },
      { pattern: /rcParams\['axes\.unicode_minus'\]/i, name: 'Unicode minus handling' },
      { pattern: /SimHei|SimSun|Microsoft YaHei|STHeiti|PingFang/i, name: 'CJK font family' },
      { pattern: /font\.sans-serif.*=.*\[/i, name: 'font fallback list' },
    ];
    
    // Check target blocks for localization patterns
    for (const block of targetBlocks) {
      for (const { pattern, name } of LOCALIZATION_PATTERNS) {
        if (pattern.test(block.content)) {
          if (!patterns.includes(name)) {
            patterns.push(name);
          }
        }
      }
    }
    
    // Check if any modified blocks have extra lines (additions vs modifications)
    const blocksWithAdditions = comparisons.filter(c => {
      if (c.match !== 'modified' || !c.targetContent) return false;
      const sourceLines = c.sourceContent.split('\n').length;
      const targetLines = c.targetContent.split('\n').length;
      return targetLines > sourceLines;
    });
    
    // Only generate note if localization patterns are detected
    if (patterns.length > 0) {
      const notes: string[] = [];
      notes.push(`Localization patterns detected: ${patterns.join(', ')}`);
      
      if (blocksWithAdditions.length > 0) {
        notes.push(`${blocksWithAdditions.length} block(s) have localization additions`);
      }
      
      return notes.join('. ');
    }
    
    return undefined;
  }

  /**
   * Extract code blocks from content.
   * Only extracts:
   * 1. {code-cell} directives: ```{code-cell} python3
   * 2. Standard markdown code blocks with language: ```python
   */
  extractCodeBlocks(content: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = content.split('\n');
    
    let inCodeBlock = false;
    let isCodeBlock = false;  // True if this is a code-cell or standard code block
    let currentLanguage = '';
    let blockContent: string[] = [];
    let startLine = 0;
    let blockIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for fence start (``` or ~~~)
      if (!inCodeBlock && (line.startsWith('```') || line.startsWith('~~~'))) {
        inCodeBlock = true;
        startLine = i + 1;
        blockContent = [];
        
        // Check for {code-cell} directive: ```{code-cell} python3
        const codeCellMatch = line.match(/^(?:```|~~~)\{code-cell\}\s*(\w*)/i);
        if (codeCellMatch) {
          isCodeBlock = true;
          currentLanguage = codeCellMatch[1] || 'python';  // Default to python if not specified
          continue;
        }
        
        // Check for standard markdown code block: ```python
        const standardMatch = line.match(/^(?:```|~~~)(\w+)/);
        if (standardMatch && standardMatch[1]) {
          isCodeBlock = true;
          currentLanguage = standardMatch[1];
          continue;
        }
        
        // Other directive or no language - not a code block we care about
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
            contentNormalized: this.normalizeCodeContent(rawContent, currentLanguage),
            startLine: startLine,
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
   * Normalize code content by removing comments and extra whitespace
   * This allows matching code that differs only in comments
   */
  private normalizeCodeContent(content: string, language: string): string {
    let normalized = content;
    
    // Step 1: Normalize strings to << STRING >> placeholders (before comment handling)
    // This handles translated labels like label="estimate" → label="<< STRING >>"
    // Triple-quoted strings first (Python docstrings)
    normalized = normalized.replace(/"""[\s\S]*?"""/g, '"""<< STRING >>"""');
    normalized = normalized.replace(/'''[\s\S]*?'''/g, "'''<< STRING >>'''");
    // f-strings (Python) - keep structure, placeholder content
    normalized = normalized.replace(/f"[^"]*"/g, 'f"<< STRING >>"');
    normalized = normalized.replace(/f'[^']*'/g, "f'<< STRING >>'");
    // Regular double-quoted strings
    normalized = normalized.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '"<< STRING >>"');
    // Regular single-quoted strings
    normalized = normalized.replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "'<< STRING >>'");
    
    // Step 2: Normalize MyST frontmatter captions (translated figure captions)
    // Matches: caption: "..." or caption: '...' or caption: bare text
    normalized = normalized.replace(/^(\s*caption:\s*).*$/gm, '$1<< CAPTION >>');
    
    // Step 3: Replace comments with COMMENT placeholder (preserves line structure)
    // Determine comment style based on language patterns
    const lang = language.toLowerCase();
    const useHashComments = lang.startsWith('python') || lang.startsWith('ipython') || 
                            lang.startsWith('julia') || lang.startsWith('r') ||
                            ['py', 'jl', 'rb', 'ruby', 'sh', 'bash', 'shell', 'zsh'].includes(lang);
    const useSlashComments = lang.startsWith('javascript') || lang.startsWith('typescript') ||
                             ['js', 'ts', 'java', 'c', 'cpp', 'cs', 'go', 'rust', 'rs'].includes(lang);
    
    if (useHashComments) {
      // Replace # comments (both full-line and inline) with placeholder
      normalized = normalized.replace(/^(\s*)#.*$/gm, '$1# << COMMENT >>');
      normalized = normalized.replace(/([^#])#(?!\s*<< COMMENT >>).*$/gm, '$1# << COMMENT >>');
    } else if (useSlashComments) {
      // Replace // and /* */ comments with placeholder
      normalized = normalized.replace(/^(\s*)\/\/.*$/gm, '$1// << COMMENT >>');
      normalized = normalized.replace(/([^/])\/\/(?!\s*<< COMMENT >>).*$/gm, '$1// << COMMENT >>');
      normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '/* << COMMENT >> */');
    }
    // For unknown languages, don't strip comments - compare raw
    
    // Step 4: Normalize whitespace (trim lines, collapse multiple spaces, collapse multiple blank lines)
    normalized = normalized
      .split('\n')
      .map(line => line.trim().replace(/\s+/g, ' '))  // Trim and collapse multiple spaces to single
      .filter((line, i, arr) => {
        // Keep non-empty lines and at most one blank line in a row
        if (line !== '') return true;
        if (i === 0) return false;
        return arr[i - 1] !== '';
      })
      .join('\n')
      .trim();
    
    return normalized;
  }

  /**
   * Compare two code blocks
   */
  private compareCodeBlock(source: CodeBlock, target: CodeBlock, index: number): CodeBlockComparison {
    const differences: string[] = [];
    
    // Check for exact match first
    if (source.content === target.content) {
      return {
        index,
        language: source.language,
        sourceContent: source.content,
        targetContent: target.content,
        sourceNormalized: source.contentNormalized,
        targetNormalized: target.contentNormalized,
        match: 'identical',
      };
    }
    
    // Check for normalized match (same code, different comments/whitespace)
    if (source.contentNormalized === target.contentNormalized) {
      differences.push('Differs only in comments or whitespace');
      return {
        index,
        language: source.language,
        sourceContent: source.content,
        targetContent: target.content,
        sourceNormalized: source.contentNormalized,
        targetNormalized: target.contentNormalized,
        match: 'normalized-match',
        differences,
      };
    }
    
    // Code is different - generate human-readable differences
    if (source.language !== target.language) {
      differences.push(`Language changed: ${source.language || 'none'} → ${target.language || 'none'}`);
    }
    
    const sourceLines = source.content.split('\n').length;
    const targetLines = target.content.split('\n').length;
    if (sourceLines !== targetLines) {
      differences.push(`Line count changed: ${sourceLines} → ${targetLines}`);
    }
    
    // Check for common modifications
    if (source.content.includes('print') !== target.content.includes('print')) {
      differences.push('Print statement changes detected');
    }
    
    if (differences.length === 0) {
      differences.push('Code content differs');
    }
    
    // Generate diff lines from NORMALIZED content to filter out translation differences
    // This shows only actual code logic changes (comments/strings are normalized)
    const diffLines = this.generateDiffLines(source.contentNormalized, target.contentNormalized);
    
    return {
      index,
      language: source.language,
      sourceContent: source.content,
      targetContent: target.content,
      sourceNormalized: source.contentNormalized,
      targetNormalized: target.contentNormalized,
      match: 'modified',
      differences,
      diffLines,
    };
  }

  /**
   * Generate diff lines between source and target content.
   * Uses LCS (Longest Common Subsequence) algorithm for accurate diff.
   */
  private generateDiffLines(sourceContent: string, targetContent: string): DiffLine[] {
    const sourceLines = sourceContent.split('\n');
    const targetLines = targetContent.split('\n');
    
    // Use LCS (Longest Common Subsequence) algorithm for proper diff
    // This handles insertions/deletions correctly without false positives
    const lcs = this.computeLCS(sourceLines, targetLines);
    
    const diffLines: DiffLine[] = [];
    let srcIdx = 0;
    let tgtIdx = 0;
    let lcsIdx = 0;
    
    while (srcIdx < sourceLines.length || tgtIdx < targetLines.length) {
      // Check if current lines are part of LCS (unchanged)
      if (lcsIdx < lcs.length && 
          srcIdx < sourceLines.length && 
          tgtIdx < targetLines.length &&
          sourceLines[srcIdx] === lcs[lcsIdx] && 
          targetLines[tgtIdx] === lcs[lcsIdx]) {
        diffLines.push({
          type: 'unchanged',
          content: sourceLines[srcIdx],
          lineNumber: srcIdx + 1,
        });
        srcIdx++;
        tgtIdx++;
        lcsIdx++;
      } else {
        // Handle removed lines (in source but not matching LCS)
        if (srcIdx < sourceLines.length && 
            (lcsIdx >= lcs.length || sourceLines[srcIdx] !== lcs[lcsIdx])) {
          diffLines.push({
            type: 'removed',
            content: sourceLines[srcIdx],
            lineNumber: srcIdx + 1,
          });
          srcIdx++;
        }
        // Handle added lines (in target but not matching LCS)
        else if (tgtIdx < targetLines.length && 
                 (lcsIdx >= lcs.length || targetLines[tgtIdx] !== lcs[lcsIdx])) {
          diffLines.push({
            type: 'added',
            content: targetLines[tgtIdx],
            lineNumber: tgtIdx + 1,
          });
          tgtIdx++;
        }
      }
    }
    
    return diffLines;
  }

  /**
   * Compute Longest Common Subsequence of two string arrays.
   * Used for generating accurate diffs.
   */
  private computeLCS(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;
    
    // Build LCS length table
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        lcs.unshift(a[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  }
}
