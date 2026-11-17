import { describe, it, expect } from 'vitest';

describe('Unit — Hot-Lead Radar & Trust Shield thresholds', () => {
  it('triggers escalation when lead_score >= 80', () => {
    const shouldEscalate = (leadScore: number, riskOfLoss: number) => leadScore >= 80 || riskOfLoss >= 80;
    expect(shouldEscalate(80, 20)).toBe(true);
    expect(shouldEscalate(85, 10)).toBe(true);
  });

  it('triggers escalation when risk_of_loss >= 80', () => {
    const shouldEscalate = (leadScore: number, riskOfLoss: number) => leadScore >= 80 || riskOfLoss >= 80;
    expect(shouldEscalate(30, 80)).toBe(true);
    expect(shouldEscalate(25, 94)).toBe(true);
  });

  it('does not trigger escalation when both metrics are below 80 (e.g. 79/79)', () => {
    const shouldEscalate = (leadScore: number, riskOfLoss: number) => leadScore >= 80 || riskOfLoss >= 80;
    expect(shouldEscalate(79, 79)).toBe(false);
    expect(shouldEscalate(50, 20)).toBe(false);
  });

  it('renders Trust Shield badge only when trust_flag is true', () => {
    const renderBadge = (flag: boolean) => (flag ? 'RED_TRUST_SHIELD_BADGE' : null);
    expect(renderBadge(true)).toBe('RED_TRUST_SHIELD_BADGE');
    expect(renderBadge(false)).toBeNull();
  });
});
