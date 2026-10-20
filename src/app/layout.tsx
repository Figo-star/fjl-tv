import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'FJL TV | Modern Cinematic Streaming Experience',
  description: 'Experience futuristic streaming with obsidian aesthetics, multi-server adaptive HLS playback, and curated cinema & series discovery on FJL TV.',
  keywords: ['FJL TV', 'movies', 'series', 'anime', 'streaming', 'cinema', 'HLS player'],
  authors: [{ name: 'FJL TV Studios' }],
  openGraph: {
    title: 'FJL TV - Futuristic Cinematic Streaming',
    description: 'High-definition entertainment with curated cinema, anime, and series discovery.',
    siteName: 'FJL TV',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FJL TV - Modern Streaming Platform',
    description: 'Ultra-sleek entertainment portal with adaptive multi-bitrate playback.',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-slate-950">
        <Suspense fallback={<div className="h-16 w-full glass-panel" />}>
          <Navbar />
        </Suspense>
        <main className="flex-grow flex flex-col">{children}</main>
        <footer className="glass-panel border-t border-white/5 py-8 mt-16 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs">
                F
              </div>
              <span className="font-semibold text-slate-300">FJL TV</span>
              <span>© 2026 All Rights Reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-slate-400">Authorized Demo & Media Stream Testing Portal</span>
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Network Systems Operational
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
