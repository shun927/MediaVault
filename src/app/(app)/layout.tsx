'use client';

import { Suspense, useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const savedTheme = window.localStorage.getItem('mv-theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Suspense fallback={null}>
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            </Suspense>

            <div className="lg:ml-[var(--sidebar-width)] transition-all duration-300">
                <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                <main className="px-4 pb-4 pt-2 lg:p-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
