import React, { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Check,
  Building,
  ArrowUpRight,
  Search,
  Lock,
} from 'lucide-react';
import { Listing, User } from '../types.js';
import { HeroSection } from './HeroSection.js';

interface ListingsViewProps {
  listings: Listing[];
  activeUser: User | null;
  onOpenChat: (listing: Listing) => void;
  onOpenDemoGuide: () => void;
  onTryLiveDemo: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const ListingsView: React.FC<ListingsViewProps> = ({
  listings,
  onOpenChat,
  onOpenDemoGuide,
  onTryLiveDemo,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'condo' | 'penthouse' | 'villa' | 'loft'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const listingsSectionRef = useRef<HTMLElement>(null);

  const filteredListings = listings.filter((item) => {
    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'condo' && item.propertyType.toLowerCase().includes('condo')) ||
      (selectedFilter === 'penthouse' && item.propertyType.toLowerCase().includes('penthouse')) ||
      (selectedFilter === 'villa' && item.propertyType.toLowerCase().includes('villa')) ||
      (selectedFilter === 'loft' && item.propertyType.toLowerCase().includes('loft'));

    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleScrollToListings = () => {
    listingsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filterTabs: Array<{
    key: 'all' | 'condo' | 'penthouse' | 'villa' | 'loft';
    label: string;
  }> = [
    { key: 'all', label: `All Properties (${listings.length})` },
    { key: 'condo', label: 'Condominiums' },
    { key: 'penthouse', label: 'Penthouses' },
    { key: 'villa', label: 'Villas' },
    { key: 'loft', label: 'Lofts' },
  ];

  return (
    <div className="w-full bg-[#0B0806]">
      {/* 100vh Cinematic Hero + Built With Marquee */}
      <HeroSection
        onTryLiveDemo={onTryLiveDemo}
        onOpenDemoGuide={onOpenDemoGuide}
        onScrollToListings={handleScrollToListings}
      />

      {/* Curated Verified Listings Section */}
      <section
        id="listings-section"
        ref={listingsSectionRef}
        className="mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-12 py-16 sm:py-20"
      >
        {/* Section Heading & Controls */}
        <div className="mb-10 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/[0.14] bg-white/[0.04] px-3.5 py-1 text-[11px] tracking-[0.08em] uppercase text-white/60 mb-3 backdrop-blur-md">
                Verified Marketplace Channels
              </div>
              <h2 className="text-[32px] sm:text-[42px] font-normal tracking-[-0.03em] leading-[1.05] text-[#FCFCFB]">
                Select a property to open a guarded chat
              </h2>
            </div>
            <p className="max-w-sm text-[14px] text-white/60 leading-relaxed">
              Every listing runs on its own encrypted buyer-to-seller channel monitored in real time by Guardian Copilot.
            </p>
          </div>

          {/* Outlined Glass Filter Pills & Glass Pill Search Input */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {filterTabs.map((tab) => {
                const isActive = selectedFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedFilter(tab.key)}
                    className={`rounded-full border px-4 py-2 text-[13px] transition-colors whitespace-nowrap shrink-0 backdrop-blur-md cursor-pointer ${
                      isActive
                        ? 'border-white/[0.24] bg-white/[0.10] text-[#FCFCFB]'
                        : 'border-white/[0.14] bg-white/[0.04] text-white/60 hover:border-white/[0.24] hover:text-[#FCFCFB]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72 shrink-0">
              <Search
                strokeWidth={1.5}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50"
              />
              <input
                type="text"
                placeholder="Search by neighborhood or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-white/[0.14] bg-white/[0.04] pl-10 pr-4 py-2 text-[13px] text-[#FCFCFB] placeholder-white/45 focus:border-white/30 focus:outline-hidden backdrop-blur-md transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Property Listings Grid or Empty State */}
        {filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.12] bg-white/[0.04] px-6 py-16 text-center backdrop-blur-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.05] text-white/70 mb-4">
              <Building strokeWidth={1.5} className="h-5 w-5" />
            </div>
            <h3 className="text-[20px] font-normal text-[#FCFCFB]">
              No properties match {searchQuery.trim() ? `"${searchQuery.trim()}"` : 'the selected filter'}
              {selectedFilter !== 'all' ? ` in ${selectedFilter}` : ''}
            </h3>
            <p className="mt-2 max-w-md text-[14px] text-white/60">
              Try clearing your category filter or adjusting your neighborhood/title search query.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedFilter('all');
                setSearchQuery('');
              }}
              className="mt-6 rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] px-6 py-2.5 text-[13px] font-medium text-[#0B0806] transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {filteredListings.map((listing, idx) => (
              <motion.div
                key={listing.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenChat(listing)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenChat(listing);
                  }
                }}
                aria-label={`Open chat for ${listing.title} with ${listing.sellerName}`}
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.55,
                  delay: prefersReducedMotion ? 0 : (idx % 2) * 0.08,
                  ease: EASE_OUT_EXPO,
                }}
                className="group flex flex-col overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-3 transition-colors hover:border-white/[0.24] cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D7EF5A]/70"
              >
                {/* Rounded-3xl Image Container with Dark Bottom Gradient & 1.04 Hover Zoom */}
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-[#141210]">
                  <img
                    src={listing.image}
                    alt={listing.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-container')) {
                        const fallback = document.createElement('div');
                        fallback.className =
                          'fallback-container flex h-full w-full flex-col items-center justify-center bg-[#141210] text-white/50 p-6 text-center';
                        fallback.innerHTML = `<span class="text-sm text-[#FCFCFB] mb-1">${listing.title}</span><span class="text-xs text-white/50">${listing.locality}</span>`;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0806]/95 via-[#0B0806]/25 to-transparent" />

                  {/* Lime-tinted glass Verified Listing pill with Check icon */}
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-[#D7EF5A]/35 bg-[#D7EF5A]/15 backdrop-blur-md px-3.5 py-1.5 text-[12px] text-[#D7EF5A]">
                    <Check strokeWidth={1.5} className="h-3.5 w-3.5" />
                    <span>Verified Listing</span>
                  </div>

                  {/* Price (Inter Tight 400, 28px) + Location & Seller (60% white) */}
                  <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[28px] font-normal tracking-[-0.03em] leading-none text-[#FCFCFB] tabular-nums">
                        {listing.formattedPrice}
                      </div>
                      <div className="mt-1.5 text-[12px] text-white/60">
                        {listing.locality}
                      </div>
                    </div>
                    <div className="text-[12px] text-white/60 text-right">
                      Seller: {listing.sellerName}
                    </div>
                  </div>
                </div>

                {/* Below the Image: Title, Specs, Description, Amenities Pills, Footer */}
                <div className="flex flex-1 flex-col px-3 pt-5 pb-2">
                  <h3 className="text-[22px] font-normal tracking-[-0.03em] leading-[1.1] text-[#FCFCFB] mb-2">
                    {listing.title}
                  </h3>

                  {/* Specs as small text separated by thin dots */}
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/60 mb-3.5">
                    <span>{listing.bedrooms} Beds</span>
                    <span aria-hidden="true" className="text-white/30">·</span>
                    <span>{listing.bathrooms} Baths</span>
                    <span aria-hidden="true" className="text-white/30">·</span>
                    <span className="tabular-nums">{listing.sqft.toLocaleString()} sqft</span>
                    <span aria-hidden="true" className="text-white/30">·</span>
                    <span>{listing.propertyType}</span>
                  </div>

                  {/* Description 2 lines max */}
                  <p className="text-[14px] leading-relaxed text-white/60 line-clamp-2 mb-4">
                    {listing.description}
                  </p>

                  {/* Amenities as small outlined pills */}
                  <div className="mb-6 flex flex-wrap gap-1.5">
                    {listing.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-white/[0.12] bg-white/[0.03] px-3 py-1 text-[11px] text-white/75"
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Footer: Monospace Lock + White Pill with Lime Circle Arrow */}
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.10] pt-4">
                    <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-white/55">
                      <Lock strokeWidth={1.5} className="h-3.5 w-3.5 text-white/60 shrink-0" />
                      <span>Direct P2P Encrypted</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChat(listing);
                      }}
                      className="inline-flex items-center gap-2.5 rounded-full bg-[#FCFCFB] hover:bg-white/90 pl-4 pr-1.5 py-1.5 text-[13px] font-medium text-[#0B0806] transition-transform duration-200 hover:scale-[1.03] whitespace-nowrap cursor-pointer"
                    >
                      <span>Chat with Seller</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D7EF5A] text-[#0B0806]">
                        <ArrowUpRight
                          strokeWidth={1.5}
                          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
