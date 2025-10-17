"use strict";
/**
 * MyST Markdown Section Parser
 *
 * Parses MyST markdown documents into sections based on ## headings.
 * Each section includes all content until the next ## heading, including
 * any nested ### subsections.
 *
 * This simplified parser replaces the previous block-based approach with
 * a cleaner section-based structure that's easier to work with for translations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MystParser = void 0;
class MystParser {
    /**
     * Parse markdown content into sections based on ## headings
     * Each section includes all content until the next ## heading
     */
    async parseSections(content, filepath) {
        const lines = content.split('\n');
        const sections = [];
        let currentSection = null;
        let currentSubsection = null;
        // Extract frontmatter (YAML between --- markers)
        let frontmatter;
        let preamble;
        let contentStartIndex = 0;
        if (lines[0] === '---') {
            // Find end of frontmatter
            const endIndex = lines.slice(1).findIndex(line => line === '---');
            if (endIndex !== -1) {
                // Extract frontmatter including the --- markers
                frontmatter = lines.slice(0, endIndex + 2).join('\n');
                contentStartIndex = endIndex + 2;
            }
        }
        // Extract preamble (content before first ## heading)
        const firstSectionIndex = lines.slice(contentStartIndex).findIndex(line => line.match(/^##\s+/));
        if (firstSectionIndex !== -1) {
            const preambleLines = lines.slice(contentStartIndex, contentStartIndex + firstSectionIndex);
            // Only keep preamble if it has non-empty content
            const preambleText = preambleLines.join('\n').trim();
            if (preambleText) {
                preamble = preambleText;
            }
            contentStartIndex = contentStartIndex + firstSectionIndex;
        }
        for (let i = contentStartIndex; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;
            // Check for ## heading (top-level section)
            const h2Match = line.match(/^##\s+(.+)$/);
            if (h2Match) {
                // Save previous section if exists
                if (currentSection) {
                    // Save current subsection to section before pushing
                    if (currentSubsection) {
                        currentSubsection.endLine = lineNum - 1;
                        currentSection.subsections.push(currentSubsection);
                    }
                    currentSection.endLine = lineNum - 1;
                    sections.push(currentSection);
                }
                // Start new section
                const headingText = h2Match[1];
                const id = this.generateHeadingId(headingText);
                currentSection = {
                    heading: line,
                    level: 2,
                    id,
                    content: line + '\n',
                    startLine: lineNum,
                    endLine: lineNum,
                    subsections: [],
                };
                currentSubsection = null;
                continue;
            }
            // Check for ### heading (subsection)
            const h3Match = line.match(/^###\s+(.+)$/);
            if (h3Match && currentSection) {
                // Save previous subsection if exists
                if (currentSubsection) {
                    currentSubsection.endLine = lineNum - 1;
                    currentSection.subsections.push(currentSubsection);
                }
                // Start new subsection
                const headingText = h3Match[1];
                const id = this.generateHeadingId(headingText);
                currentSubsection = {
                    heading: line,
                    level: 3,
                    id,
                    content: line + '\n',
                    startLine: lineNum,
                    endLine: lineNum,
                    parentId: currentSection.id,
                    subsections: [],
                };
                continue;
            }
            // Add content to current section/subsection
            if (currentSubsection) {
                currentSubsection.content += line + '\n';
                currentSubsection.endLine = lineNum;
            }
            else if (currentSection) {
                currentSection.content += line + '\n';
                currentSection.endLine = lineNum;
            }
        }
        // Save last section
        if (currentSection) {
            if (currentSubsection) {
                currentSection.subsections.push(currentSubsection);
            }
            sections.push(currentSection);
        }
        // Trim trailing newlines from content
        sections.forEach(section => {
            section.content = section.content.trimEnd();
            section.subsections.forEach(sub => {
                sub.content = sub.content.trimEnd();
            });
        });
        // Debug logging
        console.log(`[Parser] Parsed ${sections.length} sections from ${filepath}`);
        sections.forEach((s, i) => {
            console.log(`[Parser]   Section ${i}: "${s.heading}" with ${s.subsections.length} subsections`);
        });
        return {
            sections,
            frontmatter,
            preamble,
            metadata: {
                filepath,
                totalLines: lines.length,
                sectionCount: sections.length,
            },
        };
    } /**
     * Generate heading ID/anchor from heading text
     * Follows the same rules as MyST/Sphinx for consistency
     */
    generateHeadingId(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    /**
     * Find a section by ID (searches recursively through subsections)
     */
    findSectionById(sections, id) {
        for (const section of sections) {
            if (section.id === id) {
                return section;
            }
            const found = this.findSectionById(section.subsections, id);
            if (found) {
                return found;
            }
        }
        return undefined;
    }
    /**
     * Find section by position/index
     */
    findSectionByPosition(sections, index) {
        return sections[index];
    }
    /**
     * Validate MyST syntax by attempting to parse
     * Returns true if valid, false otherwise
     */
    async validateMyST(content, filepath) {
        try {
            await this.parseSections(content, filepath);
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown validation error',
            };
        }
    }
}
exports.MystParser = MystParser;
//# sourceMappingURL=parser.js.map