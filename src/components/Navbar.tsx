'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tv, Film, PlaySquare, Flame, Search, Bookmark, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', href: '/', icon: Flame },
    { label: 'Movies', href: '/movies', icon: Film },
    { label: 'TV Shows', href: '/tv', icon: Tv },
    { label: 'Anime', href: '/anime', icon: PlaySquare },
    { label: 'My List', href: '/my-list', icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link 
          href="/" 
          id="fjl-logo"
          className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
            <span className="text-white font-black tracking-wider text-lg">F</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              FJL<span className="text-cyan-400 font-bold ml-1">TV</span>
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold -mt-1">
              Cinematic Stream
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                id={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Icons */}
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            id="nav-search-button"
            aria-label="Search Catalog"
            className="p-2.5 rounded-full glass-pill text-slate-300 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Search className="w-4 h-4" />
          </Link>

          {/* Mobile hamburger button */}
          <button
            type="button"
            id="mobile-menu-toggle"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-full glass-pill text-slate-300 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-white/10 px-4 pt-2 pb-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
