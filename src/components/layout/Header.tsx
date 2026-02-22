'use client';

interface HeaderProps {
    onMenuToggle: () => void;
    userAvatarUrl?: string;
    userName?: string;
}

export default function Header({ onMenuToggle, userAvatarUrl, userName }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 h-14 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] flex items-center justify-between px-4 lg:px-6">
            <button onClick={onMenuToggle} className="lg:hidden p-2 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
            <div className="flex-1" />
            {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-[var(--border)]" />
            ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[11px] text-[var(--text-muted)] font-medium border border-[var(--border)]">
                    {userName?.charAt(0) || 'U'}
                </div>
            )}
        </header>
    );
}
