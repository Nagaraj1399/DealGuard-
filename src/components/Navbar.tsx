import React from 'react';
import {
  Shield,
  RefreshCw,
  Building2,
  MessageSquare,
  Radio,
  PlayCircle,
} from 'lucide-react';
import { User } from '../types.js';

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
  const getRoleShortLabel = (u: User) => {
    if (u.role === 'buyer') return 'Buyer';
    if (u.role === 'agent') return 'Agent';
    return `Seller (${u.name.split(' ')[0]})`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full overflow-x-hidden border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between gap-3 md:gap-6 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => onNavigate('listings')}
            className="group flex items-center gap-2.5 text-left text-lg font-bold tracking-tight text-white transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
            <span>DealGuard</span>
          </button>

          {/* Zone 2: Desktop single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-neutral-400">
            <button
              onClick={() => onNavigate('listings')}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'listings' ? 'text-white' : 'hover:text-neutral-200'
              }`}
            >
              Listings
            </button>
            <button
              onClick={() => onNavigate('chat')}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'chat' ? 'text-white' : 'hover:text-neutral-200'
              }`}
            >
              Buyer↔Seller Chat
            </button>
            <button
              onClick={() => onNavigate('agent')}
              className={`relative flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'agent' ? 'text-white' : 'hover:text-neutral-200'
              }`}
            >
              <span>Agent Radar</span>
              {activeEscalationCount > 0 && (
                <span className="flex h-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold text-white tabular-nums">
                  {activeEscalationCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('demo')}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'demo' ? 'text-white' : 'hover:text-neutral-200'
              }`}
            >
              Demo Script
            </button>
          </nav>

          {/* Zone 3: Desktop Role Switcher & Reset Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <div className="hidden md:flex items-center rounded-lg border border-neutral-800 bg-neutral-900/80 p-1 text-xs max-w-md overflow-x-auto">
              <span className="px-2 text-neutral-400 font-medium shrink-0">Role:</span>
              {users.map((u) => {
                const isActive = activeUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => onSelectUser(u)}
                    className={`rounded-md px-2 py-1 font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-neutral-800 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title={`${u.name} (${u.title})`}
                  >
                    {getRoleShortLabel(u)}
                  </button>
                );
              })}
            </div>

            <button
              onClick={onResetDemo}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0"
              title="Reset messages and escalations to original demo seed state"
            >
              <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontally Scrollable Role Switcher Bar */}
        <div className="md:hidden border-t border-neutral-800/60 bg-neutral-950/95 px-4 py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-medium text-neutral-500 shrink-0 mr-1">Role:</span>
            {users.map((u) => {
              const isActive = activeUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => onSelectUser(u)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
                  }`}
                  title={`${u.name} (${u.title})`}
                >
                  {getRoleShortLabel(u)}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Navigation (All 4 destinations reachable & tappable at 390px) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md"
      >
        <button
          onClick={() => onNavigate('listings')}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
            currentView === 'listings' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Building2 className={`h-4 w-4 ${currentView === 'listings' ? 'text-rose-400' : ''}`} />
          <span>Listings</span>
        </button>

        <button
          onClick={() => onNavigate('chat')}
          aria-label="Buyer↔Seller Chat"
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
            currentView === 'chat' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MessageSquare className={`h-4 w-4 ${currentView === 'chat' ? 'text-rose-400' : ''}`} />
          <span>Chat</span>
        </button>

        <button
          onClick={() => onNavigate('agent')}
          className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
            currentView === 'agent' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div className="relative">
            <Radio className={`h-4 w-4 ${currentView === 'agent' ? 'text-rose-400' : ''}`} />
            {activeEscalationCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white tabular-nums">
                {activeEscalationCount}
              </span>
            )}
          </div>
          <span>Agent Radar</span>
        </button>

        <button
          onClick={() => onNavigate('demo')}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
            currentView === 'demo' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <PlayCircle className={`h-4 w-4 ${currentView === 'demo' ? 'text-rose-400' : ''}`} />
          <span>Demo Script</span>
        </button>
      </nav>
    </>
  );
};
