/**
 * AI-powered prose analysis using Claude
 * Compares section headings and content for translation quality
 */

import Anthropic from '@anthropic-ai/sdk';
import { DecisionItem, ActionType } from '../types';
import { PROSE_ANALYSIS_PROMPT } from '../constants';
import { getLanguageName } from '../constants';

// =============================================================================
// PROSE ANALYSIS
// =============================================================================

/**
 * Compare documents using Claude for prose/section analysis
 */
export async function analyzeProseWithClaude(
  client: Anthropic,
  sourceContent: string,
  targetContent: string,
  targetLanguage: string,
  model: string
): Promise<{ status: 'aligned' | 'review'; analysis: string }> {
  
  const languageName = getLanguageName(targetLanguage);
  
  const prompt = PROSE_ANALYSIS_PROMPT
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

// =============================================================================
// RESPONSE PARSING
// =============================================================================

/**
 * Parse Claude's prose analysis to extract section-level decisions
 */
export function parseProseAnalysis(
  analysis: string, 
  sectionPositions?: Map<number, number>
): DecisionItem[] {
  const decisions: DecisionItem[] = [];
  
  // Parse the section table from Claude's response - supports both 5-col and 6-col format
  const tableMatch = analysis.match(
    /\| Section \| Source Heading \| Target Heading \| Status \| (?:Issue \| )?Score \|[\s\S]*?(?=\n\n|\n##|$)/
  );
  if (!tableMatch) return decisions;
  
  // Extract the "Section Notes" section for detailed notes
  // Use greedy match since Section Notes is typically the last section
  // Also support legacy "Issues and Recommendations" section
  const notesMatch = analysis.match(/## Section Notes\s*([\s\S]*)/i) ||
                     analysis.match(/## Issues and Recommendations\s*([\s\S]*)/i);
  const issuesText = notesMatch ? notesMatch[1].trim() : '';
  
  const lines = tableMatch[0].split('\n').filter(l => l.startsWith('|') && !l.includes('---'));
  
  // Detect if Issue column is present (6 columns)
  const headerCells = lines[0]?.split('|').map(c => c.trim()).filter(c => c) || [];
  const hasIssueColumn = headerCells.length >= 6 && headerCells[4]?.toUpperCase() === 'ISSUE';
  
  for (let i = 1; i < lines.length; i++) { // Skip header
    const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < 5) continue;
    
    let sectionNum: string, sourceHeading: string, targetHeading: string, status: string, issueCol: string, scoreStr: string;
    
    if (hasIssueColumn && cells.length >= 6) {
      [sectionNum, sourceHeading, targetHeading, status, issueCol, scoreStr] = cells;
    } else {
      [sectionNum, sourceHeading, targetHeading, status, scoreStr] = cells;
      issueCol = '-';
    }
    
    // Parse issue type (normalize BOTH to TITLE, CONTENT)
    let issueType: string | undefined;
    if (issueCol && issueCol !== '-') {
      // Normalize: BOTH -> TITLE, CONTENT
      if (issueCol.toUpperCase() === 'BOTH') {
        issueType = 'TITLE, CONTENT';
      } else {
        issueType = issueCol.toUpperCase();
      }
    }
    
    // Skip if aligned - and clear issueType since there's no issue
    const isAligned = status === 'ALIGNED';
    if (isAligned) {
      issueType = undefined;  // No issue for aligned sections
    }
    const score = parseInt(scoreStr.replace(/[^0-9]/g, '')) || 0;
    
    // Get startLine from section positions (fallback to large number to sort after code)
    const secNum = parseInt(sectionNum) || 0;
    const startLine = sectionPositions?.get(secNum) ?? (100000 + secNum);
    
    // Extract notes for title and content separately (from structured JSON)
    const titleNotes = extractSectionNotes(issuesText, secNum, sourceHeading, 'title');
    const contentNotes = extractSectionNotes(issuesText, secNum, sourceHeading, 'content');
    
    // Determine recommendation
    let recommendation: ActionType | undefined;
    if (isAligned && score >= 90) {
      // Keep aligned sections in decisions (for reporting), but no action needed
      recommendation = undefined;
    } else if (status === 'MISSING') {
      recommendation = 'SYNC';
    } else if (status === 'EXTRA') {
      recommendation = 'MANUAL REVIEW';
    } else if (status === 'DRIFT') {
      // Score determines recommendation
      if (score >= 85) {
        recommendation = 'SYNC'; // Minor drift, sync from source
      } else {
        recommendation = 'MANUAL REVIEW'; // Significant drift
      }
    } else if (score < 90) {
      recommendation = 'SYNC';
    }
    
    // Build issue description with score and type
    let issue = `Score: ${score}/100`;
    if (issueType) {
      issue = `[${issueType}] ` + issue;
    }
    if (status === 'DRIFT') {
      issue += ' (translation has diverged from source)';
    } else if (status === 'MISSING') {
      issue += ' (section missing in target)';
    } else if (status === 'EXTRA') {
      issue += ' (section only in target)';
    }
    
    decisions.push({
      id: `section-${sectionNum}`,
      region: `Section ${sectionNum}`,
      type: 'prose',
      status: status === 'MISSING' ? 'missing' : 
              status === 'EXTRA' ? 'inserted' :
              status === 'DRIFT' ? 'differs' : 'aligned',
      startLine,
      sourceHeading,
      targetHeading,
      issue,
      issueType,
      recommendation,
      titleNotes: titleNotes.length > 0 ? titleNotes : undefined,
      contentNotes: contentNotes.length > 0 ? contentNotes : undefined,
    });
  }
  
  return decisions;
}

/**
 * Parsed notes structure for a section
 */
interface SectionNotes {
  titleIssue?: string;
  titleFix?: string;
  contentIssue?: string;
  contentFix?: string;
}

/**
 * Parse the markdown section notes from Claude's response.
 * 
 * Format:
 * ### Section N
 * - **Title Issue:** description
 * - **Title Fix:** suggestion
 * - **Content Issue:** description
 * - **Content Fix:** suggestion
 * 
 * Returns a map of section number -> notes object.
 */
function parseMarkdownNotes(notesText: string): Record<string, SectionNotes> {
  const result: Record<string, SectionNotes> = {};
  if (!notesText) return result;
  
  // Split by section headers (### Section N)
  const sectionBlocks = notesText.split(/###\s+Section\s+/i);
  
  for (const block of sectionBlocks) {
    if (!block.trim()) continue;
    
    // Extract section number from start of block
    const numMatch = block.match(/^(\d+)/);
    if (!numMatch) continue;
    
    const sectionNum = numMatch[1];
    const notes: SectionNotes = {};
    
    // Extract each field using bullet point format
    const titleIssueMatch = block.match(/\*\*Title Issue:\*\*\s*(.+?)(?=\n|$)/i);
    const titleFixMatch = block.match(/\*\*Title Fix:\*\*\s*(.+?)(?=\n|$)/i);
    const contentIssueMatch = block.match(/\*\*Content Issue:\*\*\s*(.+?)(?=\n|$)/i);
    const contentFixMatch = block.match(/\*\*Content Fix:\*\*\s*(.+?)(?=\n|$)/i);
    
    if (titleIssueMatch) notes.titleIssue = titleIssueMatch[1].trim();
    if (titleFixMatch) notes.titleFix = titleFixMatch[1].trim();
    if (contentIssueMatch) notes.contentIssue = contentIssueMatch[1].trim();
    if (contentFixMatch) notes.contentFix = contentFixMatch[1].trim();
    
    // Only add if we found at least one note
    if (Object.keys(notes).length > 0) {
      result[sectionNum] = notes;
    }
  }
  
  return result;
}

/**
 * Extract notes for a specific section from Claude's markdown notes.
 * 
 * Claude returns notes in this format:
 * ### Section 4
 * - **Title Issue:** description
 * - **Title Fix:** suggestion
 * - **Content Issue:** description
 * - **Content Fix:** suggestion
 */
function extractSectionNotes(
  notesText: string, 
  sectionNum: number, 
  _sourceHeading: string,
  element: 'title' | 'content' = 'content'
): string[] {
  const sectionNotes: string[] = [];
  
  if (!notesText) return sectionNotes;
  
  const allNotes = parseMarkdownNotes(notesText);
  const notes = allNotes[String(sectionNum)];
  
  if (!notes) return sectionNotes;
  
  // Extract notes based on element type
  if (element === 'title') {
    if (notes.titleIssue) {
      sectionNotes.push(`Issue: ${notes.titleIssue}`);
    }
    if (notes.titleFix) {
      sectionNotes.push(`Fix: ${notes.titleFix}`);
    }
  } else {
    if (notes.contentIssue) {
      sectionNotes.push(`Issue: ${notes.contentIssue}`);
    }
    if (notes.contentFix) {
      sectionNotes.push(`Fix: ${notes.contentFix}`);
    }
  }
  
  return sectionNotes;
}
