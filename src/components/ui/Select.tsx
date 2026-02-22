'use client';

import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
}

export default function Select({ label, options, className = '', ...props }: SelectProps) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em]">
                    {label}
                </label>
            )}
            <select
                className={`w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-[4px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer ${className}`}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23678' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}
