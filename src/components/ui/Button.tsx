'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    isLoading?: boolean;
}

export default function Button({ children, variant = 'primary', isLoading, className = '', disabled, ...props }: ButtonProps) {
    const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

    const variants = {
        primary: 'bg-[var(--accent)] text-[#14181c] hover:bg-[var(--accent-hover)] active:scale-[0.97]',
        secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]',
        ghost: 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]',
        danger: 'bg-transparent text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)]/10',
    };

    return (
        <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || isLoading} {...props}>
            {isLoading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : null}
            {children}
        </button>
    );
}
