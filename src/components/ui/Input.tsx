'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em]">
                    {label}
                </label>
            )}
            <input
                className={`w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-[4px] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors ${error ? 'border-red-500' : ''}`}
                {...props}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em]">
                    {label}
                </label>
            )}
            <textarea
                className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-[4px] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none min-h-[80px]"
                {...props}
            />
        </div>
    );
}
