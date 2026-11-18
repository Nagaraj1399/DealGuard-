import { describe, it, expect } from 'vitest';
import {
  getChannelIdForListing,
  getListingIdFromChannelId,
  findListingForChannel,
} from '../../src/utils/channels.ts';
import { db } from '../../server/db.ts';

describe('Unit — Channel & Listing Mapping', () => {
  it('maps each listing to its dedicated channel ID', () => {
    expect(getChannelIdForListing('listing_1')).toBe('channel_alex_priya');
    expect(getChannelIdForListing('listing_2')).toBe('channel_listing_2');
    expect(getChannelIdForListing('listing_3')).toBe('channel_listing_3');
    expect(getChannelIdForListing('listing_4')).toBe('channel_listing_4');
  });

  it('reverse-maps channel IDs back to the matching listing', () => {
    const listings = db.getListings();
    expect(getListingIdFromChannelId('channel_alex_priya')).toBe('listing_1');
    expect(getListingIdFromChannelId('channel_listing_3')).toBe('listing_3');

    const listing3 = findListingForChannel(listings, 'channel_listing_3');
    expect(listing3?.id).toBe('listing_3');
    expect(listing3?.sellerName).toBe('Elena Rostova');
  });
});
