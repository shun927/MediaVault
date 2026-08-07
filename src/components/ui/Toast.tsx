'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'error' | 'info';
type ToastMessage = { id: string; message: string; tone: ToastTone };
const ToastContext = createContext<{ showToast: (message: string, tone?: ToastTone) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
        const id = crypto.randomUUID();
        setToasts((current) => [...current, { id, message, tone }]);
        window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200);
    }, []);
    const value = useMemo(() => ({ showToast }), [showToast]);
    return <ToastContext.Provider value={value}>
        {children}
        <div className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[10000] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
            {toasts.map((toast) => <div key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'} className={`max-w-md w-full rounded-lg border px-4 py-3 text-sm shadow-xl backdrop-blur ${toast.tone === 'error' ? 'border-red-500/40 bg-red-950/95 text-red-100' : toast.tone === 'success' ? 'border-emerald-500/40 bg-emerald-950/95 text-emerald-100' : 'border-[var(--border)] bg-[var(--bg-secondary)]/95 text-[var(--text-primary)]'}`}>{toast.message}</div>)}
        </div>
    </ToastContext.Provider>;
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used inside ToastProvider');
    return context;
}
