/**
 * Tests for language-specific configuration
 */

import { getLanguageConfig, formatAdditionalRules } from '../language-config';

describe('Language Configuration', () => {
  describe('getLanguageConfig', () => {
    it('should return Chinese config for zh-cn', () => {
      const config = getLanguageConfig('zh-cn');
      expect(config.code).toBe('zh-cn');
      expect(config.name).toBe('Chinese (Simplified)');
      expect(config.additionalRules).toHaveLength(1);
      expect(config.additionalRules[0]).toContain('full-width Chinese punctuation');
    });

    it('should handle case insensitive language codes', () => {
      const config1 = getLanguageConfig('zh-cn');
      const config2 = getLanguageConfig('ZH-CN');
      const config3 = getLanguageConfig('Zh-Cn');
      
      expect(config1).toEqual(config2);
      expect(config2).toEqual(config3);
    });

    it('should return empty rules for unconfigured languages', () => {
      const config = getLanguageConfig('ja');
      expect(config.code).toBe('ja');
      expect(config.additionalRules).toHaveLength(0);
    });

    it('should return empty rules for unknown languages', () => {
      const config = getLanguageConfig('unknown-lang');
      expect(config.code).toBe('unknown-lang');
      expect(config.additionalRules).toHaveLength(0);
    });
  });

  describe('formatAdditionalRules', () => {
    it('should format Chinese rules as string', () => {
      const rules = formatAdditionalRules('zh-cn');
      expect(rules).toContain('full-width Chinese punctuation');
    });

    it('should return empty string for unconfigured languages', () => {
      const rules = formatAdditionalRules('ja');
      expect(rules).toBe('');
    });

    it('should return empty string for unknown languages', () => {
      const rules = formatAdditionalRules('unknown-lang');
      expect(rules).toBe('');
    });
  });
});
