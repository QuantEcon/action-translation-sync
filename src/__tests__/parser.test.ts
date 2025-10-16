describe('Basic Tests', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const text = 'Hello World';
    expect(text.toLowerCase()).toBe('hello world');
  });
});

// Note: Parser and DiffDetector tests require ES module support
// These will be added once Jest is properly configured for ES modules
// or when running integration tests
