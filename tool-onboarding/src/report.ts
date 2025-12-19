/**
 * Report generation for analysis results
 * Generates markdown reports organized by document element type:
 * 1. Titles - Section heading alignment
 * 2. Sections - Prose/content alignment  
 * 3. Code - Code block alignment
 */

import { 
  FileDecisions, 
  FileResult, 
  CodeAnalysisResult, 
  ConfigAnalysis,
  DecisionItem 
} from './types';
import { STATUS_ICONS, BLOCK_STATUS_ICONS } from './constants';
import { getFileRecommendation, getDateGuidance } from './decision';
import { getUpdateDirection, getDirectionDescription } from './discovery';

// =============================================================================
// PER-FILE REPORT
// =============================================================================

/**
 * Generate a per-file markdown report organized by element type
 */
export function generateFileReport(
  fileDecisions: FileDecisions, 
  sourceName: string, 
  targetName: string
): string {
  const lines: string[] = [];
  const { file, status, sourceDate, targetDate, decisions, counts } = fileDecisions;
  
  // Header
  lines.push(`# ${file}`);
  lines.push('');
  
  // Metadata table
  const direction = getUpdateDirection(sourceDate, targetDate);
  const directionText = direction === '→' ? '→ Source newer' :
                        direction === '←' ? '← Target newer' : '= Same date';
  
  const statusText = status === 'aligned' ? '✅ Aligned' :
                     status === 'review' ? '⚠️ Review' :
                     status === 'translate' ? '📄 Translate' :
                     status === 'suggest' ? '🎯 Target-only' : '❓ Unknown';
  
  const fileRecommendation = getFileRecommendation(
    direction,
    counts.manual > 0,
    counts.sync > 0,
    counts.backport > 0
  );
  
  lines.push('| Property | Value |');
  lines.push('|----------|-------|');
  lines.push(`| Source | \`${sourceName}\` |`);
  lines.push(`| Target | \`${targetName}\` |`);
  if (sourceDate) lines.push(`| Source Date | ${sourceDate} |`);
  if (targetDate) lines.push(`| Target Date | ${targetDate} |`);
  lines.push(`| Direction | ${directionText} |`);
  lines.push(`| Status | ${statusText} |`);
  lines.push(`| Recommendation | ${fileRecommendation} |`);
  lines.push('');
  
  // ==========================================================================
  // GROUP DECISIONS BY SECTION
  // ==========================================================================
  
  // Build section map: sectionNum -> { name, decisions[] }
  const sectionMap = new Map<number, { name: string; decisions: typeof decisions }>();
  let currentSectionNum = 0;
  let currentSectionName = '';
  
  for (const d of decisions) {
    if (d.type === 'prose') {
      currentSectionNum = parseInt(d.id.replace('section-', '')) || 0;
      currentSectionName = d.sourceHeading || d.targetHeading || `Section ${currentSectionNum}`;
    }
    
    if (!sectionMap.has(currentSectionNum)) {
      sectionMap.set(currentSectionNum, { name: currentSectionName, decisions: [] });
    }
    sectionMap.get(currentSectionNum)!.decisions.push(d);
  }
  
  // Sort sections by number for document order
  const sortedSections = Array.from(sectionMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([num, data]) => ({
      num,
      name: data.name,
      decisions: data.decisions,
      isAligned: data.decisions.every(d => d.status === 'aligned')
    }));
  
  // Count totals - count actual issues (title and content count separately)
  let totalIssues = 0;
  for (const d of decisions) {
    if (d.status === 'aligned') continue;
    if (d.type === 'prose') {
      // Count title and content separately
      if (d.issueType?.includes('TITLE')) totalIssues++;
      if (d.issueType?.includes('CONTENT')) totalIssues++;
      // Handle cases without specific issue type
      if (!d.issueType?.includes('TITLE') && !d.issueType?.includes('CONTENT')) {
        totalIssues++;
      }
    } else {
      totalIssues++;
    }
  }
  const alignedSectionCount = sortedSections.filter(s => s.isAligned).length;
  const sectionsWithDiffs = sortedSections.filter(s => !s.isAligned).length;
  
  // ==========================================================================
  // UNIFIED SUMMARY TABLE - All sections in document order
  // ==========================================================================
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  
  if (totalIssues === 0) {
    lines.push('✅ **All sections aligned - no action required**');
    lines.push('');
  } else {
    lines.push(`**${alignedSectionCount} aligned, ${totalIssues} issues in ${sectionsWithDiffs} sections**`);
    lines.push('');
    
    lines.push('| Section | Type | Status | Issue | Links |');
    lines.push('|---------|------|--------|-------|-------|');
    
    for (const sec of sortedSections) {
      if (sec.isAligned) {
        // Aligned section: single compact row
        lines.push(`| §${sec.num} | Section | ✅ | - | - |`);
      } else {
        // Section with differences: show each issue
        for (const d of sec.decisions) {
          // Skip aligned items within sections that have differences
          if (d.status === 'aligned') continue;
          
          const statusIcon = STATUS_ICONS[d.status] || d.status;
          
          if (d.type === 'prose') {
            // For prose: emit separate rows for title and content issues
            // View links to details, Action links to checkbox
            const titleIssue = d.status === 'missing' ? 'Missing' : 
                               d.status === 'inserted' ? 'Extra' : 'Differs';
            const contentIssue = d.status === 'missing' ? 'Missing' : 
                                 d.status === 'inserted' ? 'Extra' : 'Differs';
            
            if (d.issueType?.includes('TITLE')) {
              const titleId = `${d.id}-title`;
              lines.push(`| §${sec.num} | Title | ${statusIcon} | ${titleIssue} | [View](#${titleId}) / [Action](#${titleId}-action) |`);
            }
            if (d.issueType?.includes('CONTENT')) {
              const contentId = `${d.id}-content`;
              lines.push(`| §${sec.num} | Content | ${statusIcon} | ${contentIssue} | [View](#${contentId}) / [Action](#${contentId}-action) |`);
            }
            // Handle cases without specific issue type
            if (!d.issueType?.includes('TITLE') && !d.issueType?.includes('CONTENT')) {
              if (d.status === 'missing') {
                lines.push(`| §${sec.num} | Section | ${statusIcon} | Missing | [View](#${d.id}) / [Action](#${d.id}-action) |`);
              } else if (d.status === 'inserted') {
                lines.push(`| §${sec.num} | Content | ${statusIcon} | Extra | [View](#${d.id}) / [Action](#${d.id}-action) |`);
              } else {
                lines.push(`| §${sec.num} | Content | ${statusIcon} | Differs | [View](#${d.id}) / [Action](#${d.id}-action) |`);
            }
            }
          } else {
            // Code blocks - View links to details, Action links to unified Code Action
            let issue: string;
            if (d.status === 'missing') {
              issue = 'Missing';
            } else if (d.status === 'inserted') {
              issue = 'Extra';
            } else if (d.notes?.some(n => n.includes('Function names'))) {
              issue = 'Function names';
            } else if (d.notes?.some(n => n.includes('i18n'))) {
              issue = 'i18n only';
            } else {
              issue = 'Code differs';
            }
            
            // Extract block number from region (e.g., "Code Block 1" -> "B1", "Code Block T7" -> "T7")
            const blockMatch = d.region.match(/Code Block (T?\d+)/);
            const blockLabel = blockMatch ? (blockMatch[1].startsWith('T') ? blockMatch[1] : `B${blockMatch[1]}`) : 'B?';
            lines.push(`| §${sec.num} | Code ${blockLabel} | ${statusIcon} | ${issue} | [View](#${d.id}) / [Action](#code-action) |`);
          }
        }
      }
    }
    lines.push('');
  }
  
  // ==========================================================================
  // CODE ACTION (immediately after summary, before section details)
  // ==========================================================================
  const codeDecisions = decisions.filter(d => d.type === 'code' && d.status !== 'aligned');
  
  if (codeDecisions.length > 0) {
    lines.push('<a id="code-action"></a>');
    lines.push('### Code Action');
    lines.push('');
    
    // Build summary table of per-block recommendations with source/target indices
    lines.push('| Source | Target | Status | Recommendation | Details |');
    lines.push('|--------|--------|--------|----------------|---------|');
    
    const recommendations = new Set<string>();
    for (const d of codeDecisions) {
      const statusIcon = STATUS_ICONS[d.status] || d.status;
      const rec = d.recommendation || 'REVIEW';
      recommendations.add(rec);
      const srcCol = d.srcIdx !== null && d.srcIdx !== undefined ? `${d.srcIdx}` : '-';
      const tgtCol = d.tgtIdx !== null && d.tgtIdx !== undefined ? `${d.tgtIdx}` : '-';
      lines.push(`| ${srcCol} | ${tgtCol} | ${statusIcon} | ${rec} | [View](#${d.id}) |`);
    }
    lines.push('');
    
    // Only make unified recommendation if all blocks agree
    if (recommendations.size === 1) {
      const unanimousRec = Array.from(recommendations)[0];
      lines.push(`> **Recommendation:** ${unanimousRec}`);
      lines.push('>');
      if (unanimousRec === 'SYNC') {
        lines.push('> All code blocks should be synced from source, then re-apply localization.');
      } else if (unanimousRec === 'BACKPORT') {
        lines.push('> Target code appears improved. Review for backport to source.');
      } else if (unanimousRec === 'ACCEPT LOCALISATION') {
        lines.push('> Changes are localization only (comments, strings). Accept target.');
      } else {
        lines.push('> Manual review needed for all code blocks.');
      }
      lines.push('');
      
      lines.push('**Action:**');
      lines.push(`- [ ] SYNC code from source${unanimousRec === 'SYNC' ? ' *(unanimous)*' : ''}`);
      lines.push(`- [ ] BACKPORT improvements to source${unanimousRec === 'BACKPORT' ? ' *(unanimous)*' : ''}`);
      lines.push(`- [ ] ACCEPT current target code${unanimousRec === 'ACCEPT LOCALISATION' ? ' *(unanimous)*' : ''}`);
      lines.push(`- [ ] MANUAL review needed${unanimousRec === 'MANUAL REVIEW' ? ' *(unanimous)*' : ''}`);
    } else {
      // Mixed recommendations - no unified action
      lines.push('> **Mixed recommendations** - review each block individually');
      lines.push('>');
      lines.push('> Code blocks have different recommended actions. See section review for details.');
      lines.push('');
      
      lines.push('**Action:**');
      lines.push('- [ ] SYNC code from source');
      lines.push('- [ ] BACKPORT improvements to source');
      lines.push('- [ ] ACCEPT current target code');
      lines.push('- [ ] MANUAL review needed');
    }
    lines.push('');
  }
  
  // ==========================================================================
  // SECTION-BY-SECTION REVIEW (document order)
  // ==========================================================================
  const needsDecision = decisions.filter(d => d.status !== 'aligned');
  
  if (needsDecision.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Section Review');
    lines.push('');
    
    // Date guidance (once, not per-item)
    const guidance = getDateGuidance(sourceDate, targetDate, direction);
    if (guidance) {
      lines.push(`> ${guidance}`);
      lines.push('');
    }
    
    // Output decisions in document order (already sorted by startLine)
    // Track current section for headings
    let lastSectionNum = -1;
    
    for (const d of needsDecision) {
      if (d.type === 'prose') {
        // Prose decision - output section heading and prose blocks
        const sectionNum = parseInt(d.id.replace('section-', '')) || 0;
        const sectionName = d.sourceHeading || d.targetHeading || `Section ${sectionNum}`;
        
        if (sectionNum !== lastSectionNum) {
          lines.push(`### §${sectionNum} ${sectionName}`);
          lines.push('');
          lastSectionNum = sectionNum;
        }
        
        if (d.issueType?.includes('TITLE')) {
          lines.push(generateProseActionBlock(d, 'title'));
        }
        if (d.issueType?.includes('CONTENT')) {
          lines.push(generateProseActionBlock(d, 'content'));
        }
        // Handle cases without specific issue type
        if (!d.issueType?.includes('TITLE') && !d.issueType?.includes('CONTENT')) {
          lines.push(generateProseActionBlock(d, 'section'));
        }
      } else {
        // Code decision - output inline in document order
        lines.push(generateCodeDiffBlock(d));
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Generate a prose/section action block for a specific element type (title, content, or section)
 */
function generateProseActionBlock(d: DecisionItem, elementType: 'title' | 'content' | 'section'): string {
  const lines: string[] = [];
  
  // Build section number from id
  const sectionNum = d.id.replace('section-', '');
  
  // Build heading display
  const sourceHeading = d.sourceHeading || `Section ${sectionNum}`;
  const targetHeading = d.targetHeading;
  const headingDisplay = targetHeading && targetHeading !== sourceHeading 
    ? `${sourceHeading} → ${targetHeading}` 
    : sourceHeading;
  
  // Capitalize element type for display
  const typeDisplay = elementType.charAt(0).toUpperCase() + elementType.slice(1);
  
  // Build anchor ID - title and content get suffixed IDs
  const anchorId = elementType === 'section' ? d.id : `${d.id}-${elementType}`;
  
  lines.push(`#### §${sectionNum} ${typeDisplay}: ${headingDisplay}`);
  lines.push(`<a id="${anchorId}"></a>`);
  lines.push('');
  
  const statusIcon = STATUS_ICONS[d.status] || d.status;
  const issueDisplay = d.status === 'missing' ? 'Missing' : 
                       d.status === 'inserted' ? 'Extra' : 'Differs';
  lines.push(`**Status:** ${statusIcon} | **Issue:** ${issueDisplay}`);
  lines.push('');
  
  // Get notes for the specific element type
  let notes: string[] | undefined;
  if (elementType === 'title') {
    notes = d.titleNotes;
  } else if (elementType === 'content') {
    notes = d.contentNotes;
  } else {
    // For 'section', combine both or use general notes
    notes = d.notes || [...(d.titleNotes || []), ...(d.contentNotes || [])];
    if (notes.length === 0) notes = undefined;
  }
  
  // Add Claude's notes if available
  if (notes && notes.length > 0) {
    lines.push('**Notes:**');
    for (const note of notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }
  
  // Action checkboxes with anchor for linking
  const actionAnchorId = `${anchorId}-action`;
  lines.push(`<a id="${actionAnchorId}"></a>`);
  lines.push('');
  const rec = d.recommendation;
  lines.push('**Action:**');
  lines.push(`- [ ] SYNC${rec === 'SYNC' ? ' *(recommended)*' : ''}`);
  lines.push(`- [ ] BACKPORT${rec === 'BACKPORT' ? ' *(recommended)*' : ''}`);
  lines.push(`- [ ] ACCEPT${rec === 'ACCEPT LOCALISATION' ? ' *(recommended)*' : ''}`);
  lines.push(`- [ ] MANUAL${rec === 'MANUAL REVIEW' ? ' *(recommended)*' : ''}`);
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate a code diff block (documentation only, no per-block actions)
 */
function generateCodeDiffBlock(d: DecisionItem): string {
  const lines: string[] = [];
  
  const statusIcon = STATUS_ICONS[d.status] || d.status;
  const issue = d.notes?.join(', ') || d.issue || 'Code differs';
  
  // Add anchor ID for linking from summary table
  lines.push(`<a id="${d.id}"></a>`);
  lines.push(`<details>`);
  lines.push(`<summary><strong>${d.region}</strong> - ${statusIcon} | ${issue}</summary>`);
  lines.push('');
  
  if (d.sourceContent) {
    lines.push('**Source:**');
    lines.push('```python');
    lines.push(d.sourceContent);
    lines.push('```');
    lines.push('');
  }
  
  if (d.targetContent) {
    lines.push('**Target:**');
    lines.push('```python');
    lines.push(d.targetContent);
    lines.push('```');
    lines.push('');
  }
  
  // For inserted blocks (only in target)
  if (d.status === 'inserted' && !d.sourceContent && d.targetContent) {
    lines.push('*This block exists only in target - not in source.*');
    lines.push('');
  }
  
  // For missing blocks (only in source)
  if (d.status === 'missing' && d.sourceContent && !d.targetContent) {
    lines.push('*This block is missing from target.*');
    lines.push('');
  }
  
  lines.push('</details>');
  lines.push('');
  
  return lines.join('\n');
}

// =============================================================================
// SUMMARY REPORT
// =============================================================================

/**
 * Generate summary report across all files
 */
export function generateSummaryReport(
  results: FileResult[],
  sourceName: string,
  targetName: string,
  configAnalysis?: ConfigAnalysis[]
): string {
  const lines: string[] = [];
  
  // Header
  lines.push('# Translation Alignment Report');
  lines.push('');
  lines.push('| Property | Value |');
  lines.push('|----------|-------|');
  lines.push(`| Source | \`${sourceName}\` |`);
  lines.push(`| Target | \`${targetName}\` |`);
  lines.push(`| Generated | ${new Date().toISOString().split('T')[0]} |`);
  lines.push(`| Files Analyzed | ${results.length} |`);
  lines.push('');
  
  // Overview counts
  const aligned = results.filter(r => r.status === 'aligned').length;
  const review = results.filter(r => r.status === 'review').length;
  const translate = results.filter(r => r.status === 'translate').length;
  const suggest = results.filter(r => r.status === 'suggest').length;
  
  lines.push('## Overview');
  lines.push('');
  lines.push('| Status | Count | Percentage |');
  lines.push('|--------|-------|------------|');
  lines.push(`| ✅ Aligned | ${aligned} | ${Math.round(aligned / results.length * 100)}% |`);
  lines.push(`| 📋 Review | ${review} | ${Math.round(review / results.length * 100)}% |`);
  if (translate > 0) {
    lines.push(`| 📄 Translate | ${translate} | ${Math.round(translate / results.length * 100)}% |`);
  }
  if (suggest > 0) {
    lines.push(`| 🎯 Target-only | ${suggest} | ${Math.round(suggest / results.length * 100)}% |`);
  }
  lines.push('');
  
  // Action summary
  let totalSync = 0, totalBackport = 0, totalAccept = 0, totalManual = 0;
  for (const r of results) {
    if (r.decisions) {
      totalSync += r.decisions.counts.sync;
      totalBackport += r.decisions.counts.backport;
      totalAccept += r.decisions.counts.accept;
      totalManual += r.decisions.counts.manual;
    }
  }
  
  lines.push('## Action Summary');
  lines.push('');
  lines.push('| Action | Count |');
  lines.push('|--------|-------|');
  lines.push(`| SYNC | ${totalSync} |`);
  lines.push(`| BACKPORT | ${totalBackport} |`);
  lines.push(`| ACCEPT | ${totalAccept} |`);
  lines.push(`| MANUAL | ${totalManual} |`);
  lines.push('');
  
  // Config analysis if provided
  if (configAnalysis && configAnalysis.length > 0) {
    lines.push(generateConfigAnalysisSection(configAnalysis));
  }
  
  // Files table
  lines.push('## Files');
  lines.push('');
  lines.push('| File | Status | Direction | Actions |');
  lines.push('|------|--------|-----------|---------|');
  
  for (const r of results) {
    const statusIcon = r.status === 'aligned' ? '✅' :
                       r.status === 'review' ? '⚠️' :
                       r.status === 'translate' ? '📄' :
                       r.status === 'suggest' ? '🎯' : '❓';
    
    const direction = getUpdateDirection(r.sourceDate, r.targetDate);
    const dirSymbol = direction === '→' ? '→' : direction === '←' ? '←' : '=';
    
    let actions = '-';
    if (r.decisions) {
      const parts: string[] = [];
      if (r.decisions.counts.sync > 0) parts.push(`SYNC: ${r.decisions.counts.sync}`);
      if (r.decisions.counts.backport > 0) parts.push(`BACKPORT: ${r.decisions.counts.backport}`);
      if (r.decisions.counts.accept > 0) parts.push(`ACCEPT: ${r.decisions.counts.accept}`);
      if (r.decisions.counts.manual > 0) parts.push(`MANUAL: ${r.decisions.counts.manual}`);
      if (parts.length > 0) actions = parts.join(', ');
    }
    
    const link = r.status !== 'aligned' ? `[${r.file}](${r.file})` : r.file;
    lines.push(`| ${link} | ${statusIcon} ${r.status} | ${dirSymbol} | ${actions} |`);
  }
  lines.push('');
  
  return lines.join('\n');
}

// =============================================================================
// CODE ANALYSIS SECTION
// =============================================================================

/**
 * Generate code analysis section for detailed report
 */
export function generateCodeAnalysisSection(codeAnalysis: CodeAnalysisResult): string {
  const lines: string[] = [];
  
  const scoreIcon = codeAnalysis.score >= 90 ? '🟢' :
                    codeAnalysis.score >= 70 ? '🟡' : '🔴';
  
  lines.push('### Code Analysis (Deterministic)');
  lines.push('');
  lines.push(`**Score:** ${scoreIcon} ${codeAnalysis.score}% | Source: ${codeAnalysis.sourceBlocks} blocks | Target: ${codeAnalysis.targetBlocks} blocks`);
  lines.push('');
  
  // Summary of divergence
  if (codeAnalysis.sourceBlocks !== codeAnalysis.targetBlocks) {
    const diff = codeAnalysis.targetBlocks - codeAnalysis.sourceBlocks;
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
    lines.push(`> **Block count:** Source ${codeAnalysis.sourceBlocks} → Target ${codeAnalysis.targetBlocks} (${diffStr})`);
    if (codeAnalysis.insertedI18n > 0) {
      lines.push(`> **i18n insertions:** ${codeAnalysis.insertedI18n} blocks (expected for localization)`);
    }
    if (codeAnalysis.inserted > 0) {
      lines.push(`> **Other insertions:** ${codeAnalysis.inserted} blocks (review needed)`);
    }
    if (codeAnalysis.missing > 0) {
      lines.push(`> **Missing blocks:** ${codeAnalysis.missing} blocks (review needed)`);
    }
    lines.push('');
  }
  
  // Block mapping table
  lines.push('**Block Mapping:**');
  lines.push('');
  lines.push('| Source | Target | Status | Lines | Notes |');
  lines.push('|--------|--------|--------|-------|-------|');
  
  for (const m of codeAnalysis.mappings) {
    const srcCol = m.srcIdx !== null ? `src[${m.srcIdx}]` : '-';
    const tgtCol = m.tgtIdx !== null ? `tgt[${m.tgtIdx}]` : '-';
    const statusIcon = BLOCK_STATUS_ICONS[m.status] || m.status;
    const linesCol = m.sourceLines === m.targetLines 
      ? `${m.sourceLines || m.targetLines}` 
      : `${m.sourceLines} → ${m.targetLines}`;
    const notes = m.notes?.join('; ') || '-';
    lines.push(`| ${srcCol} | ${tgtCol} | ${statusIcon} | ${linesCol} | ${notes} |`);
  }
  
  lines.push('');
  lines.push('> **Legend:** 🟢 Aligned (same logic) | 🟡 Modified (code differs) | 🔴 Missing | 🔵 Inserted');
  lines.push('');
  lines.push('> **Note:** "ALIGNED" includes exact matches and normalized matches (comments/strings translated).');
  
  return lines.join('\n');
}

// =============================================================================
// CONFIG ANALYSIS SECTION
// =============================================================================

/**
 * Generate config analysis section for summary report
 */
export function generateConfigAnalysisSection(configAnalysis: ConfigAnalysis[]): string {
  const lines: string[] = [];
  
  lines.push('## Config Files');
  lines.push('');
  lines.push('| File | Status | Details |');
  lines.push('|------|--------|---------|');
  
  for (const config of configAnalysis) {
    const statusIcon = config.status === 'identical' ? '✅' :
                       config.status === 'differs' ? '⚠️' :
                       config.status === 'missing' ? '🔴' :
                       config.status === 'extra' ? '🔵' : '❓';
    
    let details = '-';
    if (config.status === 'identical') {
      details = config.sourceEntries ? `${config.sourceEntries} entries` : 'Identical';
    } else if (config.status === 'differs' && config.differences) {
      details = config.differences.slice(0, 2).join('; ');
      if (config.differences.length > 2) {
        details += ` (+${config.differences.length - 2} more)`;
      }
    } else if (config.status === 'missing') {
      details = config.sourceExists ? 'Missing in target' : 'Not found';
    } else if (config.status === 'extra') {
      details = 'Only in target';
    }
    
    lines.push(`| \`${config.file}\` | ${statusIcon} ${config.status} | ${details} |`);
  }
  
  lines.push('');
  
  // Add detail sections for files that differ
  const differing = configAnalysis.filter(c => c.status === 'differs' && c.differences && c.differences.length > 0);
  if (differing.length > 0) {
    for (const config of differing) {
      lines.push(`### ${config.file} Differences`);
      lines.push('');
      for (const diff of config.differences!) {
        lines.push(`- ${diff}`);
      }
      lines.push('');
    }
  }
  
  return lines.join('\n');
}
