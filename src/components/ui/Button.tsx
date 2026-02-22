'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    isLoading?: boolean;
}

export default function Button({ children, variant = 'primary', isLoading, className = '', disabled, ...props }: ButtonProps) {
    const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

    const variants = {
        primary: 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] hover:bg-[var(--btn-primary-hover)] active:scale-[0.97]',
        secondary: 'bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border border-[var(--btn-secondary-border)] hover:text-[var(--btn-secondary-hover-text)] hover:border-[var(--btn-secondary-hover-border)]',
        ghost: 'text-[var(--btn-ghost-text)] hover:text-[var(--btn-ghost-hover-text)] hover:bg-[var(--btn-ghost-hover-bg)]',
        danger: 'bg-transparent text-[#e58f92] border border-[#7f3e44] hover:bg-[#5b282d]/40',
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
