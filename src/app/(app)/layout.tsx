'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="lg:ml-[var(--sidebar-width)] transition-all duration-300">
                <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                <main className="px-4 pb-4 pt-2 lg:px-6 lg:pb-6 lg:pt-4 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
