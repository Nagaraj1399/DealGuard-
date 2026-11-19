import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

async function postChatMessage(
  channelId: string,
  listingId: string,
  content: string,
  senderRole: 'buyer' | 'seller' = 'buyer'
) {
  const res = await fetch(`${BASE_URL}/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      senderId: senderRole === 'buyer' ? 'buyer_alex' : 'seller_elena',
      senderName: senderRole === 'buyer' ? 'Alex Chen' : 'Elena Rostova',
      senderRole,
      content,
      listingId,
    }),
  });
  expect(res.status).toBe(200);
  return res.json();
}

describe('Integration — API Endpoints & Adversarial Real-LLM Verification', () => {
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

  it('GET /api/channels/:channelId/messages returns listing-specific seller dialogue for all 4 listings', async () => {
    await fetch(`${BASE_URL}/api/seed/reset`, { method: 'POST' });

    const channelAssertions = [
      { channelId: 'channel_alex_priya', sellerName: 'Priya Patel', keyword: 'Deeded Parking' },
      { channelId: 'channel_listing_2', sellerName: 'Priya Patel', keyword: 'Private Sky Terrace' },
      { channelId: 'channel_listing_3', sellerName: 'Elena Rostova', keyword: 'Infinity Pool' },
      { channelId: 'channel_listing_4', sellerName: 'Marcus Vance', keyword: 'Zoned Live/Work' },
    ];

    for (const { channelId, sellerName, keyword } of channelAssertions) {
      const res = await fetch(`${BASE_URL}/api/channels/${channelId}/messages`);
      expect(res.status).toBe(200);
      const msgs = await res.json();
      expect(Array.isArray(msgs)).toBe(true);
      expect(msgs.length).toBeGreaterThanOrEqual(4);
      const sellerMsgs = msgs.filter((m: any) => m.senderRole === 'seller');
      expect(sellerMsgs.length).toBeGreaterThanOrEqual(1);
      expect(sellerMsgs.every((m: any) => m.senderName === sellerName)).toBe(true);
      expect(msgs.some((m: any) => m.content.includes(keyword))).toBe(true);
    }
  });

  it(
    'Trust Shield flags 5 unscripted scam phrasings across 2 listings without false positives on benign turns',
    async () => {
      await fetch(`${BASE_URL}/api/seed/reset`, { method: 'POST' });

      const unscriptedScams: Array<{ ch: string; l: string; text: string; role: 'buyer' | 'seller' }> = [
        {
          ch: 'channel_alex_priya',
          l: 'listing_1',
          text: 'I am away in Zurich this week — Venmo me $450 now and my cousin will drop the condo keys in your mailbox.',
          role: 'seller',
        },
        {
          ch: 'channel_alex_priya',
          l: 'listing_1',
          text: 'Grab two $200 Apple gift cards and send me the pin numbers before I give you the building address.',
          role: 'seller',
        },
        {
          ch: 'channel_listing_3',
          l: 'listing_3',
          text: 'Wire $1,500 directly to my personal checking account right now before any walkthrough to beat five other families.',
          role: 'seller',
        },
        {
          ch: 'channel_listing_3',
          l: 'listing_3',
          text: 'Close DealGuard and message me on Signal only so we can settle the cash holding fee privately without brokers.',
          role: 'seller',
        },
        {
          ch: 'channel_listing_3',
          l: 'listing_3',
          text: 'Send $300 via PayPal friends and family upfront to unlock the gate code for tomorrow.',
          role: 'buyer',
        },
      ];

      for (const s of unscriptedScams) {
        const data = await postChatMessage(s.ch, s.l, s.text, s.role);
        expect(data.message.trustFlag).toBe(true);
        expect(data.classification.trust_flag).toBe(true);
        expect(data.classification.trust_reason).toBeTruthy();
      }

      // Benign inquiry on a clean listing must produce zero false positives
      const benign = await postChatMessage(
        'channel_listing_4',
        'listing_4',
        'Does the loft get good afternoon sunlight and is guest parking available nearby?',
        'buyer'
      );
      expect(benign.message.trustFlag).toBe(false);
      expect(benign.classification.trust_flag).toBe(false);
      expect(benign.escalation).toBeNull();
    },
    60000
  );

  it(
    'Hot-Lead Radar escalates 5 unscripted walkaways, deduplicates re-triggers per channel, and serves concurrent 206 audio ranges',
    async () => {
      await fetch(`${BASE_URL}/api/seed/reset`, { method: 'POST' });

      // 5 unscripted walkaway messages across channels (including 2 re-triggers on same channels)
      const walk1 = await postChatMessage(
        'channel_alex_priya',
        'listing_1',
        'Honestly I have been waiting all afternoon for an answer, forget it I am moving on.',
        'buyer'
      );
      expect(walk1.classification.trust_flag).toBe(false);
      expect(walk1.classification.risk_of_loss).toBeGreaterThanOrEqual(80);
      expect(walk1.escalation).toBeTruthy();
      expect(walk1.deduplicated).toBe(false);

      // Re-trigger on SAME channel -> must deduplicate, NOT create a second active escalation or second system notice
      const walk2 = await postChatMessage(
        'channel_alex_priya',
        'listing_1',
        'Actually we decided to go with another condo downtown instead, please cancel our Saturday visit.',
        'buyer'
      );
      expect(walk2.classification.risk_of_loss).toBeGreaterThanOrEqual(80);
      expect(walk2.escalation).toBeTruthy();
      expect(walk2.escalation.id).toBe(walk1.escalation.id);
      expect(walk2.deduplicated).toBe(true);

      const walk3 = await postChatMessage(
        'channel_listing_3',
        'listing_3',
        'The price plus upkeep is way too steep for us, count me out.',
        'buyer'
      );
      expect(walk3.classification.risk_of_loss).toBeGreaterThanOrEqual(80);
      expect(walk3.escalation).toBeTruthy();

      const walk4 = await postChatMessage(
        'channel_listing_2',
        'listing_2',
        'This is dragging on way too long, I am done looking at this penthouse.',
        'buyer'
      );
      expect(walk4.classification.risk_of_loss).toBeGreaterThanOrEqual(80);
      expect(walk4.escalation).toBeTruthy();

      const walk5 = await postChatMessage(
        'channel_listing_4',
        'listing_4',
        'Not worth the hassle anymore, we found a better loft in another neighborhood.',
        'buyer'
      );
      expect(walk5.classification.risk_of_loss).toBeGreaterThanOrEqual(80);
      expect(walk5.escalation).toBeTruthy();

      // Verify exactly 4 active escalations (one per channel, zero duplicates)
      const escRes = await fetch(`${BASE_URL}/api/agent/escalations`);
      const escalations = await escRes.json();
      expect(escalations.length).toBe(4);

      const l1Msgs = await (await fetch(`${BASE_URL}/api/channels/channel_alex_priya/messages`)).json();
      expect(l1Msgs.filter((m: any) => m.isSystemNotice).length).toBe(1);

      // Rapid overlapping concurrent audio Range stress test across all 4 briefings
      const audioUrls = [
        walk1.escalation.audioUrl,
        walk3.escalation.audioUrl,
        walk4.escalation.audioUrl,
        walk5.escalation.audioUrl,
      ];

      const rangeResults = await Promise.all(
        audioUrls.flatMap((url) => [
          fetch(`${BASE_URL}${url}`, { headers: { Range: 'bytes=0-1023' } }),
          fetch(`${BASE_URL}${url}`, { headers: { Range: 'bytes=1024-4095' } }),
        ])
      );

      for (const r of rangeResults) {
        expect(r.status).toBe(206);
        expect(r.headers.get('accept-ranges')).toBe('bytes');
        expect(r.headers.get('content-range')).toMatch(/^bytes \d+-\d+\/\d+$/);
        const buf = new Uint8Array(await r.arrayBuffer());
        expect(buf.byteLength).toBeGreaterThan(0);
      }
    },
    90000
  );
});
