const AVATAR_BY_ID: Record<string, string> = {
  buyer_alex: '/src/assets/images/avatar_alex.png',
  seller_priya: '/src/assets/images/avatar_priya.png',
  seller_marcus: '/src/assets/images/avatar_marcus.png',
  seller_elena: '/src/assets/images/avatar_elena.png',
  agent_sarah: '/src/assets/images/avatar_sarah.png',
};

export function getAvatarForUser(userId?: string, name?: string): string | null {
  if (userId && AVATAR_BY_ID[userId]) {
    return AVATAR_BY_ID[userId];
  }
  const lower = (name || '').toLowerCase();
  if (lower.includes('alex')) return AVATAR_BY_ID.buyer_alex;
  if (lower.includes('priya')) return AVATAR_BY_ID.seller_priya;
  if (lower.includes('marcus')) return AVATAR_BY_ID.seller_marcus;
  if (lower.includes('elena')) return AVATAR_BY_ID.seller_elena;
  if (lower.includes('sarah')) return AVATAR_BY_ID.agent_sarah;
  return null;
}
