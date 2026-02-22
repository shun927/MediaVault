'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { createClient } from '@/lib/supabase';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<{ avatar_url?: string; full_name?: string } | null>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUser({
                    avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
                    full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
                });
            }
        });
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="lg:ml-[var(--sidebar-width)] transition-all duration-300">
                <Header
                    onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                    userAvatarUrl={user?.avatar_url}
                    userName={user?.full_name}
                />
                <main className="p-4 lg:p-6 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
