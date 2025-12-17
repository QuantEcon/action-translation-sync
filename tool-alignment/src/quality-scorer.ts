/**
 * Translation Quality Scorer
 * 
 * Uses Claude models to assess translation quality per-section.
 * Evaluates: accuracy, fluency, terminology, completeness
 * 
 * Supported models:
 * - haiku3_5: Claude 3.5 Haiku (~$0.31 for lecture-intro)
 * - haiku4_5: Claude 4.5 Haiku (~$1.24 for lecture-intro)
 * - sonnet4_5: Claude 4.5 Sonnet (~$3.72 for lecture-intro)
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { 
  QualityAssessment, 
  FileQualityAssessment, 
  SectionQuality, 
  QualityFlag,
  QualityAssessmentOptions,
  MarkdownAnalysis,
  ProgressCallback
} from './types';
import { Section } from '../../src/types';
import { MystParser } from '../../src/parser';

// Model configurations
export interface ModelConfig {
  id: string;           // API model ID
  name: string;         // Display name
  shortName: string;    // For filenames (haiku3_5, haiku4_5, sonnet4_5)
  inputCostPerMTK: number;   // $ per million input tokens
  outputCostPerMTK: number;  // $ per million output tokens
}

export const MODELS: Record<string, ModelConfig> = {
  haiku3_5: {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    shortName: 'haiku3_5',
    inputCostPerMTK: 0.25,
    outputCostPerMTK: 1.25,
  },
  haiku4_5: {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude 4.5 Haiku',
    shortName: 'haiku4_5',
    inputCostPerMTK: 1.0,
    outputCostPerMTK: 5.0,
  },
  sonnet4_5: {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude 4.5 Sonnet',
    shortName: 'sonnet4_5',
    inputCostPerMTK: 3.0,
    outputCostPerMTK: 15.0,
  },
};

// Default model
export const DEFAULT_MODEL = 'haiku3_5';

/**
 * Interface for Claude's JSON response
 */
interface HaikuQualityResponse {
  accuracy: number;
  fluency: number;
  terminology: number;
  completeness: number;
  overall: number;
  flags: string[];
  notes: string;
}

/**
 * Glossary type for terminology lookup
 */
interface Glossary {
  [englishTerm: string]: string;
}

export class QualityScorer {
  private client: Anthropic;
  private glossary: Glossary | null = null;
  private targetLanguage: string;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;
  private onProgress: ProgressCallback | undefined;
  private modelConfig: ModelConfig;

  constructor(options: QualityAssessmentOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.targetLanguage = options.targetLanguage;
    this.onProgress = options.onProgress;
    
    // Get model config
    const modelKey = options.model || DEFAULT_MODEL;
    this.modelConfig = MODELS[modelKey];
    if (!this.modelConfig) {
      throw new Error(`Unknown model: ${modelKey}. Available: ${Object.keys(MODELS).join(', ')}`);
    }
    
    if (options.glossaryPath) {
      this.loadGlossary(options.glossaryPath);
    }
  }

  /**
   * Get the model being used
   */
  getModel(): string {
    return this.modelConfig.id;
  }

  /**
   * Get the model display name
   */
  getModelName(): string {
    return this.modelConfig.name;
  }

  /**
   * Get the model short name (for filenames)
   */
  getModelShortName(): string {
    return this.modelConfig.shortName;
  }

