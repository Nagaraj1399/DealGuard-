import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  MoreHorizontal,
  Mic,
} from 'lucide-react';

interface HeroSectionProps {
  onTryLiveDemo: () => void;
  onOpenDemoGuide: () => void;
  onScrollToListings: () => void;
}

const SELLER_SAMPLE =
  'To hold the unit, please wire the ₹20,00,000 deposit to this new account today.';

const AVATARS = [
  { src: '/src/assets/images/avatar_alex.png', name: 'Alex Chen' },
  { src: '/src/assets/images/avatar_priya.png', name: 'Priya Patel' },
  { src: '/src/assets/images/avatar_marcus.png', name: 'Marcus Vance' },
  { src: '/src/assets/images/avatar_elena.png', name: 'Elena Rostova' },
  { src: '/src/assets/images/avatar_sarah.png', name: 'Sarah Jenkins' },
];

const BUILT_WITH_STACK = [
  'Nexconn Chat SDK',
  'Google Gemini',
  'Groq Llama 3.3',
  'React 19',
  'TypeScript',
  'Express',
  'Tailwind CSS',
  'Motion',
];

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onTryLiveDemo,
  onOpenDemoGuide,
  onScrollToListings,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);

  // Looping Copilot Card sequence state:
  // 0: typing seller message -> 1: alert slides in -> 2: meters animate -> pause 4s -> repeat
  const [typedLength, setTypedLength] = useState<number>(
    prefersReducedMotion ? SELLER_SAMPLE.length : 0
  );
  const [showAlert, setShowAlert] = useState<boolean>(Boolean(prefersReducedMotion));
  const [showMeters, setShowMeters] = useState<boolean>(Boolean(prefersReducedMotion));
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedLength(SELLER_SAMPLE.length);
      setShowAlert(true);
      setShowMeters(true);
      return;
    }

    let cancelled = false;
    setTypedLength(0);
    setShowAlert(false);
    setShowMeters(false);

    const timeouts: Array<ReturnType<typeof setTimeout>> = [];
    let charIndex = 0;

    const typingInterval = setInterval(() => {
      if (cancelled) return;
      charIndex += 2;
      if (charIndex >= SELLER_SAMPLE.length) {
        setTypedLength(SELLER_SAMPLE.length);
        clearInterval(typingInterval);

        // After 1s, slide in Trust Shield alert
        const t1 = setTimeout(() => {
          if (cancelled) return;
          setShowAlert(true);

          // Animate meters shortly after alert appears
          const t2 = setTimeout(() => {
            if (cancelled) return;
            setShowMeters(true);

            // Pause 4s then repeat cycle
            const t3 = setTimeout(() => {
              if (cancelled) return;
              setCycle((c) => c + 1);
            }, 4000);
            timeouts.push(t3);
          }, 350);
          timeouts.push(t2);
        }, 1000);
        timeouts.push(t1);
      } else {
        setTypedLength(charIndex);
      }
    }, 32);

    return () => {
      cancelled = true;
      clearInterval(typingInterval);
      timeouts.forEach(clearTimeout);
    };
  }, [cycle, prefersReducedMotion]);

  const fadeUp = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE_OUT_EXPO },
        };

  return (
    <>
      <section className="relative min-h-[100svh] w-full overflow-hidden bg-[#0B0806] flex flex-col justify-between pt-24 sm:pt-28 pb-10">
        {/* Background Video / Golden-Hour Fallback with 12s slow scale 1.06 -> 1 */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-0"
          initial={prefersReducedMotion ? { scale: 1 } : { scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 12, ease: EASE_OUT_EXPO }
          }
        >
          {!videoFailed ? (
            <video
              src="/src/assets/images/hero_loop.mp4"
              poster="/src/assets/images/hero_golden_hour.png"
              autoPlay
              muted
              loop
              playsInline
              onError={() => setVideoFailed(true)}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <img
              src="/src/assets/images/hero_golden_hour.png"
              alt="Waterfront skyline at golden hour"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-center"
            />
          )}
        </motion.div>

        {/* Measured Gradient Scrims: transparent top -> #0B0806 bottom + left dark vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#0B0806]/20 via-[#0B0806]/25 to-[#0B0806]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#0B0806]/85 via-[#0B0806]/45 to-transparent"
        />

        {/* Hero Main Content */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1360px] flex-1 flex-col justify-center px-5 sm:px-8 lg:px-12 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-8">
            {/* Left Column: Eyebrow, 3-line Headline, Paragraph, CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <motion.div
                {...fadeUp(0)}
                className="inline-flex items-center rounded-full border border-white/[0.15] bg-white/[0.05] px-4 py-1.5 text-[12px] font-normal text-white/80 backdrop-blur-md mb-6"
              >
                Nexconn Build Challenge 2026 · Autonomous Guardian Copilot
              </motion.div>

              <motion.h1
                {...fadeUp(0.08)}
                className="text-[42px] sm:text-[54px] lg:text-[68px] font-normal tracking-[-0.03em] leading-[1.05] text-[#FCFCFB]"
              >
                <span className="block">Every deal dies one of two ways —</span>
                <span className="block">a scam, or</span>
                <span className="block text-white/60">a missed moment.</span>
              </motion.h1>

              <motion.p
                {...fadeUp(0.16)}
                className="mt-6 max-w-[460px] text-[14px] leading-[1.6] text-white/60"
              >
                DealGuard protects high-stakes real-estate transactions with live bubble scam detection and proactive spoken agent briefings for hot leads.
              </motion.p>

              <motion.div
                {...fadeUp(0.24)}
                className="mt-8 flex flex-wrap items-center gap-3.5"
              >
                {/* Primary Lime Pill CTA */}
                <motion.button
                  type="button"
                  onClick={onTryLiveDemo}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] pl-6 pr-1.5 py-1.5 text-[14px] font-medium text-[#0B0806] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Try Live Demo</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B0806] text-[#FCFCFB]">
                    <ArrowUpRight
                      strokeWidth={1.5}
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </span>
                </motion.button>

                {/* Secondary Dark Glass Pill CTA with Lime Circle Arrow */}
                <motion.button
                  type="button"
                  onClick={onOpenDemoGuide}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  className="group inline-flex items-center gap-3 rounded-full border border-white/[0.15] bg-white/[0.06] hover:bg-white/[0.10] pl-6 pr-1.5 py-1.5 text-[14px] font-normal text-[#FCFCFB] backdrop-blur-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>View Scripted Demo Beats</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D7EF5A] text-[#0B0806]">
                    <ArrowUpRight
                      strokeWidth={1.5}
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </span>
                </motion.button>
              </motion.div>
            </div>

            {/* Right Side: Floating Glass Guardian Copilot Card (~400px) */}
            <motion.div
              {...fadeUp(0.32)}
              className="lg:col-span-5 flex lg:justify-end w-full"
            >
              <div className="w-full lg:w-[400px] xl:w-[416px] rounded-3xl border border-white/[0.14] bg-white/[0.07] p-5 backdrop-blur-xl">
                {/* Card Header */}
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/[0.10]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.05] px-3.5 py-1.5 text-[12px] text-[#FCFCFB]">
                    <ShieldCheck strokeWidth={1.5} className="h-3.5 w-3.5 text-[#D7EF5A] shrink-0" />
                    <span className="whitespace-nowrap">Guardian Copilot Active</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.05] px-3 py-1.5 text-[11px] text-[#FCFCFB]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D7EF5A] animate-pulse" />
                      <span>Live</span>
                    </div>
                    <button
                      type="button"
                      onClick={onTryLiveDemo}
                      aria-label="Open live Guardian Copilot chat"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.05] text-white/80 hover:text-[#FCFCFB] hover:bg-white/[0.10] transition-colors cursor-pointer"
                    >
                      <MoreHorizontal strokeWidth={1.5} className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Card Body: Mini-Chat Sequence */}
                <div className="py-4 space-y-3 min-h-[192px] flex flex-col justify-between">
                  <div className="space-y-2.5">
                    {/* Seller bubble typing in */}
                    <div className="rounded-2xl rounded-tl-md border border-white/[0.10] bg-[#0B0806]/45 px-3.5 py-3">
                      <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
                        <span>Seller · DirectChannel</span>
                        <span className="font-mono text-[10px]">Now</span>
                      </div>
                      <p className="text-[13px] leading-[1.45] text-[#FCFCFB] min-h-[38px]">
                        {SELLER_SAMPLE.slice(0, typedLength)}
                        {!prefersReducedMotion && typedLength < SELLER_SAMPLE.length && (
                          <span className="inline-block w-1.5 h-3.5 bg-[#D7EF5A] ml-0.5 align-middle animate-pulse" />
                        )}
                      </p>
                    </div>

                    {/* Red Trust Shield Alert Row */}
                    <div className="min-h-[48px]">
                      <AnimatePresence mode="wait">
                        {showAlert && (
                          <motion.div
                            key={`alert-${cycle}`}
                            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                            className="flex items-start gap-2.5 rounded-2xl border border-[#E5484D]/35 bg-[#E5484D]/[0.14] px-3.5 py-2.5 text-[12px] text-[#FCFCFB]"
                          >
                            <ShieldAlert
                              strokeWidth={1.5}
                              className="h-4 w-4 text-[#E5484D] shrink-0 mt-0.5"
                            />
                            <span className="leading-snug">
                              <span className="text-[#E5484D] font-medium">Trust Shield</span>
                              <span className="text-white/60"> · </span>
                              Advance-fee wire request detected — hold payment
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Two Thin Meters */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-white/60">Lead Readiness</span>
                        <span className="text-[#FCFCFB] tabular-nums">
                          {showMeters ? '72%' : '0%'}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/[0.12] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#D7EF5A]"
                          initial={{ width: '0%' }}
                          animate={{ width: showMeters ? '72%' : '0%' }}
                          transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: EASE_OUT_EXPO }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-white/60">Walkaway Risk</span>
                        <span className="text-[#FCFCFB] tabular-nums">
                          {showMeters ? '18%' : '0%'}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/[0.12] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#FCFCFB]"
                          initial={{ width: '0%' }}
                          animate={{ width: showMeters ? '18%' : '0%' }}
                          transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: EASE_OUT_EXPO }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.10]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-full border border-white/[0.14] bg-white/[0.04] px-3 py-1 text-[11px] text-white/75">
                      Scam scan
                    </span>
                    <span className="rounded-full border border-white/[0.14] bg-white/[0.04] px-3 py-1 text-[11px] text-white/75">
                      Hot-lead radar
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.04] text-[12px] text-white/75">
                      +
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={onTryLiveDemo}
                      aria-label="Test Trust Shield live"
                      className="dg-lime-glow flex h-10 w-10 items-center justify-center rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] text-[#0B0806] transition-transform hover:scale-105 cursor-pointer"
                    >
                      <ShieldCheck strokeWidth={1.5} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onTryLiveDemo}
                      aria-label="Open spoken agent briefings"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCFCFB] hover:bg-white/90 text-[#0B0806] transition-transform hover:scale-105 cursor-pointer"
                    >
                      <Mic strokeWidth={1.5} className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Hero Bottom Row */}
        <motion.div
          {...fadeUp(0.4)}
          className="relative z-10 mx-auto w-full max-w-[1360px] px-5 sm:px-8 lg:px-12 pt-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            {/* Bottom Left: 5 Overlapping Avatars + Caption */}
            <div className="flex flex-col gap-3 shrink-0">
              <div className="flex items-center">
                {AVATARS.map((person, index) => (
                  <img
                    key={person.name}
                    src={person.src}
                    alt={person.name}
                    referrerPolicy="no-referrer"
                    className={`h-9 w-9 rounded-full object-cover ring-2 ring-[#0B0806] ${
                      index === 0 ? '' : '-ml-2.5'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[13px] leading-snug text-white/60 max-w-[240px]">
                Guarding buyers, sellers and agents on every message.
              </p>
            </div>

            {/* Bottom Centre: 1px Line + Outlined Pill "How it works" (hidden on mobile) */}
            <div className="hidden lg:flex flex-1 items-center justify-center px-10 pb-3">
              <div className="relative flex w-full items-center justify-center">
                <div className="h-px w-full bg-white/[0.15]" />
                <button
                  type="button"
                  onClick={onScrollToListings}
                  className="absolute rounded-full border border-white/[0.16] bg-[#0B0806]/80 px-4 py-1.5 text-[12px] text-white/80 hover:text-[#FCFCFB] hover:border-white/30 backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  How it works
                </button>
              </div>
            </div>

            {/* Bottom Right: Large weight-300 "80%" with tiny lime dot superscript */}
            <div className="flex items-end gap-4 shrink-0">
              <div className="relative inline-flex items-start leading-none">
                <span className="text-[48px] sm:text-[56px] font-light tracking-[-0.03em] text-[#FCFCFB] tabular-nums leading-none">
                  80%
                </span>
                <span
                  aria-hidden="true"
                  className="ml-1 mt-1 h-2 w-2 rounded-full bg-[#D7EF5A]"
                />
              </div>
              <div className="text-[12px] leading-[1.35] text-white/60 pb-1">
                <span className="block">Risk threshold that triggers</span>
                <span className="block">a spoken agent briefing</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Charcoal "BUILT WITH" Marquee Strip (#141210) */}
      <section className="w-full bg-[#141210] border-y border-white/[0.08] py-10 overflow-hidden">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-12 flex flex-col items-center">
          <div className="inline-flex items-center rounded-full border border-white/[0.14] bg-white/[0.03] px-4 py-1.5 text-[11px] tracking-[0.12em] uppercase text-white/70 mb-7">
            BUILT WITH
          </div>

          <div className="w-full overflow-hidden dg-marquee-mask">
            <div className="dg-marquee-track items-center gap-14">
              {[...BUILT_WITH_STACK, ...BUILT_WITH_STACK].map((tech, idx) => (
                <span
                  key={`${tech}-${idx}`}
                  className="text-[17px] sm:text-[19px] font-normal tracking-[-0.02em] text-white/40 whitespace-nowrap select-none px-4"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
