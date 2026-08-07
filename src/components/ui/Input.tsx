'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }

export function Input({ label, error, className = '', id: providedId, ...props }: InputProps) {
    const generatedId = useId();
    const id = providedId || generatedId;
    return <div className={`space-y-1.5 ${className}`}>
        {label && <label htmlFor={id} className="block text-[11px] font-medium text-[var(--input-label)] uppercase tracking-[0.12em]">{label}</label>}
        <input id={id} className={`w-full px-3 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[8px] text-[14px] text-[var(--input-text)] placeholder:text-[var(--input-label)] focus:outline-none focus:border-[var(--input-focus)] transition-colors ${error ? 'border-red-500' : ''}`} {...props} />
        {error && <p className="text-xs text-red-400">{error}</p>}
    </div>;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; }

export function Textarea({ label, className = '', id: providedId, ...props }: TextareaProps) {
    const generatedId = useId();
    const id = providedId || generatedId;
    return <div className={`space-y-1.5 ${className}`}>
        {label && <label htmlFor={id} className="block text-[11px] font-medium text-[var(--input-label)] uppercase tracking-[0.12em]">{label}</label>}
        <textarea id={id} className="w-full px-3 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[8px] text-[14px] text-[var(--input-text)] placeholder:text-[var(--input-label)] focus:outline-none focus:border-[var(--input-focus)] transition-colors resize-none min-h-[80px]" {...props} />
    </div>;
}
