import type { Listing } from '../types.ts';

export function getChannelIdForListing(listingId: string): string {
  if (!listingId || listingId === 'listing_1') {
    return 'channel_alex_priya';
  }
  return `channel_${listingId}`;
}

export function getListingIdFromChannelId(channelId: string): string {
  if (!channelId || channelId === 'channel_alex_priya') {
    return 'listing_1';
  }
  if (channelId.startsWith('channel_listing_')) {
    return channelId.replace('channel_', '');
  }
  return 'listing_1';
}

export function findListingForChannel(listings: Listing[], channelId: string): Listing | undefined {
  const listingId = getListingIdFromChannelId(channelId);
  return listings.find((l) => l.id === listingId) || listings[0];
}
