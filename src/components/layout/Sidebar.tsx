'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { SIDEBAR_STATUS_OPTIONS, isSidebarStatusFilter } from '@/lib/status';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [counts, setCounts] = useState({ films: 0, books: 0, music: 0 });

    useEffect(() => {
        async function loadCounts() {
            const supabase = createClient();
            const [{ count: films }, { count: books }, { count: music }] = await Promise.all([
                supabase.from('movies').select('*', { count: 'exact', head: true }),
                supabase.from('books').select('*', { count: 'exact', head: true }),
                supabase.from('music').select('*', { count: 'exact', head: true }),
            ]);
            setCounts({ films: films || 0, books: books || 0, music: music || 0 });
        }
        loadCounts();
    }, []);

    const homeActive = pathname === '/dashboard';
    const activeStatusParam = pathname.startsWith('/status') ? searchParams.get('view') : null;
    const activeStatus = isSidebarStatusFilter(activeStatusParam)
        ? activeStatusParam
        : pathname.startsWith('/status')
            ? 'in-progress'
            : null;

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={onClose} />
            )}

            <aside
                className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{
                    width: '240px',
                    background: 'var(--sidebar-bg)',
                    borderRight: '1px solid var(--sidebar-border)',
                }}
            >
                <div className="px-7 pt-9 pb-6">
                    <p className="text-[50px] leading-[0.85] font-extrabold tracking-[-0.02em]" style={{ color: 'var(--sidebar-brand)', fontFamily: 'Inter, sans-serif' }}>
                        MEDIA
                        <br />
                        VAULT
                    </p>
                </div>

                <div className="px-5">
                    <Link
                        href="/dashboard"
                        onClick={onClose}
                        className="flex items-center gap-3 py-2 px-3 rounded-[10px] no-underline transition-colors"
                        style={getSidebarItemStyle(homeActive, true)}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-[18px] font-bold tracking-[0.04em]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                            HOME
                        </span>
                    </Link>
                    <Link
                        href="/search"
                        onClick={onClose}
                        className="flex items-center gap-3 py-2 px-3 rounded-[10px] no-underline transition-colors"
                        style={getSidebarItemStyle(pathname.startsWith('/search'), true)}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <span className="text-[18px] font-bold tracking-[0.04em]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                            SEARCH
                        </span>
                    </Link>
                </div>

                <div className="px-5 pt-7">
                    <h3 className="text-[11px] font-extrabold tracking-[0.1em] uppercase" style={{ color: 'var(--sidebar-section)', fontFamily: 'Archivo, sans-serif' }}>
                        Collections
                    </h3>
                    <div className="mt-3 space-y-0.5">
                        <SidebarLink href="/movies" label="Films" count={counts.films} active={pathname.startsWith('/movies')} onClose={onClose} />
                        <SidebarLink href="/books" label="Books" count={counts.books} active={pathname.startsWith('/books')} onClose={onClose} />
                        <SidebarLink href="/music" label="Music" count={counts.music} active={pathname.startsWith('/music')} onClose={onClose} />
                        <SidebarLink href="/timeline" label="Timeline" active={pathname.startsWith('/timeline')} onClose={onClose} />
                    </div>
                </div>

                <div className="px-5 pt-6">
                    <h3 className="text-[11px] font-extrabold tracking-[0.1em] uppercase" style={{ color: 'var(--sidebar-section)', fontFamily: 'Archivo, sans-serif' }}>
                        Status
                    </h3>
                    <div className="mt-3 space-y-0.5">
                        {SIDEBAR_STATUS_OPTIONS.map((status) => (
                            <SidebarLink
                                key={status.value}
                                href={`/status?view=${status.value}`}
                                label={status.label}
                                active={activeStatus === status.value}
                                onClose={onClose}
                            />
                        ))}
                    </div>
                </div>

                <div className="px-5 pt-7 pb-6">
                    <Link
                        href="/settings"
                        onClick={onClose}
                        className="flex items-center gap-3 py-2 px-3 rounded-[10px] no-underline transition-colors"
                        style={getSidebarItemStyle(pathname.startsWith('/settings'), true)}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        </svg>
                        <span className="text-[18px] font-bold tracking-[0.04em]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                            SETTINGS
                        </span>
                    </Link>
                </div>
            </aside>
        </>
    );
}

function getSidebarItemStyle(active: boolean, isPrimary = false) {
    return {
        background: active ? 'var(--sidebar-active-bg)' : 'transparent',
        boxShadow: active ? '0 0 0 1px var(--sidebar-active-border), 0 6px 16px var(--sidebar-active-shadow)' : 'none',
        color: active
            ? 'var(--sidebar-active-text)'
            : isPrimary
                ? 'var(--sidebar-link)'
                : 'var(--sidebar-item)',
    };
}

function SidebarLink({
    href,
    label,
    count,
    active,
    onClose,
}: {
    href: string;
    label: string;
    count?: number;
    active: boolean;
    onClose: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClose}
            className="flex items-center justify-between py-2 px-3 rounded-[10px] no-underline transition-colors"
            style={getSidebarItemStyle(active)}
        >
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
            {typeof count === 'number' && (
                <span
                    className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[13px] font-bold"
                    style={{ background: 'var(--sidebar-chip-bg)', border: '1px solid var(--sidebar-chip-border)', color: 'var(--sidebar-chip-text)', fontFamily: 'Archivo, sans-serif' }}
                >
                    {count}
                </span>
            )}
        </Link>
    );
}
