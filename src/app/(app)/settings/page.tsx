'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase';
import type { Profile, Tag } from '@/lib/types';
import { getRawStatusesForSidebarFilter } from '@/lib/status';
import type { User } from '@supabase/supabase-js';

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b', '#a855f7'];
const THEME_OPTIONS = [
    { key: 'dark', label: 'Dark' },
    { key: 'monochrome', label: 'Monochrome' },
    { key: 'cobalt', label: 'Cobalt' },
] as const;
type ThemeKey = typeof THEME_OPTIONS[number]['key'];

export default function SettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [stats, setStats] = useState({ movies: 0, books: 0, music: 0, tags: 0 });
    const [statusStats, setStatusStats] = useState({ inProgress: 0, onList: 0, completed: 0 });
    const [tags, setTags] = useState<Tag[]>([]);
    const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
    const [tagLoading, setTagLoading] = useState(true);
    const [showCreateTag, setShowCreateTag] = useState(false);
    const [editTag, setEditTag] = useState<Tag | null>(null);
    const [tagForm, setTagForm] = useState({ name: '', color: '#6366f1' });
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<string | null>(null);
    const [theme, setTheme] = useState<ThemeKey>('dark');
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleThemeChange(nextTheme: ThemeKey) {
        setTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        window.localStorage.setItem('mv-theme', nextTheme);
    }

    async function getCurrentUserSafe(): Promise<User | null> {
        const supabase = createClient();
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error) throw error;
            return data.user;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const isLockTimeout = message.includes('LockManager lock') || message.includes('timed out waiting');
            if (!isLockTimeout) throw error;

            const { data: sessionData } = await supabase.auth.getSession();
            return sessionData.session?.user || null;
        }
    }

    async function loadProfile() {
        const supabase = createClient();
        try {
            const user = await getCurrentUserSafe();
            if (!user) {
                setProfileLoading(false);
                return;
            }

            const [{ data: profileData }, { count: mc }, { count: bc }, { count: muc }, { data: movieStatuses }, { data: bookStatuses }, { data: musicStatuses }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('movies').select('*', { count: 'exact', head: true }),
                supabase.from('books').select('*', { count: 'exact', head: true }),
                supabase.from('music').select('*', { count: 'exact', head: true }),
                supabase.from('movies').select('status'),
                supabase.from('books').select('status'),
                supabase.from('music').select('status'),
            ]);

            if (profileData) {
                setProfile(profileData as Profile);
            }

            const allStatuses = [...(movieStatuses || []), ...(bookStatuses || []), ...(musicStatuses || [])].map((item) => item.status);
            const inProgressList = getRawStatusesForSidebarFilter('in-progress');
            const onListList = getRawStatusesForSidebarFilter('on-the-list');
            const completedList = getRawStatusesForSidebarFilter('completed');
            setStatusStats({
                inProgress: allStatuses.filter((status) => inProgressList.includes(status)).length,
                onList: allStatuses.filter((status) => onListList.includes(status)).length,
                completed: allStatuses.filter((status) => completedList.includes(status)).length,
            });

            setStats((prev) => ({ ...prev, movies: mc || 0, books: bc || 0, music: muc || 0 }));
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setProfileLoading(false);
        }
    }

    async function loadTags() {
        setTagLoading(true);
        const supabase = createClient();
        const { data } = await supabase.from('tags').select('*').order('name');
        const tagList = (data as Tag[]) || [];
        setTags(tagList);

        const counts: Record<string, number> = {};
        for (const tag of tagList) {
            const [{ count: mc }, { count: bc }, { count: muc }] = await Promise.all([
                supabase.from('movie_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tag.id),
                supabase.from('book_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tag.id),
                supabase.from('music_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tag.id),
            ]);
            counts[tag.id] = (mc || 0) + (bc || 0) + (muc || 0);
        }

        setTagCounts(counts);
        setStats((prev) => ({ ...prev, tags: tagList.length }));
        setTagLoading(false);
    }

    async function createTag() {
        if (!tagForm.name.trim()) return;
        const supabase = createClient();
        const user = await getCurrentUserSafe();
        if (!user) return;

        await supabase.from('tags').insert({ user_id: user.id, name: tagForm.name.trim(), color: tagForm.color });
        setTagForm({ name: '', color: '#6366f1' });
        setShowCreateTag(false);
        loadTags();
    }

    async function updateTag() {
        if (!editTag || !tagForm.name.trim()) return;
        const supabase = createClient();
        await supabase.from('tags').update({ name: tagForm.name.trim(), color: tagForm.color }).eq('id', editTag.id);
        setEditTag(null);
        setTagForm({ name: '', color: '#6366f1' });
        loadTags();
    }

    async function deleteTag(id: string) {
        if (!confirm('Delete this tag?')) return;
        const supabase = createClient();
        await supabase.from('tags').delete().eq('id', id);
        loadTags();
    }

    async function handleExport() {
        setExporting(true);
        try {
            const res = await fetch('/api/export');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mediavault-export-${new Date().toISOString().substr(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Export failed');
        }
        setExporting(false);
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setImportResult(null);
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                setImportResult('Import completed successfully!');
                await loadTags();
                await loadProfile();
            } else {
                setImportResult('Import failed');
            }
        } catch {
            setImportResult('Failed to read file');
        }
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProfile();
        loadTags();
        const currentTheme = (document.documentElement.getAttribute('data-theme') || 'dark') as ThemeKey;
        setTheme(currentTheme);
    }, []);

    const totalItems = stats.movies + stats.books + stats.music;

    return (
        <div className="w-full">
            <div className="app-topbar">
                <div className="app-topbar-main">
                    <div className="app-topbar-title">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
                    </div>
                </div>
            </div>

            <div className="px-4 lg:px-9 pt-5 pb-8 grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Card hover={false}>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Profile</h2>
                        {profileLoading ? (
                            <div className="space-y-3">
                                <div className="animate-shimmer rounded h-24 w-full" />
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-4">
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden border border-[var(--border)] shrink-0" style={{ background: 'var(--bg-secondary)' }}>
                                        {profile?.avatar_url ? (
                                            <Image src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" fill sizes="64px" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[var(--text-muted)]">
                                                {(profile?.display_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-[var(--text-primary)] truncate">{profile?.display_name || 'User'}</p>
                                        <p className="text-sm text-[var(--text-muted)] mt-0.5">{totalItems} total items</p>
                                        {profile ? (
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                Joined {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    <StatCard label="Total Items" value={totalItems} />
                                    <StatCard label="Films" value={stats.movies} />
                                    <StatCard label="Books" value={stats.books} />
                                    <StatCard label="Music" value={stats.music} />
                                    <StatCard label="Tags" value={stats.tags} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <StatCard label="In Progress" value={statusStats.inProgress} />
                                    <StatCard label="On the List" value={statusStats.onList} />
                                    <StatCard label="Completed" value={statusStats.completed} />
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card hover={false}>
                        <div className="flex items-center justify-between mb-4 gap-3">
                            <div>
                                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Tag Management</h2>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Create, edit, and delete tags from Settings</p>
                            </div>
                            <Button onClick={() => { setShowCreateTag(true); setTagForm({ name: '', color: '#6366f1' }); }}>+ Create Tag</Button>
                        </div>

                        {tagLoading ? (
                            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="animate-shimmer rounded-xl h-14" />)}</div>
                        ) : tags.length === 0 ? (
                            <div className="text-center py-10 text-[var(--text-muted)]">
                                <p className="text-sm">No tags yet. Create one to organize your collection.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {tags.map(tag => (
                                    <div key={tag.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                                        <div className="flex items-center gap-3">
                                            <Badge label={tag.name} color={tag.color} size="md" />
                                            <span className="text-xs text-[var(--text-muted)]">{tagCounts[tag.id] || 0} items</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditTag(tag); setTagForm({ name: tag.name, color: tag.color }); }} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                                            </button>
                                            <button onClick={() => deleteTag(tag.id)} className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card hover={false}>
                        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Theme</h2>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            Choose color theme
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {THEME_OPTIONS.map((option) => (
                                <Button
                                    key={option.key}
                                    variant={theme === option.key ? 'primary' : 'secondary'}
                                    onClick={() => handleThemeChange(option.key)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </Card>

                    <Card hover={false}>
                        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Data & Account</h2>
                        <p className="text-sm text-[var(--text-muted)] mb-4">Export/import your records and manage your session.</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="hidden"
                        />
                        <div className="grid grid-cols-1 gap-2">
                            <Button onClick={handleExport} isLoading={exporting} variant="secondary">Export JSON</Button>
                            <Button onClick={() => fileInputRef.current?.click()} isLoading={importing} variant="secondary">Import JSON</Button>
                            <Button onClick={handleLogout} variant="danger">Logout</Button>
                        </div>
                        {importResult && (
                            <p className={`mt-3 text-sm ${importResult.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                                {importResult}
                            </p>
                        )}
                    </Card>
                </div>
            </div>

            <Modal
                isOpen={showCreateTag || !!editTag}
                onClose={() => { setShowCreateTag(false); setEditTag(null); }}
                title={editTag ? 'Edit Tag' : 'Create Tag'}
                size="sm"
            >
                <div className="space-y-4">
                    <Input label="Name" placeholder="e.g. Sci-Fi, Mystery..." value={tagForm.name} onChange={e => setTagForm(p => ({ ...p, name: e.target.value }))} />
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setTagForm(p => ({ ...p, color }))}
                                    className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${tagForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)] scale-110' : ''}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <span className="text-sm text-[var(--text-primary)]/50">Preview:</span>
                        <Badge label={tagForm.name || 'Tag Name'} color={tagForm.color} size="md" />
                    </div>
                    <Button onClick={editTag ? updateTag : createTag} className="w-full">{editTag ? 'Update' : 'Create'}</Button>
                </div>
            </Modal>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{value}</p>
        </div>
    );
}
