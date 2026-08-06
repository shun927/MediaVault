"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  dashboard: "Home", search: "Search", movies: "Films", books: "Books",
  music: "Music", timeline: "Timeline", status: "Status", tags: "Tags", settings: "Settings",
};

export default function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const section = pathname.split("/").filter(Boolean)[0] || "dashboard";
  return (
    <header className="sticky top-0 z-30 min-h-14 bg-[var(--bg-primary)]/95 backdrop-blur-sm flex items-center gap-3 px-3 pt-[env(safe-area-inset-top)] lg:hidden">
      <button type="button" onClick={onMenuToggle} className="touch-target inline-flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer" aria-label="メニューを開く" aria-haspopup="dialog">
        <svg className="w-6 h-6" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <p className="text-base font-bold text-[var(--text-primary)]">{titles[section] || "MediaVault"}</p>
    </header>
  );
}
