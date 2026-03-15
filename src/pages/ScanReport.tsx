import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { AnimatePresence, motion } from "framer-motion";
import { parseQRPayload, type QRReportPayload } from "../lib/qrSharing";
import { submitReportFromQR } from "../lib/supabaseData";
import type { DisasterReport } from "../lib/reporting";
import { formatTimeAgo } from "../lib/reporting";

type ScanPhase = "scanning" | "preview" | "submitting" | "success" | "error";

const SCANNER_ID = "resq-qr-scanner";

export function ScanReport() {
  const [phase, setPhase] = useState<ScanPhase>("scanning");
  const [payload, setPayload] = useState<QRReportPayload | null>(null);
  const [result, setResult] = useState<DisasterReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  // Start camera scanner
  useEffect(() => {
    if (phase !== "scanning") return;

    const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
    scannerRef.current = scanner;
    isScanningRef.current = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          if (isScanningRef.current) return;
          isScanningRef.current = true;

          const parsed = parseQRPayload(decodedText);
          if (!parsed) {
            isScanningRef.current = false;
            return;
          }

          scanner
            .stop()
            .then(() => {
              setPayload(parsed);
              setPhase("preview");
            })
            .catch(() => {
              setPayload(parsed);
              setPhase("preview");
            });
        },
        undefined,
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Camera access denied or unavailable.";
        setErrorMessage(msg);
        setPhase("error");
      });

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(() => undefined);
      }
    };
  }, [phase]);

  const handleSubmit = async () => {
    if (!payload) return;
    setPhase("submitting");
    try {
      const submitted = await submitReportFromQR(payload);
      setResult(submitted);
      setPhase("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setPhase("error");
    }
  };

  const handleReset = () => {
    setPayload(null);
    setResult(null);
    setErrorMessage(null);
    isScanningRef.current = false;
    setPhase("scanning");
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15">
            <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 18.75h.75v.75h-.75v-.75ZM18.75 13.5h.75v.75h-.75v-.75ZM18.75 18.75h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">Scan Offline Report</h1>
            <p className="text-[11px] text-slate-500">Submit a report on behalf of someone without internet</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── SCANNING ── */}
        {phase === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-white/8 bg-white/[0.02] p-5"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Point camera at QR code</p>
            {/* Scanner container — html5-qrcode mounts inside this div */}
            <div
              id={SCANNER_ID}
              className="overflow-hidden rounded-xl [&_video]:rounded-xl [&_img]:hidden [&_select]:hidden [&_#html5-qrcode-anchor-scan-type-change]:hidden"
            />
            <p className="mt-3 text-center text-[11px] text-slate-500">
              Scanning for a ResQ offline report QR code…
            </p>
          </motion.div>
        )}

        {/* ── PREVIEW ── */}
        {phase === "preview" && payload && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-brand-400/20 bg-brand-500/[0.05] px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <p className="text-sm font-semibold text-white">QR Code Scanned</p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Incident type</span>
                  <span className="font-semibold text-white">{payload.damageType}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Location</span>
                  <span className="text-right font-semibold text-white">{payload.locationName}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Severity</span>
                  <span className={`font-semibold ${
                    payload.ai.severity === "Critical" ? "text-danger-300" :
                    payload.ai.severity === "High" ? "text-warning-300" :
                    payload.ai.severity === "Medium" ? "text-brand-300" :
                    "text-success-300"
                  }`}>{payload.ai.severity}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Submitted by</span>
                  <span className="font-semibold text-white">{payload.submitterName ?? "Unknown"}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">Reported</span>
                  <span className="font-semibold text-white">{formatTimeAgo(payload.timestamp)}</span>
                </div>
                {payload.urgentAssist && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-warning-400/20 bg-warning-500/10 px-3 py-2 text-warning-300">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    Urgent assistance required
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Description</p>
              <p className="text-sm leading-relaxed text-slate-200">{payload.description}</p>
            </div>

            {/* Image note */}
            {payload.hasImage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
                Photo evidence exists on the original device and will be attached when they reconnect.
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Scan again
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
              >
                Submit report
              </button>
            </div>
          </motion.div>
        )}

        {/* ── SUBMITTING ── */}
        {phase === "submitting" && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-10"
          >
            <svg className="h-8 w-8 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <p className="text-sm text-slate-400">Submitting report…</p>
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {phase === "success" && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-success-400/25 bg-success-500/[0.07] px-5 py-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-500/15">
                <svg className="h-6 w-6 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="mb-1 text-base font-semibold text-white">Report Submitted</p>
              <p className="text-xs text-slate-400">The incident has been logged and is pending validation.</p>
              <p className="mt-2 font-mono text-[11px] text-slate-500">ID: {result.id.slice(0, 16).toUpperCase()}</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
              <p className="mb-1 font-semibold text-slate-300">Tell the report owner:</p>
              <p className="leading-relaxed">
                Their report was submitted successfully. When they reconnect to the internet, their device will automatically upload the photo evidence.
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              Scan another report
            </button>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-danger-400/25 bg-danger-500/[0.07] px-5 py-5">
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-500/15">
                  <svg className="h-4 w-4 text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white">Something went wrong</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">{errorMessage ?? "An unexpected error occurred."}</p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
