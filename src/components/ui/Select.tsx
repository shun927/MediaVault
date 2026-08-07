'use client';

import { SelectHTMLAttributes, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: { value: string; label: string }[]; }

export default function Select({ label, options, className = '', id: providedId, ...props }: SelectProps) {
    const generatedId = useId();
    const id = providedId || generatedId;
    return <div className="space-y-1.5">
        {label && <label htmlFor={id} className="block text-[11px] font-medium text-[var(--input-label)] uppercase tracking-[0.12em]">{label}</label>}
        <select id={id} className={`w-full px-3 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[8px] text-[14px] text-[var(--input-text)] focus:outline-none focus:border-[var(--input-focus)] transition-colors appearance-none cursor-pointer ${className}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23678' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }} {...props}>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
    </div>;
}
