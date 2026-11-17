import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Security — Automated PII and Secret Gate', () => {
  it('passes scan-pii without detecting leaked credentials or unsafe PII patterns', () => {
    const output = execSync('npx tsx scripts/scan-pii.ts', { encoding: 'utf-8' });
    expect(output).toContain('PASSED');
  });
});
