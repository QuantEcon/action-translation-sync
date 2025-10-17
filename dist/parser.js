"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MystParser = void 0;
const unified_1 = require("unified");
const remark_parse_1 = __importDefault(require("remark-parse"));
const remark_stringify_1 = __importDefault(require("remark-stringify"));
const remark_directive_1 = __importDefault(require("remark-directive"));
const remark_math_1 = __importDefault(require("remark-math"));
const remark_gfm_1 = __importDefault(require("remark-gfm"));
const unist_util_visit_1 = require("unist-util-visit");
const mdast_util_to_string_1 = require("mdast-util-to-string");
/**
 * MyST Markdown Parser
 * Parses MyST markdown into semantic blocks for translation
 */
class MystParser {
    constructor() {
        this.processor = (0, unified_1.unified)()
            .use(remark_parse_1.default)
            .use(remark_directive_1.default)
            .use(remark_math_1.default)
            .use(remark_gfm_1.default)
            .use(remark_stringify_1.default);
    }
    /**
     * Parse markdown content into structured blocks
     */
    async parse(content, filepath) {
        const tree = this.processor.parse(content);
        const blocks = [];
        let currentHeading = undefined;
        let lineOffset = 0;
        const metadata = {
            filepath,
            totalLines: content.split('\n').length,
            hasDirectives: false,
            hasMath: false,
            hasCode: false,
        };
        // Visit each node in the tree
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (0, unist_util_visit_1.visit)(tree, (node, index, parent) => {
            const position = node.position;
            if (!position)
                return;
            const startLine = position.start.line;
            const endLine = position.end.line;
            const nodeContent = this.extractContent(content, startLine, endLine);
            let block = null;
            switch (node.type) {
                case 'heading':
                    const heading = node;
                    const headingText = (0, mdast_util_to_string_1.toString)(heading);
                    const headingId = this.generateHeadingId(headingText);
                    // For headings, parentHeading should be undefined for top-level (# and ##)
                    // Only ### and deeper should have a parent heading
                    block = {
                        type: 'heading',
                        content: nodeContent,
                        id: headingId,
                        level: heading.depth,
                        startLine,
                        endLine,
                        parentHeading: heading.depth > 2 ? currentHeading : undefined,
                    };
                    // Update current heading context for non-heading blocks that follow
                    // Level 1 and 2 headings set the context
                    if (heading.depth === 1 || heading.depth === 2) {
                        currentHeading = headingId;
                    }
                    break;
                case 'code':
                    const code = node;
                    metadata.hasCode = true;
                    block = {
                        type: 'code',
                        content: nodeContent,
                        language: code.lang || undefined,
                        meta: code.meta || undefined,
                        startLine,
                        endLine,
                        parentHeading: currentHeading,
                    };
                    break;
                case 'paragraph':
                    block = {
                        type: 'paragraph',
                        content: nodeContent,
                        startLine,
                        endLine,
                        parentHeading: currentHeading,
                    };
                    break;
                case 'list':
                    block = {
                        type: 'list',
                        content: nodeContent,
                        startLine,
                        endLine,
                        parentHeading: currentHeading,
                    };
                    break;
                case 'blockquote':
                    block = {
                        type: 'blockquote',
                        content: nodeContent,
                        startLine,
                        endLine,
                        parentHeading: currentHeading,
                    };
                    break;
                case 'table':
                    block = {
                        type: 'table',
                        content: nodeContent,
                        startLine,
                        endLine,
                        parentHeading: currentHeading,
                    };
                    break;
                case 'thematicBreak':
                    block = {
                        type: 'thematic_break',
                        content: nodeContent,
                        startLine,
                        endLine,
                        parentHeading: currentHeading,
                    };
                    break;
                case 'html':
                    block = {
                        type: 'html',
                        content: nodeContent,
                        startLine,
                        endLine,
                        parentHeading: currentHeading,
                    };
                    break;
                case 'math':
                    metadata.hasMath = true;
                    block = {
                        type: 'math',
                        content: nodeContent,
                        startLine,
                        endLine,
                        parentHeading: currentHeading,
                    };
                    break;
                // MyST directives (like {note}, {warning}, etc.)
                case 'textDirective':
                case 'leafDirective':
                case 'containerDirective':
                    metadata.hasDirectives = true;
                    block = {
                        type: 'directive',
                        content: nodeContent,
                        startLine,
                        endLine,
                        parentHeading: currentHeading,
                    };
                    break;
            }
            if (block) {
                blocks.push(block);
            }
        });
        return {
            blocks,
            metadata,
        };
    }
    /**
     * Reconstruct markdown from blocks
     */
    reconstructMarkdown(blocks) {
        return blocks.map(block => block.content).join('\n\n');
    }
    /**
     * Extract content between line numbers
     */
    extractContent(fullContent, startLine, endLine) {
        const lines = fullContent.split('\n');
        return lines.slice(startLine - 1, endLine).join('\n');
    }
    /**
     * Generate heading ID/anchor from heading text
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
     * Find a block by its ID (for headings)
     */
    findBlockById(blocks, id) {
        return blocks.find(b => b.id === id);
    }
    /**
     * Find blocks under a specific heading
     */
    findBlocksUnderHeading(blocks, headingId) {
        return blocks.filter(b => b.parentHeading === headingId);
    }
    /**
     * Get context around a block (before and after)
     */
    getBlockContext(blocks, block, contextLines = 3) {
        const blockIndex = blocks.indexOf(block);
        const beforeBlocks = blocks.slice(Math.max(0, blockIndex - contextLines), blockIndex);
        const afterBlocks = blocks.slice(blockIndex + 1, blockIndex + 1 + contextLines);
        return {
            before: beforeBlocks.map(b => b.content).join('\n\n'),
            after: afterBlocks.map(b => b.content).join('\n\n'),
        };
    }
}
exports.MystParser = MystParser;
//# sourceMappingURL=parser.js.map