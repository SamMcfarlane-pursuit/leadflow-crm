"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, KanbanSquare, ClipboardList, Settings, Plus } from 'lucide-react';
import { useModal } from '@/context/ModalContext';

export const MobileNav = () => {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;
    const { openAddLead } = useModal();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200/60 flex justify-around items-end px-1 pt-1.5 pb-2 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
            <MobileNavItem href="/dashboard" icon={<LayoutDashboard size={19} />} label="Home" active={isActive('/dashboard')} />
            <MobileNavItem href="/pipeline" icon={<KanbanSquare size={19} />} label="Pipeline" active={isActive('/pipeline')} />

            {/* Center FAB — Add Lead */}
            <button
                onClick={openAddLead}
                className="relative -mt-5 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
                style={{
                    background: 'linear-gradient(135deg, #e09f36, #c8891e)',
                    boxShadow: '0 4px 14px rgba(224,159,54,0.4)',
                }}
                aria-label="Add Lead"
            >
                <Plus size={22} strokeWidth={2.5} />
                <div className="absolute inset-0 rounded-full animate-pulse opacity-30" style={{ boxShadow: '0 0 20px rgba(224,159,54,0.6)' }} />
            </button>

            <MobileNavItem href="/analytics" icon={<BarChart3 size={19} />} label="Analytics" active={isActive('/analytics')} />
            <MobileNavItem href="/settings" icon={<Settings size={19} />} label="More" active={isActive('/settings') || isActive('/activity')} />
        </nav>
    );
};

const MobileNavItem = ({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) => (
    <Link
        href={href}
        className="relative flex flex-col items-center justify-center px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[48px]"
        style={active ? {
            color: '#c8891e',
            backgroundColor: 'rgba(224,159,54,0.08)'
        } : {
            color: '#8a7a6a'
        }}
    >
        {active && (
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full" style={{ backgroundColor: '#e09f36', boxShadow: '0 1px 4px rgba(224,159,54,0.3)' }} />
        )}
        <span className={`transition-transform duration-150 ${active ? 'scale-110' : ''}`}>
            {icon}
        </span>
        {label && <span className="text-[10px] font-semibold mt-0.5">{label}</span>}
    </Link>
);
