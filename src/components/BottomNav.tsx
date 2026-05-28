"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matches: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/",
    label: "Learn",
    matches: (p) => p === "/" || p.startsWith("/write"),
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H4z" />
        <path d="M20 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Chat",
    matches: (p) => p.startsWith("/chat"),
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 11.5a8.4 8.4 0 0 1-1.2 4.3 8.6 8.6 0 0 1-7.2 4.3 8.4 8.4 0 0 1-4.3-1.2L3 21l2.1-5.3A8.4 8.4 0 0 1 3.9 11.5a8.6 8.6 0 0 1 4.3-7.2 8.4 8.4 0 0 1 4.3-1.2 8.6 8.6 0 0 1 8.5 8.4z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    matches: (p) =>
      p.startsWith("/profile") ||
      p.startsWith("/placement") ||
      p.startsWith("/setup"),
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav-inner">
        {TABS.map((tab) => {
          const active = tab.matches(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`bottom-tab ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="bottom-tab-icon">{tab.icon}</span>
              <span className="bottom-tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
