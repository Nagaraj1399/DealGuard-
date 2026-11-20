import { useState, useEffect } from 'react';
import { Navbar, AppView } from './components/Navbar.js';
import { ListingsView } from './components/ListingsView.js';
import { ChatView } from './components/ChatView.js';
import { AgentRadarView } from './components/AgentRadarView.js';
import { DemoScriptModal } from './components/DemoScriptModal.js';
import {
  fetchListings,
  fetchUsers,
  fetchMessages,
  fetchEscalations,
  sendMessage,
  resetDatabase,
  issueNexconnToken,
} from './api.js';
import { Listing, User, Message, Escalation } from './types.js';
import { getChannelIdForListing, findListingForChannel } from './utils/channels.js';

function resolveRouteFromLocation(): { view: AppView; listingParam: string | null } {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  const listingParam = params.get('listing');

  if (pathname === '/' || pathname === '/listings') {
    return { view: 'listings', listingParam };
  }
  if (pathname === '/chat') {
    return { view: 'chat', listingParam };
  }
  if (pathname === '/agent' || pathname === '/agent-radar') {
    return { view: 'agent', listingParam };
  }
  return { view: 'not-found', listingParam };
}

export default function App() {
  const initialRoute = resolveRouteFromLocation();
  const [currentView, setCurrentView] = useState<AppView>(initialRoute.view);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [nexconnStatus, setNexconnStatus] = useState<{ connected: boolean; token: string; mode: string }>({
    connected: true,
    token: 'nc_init',
    mode: 'sandbox',
  });
  const [isLoading, setIsLoading] = useState(true);

  const navigateTo = (view: 'listings' | 'chat' | 'agent', listingId?: string) => {
    setCurrentView(view);
    let nextUrl = '/';
    if (view === 'chat') {
      nextUrl = listingId ? `/chat?listing=${encodeURIComponent(listingId)}` : '/chat';
    } else if (view === 'agent') {
      nextUrl = '/agent-radar';
    }
    if (window.location.pathname + window.location.search !== nextUrl) {
      window.history.pushState({ view, listingId }, '', nextUrl);
    }
  };

  // Sync browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = async () => {
      const { view, listingParam } = resolveRouteFromLocation();
      setCurrentView(view);
      if (view === 'chat' && listings.length > 0) {
        const target = (listingParam && listings.find((l) => l.id === listingParam)) || selectedListing || listings[0];
        if (target) {
          setSelectedListing(target);
          const msgs = await fetchMessages(getChannelIdForListing(target.id));
          setMessages(msgs);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [listings, selectedListing]);

  // Initialize data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [loadedListings, loadedUsers, loadedEscalations] = await Promise.all([
          fetchListings(),
          fetchUsers(),
          fetchEscalations(),
        ]);

        setListings(loadedListings);
        setUsers(loadedUsers);
        setEscalations(loadedEscalations);

        const defaultBuyer = loadedUsers.find((u) => u.role === 'buyer') || loadedUsers[0];
        setActiveUser(defaultBuyer);

        const { listingParam } = resolveRouteFromLocation();
        const initialListing =
          (listingParam && loadedListings.find((l) => l.id === listingParam)) || loadedListings[0];
        setSelectedListing(initialListing);

        if (initialListing) {
          const channelId = getChannelIdForListing(initialListing.id);
          const msgs = await fetchMessages(channelId);
          setMessages(msgs);
        }

        // Initialize Nexconn Token
        if (defaultBuyer) {
          try {
            const tokenRes = await issueNexconnToken(defaultBuyer.id);
            setNexconnStatus({
              connected: tokenRes.isOk,
              token: tokenRes.token,
              mode: tokenRes.isMock ? 'sandbox' : 'live',
            });
          } catch (err) {
            console.warn('Nexconn token initial setup:', err);
          }
        }
      } catch (err) {
        console.error('Failed to initialize app data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleOpenChat = async (listing: Listing) => {
    setSelectedListing(listing);
    navigateTo('chat', listing.id);
    try {
      const channelId = getChannelIdForListing(listing.id);
      const msgs = await fetchMessages(channelId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to fetch channel messages:', err);
    }
  };

  const handleNavigateToChannel = async (channelId: string) => {
    const targetListing = findListingForChannel(listings, channelId);
    if (targetListing) {
      setSelectedListing(targetListing);
      navigateTo('chat', targetListing.id);
    } else {
      navigateTo('chat');
    }
    try {
      const msgs = await fetchMessages(channelId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to fetch channel messages:', err);
    }
  };

  const handleMessageSent = (newMsg: Message, classification: any, escalation: Escalation | null) => {
    setMessages((prev) => [...prev, newMsg]);

    // If an escalation occurred, update escalations list and add system message to UI if present
    if (escalation) {
      setEscalations((prev) => [escalation, ...prev.filter((e) => e.id !== escalation.id)]);
      // Re-fetch messages after short delay to capture the system notice
      setTimeout(async () => {
        try {
          const msgs = await fetchMessages(newMsg.channelId);
          setMessages(msgs);
        } catch (err) {
          console.error(err);
        }
      }, 200);
    }
  };

  const handleResetDemo = async () => {
    try {
      await resetDatabase();
      const activeListing = selectedListing || listings[0];
      const activeChannelId = activeListing ? getChannelIdForListing(activeListing.id) : 'channel_alex_priya';
      const [loadedListings, loadedEscalations, msgs] = await Promise.all([
        fetchListings(),
        fetchEscalations(),
        fetchMessages(activeChannelId),
      ]);
      setListings(loadedListings);
      setEscalations(loadedEscalations);
      setMessages(msgs);
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  const handleTriggerBeat1 = async () => {
    const targetListing = selectedListing || listings[0];
    if (targetListing) {
      setSelectedListing(targetListing);
      navigateTo('chat', targetListing.id);
    } else {
      navigateTo('chat');
    }
    const buyerUser = users.find((u) => u.role === 'buyer') || activeUser;
    if (buyerUser && targetListing) {
      setActiveUser(buyerUser);
      const channelId = getChannelIdForListing(targetListing.id);
      const text = 'Please transfer the booking amount to this UPI ID before I show you the flat';
      try {
        const currentMsgs = await fetchMessages(channelId);
        setMessages(currentMsgs);
        const res = await sendMessage(channelId, {
          senderId: buyerUser.id,
          senderName: buyerUser.name,
          senderRole: 'buyer',
          content: text,
          listingId: targetListing.id,
        });
        handleMessageSent(res.message, res.classification, res.escalation);
      } catch (err) {
        console.error('Error triggering Beat 1:', err);
      }
    }
  };

  const handleTriggerBeat2 = async () => {
    const targetListing = selectedListing || listings[0];
    if (targetListing) {
      setSelectedListing(targetListing);
      navigateTo('chat', targetListing.id);
    } else {
      navigateTo('chat');
    }
    const buyerUser = users.find((u) => u.role === 'buyer') || activeUser;
    if (buyerUser && targetListing) {
      setActiveUser(buyerUser);
      const channelId = getChannelIdForListing(targetListing.id);
      const text = "ok nvm I'll look elsewhere";
      try {
        const currentMsgs = await fetchMessages(channelId);
        setMessages(currentMsgs);
        const res = await sendMessage(channelId, {
          senderId: buyerUser.id,
          senderName: buyerUser.name,
          senderRole: 'buyer',
          content: text,
          listingId: targetListing.id,
        });
        handleMessageSent(res.message, res.classification, res.escalation);
      } catch (err) {
        console.error('Error triggering Beat 2:', err);
      }
    }
  };

  const handleUserSelect = async (user: User) => {
    setActiveUser(user);

    // Issue fresh Nexconn session token for the selected persona
    issueNexconnToken(user.id)
      .then((tokenRes) => {
        setNexconnStatus({
          connected: tokenRes.isOk,
          token: tokenRes.token,
          mode: tokenRes.isMock ? 'sandbox' : 'live',
        });
      })
      .catch(() => {
        // Non-blocking
      });

    if (user.role === 'agent') {
      navigateTo('agent');
      try {
        const latestEscalations = await fetchEscalations();
        setEscalations(latestEscalations);
      } catch (err) {
        console.error('Failed to refresh escalations:', err);
      }
      return;
    }

    if (user.role === 'seller') {
      const sellerListings = listings.filter((l) => l.sellerId === user.id);
      if (sellerListings.length > 0) {
        const keepCurrent =
          selectedListing && sellerListings.some((l) => l.id === selectedListing.id);
        const targetListing = keepCurrent ? selectedListing! : sellerListings[0];
        await handleOpenChat(targetListing);
      }
      return;
    }

    // Buyer role selected
    if (currentView === 'agent') {
      const targetListing = selectedListing || listings[0];
      if (targetListing) {
        await handleOpenChat(targetListing);
      } else {
        navigateTo('listings');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0B0806] text-white/60">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D7EF5A] border-t-transparent" />
          <span className="text-[13px]">Initializing DealGuard Copilot...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0806] text-[#FCFCFB] flex flex-col">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'demo') {
            setIsDemoModalOpen(true);
          } else if (view === 'chat') {
            const target = selectedListing || listings[0];
            if (target) {
              handleOpenChat(target);
            } else {
              navigateTo('chat');
            }
          } else {
            navigateTo(view);
          }
        }}
        activeUser={activeUser}
        users={users}
        onSelectUser={handleUserSelect}
        onResetDemo={handleResetDemo}
        activeEscalationCount={escalations.filter((e) => e.status === 'active').length}
      />

      <main className="flex-1 pb-20 md:pb-0">
        {currentView === 'listings' && (
          <ListingsView
            listings={listings}
            activeUser={activeUser}
            onOpenChat={handleOpenChat}
            onOpenDemoGuide={() => setIsDemoModalOpen(true)}
            onTryLiveDemo={() => {
              const target = selectedListing || listings[0];
              if (target) {
                handleOpenChat(target);
              } else {
                navigateTo('chat');
              }
            }}
          />
        )}

        {currentView === 'chat' && selectedListing && activeUser && (
          <ChatView
            listing={selectedListing}
            activeUser={activeUser}
            messages={messages}
            onMessageSent={handleMessageSent}
            onNavigateToAgent={() => {
              const agentUser = users.find((u) => u.role === 'agent');
              if (agentUser) setActiveUser(agentUser);
              navigateTo('agent');
            }}
            nexconnStatus={nexconnStatus}
          />
        )}

        {currentView === 'agent' && (
          <AgentRadarView
            escalations={escalations}
            activeUser={activeUser?.role === 'agent' ? activeUser : users.find((u) => u.role === 'agent') || activeUser!}
            onNavigateToChat={handleNavigateToChannel}
            onEscalationUpdated={async () => {
              const updated = await fetchEscalations();
              setEscalations(updated);
            }}
          />
        )}

        {currentView === 'not-found' && (
          <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-6 py-28 text-center">
            <div className="rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-10 w-full">
              <div className="inline-flex items-center rounded-full border border-white/[0.14] bg-white/[0.05] px-3.5 py-1 text-[11px] font-mono text-white/60 mb-4">
                404 · Route Not Found
              </div>
              <h1 className="text-[32px] font-normal tracking-[-0.03em] text-[#FCFCFB] mb-3">
                Page not found
              </h1>
              <p className="text-[14px] text-white/60 mb-7">
                The route <span className="font-mono text-[#FCFCFB]">{window.location.pathname}</span> does not exist in DealGuard.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('listings')}
                className="rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] px-6 py-2.5 text-[13px] font-medium text-[#0B0806] transition-colors cursor-pointer"
              >
                Back to Listings
              </button>
            </div>
          </div>
        )}
      </main>

      <DemoScriptModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onTriggerBeat1={handleTriggerBeat1}
        onTriggerBeat2={handleTriggerBeat2}
        onReset={handleResetDemo}
        onOpenLiveChat={() => {
          const target = selectedListing || listings[0];
          if (target) {
            handleOpenChat(target);
          } else {
            navigateTo('chat');
          }
        }}
      />
    </div>
  );
}
