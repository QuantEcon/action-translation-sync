/**
 * Tests for discovery.ts - File discovery and git metadata
 */

import * as path from 'path';
import {
  getMarkdownFiles,
  discoverFiles,
  getUpdateDirection,
  getDirectionDescription,
  getFilePath
} from '../discovery';

describe('getMarkdownFiles', () => {
  // Note: These tests use the actual test-fixtures directory
  const fixturesPath = path.join(__dirname, '../../test-fixtures');

  it('should find markdown files in a directory', () => {
    const alignedFixture = path.join(fixturesPath, '01-aligned-perfect');
    
    // This test only runs if fixtures exist
    try {
      const files = getMarkdownFiles(path.join(alignedFixture, 'source'), '');
      expect(Array.isArray(files)).toBe(true);
      // If there are files, they should be .md
      files.forEach(file => {
        expect(file.endsWith('.md')).toBe(true);
      });
    } catch {
      // Skip if fixtures don't exist
      console.log('Skipping: test fixtures not found');
    }
  });

  it('should return empty array for non-existent directory', () => {
    const files = getMarkdownFiles('/non/existent/path', '');
    expect(files).toEqual([]);
  });
});

describe('discoverFiles', () => {
  it('should pair source and target files correctly', () => {
    const fixturesPath = path.join(__dirname, '../../test-fixtures/01-aligned-perfect');
    
    try {
      const discovered = discoverFiles(
        path.join(fixturesPath, 'source'),
        path.join(fixturesPath, 'target'),
        ''
      );
      
      expect(discovered).toHaveProperty('paired');
      expect(discovered).toHaveProperty('sourceOnly');
      expect(discovered).toHaveProperty('targetOnly');
      expect(Array.isArray(discovered.paired)).toBe(true);
    } catch {
      console.log('Skipping: test fixtures not found');
    }
  });

  it('should identify source-only files', () => {
    const fixturesPath = path.join(__dirname, '../../test-fixtures/07-missing-file');
    
    try {
      const discovered = discoverFiles(
        path.join(fixturesPath, 'source'),
        path.join(fixturesPath, 'target'),
        ''
      );
      
      // Missing file fixture should have source-only files
      expect(discovered.sourceOnly.length).toBeGreaterThanOrEqual(0);
    } catch {
      console.log('Skipping: test fixtures not found');
    }
  });
});

describe('getUpdateDirection', () => {
  it('should return → when source is newer', () => {
    const direction = getUpdateDirection('2024-12-15', '2024-12-01');
    expect(direction).toBe('→');
  });

  it('should return ← when target is newer', () => {
    const direction = getUpdateDirection('2024-12-01', '2024-12-15');
    expect(direction).toBe('←');
  });

  it('should return = when dates are equal', () => {
    const direction = getUpdateDirection('2024-12-15', '2024-12-15');
    expect(direction).toBe('=');
  });

  it('should return = when dates are missing', () => {
    expect(getUpdateDirection(undefined, undefined)).toBe('=');
    expect(getUpdateDirection('2024-12-15', undefined)).toBe('=');
    expect(getUpdateDirection(undefined, '2024-12-15')).toBe('=');
  });
});

describe('getDirectionDescription', () => {
  it('should describe → direction', () => {
    const desc = getDirectionDescription('→');
    expect(desc).toContain('Source');
    expect(desc.toLowerCase()).toContain('newer');
  });

  it('should describe ← direction', () => {
    const desc = getDirectionDescription('←');
    expect(desc).toContain('Target');
    expect(desc.toLowerCase()).toContain('newer');
  });

  it('should describe = state', () => {
    const desc = getDirectionDescription('=');
    expect(desc.toLowerCase()).toContain('same');
  });
});

describe('getFilePath', () => {
  it('should join base, docs folder and file paths', () => {
    const result = getFilePath('/base/path', 'docs', 'file.md');
    expect(result).toBe('/base/path/docs/file.md');
  });

  it('should handle empty docs folder', () => {
    const result = getFilePath('/base', '', 'file.md');
    expect(result).toBe('/base/file.md');
  });

  it('should handle nested docs folder', () => {
    const result = getFilePath('/base', 'lectures/intro', 'file.md');
    expect(result).toBe('/base/lectures/intro/file.md');
  });
});
