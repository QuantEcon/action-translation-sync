import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root, RootContent, Heading, Code } from 'mdast';
import { Block, BlockType, ParsedDocument } from './types';

/**
 * MyST Markdown Parser
 * Parses MyST markdown into semantic blocks for translation
 */
export class MystParser {
  private processor;

  constructor() {
    this.processor = unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkMath)
      .use(remarkGfm)
      .use(remarkStringify);
  }

  /**
   * Parse markdown content into structured blocks
   */
  async parse(content: string, filepath: string): Promise<ParsedDocument> {
    const tree = this.processor.parse(content) as Root;
    const blocks: Block[] = [];
    let currentHeading: string | undefined = undefined;
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
    visit(tree, (node: any, index: number | undefined, parent: any) => {
      const position = node.position;
      if (!position) return;

      const startLine = position.start.line;
      const endLine = position.end.line;
      const nodeContent = this.extractContent(content, startLine, endLine);

      let block: Block | null = null;

      switch (node.type) {
        case 'heading':
          const heading = node as Heading;
          const headingText = toString(heading);
          const headingId = this.generateHeadingId(headingText);
          
          block = {
            type: 'heading',
            content: nodeContent,
            id: headingId,
            level: heading.depth,
            startLine,
            endLine,
            parentHeading: heading.depth > 1 ? currentHeading : undefined,
          };
          
          // Update current heading context
          if (heading.depth === 1 || heading.depth === 2) {
            currentHeading = headingId;
          }
          break;

        case 'code':
          const code = node as Code;
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
  reconstructMarkdown(blocks: Block[]): string {
    return blocks.map(block => block.content).join('\n\n');
  }

  /**
   * Extract content between line numbers
   */
  private extractContent(fullContent: string, startLine: number, endLine: number): string {
    const lines = fullContent.split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
  }

  /**
   * Generate heading ID/anchor from heading text
   */
  private generateHeadingId(text: string): string {
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
  findBlockById(blocks: Block[], id: string): Block | undefined {
    return blocks.find(b => b.id === id);
  }

  /**
   * Find blocks under a specific heading
   */
  findBlocksUnderHeading(blocks: Block[], headingId: string): Block[] {
    return blocks.filter(b => b.parentHeading === headingId);
  }

  /**
   * Get context around a block (before and after)
   */
  getBlockContext(blocks: Block[], block: Block, contextLines: number = 3): {
    before: string;
    after: string;
  } {
    const blockIndex = blocks.indexOf(block);
    
    const beforeBlocks = blocks.slice(Math.max(0, blockIndex - contextLines), blockIndex);
    const afterBlocks = blocks.slice(blockIndex + 1, blockIndex + 1 + contextLines);

    return {
      before: beforeBlocks.map(b => b.content).join('\n\n'),
      after: afterBlocks.map(b => b.content).join('\n\n'),
    };
  }
}
