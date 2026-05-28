import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SWUpdater } from "@/components/SWUpdater";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// GH Pages serves us under /Languages-/ — public/ assets need the prefix.
const basePath = process.env.NEXT_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Gamer · Afrikaans",
  description:
    "Level up your Afrikaans through real writing, with adaptive feedback. RPG mechanics under a clean surface.",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Gamer Lang" },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SWUpdater />
        <header className="w-full border-b border-white/5">
          <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: "var(--accent)", boxShadow: "0 0 12px var(--accent)" }}
              />
              <span className="font-medium tracking-tight">
                Gamer<span className="text-[color:var(--muted)]"> · Afrikaans</span>
              </span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/" className="text-[color:var(--muted)] hover:text-white">
                Status
              </Link>
              <Link href="/placement" className="text-[color:var(--muted)] hover:text-white">
                Placement
              </Link>
              <Link href="/write" className="text-[color:var(--muted)] hover:text-white">
                Write
              </Link>
              <Link href="/setup" className="text-[color:var(--muted)] hover:text-white">
                Setup
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 w-full">{children}</main>
        <footer className="w-full text-center text-xs text-[color:var(--muted)] py-6">
          v0 · adaptive writing engine
        </footer>
      </body>
    </html>
  );
}
