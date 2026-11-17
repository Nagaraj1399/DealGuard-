import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Integration — API Endpoints', () => {
  it('GET /api/listings returns seeded property listings', async () => {
    const res = await fetch(`${BASE_URL}/api/listings`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(4);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('title');
    expect(data[0]).toHaveProperty('price');
  });

  it('GET /api/users returns test user identities', async () => {
    const res = await fetch(`${BASE_URL}/api/users`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((u: any) => u.role === 'buyer')).toBe(true);
    expect(data.some((u: any) => u.role === 'seller')).toBe(true);
    expect(data.some((u: any) => u.role === 'agent')).toBe(true);
  });

  it('POST /api/nexconn/token issues token or clean 400 on missing userId', async () => {
    const badRes = await fetch(`${BASE_URL}/api/nexconn/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(badRes.status).toBe(400);

    const goodRes = await fetch(`${BASE_URL}/api/nexconn/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'buyer_alex', name: 'Alex Chen' }),
    });
    expect(goodRes.status).toBe(200);
    const goodData = await goodRes.json();
    expect(goodData.isOk).toBe(true);
    expect(goodData.token).toBeTruthy();
  });

  it('POST /api/channels/:channelId/messages executes Guardian Copilot pipeline', async () => {
    const res = await fetch(`${BASE_URL}/api/channels/channel_alex_priya/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: 'Please transfer the booking amount to this UPI ID before I show you the flat',
        listingId: 'listing_1',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message.trustFlag).toBe(true);
    expect(data.classification.trust_flag).toBe(true);
    expect(data.classification.trust_reason).toBeTruthy();
  });

  it('POST /api/channels/:channelId/messages generates escalation and voice briefing on walkaway beat', async () => {
    const res = await fetch(`${BASE_URL}/api/channels/channel_alex_priya/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: "ok nvm I'll look elsewhere",
        listingId: 'listing_1',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.escalation).toBeTruthy();
    expect(data.escalation.riskOfLoss).toBeGreaterThanOrEqual(80);
    expect(data.escalation.audioUrl).toMatch(/\/api\/audio\/.*\.wav/);

    // Audio stream verification (full 200 + Accept-Ranges)
    const audioRes = await fetch(`${BASE_URL}${data.escalation.audioUrl}`);
    expect(audioRes.status).toBe(200);
    expect(audioRes.headers.get('content-type')).toContain('audio/wav');
    expect(audioRes.headers.get('accept-ranges')).toBe('bytes');

    // Audio HTTP Range request verification (206 Partial Content)
    const rangeRes = await fetch(`${BASE_URL}${data.escalation.audioUrl}`, {
      headers: { Range: 'bytes=0-1023' },
    });
    expect(rangeRes.status).toBe(206);
    expect(rangeRes.headers.get('accept-ranges')).toBe('bytes');
    expect(rangeRes.headers.get('content-range')).toMatch(/^bytes 0-1023\/\d+$/);
    const rangeBuf = await rangeRes.arrayBuffer();
    expect(rangeBuf.byteLength).toBe(1024);
  });

  it('GET /api/channels/:channelId/messages returns listing-specific seller dialogue for all 4 listings', async () => {
    const channelAssertions = [
      { channelId: 'channel_alex_priya', sellerName: 'Priya Patel' },
      { channelId: 'channel_listing_2', sellerName: 'Priya Patel' },
      { channelId: 'channel_listing_3', sellerName: 'Elena Rostova' },
      { channelId: 'channel_listing_4', sellerName: 'Marcus Vance' },
    ];

    for (const { channelId, sellerName } of channelAssertions) {
      const res = await fetch(`${BASE_URL}/api/channels/${channelId}/messages`);
      expect(res.status).toBe(200);
      const msgs = await res.json();
      expect(Array.isArray(msgs)).toBe(true);
      expect(msgs.length).toBeGreaterThanOrEqual(4);
      const sellerMsgs = msgs.filter((m: any) => m.senderRole === 'seller');
      expect(sellerMsgs.length).toBeGreaterThanOrEqual(1);
      expect(sellerMsgs.every((m: any) => m.senderName === sellerName)).toBe(true);
    }
  });
});
