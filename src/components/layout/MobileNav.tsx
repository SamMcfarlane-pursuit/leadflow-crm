"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, KanbanSquare } from 'lucide-react';

export const MobileNav = () => {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-200/60 flex justify-around p-2 z-30 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <MobileNavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Home" active={isActive('/dashboard')} />
            <MobileNavItem href="/pipeline" icon={<KanbanSquare size={20} />} label="Pipeline" active={isActive('/pipeline')} />
            <MobileNavItem href="/analytics" icon={<BarChart3 size={20} />} label="Analytics" active={isActive('/analytics')} />
        </nav>
    );
};

const MobileNavItem = ({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) => (
    <Link
        href={href}
        className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${active
            ? 'text-indigo-600 bg-indigo-50'
            : 'text-slate-400 hover:text-slate-600 active:scale-95'
            }`}
    >
        {active && (
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-indigo-500 rounded-full shadow-sm shadow-indigo-500/30" />
        )}
        <span className={`transition-transform duration-150 ${active ? 'scale-110' : ''}`}>
            {icon}
        </span>
        <span className="text-[10px] font-semibold mt-1">{label}</span>
    </Link>
);
