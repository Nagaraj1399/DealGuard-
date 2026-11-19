import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Shield,
  RefreshCw,
  Building2,
  MessageSquare,
  Radio,
  PlayCircle,
  ChevronDown,
  ArrowUpRight,
  Menu,
  X,
  Check,
} from 'lucide-react';
import { User } from '../types.js';
import { getAvatarForUser } from '../utils/avatars.js';

export type AppView = 'listings' | 'chat' | 'agent' | 'demo' | 'not-found';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: 'listings' | 'chat' | 'agent' | 'demo') => void;
  activeUser: User | null;
  users: User[];
  onSelectUser: (user: User) => void;
  onResetDemo: () => void;
  activeEscalationCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeUser,
  users,
  onSelectUser,
  onResetDemo,
  activeEscalationCount,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const isHeroOverlay = currentView === 'listings';

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleShortLabel = (u: User) => {
    if (u.role === 'buyer') return 'Buyer';
    if (u.role === 'agent') return 'Agent';
    return `Seller (${u.name.split(' ')[0]})`;
  };

  const navItems: Array<{
    key: 'listings' | 'chat' | 'agent' | 'demo';
    label: string;
    mobileLabel: string;
  }> = [
    { key: 'listings', label: 'Listings', mobileLabel: 'Listings' },
    { key: 'chat', label: 'Buyer↔Seller Chat', mobileLabel: 'Chat' },
    { key: 'agent', label: 'Agent Radar', mobileLabel: 'Agent Radar' },
    { key: 'demo', label: 'Demo Script', mobileLabel: 'Demo Script' },
  ];

  const headerPositionClass = isHeroOverlay
    ? isScrolled || isMobileMenuOpen
      ? 'fixed top-0 left-0 right-0 z-50 bg-[#0B0806]/80 backdrop-blur-xl border-b border-white/[0.10]'
      : 'fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-transparent'
    : 'sticky top-0 z-50 bg-[#0B0806]/85 backdrop-blur-xl border-b border-white/[0.10]';

  return (
    <>
      <header className={`w-full transition-colors duration-300 ${headerPositionClass}`}>
        <div className="mx-auto flex h-16 sm:h-[72px] max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          {/* Left: Simple White Outline Shield SVG + Inter Tight 500 Wordmark */}
          <button
            type="button"
            onClick={() => {
              onNavigate('listings');
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-2.5 text-left text-[#FCFCFB] transition-opacity hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shield strokeWidth={1.5} className="h-5 w-5 text-[#FCFCFB]" />
            <span className="text-[18px] font-medium tracking-[-0.02em] leading-none">
              DealGuard
            </span>
          </button>

          {/* Centre: Separate Outlined Glass Pills (Desktop) */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-2"
          >
            {navItems.map((item) => {
              const isActive = currentView === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-normal transition-colors whitespace-nowrap shrink-0 backdrop-blur-md cursor-pointer ${
                    isActive
                      ? 'border-white/[0.24] bg-white/[0.10] text-[#FCFCFB]'
                      : 'border-white/[0.14] bg-white/[0.04] text-white/75 hover:border-white/[0.25] hover:text-[#FCFCFB]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.key === 'agent' && activeEscalationCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D7EF5A] px-1 text-[10px] font-medium text-[#0B0806] tabular-nums">
                      {activeEscalationCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Compact Role Dropdown Pill + Lime "Try Live Demo" Pill (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            <div className="relative" ref={roleDropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                aria-expanded={isRoleDropdownOpen}
                aria-haspopup="menu"
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.09] pl-2 pr-3.5 py-1.5 text-[13px] font-normal text-[#FCFCFB] backdrop-blur-md transition-colors whitespace-nowrap cursor-pointer"
              >
                {activeUser && getAvatarForUser(activeUser.id, activeUser.name) && (
                  <img
                    src={getAvatarForUser(activeUser.id, activeUser.name)!}
                    alt={activeUser.name}
                    className="h-5 w-5 rounded-full object-cover border border-white/[0.18] shrink-0"
                  />
                )}
                <span className="text-white/60">Viewing as:</span>
                <span>{activeUser ? getRoleShortLabel(activeUser) : 'Buyer'}</span>
                <ChevronDown
                  strokeWidth={1.5}
                  className={`h-3.5 w-3.5 text-white/70 transition-transform duration-200 ${
                    isRoleDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isRoleDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-3xl border border-white/[0.14] bg-[#141210]/95 p-2 backdrop-blur-2xl z-50"
                >
                  <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-white/40">
                    Switch Active Persona
                  </div>
                  <div className="space-y-0.5">
                    {users.map((u) => {
                      const isActive = activeUser?.id === u.id;
                      const avatarUrl = getAvatarForUser(u.id, u.name);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            onSelectUser(u);
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2.5 rounded-full px-3 py-2 text-left text-[13px] transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-white/[0.10] text-[#FCFCFB]'
                              : 'text-white/70 hover:bg-white/[0.05] hover:text-[#FCFCFB]'
                          }`}
                          title={`${u.name} (${u.title})`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {avatarUrl && (
                              <img
                                src={avatarUrl}
                                alt={u.name}
                                className="h-6 w-6 rounded-full object-cover border border-white/[0.15] shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-normal">{getRoleShortLabel(u)}</div>
                              <div className="truncate text-[11px] text-white/45">{u.name}</div>
                            </div>
                          </div>
                          {isActive && (
                            <Check strokeWidth={1.5} className="h-3.5 w-3.5 text-[#D7EF5A] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="my-2 h-px bg-white/[0.10]" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onResetDemo();
                      setIsRoleDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-full px-3.5 py-2 text-[13px] text-white/75 hover:bg-white/[0.06] hover:text-[#FCFCFB] transition-colors cursor-pointer"
                    title="Reset messages and escalations to original demo seed state"
                  >
                    <RefreshCw strokeWidth={1.5} className="h-3.5 w-3.5 text-white/60" />
                    <span>Reset Demo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Primary Lime Pill "Try Live Demo" -> /chat */}
            <motion.button
              type="button"
              onClick={() => onNavigate('chat')}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="group inline-flex items-center gap-2.5 rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] pl-5 pr-1.5 py-1.5 text-[13px] font-medium text-[#0B0806] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Try Live Demo</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B0806] text-[#FCFCFB]">
                <ArrowUpRight
                  strokeWidth={1.5}
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
            </motion.button>
          </div>

          {/* Mobile Controls: Compact Live Demo Pill + Glass Menu Button */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onNavigate('chat');
                setIsMobileMenuOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] pl-3.5 pr-1 py-1 text-[12px] font-medium text-[#0B0806] transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Live Demo</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B0806] text-[#FCFCFB]">
                <ArrowUpRight strokeWidth={1.5} className="h-3 w-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.06] text-[#FCFCFB] backdrop-blur-md transition-colors hover:bg-white/[0.12] cursor-pointer"
            >
              {isMobileMenuOpen ? (
                <X strokeWidth={1.5} className="h-4 w-4" />
              ) : (
                <Menu strokeWidth={1.5} className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Glass Menu Panel */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-white/[0.10] bg-[#0B0806]/95 backdrop-blur-2xl px-5 py-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const isActive = currentView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onNavigate(item.key);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors cursor-pointer ${
                      isActive
                        ? 'border-white/[0.24] bg-white/[0.12] text-[#FCFCFB]'
                        : 'border-white/[0.14] bg-white/[0.04] text-white/75'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.key === 'agent' && activeEscalationCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D7EF5A] px-1 text-[10px] font-medium text-[#0B0806] tabular-nums">
                        {activeEscalationCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-white/[0.10] pt-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-white/45 mb-2">
                Viewing as: {activeUser ? getRoleShortLabel(activeUser) : 'Buyer'}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {users.map((u) => {
                  const isActive = activeUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        onSelectUser(u);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-[12px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'border-[#D7EF5A]/60 bg-[#D7EF5A]/15 text-[#FCFCFB]'
                          : 'border-white/[0.12] bg-white/[0.04] text-white/70'
                      }`}
                    >
                      {getRoleShortLabel(u)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/[0.10] pt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onResetDemo();
                  setIsMobileMenuOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-4 py-1.5 text-[12px] text-white/80 hover:text-[#FCFCFB] cursor-pointer"
              >
                <RefreshCw strokeWidth={1.5} className="h-3.5 w-3.5" />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Tab Bar (Compact 4-destination access at 390px) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-white/[0.10] bg-[#0B0806]/90 backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={() => onNavigate('listings')}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors cursor-pointer ${
            currentView === 'listings' ? 'text-[#FCFCFB]' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Building2
            strokeWidth={1.5}
            className={`h-4 w-4 ${currentView === 'listings' ? 'text-[#D7EF5A]' : ''}`}
          />
          <span>Listings</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('chat')}
          aria-label="Buyer↔Seller Chat"
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors cursor-pointer ${
            currentView === 'chat' ? 'text-[#FCFCFB]' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <MessageSquare
            strokeWidth={1.5}
            className={`h-4 w-4 ${currentView === 'chat' ? 'text-[#D7EF5A]' : ''}`}
          />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('agent')}
          className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors cursor-pointer ${
            currentView === 'agent' ? 'text-[#FCFCFB]' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <div className="relative">
            <Radio
              strokeWidth={1.5}
              className={`h-4 w-4 ${currentView === 'agent' ? 'text-[#D7EF5A]' : ''}`}
            />
            {activeEscalationCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D7EF5A] px-1 text-[9px] font-medium text-[#0B0806] tabular-nums">
                {activeEscalationCount}
              </span>
            )}
          </div>
          <span>Agent Radar</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('demo')}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition-colors cursor-pointer ${
            currentView === 'demo' ? 'text-[#FCFCFB]' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <PlayCircle
            strokeWidth={1.5}
            className={`h-4 w-4 ${currentView === 'demo' ? 'text-[#D7EF5A]' : ''}`}
          />
          <span>Demo Script</span>
        </button>
      </nav>
    </>
  );
};
