import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buildQRPayload, generateQRDataUrl } from "../lib/qrSharing";
import type { QueuedReportDraft } from "../lib/reporting";
import { useReportStore } from "../store/useReportStore";

type Props = {
  draft: QueuedReportDraft;
  submitterName: string | null;
  onClose: () => void;
};

export function QRShareModal({ draft, submitterName, onClose }: Props) {
  const markDraftAsQRSubmitted = useReportStore((state) => state.markDraftAsQRSubmitted);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsGenerating(true);

    const payload = buildQRPayload(draft, submitterName);
    generateQRDataUrl(payload)
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft, submitterName]);

  const handleMarkSubmitted = () => {
    markDraftAsQRSubmitted(draft.id);
    setConfirmed(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-panel-950 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15">
              <svg className="h-4 w-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 18.75h.75v.75h-.75v-.75ZM18.75 13.5h.75v.75h-.75v-.75ZM18.75 18.75h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Share Report via QR</p>
              <p className="text-[11px] text-slate-500">Scan to submit on your behalf</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {/* QR code */}
          <div className="mb-4 flex items-center justify-center rounded-2xl bg-white p-4">
            {isGenerating ? (
              <div className="flex h-[200px] w-[200px] items-center justify-center">
                <svg className="h-6 w-6 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code for offline report" className="h-[200px] w-[200px]" />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center">
                <p className="text-xs text-danger-400">Failed to generate QR code</p>
              </div>
            )}
          </div>

          {/* Report summary */}
          <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs">
            <p className="mb-1 font-semibold text-slate-300">{draft.damageType} — {draft.locationName}</p>
            <p className="line-clamp-2 text-slate-500">{draft.description}</p>
            {draft.imageDataUrl && (
              <p className="mt-1.5 text-warning-400">Photo will upload separately when you reconnect</p>
            )}
          </div>

          <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
            Show this QR code to someone with internet access. Once they scan and confirm submission, tap "Mark as submitted" to remove this draft from your queue.
          </p>

          <AnimatePresence mode="wait">
            {confirmed ? (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 rounded-xl border border-success-400/25 bg-success-500/10 py-3 text-sm font-semibold text-success-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Draft removed — image will upload when online
              </motion.div>
            ) : (
              <motion.div key="actions" className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Keep draft
                </button>
                <button
                  type="button"
                  onClick={handleMarkSubmitted}
                  className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
                >
                  Mark as submitted
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
