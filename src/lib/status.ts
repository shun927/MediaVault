export const STATUS_LABELS: Record<string, string> = {
    watched: 'Completed',
    read: 'Completed',
    listened: 'Completed',
    watching: 'In Progress',
    reading: 'In Progress',
    listening: 'In Progress',
    wishlist: 'On the List',
};

export type SidebarStatusFilter = 'in-progress' | 'on-the-list' | 'completed';

export const SIDEBAR_STATUS_OPTIONS: { value: SidebarStatusFilter; label: string }[] = [
    { value: 'in-progress', label: 'In Progress' },
    { value: 'on-the-list', label: 'On the List' },
    { value: 'completed', label: 'Completed' },
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
