export const STATUS_LABELS: Record<string, string> = {
    watched: '完了',
    read: '完了',
    listened: '完了',
    watching: '進行中',
    reading: '進行中',
    listening: '進行中',
    wishlist: 'あとで見る',
};

export type SidebarStatusFilter = 'in-progress' | 'on-the-list' | 'completed';

export const SIDEBAR_STATUS_OPTIONS: { value: SidebarStatusFilter; label: string }[] = [
    { value: 'in-progress', label: '進行中' },
    { value: 'on-the-list', label: 'あとで見る' },
    { value: 'completed', label: '完了' },
];

const SIDEBAR_STATUS_TO_RAW: Record<SidebarStatusFilter, string[]> = {
    'in-progress': ['watching', 'reading', 'listening'],
    'on-the-list': ['wishlist'],
    completed: ['watched', 'read', 'listened'],
};

export const MOVIE_STATUS_OPTIONS = [
    { value: 'watched', label: STATUS_LABELS.watched },
    { value: 'watching', label: STATUS_LABELS.watching },
    { value: 'wishlist', label: STATUS_LABELS.wishlist },
];

export const BOOK_STATUS_OPTIONS = [
    { value: 'read', label: STATUS_LABELS.read },
    { value: 'reading', label: STATUS_LABELS.reading },
    { value: 'wishlist', label: STATUS_LABELS.wishlist },
];

export const MUSIC_STATUS_OPTIONS = [
    { value: 'listened', label: STATUS_LABELS.listened },
    { value: 'listening', label: STATUS_LABELS.listening },
    { value: 'wishlist', label: STATUS_LABELS.wishlist },
];

export function getStatusLabel(status: string) {
    return STATUS_LABELS[status] ?? status;
}

export function getRawStatusesForSidebarFilter(filter: SidebarStatusFilter): string[] {
    return SIDEBAR_STATUS_TO_RAW[filter];
}

export function isSidebarStatusFilter(value: string | null): value is SidebarStatusFilter {
    return !!value && SIDEBAR_STATUS_OPTIONS.some((option) => option.value === value);
}
