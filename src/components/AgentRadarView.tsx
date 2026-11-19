import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Play,
  Pause,
  TrendingDown,
  TrendingUp,
  PhoneCall,
  MessageSquare,
  Radio,
  Loader2,
  ArrowUpRight,
} from 'lucide-react';
import { Escalation, User } from '../types.js';
import { takeoverEscalation } from '../api.js';
import { getAvatarForUser } from '../utils/avatars.js';

interface AgentRadarViewProps {
  escalations: Escalation[];
  activeUser: User;
  onNavigateToChat: (channelId: string) => void;
  onEscalationUpdated: () => void;
}

interface AudioPlaybackMeta {
  currentTime: number;
  duration: number;
  readyState: number;
}

export const AgentRadarView: React.FC<AgentRadarViewProps> = ({
  escalations,
  activeUser,
  onNavigateToChat,
  onEscalationUpdated,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [audioMeta, setAudioMeta] = useState<Record<string, AudioPlaybackMeta>>({});
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const playRequestTokenRef = useRef<number>(0);
  const inFlightPlayPromiseRef = useRef<Promise<void> | null>(null);

  const activeUserAvatar = getAvatarForUser(activeUser.id, activeUser.name);

  useEffect(() => {
    if (playingId && audioRefs.current[playingId]) {
      audioRefs.current[playingId]!.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, playingId]);

  useEffect(() => {
    return () => {
      playRequestTokenRef.current += 1;
      Object.values(audioRefs.current).forEach((el) => {
        if (el) {
          el.pause();
        }
      });
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const updateAudioMeta = (id: string, el: HTMLAudioElement) => {
    setAudioMeta((prev) => ({
      ...prev,
      [id]: {
        currentTime: el.currentTime || 0,
        duration: Number.isFinite(el.duration) ? el.duration : 0,
        readyState: el.readyState,
      },
    }));
  };

  const pauseAllAudio = (exceptId?: string) => {
    Object.entries(audioRefs.current).forEach(([key, el]) => {
      if (el && key !== exceptId) {
        el.pause();
        el.currentTime = 0;
      }
    });
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const togglePlayAudio = async (id: string, audioUrl: string, transcript: string) => {
    const reqToken = ++playRequestTokenRef.current;
    const audioEl = audioRefs.current[id];

    // If clicking the currently playing card, cleanly pause it
    if (playingId === id) {
      pauseAllAudio();
      if (audioEl) {
        audioEl.pause();
      }
      setLoadingAudioId(null);
      setPlayingId(null);
      return;
    }

    // Stop any other playing audio or browser speech before starting this one
    pauseAllAudio(id);
    setPlayingId(null);

    // Wait for any previous in-flight play() promise to settle so rapid clicks serialize cleanly
    if (inFlightPlayPromiseRef.current) {
      try {
        await inFlightPlayPromiseRef.current;
      } catch {
        // Ignore superseded AbortError from previous play()
      }
      if (playRequestTokenRef.current !== reqToken) {
        return;
      }
    }

    if (audioEl && audioUrl) {
      try {
        setLoadingAudioId(id);

        // If audio hasn't loaded metadata yet, wait briefly for readiness without overlapping loads
        if (audioEl.readyState === 0) {
          audioEl.load();
          await new Promise<void>((resolve) => {
            const onReady = () => {
              cleanup();
              resolve();
            };
            const timer = setTimeout(() => {
              cleanup();
              resolve();
            }, 2500);
            const cleanup = () => {
              clearTimeout(timer);
              audioEl.removeEventListener('canplay', onReady);
              audioEl.removeEventListener('loadeddata', onReady);
              audioEl.removeEventListener('error', onReady);
            };
            audioEl.addEventListener('canplay', onReady, { once: true });
            audioEl.addEventListener('loadeddata', onReady, { once: true });
            audioEl.addEventListener('error', onReady, { once: true });
          });
        }

        // Abort if a newer click superseded this request while buffering
        if (playRequestTokenRef.current !== reqToken) {
          audioEl.pause();
          return;
        }

        if (audioEl.ended) {
          audioEl.currentTime = 0;
        }
        audioEl.playbackRate = playbackSpeed;

        const playPromise = audioEl.play();
        inFlightPlayPromiseRef.current = playPromise;
        await playPromise;

        if (playRequestTokenRef.current !== reqToken) {
          audioEl.pause();
          return;
        }

        setLoadingAudioId(null);
        setPlayingId(id);
        updateAudioMeta(id, audioEl);
        return;
      } catch (err: any) {
        // If superseded by a rapid click or paused intentionally, do NOT trigger speech fallback
        if (playRequestTokenRef.current !== reqToken || err?.name === 'AbortError') {
          return;
        }
        setLoadingAudioId(null);
        console.warn('WAV playback error, falling back to Web Speech synthesis:', err);
      } finally {
        if (playRequestTokenRef.current === reqToken) {
          setLoadingAudioId(null);
        }
      }
    }

    if (playRequestTokenRef.current !== reqToken) return;
    setPlayingId(id);
    speakTranscript(id, transcript, reqToken);
  };

  const speakTranscript = (id: string, text: string, token?: number) => {
    const reqToken = token ?? ++playRequestTokenRef.current;
    pauseAllAudio();
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackSpeed * 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (playRequestTokenRef.current === reqToken) {
        setPlayingId(null);
      }
    };
    utterance.onerror = () => {
      if (playRequestTokenRef.current === reqToken) {
        setPlayingId(null);
      }
    };

    setPlayingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleTakeover = async (esc: Escalation) => {
    try {
      await takeoverEscalation(esc.id, esc.channelId, activeUser.id, activeUser.name);
      onEscalationUpdated();
      onNavigateToChat(esc.channelId);
    } catch (err) {
      console.error('Failed takeover:', err);
    }
  };

  return (
    <div className="mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-12 py-10 sm:py-14">
      {/* Hero-style Header: Eyebrow Pill, Regular-Weight Headline, Sarah Jenkins Avatar Badge */}
      <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/[0.10] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.05] px-4 py-1.5 text-[12px] text-white/80 backdrop-blur-md mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-pulse" />
            <span>Agent Priority Command Center · Guardian Copilot</span>
          </div>
          <h1 className="text-[36px] sm:text-[48px] font-normal tracking-[-0.03em] leading-[1.05] text-[#FCFCFB]">
            Hot-Lead Radar & Escalation Briefings
          </h1>
          <p className="mt-3 max-w-xl text-[14px] text-white/60 leading-relaxed">
            Proactive spoken briefings synthesized whenever buyer walkaway risk or closing intent crosses the 80% threshold.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] backdrop-blur-md px-4 py-2 text-[12px] text-white/75">
            <Radio strokeWidth={1.5} className="h-3.5 w-3.5 text-[#D7EF5A]" />
            <span className="font-mono text-[11px]">GroupChannel: channel_agent_group</span>
          </div>

          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.14] bg-white/[0.05] backdrop-blur-md pl-1.5 pr-4 py-1.5 text-[12px] text-white/75">
            {activeUserAvatar ? (
              <img
                src={activeUserAvatar}
                alt={activeUser.name}
                referrerPolicy="no-referrer"
                className="h-6 w-6 rounded-full object-cover ring-1 ring-white/20"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.10] text-[10px] text-[#FCFCFB]">
                {activeUser.name.substring(0, 2).toUpperCase()}
              </span>
            )}
            <span className="text-white/50">Viewing as:</span>
            <span className="text-[#FCFCFB]">{activeUser.name}</span>
          </div>
        </div>
      </div>

      {/* Escalation Queue or Radar-Sweep Empty State */}
      {escalations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl px-6 py-16 text-center">
          {/* Slowly rotating 6s thin lime radar sweep arc */}
          <div className="relative flex h-24 w-24 items-center justify-center mb-6">
            <svg
              viewBox="0 0 96 96"
              className="h-24 w-24"
              aria-hidden="true"
            >
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="rgba(252,252,251,0.12)"
                strokeWidth="1"
              />
              <circle
                cx="48"
                cy="48"
                r="29"
                fill="none"
                stroke="rgba(252,252,251,0.09)"
                strokeWidth="1"
              />
              <circle
                cx="48"
                cy="48"
                r="14"
                fill="none"
                stroke="rgba(252,252,251,0.08)"
                strokeWidth="1"
              />
              <line x1="48" y1="4" x2="48" y2="92" stroke="rgba(252,252,251,0.06)" strokeWidth="1" />
              <line x1="4" y1="48" x2="92" y2="48" stroke="rgba(252,252,251,0.06)" strokeWidth="1" />
            </svg>

            {/* Rotating sweep overlay (6s linear loop) */}
            <svg
              viewBox="0 0 96 96"
              className="dg-radar-sweep absolute inset-0 h-24 w-24"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="radarArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D7EF5A" stopOpacity="0" />
                  <stop offset="100%" stopColor="#D7EF5A" stopOpacity="0.95" />
                </linearGradient>
              </defs>
              {/* Thin lime arc along outer circumference */}
              <path
                d="M 48 4 A 44 44 0 0 1 92 48"
                fill="none"
                stroke="url(#radarArcGrad)"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              {/* Sweep hand from center to leading edge */}
              <line
                x1="48"
                y1="48"
                x2="92"
                y2="48"
                stroke="#D7EF5A"
                strokeWidth="1.25"
                strokeOpacity="0.85"
              />
            </svg>

            <span className="h-2 w-2 rounded-full bg-[#D7EF5A]" />
          </div>

          <h3 className="text-[22px] font-normal tracking-[-0.03em] text-[#FCFCFB]">
            No Active Escalations
          </h3>
          <p className="mt-2 max-w-md text-[14px] text-white/60 leading-relaxed">
            Guardian Copilot is scanning active channels. Trigger Beat 2 or type a walkaway message in chat to generate a live spoken escalation briefing.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {escalations.map((esc) => {
            const isPlaying = playingId === esc.id;
            const isRisk = esc.triggerReason === 'risk_of_loss' || esc.riskOfLoss >= 80;
            const meta = audioMeta[esc.id] || { currentTime: 0, duration: 0, readyState: 0 };
            const buyerAvatar = getAvatarForUser(esc.buyerId, esc.buyerName);

            return (
              <div
                key={esc.id}
                className="overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl transition-colors hover:border-white/[0.20]"
              >
                {/* Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.10] bg-white/[0.03] px-6 py-4">
                  <div className="flex items-center gap-3.5">
                    {buyerAvatar ? (
                      <img
                        src={buyerAvatar}
                        alt={esc.buyerName}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-white/[0.18] shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.06] text-[#D7EF5A]">
                        {isRisk ? (
                          <TrendingDown strokeWidth={1.5} className="h-4 w-4 text-[#E5484D]" />
                        ) : (
                          <TrendingUp strokeWidth={1.5} className="h-4 w-4 text-[#D7EF5A]" />
                        )}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[16px] font-normal text-[#FCFCFB]">{esc.listingTitle}</span>
                        <span className="text-[13px] text-white/60">· Buyer: {esc.buyerName}</span>
                      </div>
                      <div className="text-[12px] text-white/55">
                        Seller: {esc.sellerName} · Logged {new Date(esc.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] ${
                        esc.riskOfLoss >= 80
                          ? 'border-[#E5484D]/45 bg-[#E5484D]/12 text-[#E5484D]'
                          : 'border-white/[0.12] bg-white/[0.04] text-[#FCFCFB]'
                      }`}
                    >
                      <span className={esc.riskOfLoss >= 80 ? 'text-[#E5484D]/80' : 'text-white/55'}>
                        Walkaway Risk:
                      </span>
                      <span className="tabular-nums">{esc.riskOfLoss}%</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3.5 py-1.5 text-[12px]">
                      <span className="text-white/55">Lead Score:</span>
                      <span className="text-[#D7EF5A] tabular-nums">{esc.leadScore}%</span>
                    </div>

                    <div className="inline-flex items-center rounded-full border border-white/[0.14] bg-white/[0.06] px-3.5 py-1.5 text-[12px] text-[#FCFCFB]">
                      {esc.status === 'claimed' ? `Claimed by ${esc.claimedBy}` : 'Unclaimed'}
                    </div>
                  </div>
                </div>

                {/* Spoken Audio Briefing Card Body */}
                <div className="p-6">
                  <div className="mb-5">
                    <div className="text-[11px] uppercase tracking-[0.08em] text-white/45 mb-2">
                      Trigger Message
                    </div>
                    <div className="rounded-2xl border border-white/[0.10] bg-[#0B0806]/60 px-4 py-3 text-[14px] text-[#FCFCFB] italic">
                      "{esc.lastMessageText}"
                    </div>
                  </div>

                  {/* Glass Audio Briefing Player Box */}
                  <div className="rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-md p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5">
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(esc.id, esc.audioUrl, esc.briefingTranscript)}
                          className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.05] shrink-0 cursor-pointer ${
                            isPlaying
                              ? 'bg-[#D7EF5A] text-[#0B0806] dg-lime-glow'
                              : 'bg-[#D7EF5A] hover:bg-[#C4E03E] text-[#0B0806]'
                          }`}
                          title={isPlaying ? 'Pause spoken briefing' : 'Play spoken briefing'}
                          aria-label={isPlaying ? 'Pause spoken briefing' : 'Play spoken briefing'}
                        >
                          {loadingAudioId === esc.id ? (
                            <Loader2 strokeWidth={1.5} className="h-5 w-5 animate-spin" />
                          ) : isPlaying ? (
                            <Pause strokeWidth={1.5} className="h-5 w-5" />
                          ) : (
                            <Play strokeWidth={1.5} className="h-5 w-5 ml-0.5" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-normal text-[#FCFCFB]">
                              Spoken AI Briefing for Agent
                            </span>
                            {isPlaying && (
                              <span className="h-2 w-2 rounded-full bg-[#D7EF5A] animate-pulse" />
                            )}
                          </div>
                          <div className="text-[12px] text-white/55 flex items-center gap-2 flex-wrap">
                            <span>Synthesized voice summary · Guardian Copilot TTS</span>
                            {meta.duration > 0 && (
                              <span className="tabular-nums text-[#FCFCFB]">
                                ({formatTime(meta.currentTime)} / {formatTime(meta.duration)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Speed & Speech Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => speakTranscript(esc.id, esc.briefingTranscript)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.05] hover:bg-white/[0.10] px-3.5 py-1.5 text-[12px] text-[#FCFCFB] transition-colors cursor-pointer"
                          title="Speak via browser voice engine"
                        >
                          <Volume2 strokeWidth={1.5} className="h-3.5 w-3.5 text-[#D7EF5A]" />
                          <span>TTS Voice</span>
                        </button>

                        <div className="inline-flex items-center rounded-full border border-white/[0.14] bg-white/[0.04] p-0.5 text-[12px]">
                          {[1.0, 1.25, 1.5].map((speed) => (
                            <button
                              key={speed}
                              type="button"
                              onClick={() => setPlaybackSpeed(speed)}
                              className={`rounded-full px-2.5 py-1 tabular-nums transition-colors cursor-pointer ${
                                playbackSpeed === speed
                                  ? 'bg-white/[0.14] text-[#FCFCFB]'
                                  : 'text-white/55 hover:text-[#FCFCFB]'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Range-enabled Native Audio Element for WAV stream */}
                    {esc.audioUrl ? (
                      <audio
                        ref={(el) => {
                          audioRefs.current[esc.id] = el;
                        }}
                        src={esc.audioUrl}
                        preload="metadata"
                        controls
                        onLoadedMetadata={(e) => updateAudioMeta(esc.id, e.currentTarget)}
                        onLoadedData={(e) => updateAudioMeta(esc.id, e.currentTarget)}
                        onCanPlay={(e) => updateAudioMeta(esc.id, e.currentTarget)}
                        onTimeUpdate={(e) => updateAudioMeta(esc.id, e.currentTarget)}
                        onPlay={() => setPlayingId(esc.id)}
                        onPause={() => setPlayingId((prev) => (prev === esc.id ? null : prev))}
                        onEnded={(e) => {
                          setPlayingId(null);
                          updateAudioMeta(esc.id, e.currentTarget);
                        }}
                        className="w-full mt-2"
                      />
                    ) : (
                      <div className="mt-2 rounded-2xl border border-white/[0.10] bg-white/[0.03] px-3.5 py-2.5 text-[12px] text-white/60">
                        Audio attachment unavailable — full written briefing transcript is ready below.
                      </div>
                    )}

                    {/* Animated Audio Waveform Bar */}
                    <div className="mt-4 flex h-8 items-center gap-1 px-1">
                      {Array.from({ length: 48 }).map((_, i) => {
                        const baseHeight = 22 + ((Math.sin(i * 0.7) + 1) * 32);
                        const activeHeight = isPlaying
                          ? Math.max(24, Math.abs(Math.sin((i + meta.currentTime * 10) * 0.48)) * 76 + 24)
                          : baseHeight * 0.55;
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-colors duration-200 ${
                              isPlaying
                                ? 'bg-[#D7EF5A] dg-wave-bar-playing'
                                : 'bg-white/[0.14]'
                            }`}
                            style={{
                              height: `${activeHeight}%`,
                              animationDelay: isPlaying ? `${(i % 12) * 85}ms` : undefined,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Spoken Transcript */}
                    <div className="mt-4 border-t border-white/[0.10] pt-3.5">
                      <div className="text-[11px] uppercase tracking-[0.08em] text-white/45 mb-1.5">
                        Spoken Briefing Transcript
                      </div>
                      <p className="text-[13px] leading-relaxed text-white/75">
                        {esc.briefingTranscript}
                      </p>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.10] pt-4">
                    <div className="text-[12px] text-white/55">
                      Direct Channel: <span className="text-[#FCFCFB] font-mono">{esc.channelId}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onNavigateToChat(esc.channelId)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.10] px-4 py-2 text-[13px] text-[#FCFCFB] transition-colors cursor-pointer"
                      >
                        <MessageSquare strokeWidth={1.5} className="h-3.5 w-3.5" />
                        <span>View Chat Channel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTakeover(esc)}
                        className="inline-flex items-center gap-2 rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] pl-5 pr-1.5 py-1.5 text-[13px] font-medium text-[#0B0806] transition-transform duration-150 hover:scale-[1.03] cursor-pointer"
                      >
                        <PhoneCall strokeWidth={1.5} className="h-3.5 w-3.5" />
                        <span>Take Over Conversation</span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B0806] text-[#FCFCFB]">
                          <ArrowUpRight strokeWidth={1.5} className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
