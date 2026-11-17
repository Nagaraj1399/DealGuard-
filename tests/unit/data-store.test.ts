import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../server/db.ts';

describe('Unit — data store CRUD & seed integrity', () => {
  beforeEach(() => {
    db.resetToDefaults();
  });

  it('loads seeded users and listings with synthetic data', () => {
    const users = db.getUsers();
    expect(users.length).toBeGreaterThanOrEqual(4);
    expect(users.some((u) => u.role === 'buyer')).toBe(true);
    expect(users.some((u) => u.role === 'seller')).toBe(true);
    expect(users.some((u) => u.role === 'agent')).toBe(true);

    const listings = db.getListings();
    expect(listings.length).toBeGreaterThanOrEqual(4);
    expect(listings[0].title).toBeTruthy();
    expect(listings[0].price).toBeGreaterThan(0);
  });

  it('adds and updates messages without dropping state', () => {
    const newMsg = {
      id: `test_msg_${Date.now()}`,
      channelId: 'channel_test',
      senderId: 'buyer_alex',
      senderName: 'Alex Chen',
      senderRole: 'buyer' as const,
      content: 'Can I view tomorrow?',
      timestamp: Date.now(),
    };

    db.addMessage(newMsg);
    const msgs = db.getMessages('channel_test');
    expect(msgs.length).toBe(1);
    expect(msgs[0].content).toBe('Can I view tomorrow?');
  });

  it('manages escalations and claims properly', () => {
    const esc = {
      id: `esc_test_${Date.now()}`,
      channelId: 'channel_alex_priya',
      listingId: 'listing_1',
      listingTitle: 'The Horizon Marina Residence',
      buyerId: 'buyer_alex',
      buyerName: 'Alex Chen',
      sellerId: 'seller_priya',
      sellerName: 'Priya Patel',
      triggerReason: 'risk_of_loss' as const,
      leadScore: 28,
      riskOfLoss: 94,
      briefingTranscript: 'Escalation briefing',
      audioUrl: '/api/audio/test.wav',
      timestamp: Date.now(),
      status: 'active' as const,
      lastMessageText: "ok nvm I'll look elsewhere",
    };

    db.addEscalation(esc);
    const escalations = db.getEscalations();
    expect(escalations.length).toBeGreaterThanOrEqual(1);

    const claimed = db.claimEscalation(esc.id, 'Sarah Jenkins');
    expect(claimed?.status).toBe('claimed');
    expect(claimed?.claimedBy).toBe('Sarah Jenkins');
  });
});
