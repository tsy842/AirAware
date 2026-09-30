import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  PlusSquare, 
  QrCode, 
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PhoneReadyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhoneReadyModal: React.FC<PhoneReadyModalProps> = ({ isOpen, onClose }) => {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Use the active browser URL
  const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://ais-dev-5ylvwy3cjhvnodyyacpkvu-436820113846.asia-southeast1.run.app';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&color=020617&bgcolor=ffffff&data=${encodeURIComponent(currentUrl)}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeInstall = async () => {
    const success = await promptInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-teal-500/40 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-inner">
              <Smartphone className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Phone Ready Mobile App
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold uppercase border border-teal-500/40">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan with your phone camera or install directly as a native app
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code & Scan Section */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 relative z-10">
          <div className="bg-white p-2.5 rounded-2xl shadow-xl shrink-0">
            <img 
              src={qrCodeUrl} 
              alt="Scan QR code to open on mobile" 
              className="w-36 h-36 rounded-lg object-contain"
              loading="eager"
            />
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-teal-300">
              <QrCode className="w-4 h-4 text-teal-400" />
              <span>Instant Mobile Access</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Open your phone camera (iPhone or Android) and point it at the QR code to launch AirAware instantly in your mobile browser.
            </p>
            <div className="text-[11px] text-slate-400 flex items-center justify-center sm:justify-start gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Full GPS auto-detection & touch navigation enabled</span>
            </div>
          </div>
        </div>

        {/* Copy Phone Link Bar */}
        <div className="space-y-1.5 relative z-10">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Direct Phone URL</span>
            <span className="text-[10px] text-teal-400 font-mono">Live Link</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20 shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Direct Install Button (If supported by browser / Chrome) */}
        {canInstall && !isInstalled && (
          <button
            onClick={handleNativeInstall}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install AirAware App to Home Screen</span>
          </button>
        )}

        {/* Step-by-Step Installation Guide Tabs */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            How to Install on Your Phone:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* iOS */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>🍏 iPhone / iPad (Safari)</span>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Open the link in <strong>Safari</strong></li>
                <li>Tap the <strong>Share</strong> button <Share2 className="w-3 h-3 inline text-teal-400" /></li>
                <li>Scroll down & tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3 h-3 inline text-teal-400" /></li>
              </ol>
            </div>

            {/* Android */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>🤖 Android (Chrome / Edge)</span>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                <li>Open the link in <strong>Chrome</strong></li>
                <li>Tap the <strong>3 dots (⋮)</strong> menu top right</li>
                <li>Tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong></li>
              </ol>
            </div>
          </div>
        </div>

        {/* Done Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
