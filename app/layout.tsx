import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { BUSINESS } from "@/config/business";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BUSINESS.name,
  description: BUSINESS.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-screen bg-bg-main flex flex-col font-sans">
        {/* Ambient Blobs */}
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />

        {/* Desktop Sidebar / Mobile Bottom Nav */}
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Main Navigation (Side on desktop, Top on mobile) */}
          <nav className="fixed bottom-0 lg:left-5 lg:top-5 w-full lg:w-[17.5rem] lg:h-[calc(100vh-2.5rem)] soft-panel border-t lg:border lg:border-white/70 lg:rounded-[2rem] p-4 lg:p-6 z-50 flex flex-row lg:flex-col justify-around lg:justify-start items-center lg:items-start transition-all duration-300 overflow-y-auto">
            <div className="hidden lg:block mb-10 w-full shrink-0">
              <div className="pill-surface rounded-[1.6rem] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand/70">Owner OS</p>
                <h1 className="mt-2 text-2xl font-bold bg-gradient-to-r from-brand to-brand-soft bg-clip-text text-transparent">
                  {BUSINESS.name}
                </h1>
                <p className="text-[10px] text-text-sub uppercase tracking-[0.2em] font-medium leading-none mt-2">
                  {BUSINESS.tagline}
                </p>
              </div>
            </div>

            <div className="flex flex-row lg:flex-col w-full gap-2 lg:gap-3 justify-around lg:justify-start">
              <NavLink href="/dashboard" icon="🏠" label="Focus" />
              <NavLink href="/clients" icon="👥" label="Clients" />
              <NavLink href="/analytics" icon="📊" label="Insights" />
              <NavLink href="/bookings" icon="📅" label="Calendar" />
              <NavLink href="/dashboard/settings" icon="⚙️" label="Settings" />
            </div>

            <div className="hidden lg:block mt-6 w-full">
              <div className="soft-inset rounded-[1.6rem] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-sub">Quick Actions</p>
                <div className="mt-3 space-y-2">
                  <QuickAction href="/bookings" label="Add Booking" />
                  <QuickAction href="/dashboard/settings" label="Open Settings" />
                  <QuickAction href="/analytics" label="View Insights" />
                </div>
              </div>
            </div>

            <div className="hidden lg:block mt-auto pt-6 border-t border-white/70 w-full">
              <div className="soft-inset rounded-[1.6rem] p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[linear-gradient(135deg,#d06f86,#efb8c5)] flex items-center justify-center text-white text-lg shadow-[0_16px_32px_-20px_rgba(208,111,134,0.8)]">
                    ✨
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand">Owner Mode</p>
                    <p className="text-[10px] text-text-sub leading-none">Client intelligence live</p>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 w-full pb-36 lg:pb-0 lg:pl-[21rem] transition-all duration-300">
            <header className="lg:hidden sticky top-0 glass border-b border-white/70 p-4 z-40 flex justify-between items-center">
              <div>
                <h1 className="text-lg font-bold text-brand">{BUSINESS.name}</h1>
                <p className="text-[10px] uppercase tracking-[0.18em] text-text-sub">Owner mode</p>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-brand-light flex items-center justify-center text-brand text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">SM</div>
            </header>
            
            <div className="p-4 lg:p-10 max-w-[92rem] mx-auto animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link 
      href={href} 
      className="pill-surface flex flex-col lg:flex-row items-center gap-1 lg:gap-4 p-2.5 lg:p-3.5 rounded-2xl transition-all duration-200 group text-text-sub lg:hover:text-brand lg:hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <span className="text-xl lg:text-base group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[10px] lg:text-sm font-semibold uppercase lg:capitalize tracking-wider lg:tracking-normal">{label}</span>
      <div className="hidden lg:block ml-auto mr-1 w-1.5 h-1.5 rounded-full bg-brand scale-0 group-hover:scale-100 transition-all shrink-0" />
    </Link>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-text-main shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_12px_20px_-18px_rgba(200,168,177,0.5)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {label}
    </Link>
  );
}
