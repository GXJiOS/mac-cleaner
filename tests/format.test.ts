import { describe, expect, it } from 'vitest';
import { compactPath, formatBytes } from '../src/lib/format';

describe('formatBytes', () => {
  it('formats byte sizes across units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5.00 GB');
  });
});

describe('compactPath', () => {
  it('replaces the user home prefix', () => {
    expect(compactPath('/Users/demo/Library/Caches')).toBe('~/Library/Caches');
    expect(compactPath('/private/tmp/item')).toBe('/private/tmp/item');
  });
});
