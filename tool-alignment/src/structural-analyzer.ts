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
}
