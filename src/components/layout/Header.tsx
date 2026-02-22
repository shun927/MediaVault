'use client';

interface HeaderProps {
    onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 h-14 bg-[var(--bg-primary)]/95 backdrop-blur-sm flex items-center px-4 lg:hidden">
            <button onClick={onMenuToggle} className="lg:hidden p-2 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
        </header>
    );
}
