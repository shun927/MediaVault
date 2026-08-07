"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export default function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ) || []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      returnFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`relative ${widths[size]} w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-t-2xl sm:rounded-[10px] shadow-xl animate-scale-in max-h-[min(90dvh,48rem)] flex flex-col pb-[env(safe-area-inset-bottom)]`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--card-border)]">
          <h2 id="modal-title" className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button type="button" onClick={onClose} className="touch-target inline-flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer" aria-label="閉じる">
            <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
