import React from 'react';
import {
  Play,
  RotateCcw,
  Copy,
  ShieldCheck,
  ShieldAlert,
  TrendingDown,
  MessageSquarePlus,
  X,
  ArrowUpRight,
} from 'lucide-react';

interface DemoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerBeat1: () => void;
  onTriggerBeat2: () => void;
  onReset: () => void;
  onOpenLiveChat?: () => void;
}

export const DemoScriptModal: React.FC<DemoScriptModalProps> = ({
  isOpen,
  onClose,
  onTriggerBeat1,
  onTriggerBeat2,
  onReset,
  onOpenLiveChat,
}) => {
  if (!isOpen) return null;

  const beat1Text = 'Please transfer the booking amount to this UPI ID before I show you the flat';
  const beat2Text = "ok nvm I'll look elsewhere";

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0806]/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/[0.14] bg-[#141210]/95 p-6 sm:p-8 backdrop-blur-2xl my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.10] pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.04] px-3 py-1 text-[11px] text-white/75 mb-3">
              <ShieldCheck strokeWidth={1.5} className="h-3.5 w-3.5 text-[#D7EF5A]" />
              <span>Nexconn Build Challenge 2026</span>
            </div>
            <h2 className="text-[26px] sm:text-[30px] font-normal tracking-[-0.03em] leading-[1.05] text-[#FCFCFB]">
              Live AI Proof & Demo Script
            </h2>
            <p className="mt-2 text-[13px] text-white/60">
              "Every chat deal dies one of two ways — a scam, or a missed moment. Guardian Copilot watches for both."
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.05] text-white/70 hover:bg-white/[0.10] hover:text-[#FCFCFB] transition-colors shrink-0 cursor-pointer"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </div>

        {/* Live Adversarial Challenge Card */}
        <div className="mt-5 rounded-3xl border border-[#D7EF5A]/30 bg-white/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck strokeWidth={1.5} className="h-4 w-4 text-[#D7EF5A] shrink-0" />
              <span className="text-[15px] font-normal text-[#FCFCFB]">
                Type Your Own Unscripted Test Message Live
              </span>
            </div>
            <span className="rounded-full border border-[#D7EF5A]/35 bg-[#D7EF5A]/10 px-2.5 py-0.5 text-[11px] text-[#D7EF5A]">
              Real LLM Classifier
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-white/60 mb-3">
            Open any of the 4 listings and invent your own phrasing directly in the chat input:
          </p>
          <ul className="space-y-1.5 text-[13px] text-white/75 mb-4 list-disc pl-4">
            <li>
              <span className="text-[#E5484D]">Trust Shield:</span> Ask for Zelle, Venmo, crypto, gift cards, bank wire, or mailed keys before an in-person tour in any phrasing.
            </li>
            <li>
              <span className="text-[#D7EF5A]">Hot-Lead Radar:</span> Say you are losing patience, picking another listing, or walking away in your own words to trigger a spoken broker briefing.
            </li>
            <li>
              <span className="text-[#FCFCFB]">Zero False Positives:</span> Ask a normal question about HOA fees, parking, or escrow timelines and confirm no warning fires.
            </li>
          </ul>
          {onOpenLiveChat && (
            <button
              type="button"
              onClick={() => {
                onOpenLiveChat();
                onClose();
              }}
              className="inline-flex items-center gap-2.5 rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] pl-4 pr-1.5 py-1.5 text-[13px] font-medium text-[#0B0806] transition-transform duration-150 hover:scale-[1.02] cursor-pointer"
            >
              <MessageSquarePlus strokeWidth={1.5} className="h-3.5 w-3.5" />
              <span>Open Live Chat & Type Your Own Test</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B0806] text-[#FCFCFB]">
                <ArrowUpRight strokeWidth={1.5} className="h-3.5 w-3.5" />
              </span>
            </button>
          )}
        </div>

        {/* Optional 1-Click Beats Checklist */}
        <div className="my-5 space-y-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-white/45">
            Optional 1-Click Quick Beats (Same Live LLM Pipeline)
          </div>

          {/* Beat 1 */}
          <div className="rounded-3xl border border-[#E5484D]/35 bg-[#E5484D]/[0.06] p-4">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert strokeWidth={1.5} className="h-4 w-4 text-[#E5484D] shrink-0" />
                <span className="text-[14px] text-[#FCFCFB]">
                  Beat 1: Trust Shield Scam Detection
                </span>
              </div>
              <span className="rounded-full border border-[#E5484D]/35 bg-[#E5484D]/15 px-2.5 py-0.5 text-[11px] text-[#E5484D]">
                Scam Flag
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.10] bg-[#0B0806]/60 px-3.5 py-2.5 text-[12px] text-white/85">
              <span className="truncate mr-2">"{beat1Text}"</span>
              <button
                type="button"
                onClick={() => copyToClipboard(beat1Text)}
                className="p-1 text-white/55 hover:text-[#FCFCFB] shrink-0 cursor-pointer"
                title="Copy text"
              >
                <Copy strokeWidth={1.5} className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-white/55">
                Expected: Instant red warning pill with AI-generated fraud reasoning.
              </span>
              <button
                type="button"
                onClick={() => {
                  onTriggerBeat1();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#E5484D] hover:bg-[#E5484D]/90 px-4 py-1.5 text-[12px] font-medium text-[#FCFCFB] transition-colors cursor-pointer"
              >
                <Play strokeWidth={1.5} className="h-3 w-3" />
                <span>Test Beat 1 Now</span>
              </button>
            </div>
          </div>

          {/* Beat 2 */}
          <div className="rounded-3xl border border-white/[0.12] bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <TrendingDown strokeWidth={1.5} className="h-4 w-4 text-[#D7EF5A] shrink-0" />
                <span className="text-[14px] text-[#FCFCFB]">
                  Beat 2: Hot-Lead Radar & Spoken Briefing
                </span>
              </div>
              <span className="rounded-full border border-white/[0.14] bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-white/75">
                Audio Briefing
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.10] bg-[#0B0806]/60 px-3.5 py-2.5 text-[12px] text-white/85">
              <span className="truncate mr-2">"{beat2Text}"</span>
              <button
                type="button"
                onClick={() => copyToClipboard(beat2Text)}
                className="p-1 text-white/55 hover:text-[#FCFCFB] shrink-0 cursor-pointer"
                title="Copy text"
              >
                <Copy strokeWidth={1.5} className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-white/55">
                Expected: AI → Human hand-off notice + playable spoken briefing in Agent Radar.
              </span>
              <button
                type="button"
                onClick={() => {
                  onTriggerBeat2();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#D7EF5A] hover:bg-[#C4E03E] px-4 py-1.5 text-[12px] font-medium text-[#0B0806] transition-colors cursor-pointer"
              >
                <Play strokeWidth={1.5} className="h-3 w-3" />
                <span>Test Beat 2 Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-white/[0.10] pt-4">
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] px-4 py-1.5 text-[12px] text-white/75 hover:text-[#FCFCFB] transition-colors cursor-pointer"
          >
            <RotateCcw strokeWidth={1.5} className="h-3.5 w-3.5" />
            <span>Reset Demo Data</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/[0.14] bg-white/[0.06] hover:bg-white/[0.12] px-5 py-1.5 text-[12px] text-[#FCFCFB] transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
