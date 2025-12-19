/**
 * Constants and configuration for tool-onboarding
 */

import { Thresholds } from './types';

// =============================================================================
// DEFAULT THRESHOLDS
// =============================================================================

export const DEFAULT_THRESHOLDS: Thresholds = {
  code: {
    aligned: 90,
    review: 70,
  },
  prose: {
    aligned: 90,
    review: 70,
  },
};

// =============================================================================
// LANGUAGE CONFIGURATION
// =============================================================================

export const LANGUAGE_NAMES: Record<string, string> = {
  'zh-cn': 'Simplified Chinese',
  'zh-tw': 'Traditional Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'fa': 'Farsi',
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

// =============================================================================
// i18n PATTERNS
// =============================================================================

/**
 * Line-level patterns that indicate i18n setup code.
 * Used to detect if an entire code block is i18n-only.
 */
export const I18N_LINE_PATTERNS: RegExp[] = [
  // Font configuration
  /plt\.rcParams\[['"].*font.*['"]\]/i,
  /rcParams\[['"].*font.*['"]\]/i,
  /matplotlib\.font_manager/i,
  /from matplotlib import font_manager/i,
  /fm\.FontProperties/i,
  /plt\.legend\(.*prop\s*=/i,
  /set_.*fontproperties/i,
  // Locale/encoding
  /locale\./i,
  /encoding\s*=/i,
  /# -\*- coding:/i,
  // Import statements (alone)
  /^import\s+\w+$/,
  /^from\s+\w+\s+import\s+\w+$/,
  // Comments (Chinese/Japanese/Korean characters)
  /^#.*[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/,
  // Empty lines
  /^\s*$/,
];

/**
 * Named patterns for detecting specific i18n additions.
 * Used to classify what type of i18n change was made.
 */
export const I18N_NAMED_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'matplotlib-font', pattern: /plt\.rcParams\[['"].*font.*['"]\]/i },
  { name: 'rcParams-font', pattern: /rcParams\[['"].*font.*['"]\]/i },
  { name: 'font-manager-import', pattern: /font_manager/i },
  { name: 'FontProperties', pattern: /FontProperties/i },
  { name: 'legend-font', pattern: /plt\.legend\(.*prop\s*=/i },
  { name: 'fontproperties-setter', pattern: /set_.*fontproperties/i },
  { name: 'locale-config', pattern: /locale\./i },
  { name: 'encoding-declaration', pattern: /encoding\s*=|# -\*- coding:/i },
];

// =============================================================================
// CLAUDE PROMPT
// =============================================================================

export const PROSE_ANALYSIS_PROMPT = `Compare this English source document with its translation.

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

Format your response EXACTLY as follows:

## Overall: ALIGNED
or
## Overall: REVIEW

## Section Analysis

| Section | Source Heading | Target Heading | Status | Issue | Score |
|---------|---------------|----------------|--------|-------|-------|
| 1 | [heading] | [translation] | ALIGNED/DRIFT/MISSING | TITLE/CONTENT/BOTH/- | 🟢/🟡/🔴 0-100 |
| 2 | [heading] | [translation] | ALIGNED/DRIFT/MISSING | TITLE/CONTENT/BOTH/- | 🟢/🟡/🔴 0-100 |

**Status codes:**
- ALIGNED: Translation accurate
- DRIFT: Differences in meaning/structure
- MISSING: Section not found in target
- EXTRA: Section only in target

**Issue column:** Where the problem is located (can combine with comma):
- TITLE: Section heading translation has diverged
- CONTENT: Body text has diverged
- TITLE, CONTENT: Both heading and content have issues
- \`-\`: No issue (when ALIGNED)

**Score colors:** 🟢 90-100 (good) | 🟡 70-89 (minor issues) | 🔴 <70 (needs attention)

## Section Notes

For sections with issues, provide notes using EXACTLY this format (one block per section):

### Section N
- **Title Issue:** [description of title problem, or omit line if no title issue]
- **Title Fix:** [suggested fix for title, or omit line if no title issue]
- **Content Issue:** [description of content problem, or omit line if no content issue]
- **Content Fix:** [suggested fix for content, or omit line if no content issue]

Example:
### Section 4
- **Title Issue:** Translation loses the metaphorical meaning of "Harvesting insights"
- **Title Fix:** Consider "从矩阵表达中获得洞见" to preserve the original nuance

### Section 6
- **Title Issue:** Target focuses only on inflation differences, missing "model computation"
- **Title Fix:** Use "预测误差与模型计算" to cover both aspects
- **Content Issue:** Target adds extensive explanatory text not in source
- **Content Fix:** Remove added paragraphs to match source brevity

Only include sections that have issues. Keep descriptions concise (1-2 sentences).
Focus on translation quality, not code issues.

========== SOURCE DOCUMENT (English) ==========
{SOURCE}
========== END SOURCE DOCUMENT ==========

========== TARGET DOCUMENT (Translation) ==========
{TARGET}
========== END TARGET DOCUMENT ==========`;

// =============================================================================
// STATUS ICONS
// =============================================================================

export const STATUS_ICONS = {
  aligned: '✅ ALIGNED',
  differs: '⚠️ DIFFERS',
  missing: '🔴 MISSING',
  inserted: '🔵 INSERTED',
} as const;

export const BLOCK_STATUS_ICONS = {
  aligned: '🟢 ALIGNED',
  modified: '🟡 MODIFIED',
  'inserted-i18n': '🔵 +i18n',
  inserted: '🔵 +INSERTED',
  missing: '🔴 MISSING',
} as const;
