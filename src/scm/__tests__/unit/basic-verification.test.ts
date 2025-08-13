/**
 * Basic verification test to ensure test infrastructure is working
 */

import { describe, it, expect } from 'vitest';

describe('Basic Test Infrastructure', () => {
  it('should run basic test', () => {
    expect(true).toBe(true);
  });

  it('should have access to vitest globals', () => {
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });
});