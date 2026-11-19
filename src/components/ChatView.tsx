import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  TrendingDown,
  Volume2,
  CheckCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ArrowUpRight,
  ArrowUp,
} from 'lucide-react';
import { Listing, Message, User } from '../types.js';
import { sendMessage } from '../api.js';
import { getChannelIdForListing } from '../utils/channels.js';
import { getAvatarForUser } from '../utils/avatars.js';

interface ChatViewProps {
  listing: Listing;
  activeUser: User;
  messages: Message[];
  onMessageSent: (newMsg: Message, classification: any, escalation: any) => void;
  onNavigateToAgent: () => void;
  nexconnStatus: { connected: boolean; token: string; mode: string };
}

export const ChatView: React.FC<ChatViewProps> = ({
  listing,
  activeUser,
  messages,
  onMessageSent,
  onNavigateToAgent,
  nexconnStatus,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [isSellerTyping, setIsSellerTyping] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [isMobileRadarOpen, setIsMobileRadarOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sellerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const channelId = getChannelIdForListing(listing.id);
  const sellerAvatar = getAvatarForUser(listing.sellerId, listing.sellerName);
  const activeUserAvatar = getAvatarForUser(activeUser.id, activeUser.name);

  useEffect(() => {
    setIsSellerTyping(false);
    setPendingText(null);
    return () => {
      if (sellerTypingTimerRef.current) {
        clearTimeout(sellerTypingTimerRef.current);
      }
    };
  }, [listing.id]);

  const scrollToBottom = (instant = false) => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  };

  // Scroll immediately on mount or listing change (e.g., returning from Agent Radar / Take Over)
  useEffect(() => {
    const raf = requestAnimationFrame(() => scrollToBottom(true));
    return () => cancelAnimationFrame(raf);
  }, [listing.id]);

  // Auto-scroll whenever messages change/append or pending/typing indicators appear
  useEffect(() => {
    const raf = requestAnimationFrame(() => scrollToBottom(false));
    return () => cancelAnimationFrame(raf);
  }, [listing.id, messages, pendingText, isSellerTyping]);

  // Compute latest radar stats
  const latestClassification = [...messages]
    .reverse()
    .find((m) => m.classification)?.classification || {
    trust_flag: false,
    trust_reason: null,
    lead_score: 68,
    risk_of_loss: 18,
  };

  const isRiskDanger = latestClassification.risk_of_loss >= 80;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setPendingText(text);
    if (!textToSend) {
      setInputText('');
    }

    try {
      const res = await sendMessage(channelId, {
        senderId: activeUser.id,
        senderName: activeUser.name,
        senderRole: activeUser.role,
        content: text,
        listingId: listing.id,
      });

      onMessageSent(res.message, res.classification, res.escalation);

      // Show seller composing indicator + reply on benign buyer inquiries
      const isBenignBuyerTurn =
        activeUser.role === 'buyer' &&
        !res.classification?.trust_flag &&
        !res.escalation;

      if (isBenignBuyerTurn) {
        setIsSellerTyping(true);
        sellerTypingTimerRef.current = setTimeout(async () => {
          try {
            const replyRes = await sendMessage(channelId, {
              senderId: listing.sellerId,
              senderName: listing.sellerName,
              senderRole: 'seller',
              content: `Thanks ${activeUser.name.split(' ')[0]}! I've noted that for ${listing.title} (${listing.formattedPrice}) — happy to confirm the details and schedule your visit.`,
              listingId: listing.id,
            });
            onMessageSent(replyRes.message, replyRes.classification, replyRes.escalation);
          } catch {
            // Non-blocking if reply simulation fails
          } finally {
            setIsSellerTyping(false);
          }
        }, 900);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setPendingText(null);
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Demo script beats
  const demoBeat1Text = 'Please transfer the booking amount to this UPI ID before I show you the flat';
  const demoBeat2Text = "ok nvm I'll look elsewhere";

  const renderAvatar = (userId: string, name: string, sizeClass = 'h-7 w-7') => {
    const src = getAvatarForUser(userId, name);
    if (src) {
      return (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          className={`${sizeClass} rounded-full object-cover ring-1 ring-white/[0.15] shrink-0`}
        />
      );
    }
    return (
      <div
        className={`${sizeClass} flex items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.06] text-[11px] text-[#FCFCFB] shrink-0`}
      >
        {name.substring(0, 2).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-5rem)] max-w-[1360px] flex-col px-3 sm:px-8 lg:px-12 py-3 sm:py-5">
      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl">
        {/* Top Channel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.10] bg-white/[0.03] px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              {sellerAvatar ? (
                <img
                  src={sellerAvatar}
                  alt={listing.sellerName}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/[0.18]"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.06] text-[#FCFCFB] text-[13px] font-medium">
                  {listing.sellerName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#D7EF5A] ring-2 ring-[#0B0806]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-medium text-[#FCFCFB] truncate">
                  {listing.sellerName}
                </span>
                <span className="text-[12px] text-white/60">· Listing Agent</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#D7EF5A]">
                  <CheckCheck strokeWidth={1.5} className="h-3.5 w-3.5" />
                  <span>Read Receipts On</span>
                </span>
              </div>
              <div className="text-[12px] text-white/60 truncate">
                Inquiry on <span className="text-[#FCFCFB]">{listing.title}</span> ({listing.formattedPrice})
              </div>
            </div>
          </div>

          {/* Header Channel Glass Pills + Guardian Copilot Active with Pulsing Lime Dot */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.05] backdrop-blur-md px-3.5 py-1.5 text-[11px] text-white/80"
              title={`DirectChannel: ${channelId} · Token: ${nexconnStatus.token.slice(0, 10)}…`}
            >
              <Radio strokeWidth={1.5} className="h-3 w-3 text-white/75 shrink-0" />
              <span className="font-mono text-[11px] truncate">
                Nexconn DirectChannel ({nexconnStatus.mode === 'live' ? 'Live' : 'Sandbox'})
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.05] backdrop-blur-md px-3.5 py-1.5 text-[12px] text-[#FCFCFB]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-pulse shrink-0" />
              <span className="whitespace-nowrap">Guardian Copilot Active</span>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Guardian Copilot Radar Bar (Always visible at 390px, expandable to full cards) */}
        <div
          data-testid="mobile-copilot-radar"
          className="lg:hidden border-b border-white/[0.10] bg-white/[0.03] px-4 py-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              <div className="flex items-center gap-1.5 text-[12px] text-[#FCFCFB] shrink-0">
                <ShieldCheck strokeWidth={1.5} className="h-3.5 w-3.5 text-[#D7EF5A]" />
                <span>Copilot Radar</span>
              </div>

              <div className="flex items-center gap-1.5 text-[12px]">
                <span className="text-white/60">Lead:</span>
                <span className="text-[#D7EF5A] tabular-nums">
                  {latestClassification.lead_score}%
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[12px]">
                <span className="text-white/60">Risk:</span>
                <span
                  className={`tabular-nums ${
                    isRiskDanger ? 'text-[#E5484D]' : 'text-[#FCFCFB]'
                  }`}
                >
                  {latestClassification.risk_of_loss}%
                </span>
              </div>

              {latestClassification.trust_flag ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E5484D]/15 border border-[#E5484D]/45 px-2.5 py-0.5 text-[11px] text-[#E5484D] dg-red-glow">
                  <ShieldAlert strokeWidth={1.5} className="h-3 w-3" />
                  <span>Trust Alert</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#D7EF5A]">
                  <span>Verified</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileRadarOpen((prev) => !prev)}
              aria-expanded={isMobileRadarOpen}
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.05] px-3 py-1 text-[11px] text-white/80 hover:text-[#FCFCFB] shrink-0 cursor-pointer"
            >
              <span>{isMobileRadarOpen ? 'Hide' : 'Details'}</span>
              {isMobileRadarOpen ? (
                <ChevronUp strokeWidth={1.5} className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown strokeWidth={1.5} className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Dual thin meters: lime for readiness, white turning red >= 80% for risk */}
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <div className="h-1 w-full rounded-full bg-white/[0.12] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D7EF5A] transition-all duration-500"
                style={{ width: `${latestClassification.lead_score}%` }}
              />
            </div>
            <div className="h-1 w-full rounded-full bg-white/[0.12] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isRiskDanger ? 'bg-[#E5484D]' : 'bg-[#FCFCFB]'
                }`}
                style={{ width: `${latestClassification.risk_of_loss}%` }}
              />
            </div>
          </div>

          {/* Collapsible full Guardian Copilot Radar details on mobile */}
          {isMobileRadarOpen && (
            <div className="mt-3 pt-3 border-t border-white/[0.10] space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-white/60">Lead Readiness</span>
                    <span className="text-[#D7EF5A] tabular-nums">
                      {latestClassification.lead_score}%
                    </span>
                  </div>
                  <p className="text-[11px] text-white/55 leading-snug">
                    Live LLM commitment score evaluated on every message.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-white/60">Walkaway Risk</span>
                    <span
                      className={`tabular-nums ${
                        isRiskDanger ? 'text-[#E5484D]' : 'text-[#FCFCFB]'
                      }`}
                    >
                      {latestClassification.risk_of_loss}%
                    </span>
                  </div>
                  <p className="text-[11px] text-white/55 leading-snug">
                    Auto-escalates to senior broker when risk exceeds 80%.
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center justify-between gap-2 rounded-2xl border p-3 ${
                  latestClassification.trust_flag
                    ? 'border-[#E5484D]/45 bg-[#E5484D]/[0.10] dg-red-glow'
                    : 'border-white/[0.10] bg-white/[0.04]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[12px] text-[#FCFCFB]">
                    <ShieldAlert
                      strokeWidth={1.5}
                      className={`h-3.5 w-3.5 shrink-0 ${
                        latestClassification.trust_flag ? 'text-[#E5484D]' : 'text-[#D7EF5A]'
                      }`}
                    />
                    <span>Trust Shield Status</span>
                  </div>
                  <p className="text-[11px] text-white/55 mt-0.5">
                    Scans every message in real time for advance fees, wire/crypto scams, and off-platform coercion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToAgent}
                  className="rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] px-3.5 py-1.5 text-[11px] font-medium text-[#0B0806] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Agent Radar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Chat Layout Split: Messages on Left, Hot-Lead Radar on Right */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Message Thread */}
          <div className="flex flex-1 flex-col justify-between overflow-hidden">
            {/* Scrollable messages area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
            >
              {/* Top context card */}
              <div className="rounded-2xl border border-white/[0.10] bg-white/[0.03] px-4 py-3 text-[13px] text-white/60">
                <div className="flex items-center justify-between text-[#FCFCFB] mb-1 gap-2">
                  <span className="truncate">{listing.title} · {listing.locality}</span>
                  <span className="tabular-nums text-[#FCFCFB] shrink-0">{listing.formattedPrice}</span>
                </div>
                <p className="line-clamp-1 text-[12px] text-white/55">{listing.description}</p>
              </div>

              {/* Messages Loop */}
              {messages.map((msg, idx) => {
                const isSender = msg.senderId === activeUser.id;
                const isSystem = msg.isSystemNotice || msg.senderRole === 'system';
                const isLastMessage = idx === messages.length - 1;

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-3xl border border-[#D7EF5A]/30 bg-white/[0.06] px-5 py-3 text-[12px] text-[#FCFCFB] backdrop-blur-md max-w-2xl">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="h-2 w-2 rounded-full bg-[#D7EF5A] animate-pulse shrink-0" />
                          <span className="text-[#D7EF5A] uppercase tracking-[0.08em] text-[10px] font-medium whitespace-nowrap">
                            AI → Human Hand-Off
                          </span>
                        </div>
                        <span className="text-white/80">{msg.content}</span>
                        <button
                          type="button"
                          onClick={onNavigateToAgent}
                          className="inline-flex items-center gap-1 rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] px-3 py-1 text-[11px] font-medium text-[#0B0806] whitespace-nowrap self-start sm:self-auto transition-colors cursor-pointer"
                        >
                          <span>Open Agent Radar</span>
                          <ArrowUpRight strokeWidth={1.5} className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                }

                const hasTrustFlag = msg.trustFlag || msg.classification?.trust_flag;
                const trustReason = msg.trustReason || msg.classification?.trust_reason;
                const isAgentMessage = msg.senderRole === 'agent';
                const isBuyerBubble = msg.senderRole === 'buyer';

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2.5 ${isSender ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Persona Avatar */}
                    <div className="mb-1 shrink-0">
                      {renderAvatar(msg.senderId, msg.senderName, 'h-7 w-7')}
                    </div>

                    <div className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} max-w-lg sm:max-w-xl`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[12px] text-white/75">
                          {msg.senderName}
                        </span>
                        {isAgentMessage && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#D7EF5A]/40 bg-[#D7EF5A]/15 px-2.5 py-0.5 text-[10px] text-[#D7EF5A]">
                            <UserCheck strokeWidth={1.5} className="h-3 w-3" />
                            <span>Senior Broker Joined</span>
                          </span>
                        )}
                        <span className="text-[11px] text-white/40 tabular-nums">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Message Bubble: Buyer = white 8% glass, Seller = white 4% with hairline border, both rounded-2xl */}
                      <div
                        className={`relative rounded-2xl px-4 py-3 text-[14px] leading-relaxed backdrop-blur-md transition-all ${
                          isAgentMessage
                            ? 'bg-[#D7EF5A]/[0.08] border border-[#D7EF5A]/30 text-[#FCFCFB]'
                            : isBuyerBubble
                            ? 'bg-white/[0.08] border border-white/[0.10] text-[#FCFCFB]'
                            : 'bg-white/[0.04] border border-white/[0.12] text-[#FCFCFB]'
                        } ${hasTrustFlag ? 'border-[#E5484D]/65 dg-red-glow' : ''}`}
                      >
                        {msg.content}

                        {/* Live Trust Shield Flag State (#E5484D + soft red glow) */}
                        {hasTrustFlag && (
                          <div className="mt-3 pt-2.5 border-t border-[#E5484D]/35">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveTooltipId(activeTooltipId === msg.id ? null : msg.id)
                              }
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#E5484D]/20 px-3 py-1 text-[12px] font-medium text-[#E5484D] border border-[#E5484D]/45 hover:bg-[#E5484D]/30 transition-colors cursor-pointer"
                            >
                              <ShieldAlert strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" />
                              <span>Trust Shield Warning</span>
                            </button>

                            <div className="mt-2 rounded-2xl bg-[#E5484D]/[0.12] border border-[#E5484D]/35 p-3 text-[12px] text-[#FCFCFB] leading-relaxed">
                              <div className="text-[#E5484D] font-medium mb-0.5">
                                Potential P2P Scam Flagged
                              </div>
                              <div className="text-white/90">
                                {trustReason || 'Advance payment request detected prior to viewing.'}
                              </div>
                              <div className="mt-1.5 text-[11px] text-white/60">
                                Recommendation: Never wire funds or transfer UPI deposits before a verified in-person tour.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Nexconn Delivery & Read Receipt */}
                      {isSender && (
                        <div className="mt-1 flex items-center justify-end gap-1 px-1.5 text-[11px] text-white/45">
                          <CheckCheck strokeWidth={1.5} className="h-3 w-3 text-[#D7EF5A]" />
                          <span>{isLastMessage ? 'Delivered · Read' : 'Read'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Optimistic Pending Bubble + Guardian Copilot Analyzing Indicator */}
              {pendingText && (
                <div className="flex items-end gap-2.5 flex-row-reverse">
                  <div className="mb-1 shrink-0">
                    {activeUserAvatar ? (
                      <img
                        src={activeUserAvatar}
                        alt={activeUser.name}
                        referrerPolicy="no-referrer"
                        className="h-7 w-7 rounded-full object-cover ring-1 ring-white/[0.15]"
                      />
                    ) : (
                      renderAvatar(activeUser.id, activeUser.name, 'h-7 w-7')
                    )}
                  </div>
                  <div className="flex flex-col items-end max-w-lg sm:max-w-xl">
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-[12px] text-white/75">{activeUser.name}</span>
                      <span className="text-[11px] text-white/45">Sending…</span>
                    </div>
                    <div className="rounded-2xl bg-white/[0.08] px-4 py-3 text-[14px] text-[#FCFCFB] border border-white/[0.14] backdrop-blur-md">
                      {pendingText}
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#D7EF5A]">
                        <Loader2 strokeWidth={1.5} className="h-3 w-3 animate-spin" />
                        <span>Guardian Copilot analyzing…</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seller Typing Indicator */}
              {isSellerTyping && (
                <div className="flex items-end gap-2.5">
                  <div className="mb-1 shrink-0">
                    {renderAvatar(listing.sellerId, listing.sellerName, 'h-7 w-7')}
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-[12px] text-white/75">{listing.sellerName}</span>
                      <span className="text-[11px] text-[#D7EF5A]">typing…</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-[12px] text-white/60 backdrop-blur-md">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-bounce" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-bounce [animation-delay:120ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-bounce [animation-delay:240ms]" />
                      </span>
                      <span>{listing.sellerName} is composing a reply…</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Typing / Presence Bar */}
              {inputText.trim().length > 0 && !isSending && (
                <div className="flex items-center gap-2 px-1 text-[11px] text-white/50">
                  <span className="inline-flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-bounce [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-bounce [animation-delay:240ms]" />
                  </span>
                  <span>
                    {activeUser.name} is typing in Nexconn <span className="font-mono">{channelId}</span>…
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Outlined Pill Demo Beat Triggers */}
            <div className="border-t border-white/[0.10] bg-white/[0.02] px-4 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] text-white/60">
                  Type your own live test below, or run quick beats:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSend(demoBeat1Text)}
                    disabled={isSending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E5484D]/45 bg-transparent hover:bg-[#E5484D]/[0.12] px-3.5 py-1.5 text-[12px] text-[#E5484D] transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
                    title="Scripted Beat 1: Requests booking amount before flat showing"
                  >
                    <ShieldAlert strokeWidth={1.5} className="h-3.5 w-3.5" />
                    <span>Beat 1: Trigger Trust Shield Scam Flag</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend(demoBeat2Text)}
                    disabled={isSending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.16] bg-transparent hover:bg-white/[0.08] px-3.5 py-1.5 text-[12px] text-[#FCFCFB] transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
                    title="Scripted Beat 2: Disengagement walkaway triggers escalation briefing"
                  >
                    <TrendingDown strokeWidth={1.5} className="h-3.5 w-3.5 text-[#D7EF5A]" />
                    <span>Beat 2: Trigger Hot-Lead Walkaway Radar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Input Box + Lime Circle Arrow Send Button */}
            <div className="border-t border-white/[0.10] bg-[#0B0806]/60 p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  placeholder={`Type a message as ${activeUser.name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  className="flex-1 min-w-0 rounded-full border border-white/[0.14] bg-white/[0.04] px-4 py-2.5 text-[14px] text-[#FCFCFB] placeholder-white/40 focus:border-white/30 focus:outline-hidden transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || isSending}
                  aria-label="Send message"
                  title="Send message"
                  className="group flex h-10 w-10 items-center justify-center rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] text-[#0B0806] transition-transform duration-150 hover:scale-[1.05] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                >
                  {isSending ? (
                    <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp
                      strokeWidth={1.75}
                      className="h-4 w-4 transition-transform duration-150 group-hover:-translate-y-0.5"
                    />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Glass Rounded-3xl Guardian Copilot Radar Panels */}
          <aside className="hidden lg:flex w-80 flex-col border-l border-white/[0.10] bg-white/[0.02] p-5 overflow-y-auto">
            <div className="flex items-center justify-between gap-2 mb-5 pb-3.5 border-b border-white/[0.10]">
              <div className="flex items-center gap-2">
                <ShieldCheck strokeWidth={1.5} className="h-4 w-4 text-[#D7EF5A]" />
                <h3 className="text-[16px] font-normal text-[#FCFCFB]">Guardian Copilot Radar</h3>
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-pulse" />
            </div>

            <div className="space-y-4">
              {/* Lead Readiness Meter (thin lime bar) */}
              <div className="rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-white/60">Lead Readiness</span>
                  <span className="text-[14px] text-[#D7EF5A] tabular-nums">
                    {latestClassification.lead_score}%
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-white/[0.12] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#D7EF5A] transition-all duration-500"
                    style={{ width: `${latestClassification.lead_score}%` }}
                  />
                </div>
                <p className="mt-2.5 text-[12px] text-white/55 leading-relaxed">
                  Buyer commitment and booking intent evaluated on each turn.
                </p>
              </div>

              {/* Walkaway Risk Meter (thin white bar, turning red #E5484D above 80%) */}
              <div
                className={`rounded-3xl border backdrop-blur-xl p-4 transition-all ${
                  isRiskDanger
                    ? 'border-[#E5484D]/45 bg-[#E5484D]/[0.08] dg-red-glow'
                    : 'border-white/[0.12] bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-white/60">Walkaway Risk</span>
                  <span
                    className={`text-[14px] tabular-nums ${
                      isRiskDanger ? 'text-[#E5484D]' : 'text-[#FCFCFB]'
                    }`}
                  >
                    {latestClassification.risk_of_loss}%
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-white/[0.12] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isRiskDanger ? 'bg-[#E5484D]' : 'bg-[#FCFCFB]'
                    }`}
                    style={{ width: `${latestClassification.risk_of_loss}%` }}
                  />
                </div>
                <p className="mt-2.5 text-[12px] text-white/55 leading-relaxed">
                  Escalates to human broker team when risk exceeds 80%.
                </p>
              </div>

              {/* Trust Shield Status (red glow when flagged) */}
              <div
                className={`rounded-3xl border backdrop-blur-xl p-4 transition-all ${
                  latestClassification.trust_flag
                    ? 'border-[#E5484D]/50 bg-[#E5484D]/[0.10] dg-red-glow'
                    : 'border-white/[0.12] bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      strokeWidth={1.5}
                      className={`h-4 w-4 ${
                        latestClassification.trust_flag ? 'text-[#E5484D]' : 'text-[#D7EF5A]'
                      }`}
                    />
                    <span className="text-[13px] text-[#FCFCFB]">Trust Shield Status</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] ${
                      latestClassification.trust_flag
                        ? 'bg-[#E5484D]/20 text-[#E5484D] border border-[#E5484D]/40'
                        : 'bg-[#D7EF5A]/15 text-[#D7EF5A] border border-[#D7EF5A]/30'
                    }`}
                  >
                    {latestClassification.trust_flag ? 'Flagged' : 'Safe'}
                  </span>
                </div>
                <p className="text-[12px] text-white/60 leading-relaxed">
                  {latestClassification.trust_flag && latestClassification.trust_reason
                    ? latestClassification.trust_reason
                    : 'Scans for advance fees, wire transfer spoofing, and off-platform coercion before money changes hands.'}
                </p>
              </div>

              {/* Agent Link CTA */}
              <div className="rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-4">
                <div className="flex items-center gap-2 text-[13px] text-[#FCFCFB] mb-1.5">
                  <Volume2 strokeWidth={1.5} className="h-4 w-4 text-[#D7EF5A]" />
                  <span>Agent Escalation Channel</span>
                </div>
                <p className="text-[12px] text-white/60 mb-4 leading-relaxed">
                  When deals heat up or threaten to walk, spoken audio briefings stream to Sarah Jenkins.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToAgent}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.16] bg-white/[0.06] hover:bg-white/[0.12] py-2 text-[12px] text-[#FCFCFB] transition-colors cursor-pointer"
                >
                  <span>Open Agent View</span>
                  <ArrowUpRight strokeWidth={1.5} className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
