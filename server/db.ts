import fs from 'fs';
import path from 'path';
import type { User, Listing, Message, Escalation } from './types.ts';

interface DatabaseState {
  users: User[];
  listings: Listing[];
  messages: Message[];
  escalations: Escalation[];
}

const DB_FILE = path.resolve(process.cwd(), 'dev.db.json');

class Database {
  private state: DatabaseState = {
    users: [],
    listings: [],
    messages: [],
    escalations: [],
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(data);
        // Ensure per-listing channels have their seeded conversation if absent
        const defaults = this.buildDefaultMessages();
        const existingChannels = new Set(this.state.messages.map((m) => m.channelId));
        let mutated = false;
        for (const msg of defaults) {
          if (!existingChannels.has(msg.channelId)) {
            this.state.messages.push(msg);
            mutated = true;
          }
        }
        // Migrate any legacy USD ($) prices/HOA fees to INR (₹)
        const inrPriceMap: Record<string, { price: number; formattedPrice: string }> = {
          listing_1: { price: 107500000, formattedPrice: '₹10.75 Cr' },
          listing_2: { price: 205000000, formattedPrice: '₹20.50 Cr' },
          listing_3: { price: 158500000, formattedPrice: '₹15.85 Cr' },
          listing_4: { price: 82500000, formattedPrice: '₹8.25 Cr' },
        };
        for (const listing of this.state.listings) {
          const target = inrPriceMap[listing.id];
          if (target && listing.formattedPrice.includes('$')) {
            listing.price = target.price;
            listing.formattedPrice = target.formattedPrice;
            mutated = true;
          }
          if (listing.highlights?.some((h) => h.includes('$420/mo'))) {
            listing.highlights = listing.highlights.map((h) =>
              h.replace('$420/mo', '₹35,000/mo')
            );
            mutated = true;
          }
        }
        for (const msg of this.state.messages) {
          if (msg.content.includes('$420/mo')) {
            msg.content = msg.content.replace(/\$420\/mo/g, '₹35,000/mo');
            mutated = true;
          }
        }
        if (mutated) {
          this.save();
        }
      } else {
        this.resetToDefaults();
      }
    } catch (err) {
      console.warn('Error reading db file, initializing defaults:', err);
      this.resetToDefaults();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing db file:', err);
    }
  }

  private buildDefaultMessages(): Message[] {
    const now = Date.now();
    return [
      // Listing 1: The Horizon Marina Residence (Priya Patel)
      {
        id: 'msg_seed_1',
        channelId: 'channel_alex_priya',
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: 'Hi Priya, I saw the Marina Boulevard 2-bed listing. Is it still available for a viewing this Saturday?',
        timestamp: now - 3600000 * 3,
        classification: {
          trust_flag: false,
          trust_reason: null,
          lead_score: 65,
          risk_of_loss: 15,
        },
      },
      {
        id: 'msg_seed_2',
        channelId: 'channel_alex_priya',
        senderId: 'seller_priya',
        senderName: 'Priya Patel',
        senderRole: 'seller',
        content: 'Hello Alex! Yes, absolutely. Saturday at 11:00 AM or 2:00 PM are both open. The unit gets wonderful south-west sunlight and Panoramic Bay Views.',
        timestamp: now - 3600000 * 2,
      },
      {
        id: 'msg_seed_3',
        channelId: 'channel_alex_priya',
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: '2:00 PM works well for me. Does the Low HOA (₹35,000/mo) allow pets and is the Deeded Parking space covered?',
        timestamp: now - 3600000 * 1,
        classification: {
          trust_flag: false,
          trust_reason: null,
          lead_score: 72,
          risk_of_loss: 18,
        },
      },
      {
        id: 'msg_seed_4',
        channelId: 'channel_alex_priya',
        senderId: 'seller_priya',
        senderName: 'Priya Patel',
        senderRole: 'seller',
        content: 'Deeded Parking space #14 is directly next to the elevator! And yes, pets under 40 lbs are welcome.',
        timestamp: now - 1800000,
      },

      // Listing 2: Glasshouse Penthouse Suite (Priya Patel)
      {
        id: 'msg_seed_l2_1',
        channelId: 'channel_listing_2',
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: 'Hi Priya, I am interested in Glasshouse Penthouse Suite on Market St. Is the Private Sky Terrace exclusive to Penthouse 38?',
        timestamp: now - 3600000 * 3,
        classification: {
          trust_flag: false,
          trust_reason: null,
          lead_score: 68,
          risk_of_loss: 14,
        },
      },
      {
        id: 'msg_seed_l2_2',
        channelId: 'channel_listing_2',
        senderId: 'seller_priya',
        senderName: 'Priya Patel',
        senderRole: 'seller',
        content: 'Hello Alex! Yes, Penthouse 38 includes private keyed access to the wrap-around Private Sky Terrace, a bespoke Boffi Designer Kitchen, and a temperature-controlled Wine Cellar.',
        timestamp: now - 3600000 * 2,
      },
      {
        id: 'msg_seed_l2_3',
        channelId: 'channel_listing_2',
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: 'That sounds great. Does the building offer 24/7 Valet & Doorman service for guests?',
        timestamp: now - 3600000 * 1,
        classification: {
          trust_flag: false,
          trust_reason: null,
          lead_score: 74,
          risk_of_loss: 16,
        },
      },
      {
        id: 'msg_seed_l2_4',
        channelId: 'channel_listing_2',
        senderId: 'seller_priya',
        senderName: 'Priya Patel',
        senderRole: 'seller',
        content: 'Yes, 24/7 Valet & Doorman concierge service is included. Would you like to schedule a sunset viewing?',
        timestamp: now - 1800000,
      },

      // Listing 3: Cedarwood Modern Villa (Elena Rostova)
      {
        id: 'msg_seed_l3_1',
        channelId: 'channel_listing_3',
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: 'Hi Elena, I saw Cedarwood Modern Villa on Crestview Lane. Is the Infinity Pool heated year-round by the Zero-Carbon Solar Array?',
        timestamp: now - 3600000 * 3,
        classification: {
          trust_flag: false,
          trust_reason: null,
          lead_score: 64,
          risk_of_loss: 16,
        },
      },
      {
        id: 'msg_seed_l3_2',
        channelId: 'channel_listing_3',
        senderId: 'seller_elena',
        senderName: 'Elena Rostova',
        senderRole: 'seller',
        content: 'Hello Alex! Yes, the Zero-Carbon Solar Array powers both the Infinity Pool heat pump and the smart home automation year-round.',
        timestamp: now - 3600000 * 2,
      },
      {
        id: 'msg_seed_l3_3',
        channelId: 'channel_listing_3',
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: 'Wonderful. Does the EV Charging Garage fit two vehicles, and is the Private Garden fully enclosed?',
        timestamp: now - 3600000 * 1,
        classification: {
          trust_flag: false,
          trust_reason: null,
          lead_score: 71,
          risk_of_loss: 15,
        },
      },
      {
        id: 'msg_seed_l3_4',
        channelId: 'channel_listing_3',
        senderId: 'seller_elena',
        senderName: 'Elena Rostova',
        senderRole: 'seller',
        content: 'Yes, the EV Charging Garage has dual Level-2 chargers for two SUVs, and the Private Garden is bordered by mature cedar hedges for total privacy.',
        timestamp: now - 1800000,
      },

      // Listing 4: Heritage Warehouse Loft (Marcus Vance)
      {
        id: 'msg_seed_l4_1',
        channelId: 'channel_listing_4',
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: 'Hi Marcus, I love the Heritage Warehouse Loft on Industrial Way. Since it is Zoned Live/Work, can I host design clients in the front studio?',
        timestamp: now - 3600000 * 3,
        classification: {
          trust_flag: false,
          trust_reason: null,
          lead_score: 66,
          risk_of_loss: 15,
        },
      },
      {
        id: 'msg_seed_l4_2',
        channelId: 'channel_listing_4',
        senderId: 'seller_marcus',
        senderName: 'Marcus Vance',
        senderRole: 'seller',
        content: 'Hey Alex! Absolutely — it is officially Zoned Live/Work, and the 14ft Ceilings with Exposed Historic Brick make an incredible client studio.',
        timestamp: now - 3600000 * 2,
      },
      {
        id: 'msg_seed_l4_3',
        channelId: 'channel_listing_4',
        senderId: 'buyer_alex',
        senderName: 'Alex Chen',
        senderRole: 'buyer',
        content: 'Great to hear. Is the Custom Steelwork mezzanine rated for heavy studio equipment, and is freight elevator access included?',
        timestamp: now - 3600000 * 1,
        classification: {
          trust_flag: false,
          trust_reason: null,
          lead_score: 73,
          risk_of_loss: 14,
        },
      },
      {
        id: 'msg_seed_l4_4',
        channelId: 'channel_listing_4',
        senderId: 'seller_marcus',
        senderName: 'Marcus Vance',
        senderRole: 'seller',
        content: 'Yes, I designed the Custom Steelwork mezzanine with structural steel framing, and Loft 204 has direct key-fob access to the freight elevator.',
        timestamp: now - 1800000,
      },
    ];
  }

  public resetToDefaults() {
    this.state = {
      users: [
        {
          id: 'buyer_alex',
          name: 'Alex Chen',
          role: 'buyer',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          title: 'Verified Homebuyer',
          phone: '+1 (415) 555-0182',
          statusText: 'Pre-approved buyer looking in Marina / Waterfront',
        },
        {
          id: 'seller_priya',
          name: 'Priya Patel',
          role: 'seller',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
          title: 'Managing Broker',
          agency: 'Bayfront Realty Group',
          rating: 4.9,
          phone: '+1 (415) 555-0149',
          statusText: 'Online · Listing Agent for Horizon Residences',
        },
        {
          id: 'seller_marcus',
          name: 'Marcus Vance',
          role: 'seller',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          title: 'Owner & Architect',
          agency: 'Urban Loft Collective',
          rating: 4.8,
          phone: '+1 (415) 555-0199',
          statusText: 'Direct property owner',
        },
        {
          id: 'seller_elena',
          name: 'Elena Rostova',
          role: 'seller',
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
          title: 'Principal Broker',
          agency: 'Highland Estates',
          rating: 5.0,
          phone: '+1 (415) 555-0177',
          statusText: 'Specializing in Peninsula estates',
        },
        {
          id: 'agent_sarah',
          name: 'Sarah Jenkins',
          role: 'agent',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
          title: 'Senior Broker Lead (Guardian Escalations)',
          agency: 'DealGuard Priority Team',
          rating: 4.98,
          phone: '+1 (415) 555-0100',
          statusText: 'Standing by for hot lead rescue & escrow intervention',
        },
      ],
      listings: [
        {
          id: 'listing_1',
          title: 'The Horizon Marina Residence',
          price: 107500000,
          formattedPrice: '₹10.75 Cr',
          locality: 'Marina Waterfront',
          address: '420 Marina Boulevard, Unit 4B',
          bedrooms: 2,
          bathrooms: 2,
          sqft: 1420,
          propertyType: 'Condominium',
          description: 'Sun-drenched Scandinavian-inspired waterfront residence with panoramic bay views, private balcony, chevron oak floors, and deeded garage parking.',
          highlights: ['Panoramic Bay Views', 'Deeded Parking', 'Floor-to-Ceiling Windows', 'Low HOA (₹35,000/mo)'],
          image: '/src/assets/images/property_luxury_apartment_1794032403222.jpg',
          sellerId: 'seller_priya',
          sellerName: 'Priya Patel',
          status: 'available',
          verified: true,
        },
        {
          id: 'listing_2',
          title: 'Glasshouse Penthouse Suite',
          price: 205000000,
          formattedPrice: '₹20.50 Cr',
          locality: 'Downtown Financial District',
          address: '880 Market St, Penthouse 38',
          bedrooms: 3,
          bathrooms: 3.5,
          sqft: 2280,
          propertyType: 'Penthouse',
          description: 'Dramatic wrap-around terrace overlooking the city skyline at golden hour. Double-height ceilings, bespoke Boffi kitchen, and 24/7 concierge.',
          highlights: ['Private Sky Terrace', '24/7 Valet & Doorman', 'Boffi Designer Kitchen', 'Wine Cellar'],
          image: '/src/assets/images/property_modern_penthouse_1794032403502.jpg',
          sellerId: 'seller_priya',
          sellerName: 'Priya Patel',
          status: 'available',
          verified: true,
        },
        {
          id: 'listing_3',
          title: 'Cedarwood Modern Villa',
          price: 158500000,
          formattedPrice: '₹15.85 Cr',
          locality: 'Silverwood Hills',
          address: '1540 Crestview Lane',
          bedrooms: 4,
          bathrooms: 3.5,
          sqft: 3100,
          propertyType: 'Single Family Villa',
          description: 'Contemporary architectural sanctuary with seamless indoor-outdoor living, manicured grounds, infinity pool, and integrated smart home automation.',
          highlights: ['Infinity Pool', 'Zero-Carbon Solar Array', 'EV Charging Garage', 'Private Garden'],
          image: '/src/assets/images/property_suburban_villa_1794032404189.jpg',
          sellerId: 'seller_elena',
          sellerName: 'Elena Rostova',
          status: 'available',
          verified: true,
        },
        {
          id: 'listing_4',
          title: 'Heritage Warehouse Loft',
          price: 82500000,
          formattedPrice: '₹8.25 Cr',
          locality: 'Arts & Brewery District',
          address: '710 Industrial Way, Loft 204',
          bedrooms: 1,
          bathrooms: 1.5,
          sqft: 1250,
          propertyType: 'Live/Work Loft',
          description: 'Authentic 1920s brick timber loft with 14-foot timber beamed ceilings, polished concrete floors, custom industrial steel mullions, and freight elevator access.',
          highlights: ['Exposed Historic Brick', '14ft Ceilings', 'Zoned Live/Work', 'Custom Steelwork'],
          image: '/src/assets/images/property_urban_loft_1794032403759.jpg',
          sellerId: 'seller_marcus',
          sellerName: 'Marcus Vance',
          status: 'available',
          verified: true,
        },
      ],
      messages: this.buildDefaultMessages(),
      escalations: [],
    };
    this.save();
  }

  // Getters
  public getUsers(): User[] {
    return this.state.users;
  }

  public getUser(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public getListings(): Listing[] {
    return this.state.listings;
  }

  public getListing(id: string): Listing | undefined {
    return this.state.listings.find((l) => l.id === id);
  }

  public getMessages(channelId: string): Message[] {
    return this.state.messages.filter((m) => m.channelId === channelId);
  }

  public addMessage(msg: Message): Message {
    this.state.messages.push(msg);
    this.save();
    return msg;
  }

  public updateMessage(id: string, updates: Partial<Message>): Message | undefined {
    const msg = this.state.messages.find((m) => m.id === id);
    if (msg) {
      Object.assign(msg, updates);
      this.save();
    }
    return msg;
  }

  public getEscalations(): Escalation[] {
    return [...this.state.escalations].sort((a, b) => b.timestamp - a.timestamp);
  }

  public getActiveEscalationForChannel(channelId: string): Escalation | undefined {
    return this.state.escalations.find((e) => e.channelId === channelId && e.status === 'active');
  }

  public addEscalation(esc: Escalation): Escalation {
    // Enforce single active escalation per channel: update existing active escalation in-place
    const existingIdx = this.state.escalations.findIndex((e) => e.channelId === esc.channelId && e.status === 'active');
    if (existingIdx >= 0) {
      this.state.escalations[existingIdx] = esc;
    } else {
      this.state.escalations.unshift(esc);
    }
    this.save();
    return esc;
  }

  public upsertSystemNotice(channelId: string, escalationId: string, content: string): Message {
    const existing = [...this.state.messages]
      .reverse()
      .find((m) => m.channelId === channelId && m.isSystemNotice && m.escalationId === escalationId);

    if (existing) {
      existing.content = content;
      existing.timestamp = Date.now() + 50;
      this.save();
      return existing;
    }

    const systemMsg: Message = {
      id: `sys_${Date.now()}`,
      channelId,
      senderId: 'system_copilot',
      senderName: 'DealGuard Guardian',
      senderRole: 'system',
      content,
      timestamp: Date.now() + 50,
      isSystemNotice: true,
      escalationId,
    };
    this.state.messages.push(systemMsg);
    this.save();
    return systemMsg;
  }

  public upsertAgentVoiceMessage(escalationId: string, msg: Message): Message {
    const existingIdx = this.state.messages.findIndex(
      (m) => m.channelId === 'channel_agent_group' && m.escalationId === escalationId
    );
    if (existingIdx >= 0) {
      this.state.messages[existingIdx] = {
        ...this.state.messages[existingIdx],
        ...msg,
        id: this.state.messages[existingIdx].id,
      };
      this.save();
      return this.state.messages[existingIdx];
    }
    this.state.messages.push(msg);
    this.save();
    return msg;
  }

  public claimEscalation(id: string, claimedBy: string): Escalation | undefined {
    const esc = this.state.escalations.find((e) => e.id === id);
    if (esc) {
      esc.status = 'claimed';
      esc.claimedBy = claimedBy;
      this.save();
    }
    return esc;
  }
}

export const db = new Database();