  /**
   * Load glossary from JSON file
   * Supports both flat format {en: zh} and structured format {terms: [{en, zh-cn}]}
   */
  private loadGlossary(glossaryPath: string): void {
    try {
      const content = fs.readFileSync(glossaryPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Check if it's the structured format with terms array
      if (data.terms && Array.isArray(data.terms)) {
        // Convert structured format to flat format
        this.glossary = {};
        for (const term of data.terms) {
          const en = term.en;
          const translated = term[this.targetLanguage] || term['zh-cn'] || term.translated;
          if (en && translated) {
            this.glossary[en] = translated;
          }
        }
        console.log(`   Loaded ${Object.keys(this.glossary).length} glossary terms`);
      } else {
        // Assume flat format
        this.glossary = data;
      }
    } catch (error) {
      console.warn(`Warning: Could not load glossary from ${glossaryPath}`);
    }
  }

  /**
   * Format glossary for prompt
   */
  private formatGlossaryForPrompt(): string {
    if (!this.glossary || Object.keys(this.glossary).length === 0) {
      return '';
    }

    const terms = Object.entries(this.glossary)
      .map(([en, translated]) => `- "${en}" → "${translated}"`)
      .join('\n');

    return `## Required Terminology (Glossary)
Use these translations for technical terms:
${terms}
`;
  }

  /**
   * Estimate cost for quality assessment
   * Based on actual usage: ~4300 tokens input per section (prompt + EN + ZH content)
   * Plus full glossary (~3900 tokens for 357 terms)
   */
  estimateCost(sectionCount: number): { inputTokens: number; outputTokens: number; totalUSD: number } {
    // Base: ~4300 tokens per section (prompt ~400 + content ~3900)
    // Glossary: ~3900 tokens (357 terms × ~11 tokens each)
    // Output: ~250 tokens per section (JSON response)
    const glossaryTokens = 3900;  // Full glossary
    const inputTokens = sectionCount * (4300 + glossaryTokens);
    const outputTokens = sectionCount * 250;
    
    const inputCost = (inputTokens / 1_000_000) * this.modelConfig.inputCostPerMTK;
    const outputCost = (outputTokens / 1_000_000) * this.modelConfig.outputCostPerMTK;
    
    return {
      inputTokens,
      outputTokens,
      totalUSD: inputCost + outputCost,
    };
  }

  /**
   * Get actual cost from tracked tokens
   */
  getActualCost(): { inputTokens: number; outputTokens: number; totalUSD: number } {
    const inputCost = (this.totalInputTokens / 1_000_000) * this.modelConfig.inputCostPerMTK;
    const outputCost = (this.totalOutputTokens / 1_000_000) * this.modelConfig.outputCostPerMTK;
    
    return {
      inputTokens: this.totalInputTokens,
      outputTokens: this.totalOutputTokens,
      totalUSD: inputCost + outputCost,
    };
  }

  /**
   * Assess quality of a single section
   */
  async assessSection(
    englishContent: string,
    translatedContent: string,
    sectionId: string,
    englishHeading: string,
    translatedHeading: string
  ): Promise<SectionQuality> {
    const glossarySection = this.formatGlossaryForPrompt();

    const prompt = `You are a translation quality assessor. Evaluate this translation from English to ${this.targetLanguage}.

## English Source
${englishContent}

## Translation
${translatedContent}

${glossarySection}

## Assess on these criteria (0-100 each):

1. **Accuracy** - Is the meaning preserved correctly?
   - 90-100: Perfect/near-perfect accuracy
   - 70-89: Minor inaccuracies, meaning clear
   - 50-69: Some meaning lost or changed
   - <50: Significant errors

2. **Fluency** - Does it read naturally in ${this.targetLanguage}?
   - 90-100: Native-level fluency
   - 70-89: Readable with minor awkwardness
   - 50-69: Understandable but unnatural
   - <50: Difficult to read

3. **Terminology** - Are technical terms translated correctly per glossary?
   - 90-100: All terms correct
   - 70-89: Most terms correct
   - 50-69: Some terms wrong
   - <50: Many terms wrong

4. **Completeness** - Is all content translated?
   - 90-100: Complete
   - 70-89: Minor omissions
   - 50-69: Some content missing
   - <50: Significant omissions

## Output JSON only (no markdown code fences):
{
  "accuracy": <number>,
  "fluency": <number>,
  "terminology": <number>,
  "completeness": <number>,
  "overall": <number>,
  "flags": ["<flag1>", "<flag2>"],
  "notes": "<brief explanation of any issues>"
}

Valid flags: inaccurate, awkward, terminology, omission, addition, formatting
Only include flags if score <80 in any category.`;

    try {
      const response = await this.client.messages.create({
        model: this.modelConfig.id,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      // Track tokens
      this.totalInputTokens += response.usage.input_tokens;
      this.totalOutputTokens += response.usage.output_tokens;

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format');
      }

      // Parse JSON response
      const result = this.parseHaikuResponse(content.text);

      return {
        sectionId,
        heading: englishHeading,
        translatedHeading,
        accuracyScore: result.accuracy,
        fluencyScore: result.fluency,
        terminologyScore: result.terminology,
        completenessScore: result.completeness,
        overallScore: result.overall,
        flags: result.flags as QualityFlag[],
        notes: result.notes,
      };
    } catch (error) {
      // Return error assessment
      return {
        sectionId,
        heading: englishHeading,
        translatedHeading,
        accuracyScore: 0,
        fluencyScore: 0,
        terminologyScore: 0,
        completenessScore: 0,
        overallScore: 0,
        flags: [],
        notes: `Error assessing section: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Parse Haiku's JSON response
   */
  private parseHaikuResponse(text: string): HaikuQualityResponse {
    // Remove markdown code fences if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(cleaned);
      
      // Validate and sanitize response
      return {
        accuracy: this.clampScore(parsed.accuracy),
        fluency: this.clampScore(parsed.fluency),
        terminology: this.clampScore(parsed.terminology),
        completeness: this.clampScore(parsed.completeness),
        overall: this.clampScore(parsed.overall),
        flags: Array.isArray(parsed.flags) ? parsed.flags.filter(this.isValidFlag) : [],
        notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      };
    } catch {
      // Try to extract scores with regex as fallback
      const accuracyMatch = text.match(/"accuracy"\s*:\s*(\d+)/);
      const fluencyMatch = text.match(/"fluency"\s*:\s*(\d+)/);
      const terminologyMatch = text.match(/"terminology"\s*:\s*(\d+)/);
      const completenessMatch = text.match(/"completeness"\s*:\s*(\d+)/);
      const overallMatch = text.match(/"overall"\s*:\s*(\d+)/);

      if (accuracyMatch && fluencyMatch && terminologyMatch && completenessMatch) {
        const accuracy = this.clampScore(parseInt(accuracyMatch[1], 10));
        const fluency = this.clampScore(parseInt(fluencyMatch[1], 10));
        const terminology = this.clampScore(parseInt(terminologyMatch[1], 10));
        const completeness = this.clampScore(parseInt(completenessMatch[1], 10));
        const overall = overallMatch 
          ? this.clampScore(parseInt(overallMatch[1], 10))
          : this.calculateOverall(accuracy, fluency, terminology, completeness);

        return {
          accuracy,
          fluency,
          terminology,
          completeness,
          overall,
          flags: [],
          notes: 'Scores extracted from partial response',
        };
      }

      throw new Error('Could not parse quality assessment response');
    }
  }

  /**
   * Clamp score to 0-100 range
   */
  private clampScore(score: number): number {
    if (typeof score !== 'number' || isNaN(score)) return 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate overall score using weights from plan:
   * accuracy 40%, fluency 25%, terminology 20%, completeness 15%
   */
  private calculateOverall(accuracy: number, fluency: number, terminology: number, completeness: number): number {
    return Math.round(
      accuracy * 0.40 +
      fluency * 0.25 +
      terminology * 0.20 +
      completeness * 0.15
    );
  }

  /**
   * Check if flag is valid
   */
  private isValidFlag(flag: string): flag is QualityFlag {
    return ['inaccurate', 'awkward', 'terminology', 'omission', 'addition', 'formatting'].includes(flag);
  }

  /**
   * Assess quality of a file
   */
  async assessFile(
    sourceFilePath: string,
    targetFilePath: string,
    fileName: string
  ): Promise<FileQualityAssessment> {
    // Read files
    const sourceContent = fs.readFileSync(sourceFilePath, 'utf-8');
    const targetContent = fs.readFileSync(targetFilePath, 'utf-8');

    // Parse sections from both files
    const parser = new MystParser();
    const sourceParsed = await parser.parseSections(sourceContent, sourceFilePath);
    const targetParsed = await parser.parseSections(targetContent, targetFilePath);

    const sections: SectionQuality[] = [];

    // Assess each section by position
    for (let i = 0; i < sourceParsed.sections.length; i++) {
      const sourceSection = sourceParsed.sections[i];
      const targetSection = targetParsed.sections[i];

      if (!targetSection) {
        // Section missing in target - skip assessment
        continue;
      }

      // Get full content including subsections for assessment
      const sourceFullContent = this.getSectionFullContent(sourceSection);
      const targetFullContent = this.getSectionFullContent(targetSection);

      const quality = await this.assessSection(
        sourceFullContent,
        targetFullContent,
        sourceSection.id,
        sourceSection.heading,
        targetSection.heading
      );

      sections.push(quality);
    }

    // Calculate file-level scores
    const overallScore = sections.length > 0
      ? Math.round(sections.reduce((sum, s) => sum + s.overallScore, 0) / sections.length)
      : 0;
    
    // Flag sections with score < 80 (below "Good/Acceptable" threshold)
    const flaggedCount = sections.filter(s => s.overallScore < 80).length;

    return {
      file: fileName,
      overallScore,
      sectionCount: sections.length,
      flaggedCount,
      sections,
    };
  }

  /**
   * Get full content of a section including subsections
   */
  private getSectionFullContent(section: Section): string {
    let content = section.heading + '\n\n' + section.content;
    
    for (const sub of section.subsections) {
      content += '\n\n' + this.getSectionFullContent(sub);
    }
    
    return content;
  }

  /**
   * Assess quality across multiple files
   */
  async assessFiles(
    analyses: MarkdownAnalysis[],
    sourceRoot: string,
    targetRoot: string,
    docsFolder: string,
    maxSections?: number
  ): Promise<QualityAssessment> {
    // Filter to only aligned/likely-aligned files
    const eligibleFiles = analyses.filter(
      a => a.status === 'aligned' || a.status === 'likely-aligned'
    );
    
    const skippedFiles = analyses.length - eligibleFiles.length;
    const fileAssessments: FileQualityAssessment[] = [];
    
    let totalSections = 0;
    let totalFlagged = 0;
    let totalAccuracy = 0;
    let totalFluency = 0;
    let totalTerminology = 0;
    let totalCompleteness = 0;
    let sectionCount = 0;
    let fileIndex = 0;

    for (const analysis of eligibleFiles) {
      // Check max sections limit
      if (maxSections && sectionCount >= maxSections) {
        break;
      }

      fileIndex++;
      
      // Report progress
      if (this.onProgress) {
        this.onProgress(fileIndex, eligibleFiles.length, analysis.file);
      }

      const sourceDocsFolder = docsFolder ? path.join(sourceRoot, docsFolder) : sourceRoot;
      const targetDocsFolder = docsFolder ? path.join(targetRoot, docsFolder) : targetRoot;
      
      const sourcePath = path.join(sourceDocsFolder, analysis.file);
      const targetPath = path.join(targetDocsFolder, analysis.file);

      if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) {
        continue;
      }

      const fileAssessment = await this.assessFile(sourcePath, targetPath, analysis.file);
      fileAssessments.push(fileAssessment);

      totalSections += fileAssessment.sectionCount;
      totalFlagged += fileAssessment.flaggedCount;
      sectionCount += fileAssessment.sectionCount;

      // Aggregate scores
      for (const section of fileAssessment.sections) {
        totalAccuracy += section.accuracyScore;
        totalFluency += section.fluencyScore;
        totalTerminology += section.terminologyScore;
        totalCompleteness += section.completenessScore;
      }
    }

    // Calculate averages
    const avgAccuracy = totalSections > 0 ? Math.round(totalAccuracy / totalSections) : 0;
    const avgFluency = totalSections > 0 ? Math.round(totalFluency / totalSections) : 0;
    const avgTerminology = totalSections > 0 ? Math.round(totalTerminology / totalSections) : 0;
    const avgCompleteness = totalSections > 0 ? Math.round(totalCompleteness / totalSections) : 0;
    
    const overallScore = this.calculateOverall(avgAccuracy, avgFluency, avgTerminology, avgCompleteness);

    return {
      model: this.modelConfig.shortName,
      overallScore,
      filesAssessed: fileAssessments.length,
      filesSkipped: skippedFiles,
      sectionCount: totalSections,
      flaggedCount: totalFlagged,
      cost: this.getActualCost(),
      averageScores: {
        accuracy: avgAccuracy,
        fluency: avgFluency,
        terminology: avgTerminology,
        completeness: avgCompleteness,
      },
      files: fileAssessments,
    };
  }
}

/**
 * Count total sections in analysis results
 */
export function countSections(analyses: MarkdownAnalysis[]): number {
  return analyses
    .filter(a => a.status === 'aligned' || a.status === 'likely-aligned')
    .reduce((sum, a) => sum + (a.source?.sections || 0), 0);
}

/**
 * Format cost estimate for display
 */
export function formatCostEstimate(estimate: { inputTokens: number; outputTokens: number; totalUSD: number }): string {
  return `Estimated cost: $${estimate.totalUSD.toFixed(2)} (${estimate.inputTokens.toLocaleString()} input tokens, ${estimate.outputTokens.toLocaleString()} output tokens)`;
}
