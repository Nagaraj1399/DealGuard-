import { describe, it, expect } from 'vitest';
import { classifyMessage } from '../../server/classifier.ts';

describe('Unit — classifier contract', () => {
  it('identifies Trust Shield scam patterns and produces formatted json', async () => {
    const result = await classifyMessage('Please transfer the booking amount to this UPI ID before I show you the flat');
    expect(result.trust_flag).toBe(true);
    expect(result.trust_reason).toBeTruthy();
    expect(typeof result.trust_reason).toBe('string');
    expect(result.lead_score).toBeGreaterThanOrEqual(0);
    expect(result.lead_score).toBeLessThanOrEqual(100);
    expect(result.risk_of_loss).toBeGreaterThanOrEqual(0);
    expect(result.risk_of_loss).toBeLessThanOrEqual(100);
  });

  it('identifies Hot-Lead walkaway disengagement risk', async () => {
    const result = await classifyMessage("ok nvm I'll look elsewhere");
    expect(result.trust_flag).toBe(false);
    expect(result.trust_reason).toBeNull();
    expect(result.risk_of_loss).toBeGreaterThanOrEqual(80);
  });

  it('identifies high intent commitment signals', async () => {
    const result = await classifyMessage('I am ready to sign and make an offer right now with full cash');
    expect(result.trust_flag).toBe(false);
    expect(result.lead_score).toBeGreaterThanOrEqual(80);
    expect(result.risk_of_loss).toBeLessThan(50);
  });

  it('safely classifies neutral inquiries without throwing', async () => {
    const result = await classifyMessage('What is the square footage and HOA fee?');
    expect(typeof result.trust_flag).toBe('boolean');
    expect(result.lead_score).toBeGreaterThanOrEqual(0);
    expect(result.lead_score).toBeLessThanOrEqual(100);
    expect(result.risk_of_loss).toBeGreaterThanOrEqual(0);
    expect(result.risk_of_loss).toBeLessThanOrEqual(100);
  });
});
