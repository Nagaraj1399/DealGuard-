import { describe, it, expect } from 'vitest';
import { issueNexconnToken } from '../../server/nexconn.ts';

describe('Unit — Nexconn token signing and issuance', () => {
  it('generates a deterministic synthetic token structure for sandbox test identities', async () => {
    const res1 = await issueNexconnToken({ userId: 'buyer_alex', name: 'Alex Chen' });
    expect(res1.code).toBe(0);
    expect(res1.isOk).toBe(true);
    expect(res1.userId).toBe('buyer_alex');
    expect(res1.token).toMatch(/^nc_[a-f0-9]{32}$/);
    expect(res1.appKey).toBeTruthy();
  });

  it('handles distinct user identities cleanly', async () => {
    const buyer = await issueNexconnToken({ userId: 'buyer_alex' });
    const seller = await issueNexconnToken({ userId: 'seller_priya' });
    expect(buyer.userId).toBe('buyer_alex');
    expect(seller.userId).toBe('seller_priya');
    expect(buyer.token).not.toBe(seller.token);
  });
});
