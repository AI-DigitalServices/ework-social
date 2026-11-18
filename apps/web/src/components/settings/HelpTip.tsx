'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Small "?" button that opens a plain-language explanation. Click to open,
 * click outside or press Escape to close. Used across Settings, Integrations.
 */
export default function HelpTip({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={`Help: ${title}`}
        aria-expanded={open}
        className="w-5 h-5 rounded-full border border-slate-300 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-400 text-[11px] font-bold flex items-center justify-center"
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-7 z-30 w-80 max-w-[85vw] rounded-xl border border-slate-200 bg-white shadow-xl p-4 text-left text-xs leading-relaxed text-slate-600 space-y-2 font-normal"
        >
          <p className="text-sm font-bold text-slate-800">{title}</p>
          {children}
        </div>
      )}
    </span>
  );
}
