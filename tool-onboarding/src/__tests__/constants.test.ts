/**
 * Tests for constants.ts - Shared constants and configuration
 */

import {
  DEFAULT_THRESHOLDS,
  LANGUAGE_NAMES,
  getLanguageName,
  I18N_LINE_PATTERNS,
  I18N_NAMED_PATTERNS,
  STATUS_ICONS,
  BLOCK_STATUS_ICONS
} from '../constants';

describe('DEFAULT_THRESHOLDS', () => {
  it('should have valid code alignment thresholds', () => {
    expect(DEFAULT_THRESHOLDS.code.aligned).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.code.aligned).toBeLessThanOrEqual(100);
    expect(DEFAULT_THRESHOLDS.code.review).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.code.review).toBeLessThanOrEqual(100);
  });

  it('should have valid prose alignment thresholds', () => {
    expect(DEFAULT_THRESHOLDS.prose.aligned).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.prose.aligned).toBeLessThanOrEqual(100);
    expect(DEFAULT_THRESHOLDS.prose.review).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.prose.review).toBeLessThanOrEqual(100);
  });

  it('should have aligned threshold >= review threshold', () => {
    expect(DEFAULT_THRESHOLDS.code.aligned).toBeGreaterThanOrEqual(
      DEFAULT_THRESHOLDS.code.review
    );
    expect(DEFAULT_THRESHOLDS.prose.aligned).toBeGreaterThanOrEqual(
      DEFAULT_THRESHOLDS.prose.review
    );
  });
});

describe('LANGUAGE_NAMES', () => {
  it('should have Chinese language mapping', () => {
    expect(LANGUAGE_NAMES['zh-cn']).toBe('Simplified Chinese');
  });

  it('should have Farsi language mapping', () => {
    expect(LANGUAGE_NAMES['fa']).toBe('Farsi');
  });

  it('should have multiple language mappings', () => {
    expect(Object.keys(LANGUAGE_NAMES).length).toBeGreaterThan(5);
  });
});

describe('getLanguageName', () => {
  it('should return full name for known languages', () => {
    expect(getLanguageName('zh-cn')).toBe('Simplified Chinese');
    expect(getLanguageName('fa')).toBe('Farsi');
    expect(getLanguageName('ja')).toBe('Japanese');
  });

  it('should return code for unknown languages', () => {
    expect(getLanguageName('unknown')).toBe('unknown');
    expect(getLanguageName('xx')).toBe('xx');
  });

  it('should handle empty string', () => {
    expect(getLanguageName('')).toBe('');
  });
});

describe('I18N_LINE_PATTERNS', () => {
  it('should be an array of RegExp', () => {
    expect(Array.isArray(I18N_LINE_PATTERNS)).toBe(true);
    I18N_LINE_PATTERNS.forEach(pattern => {
      expect(pattern).toBeInstanceOf(RegExp);
    });
  });

  it('should match font configuration', () => {
    const fontPattern = I18N_LINE_PATTERNS.find(p => 
      p.test("plt.rcParams['font.family'] = 'sans-serif'")
    );
    expect(fontPattern).toBeDefined();
  });

  it('should match matplotlib font_manager', () => {
    const fontManagerPattern = I18N_LINE_PATTERNS.find(p =>
      p.test("import matplotlib.font_manager as fm")
    );
    expect(fontManagerPattern).toBeDefined();
  });
});

describe('I18N_NAMED_PATTERNS', () => {
  it('should be an array with name and pattern', () => {
    expect(Array.isArray(I18N_NAMED_PATTERNS)).toBe(true);
    I18N_NAMED_PATTERNS.forEach(item => {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('pattern');
      expect(typeof item.name).toBe('string');
      expect(item.pattern).toBeInstanceOf(RegExp);
    });
  });

  it('should include matplotlib-font pattern', () => {
    const fontPattern = I18N_NAMED_PATTERNS.find(p => p.name === 'matplotlib-font');
    expect(fontPattern).toBeDefined();
  });
});

describe('STATUS_ICONS', () => {
  it('should have icon for aligned status', () => {
    expect(STATUS_ICONS.aligned).toBeDefined();
    expect(typeof STATUS_ICONS.aligned).toBe('string');
  });

  it('should have icon for differs status', () => {
    expect(STATUS_ICONS.differs).toBeDefined();
    expect(typeof STATUS_ICONS.differs).toBe('string');
  });

  it('should have icon for missing status', () => {
    expect(STATUS_ICONS.missing).toBeDefined();
    expect(typeof STATUS_ICONS.missing).toBe('string');
  });

  it('should have icon for inserted status', () => {
    expect(STATUS_ICONS.inserted).toBeDefined();
    expect(typeof STATUS_ICONS.inserted).toBe('string');
  });
});

describe('BLOCK_STATUS_ICONS', () => {
  it('should have icon for aligned blocks', () => {
    expect(BLOCK_STATUS_ICONS.aligned).toBeDefined();
  });

  it('should have icon for modified blocks', () => {
    expect(BLOCK_STATUS_ICONS.modified).toBeDefined();
  });

  it('should have icon for inserted-i18n blocks', () => {
    expect(BLOCK_STATUS_ICONS['inserted-i18n']).toBeDefined();
  });

  it('should have icon for missing blocks', () => {
    expect(BLOCK_STATUS_ICONS.missing).toBeDefined();
  });
});
