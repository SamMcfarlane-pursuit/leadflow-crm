"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, KanbanSquare, Zap, ClipboardList, Settings } from 'lucide-react';
import { UserButton } from "@clerk/nextjs";

export const Sidebar = () => {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;

    return (
        <aside className="hidden md:flex w-16 hover:w-52 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex-shrink-0 flex-col py-5 sticky top-0 h-screen z-20 transition-all duration-300 overflow-hidden group/sidebar">
            {/* Logo */}
            <div className="px-3 mb-8 flex items-center gap-3 min-w-0">
                <div className="relative w-9 h-9 min-w-[36px] bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
                    <Zap size={18} strokeWidth={2.5} />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl blur-lg opacity-40" />
                </div>
                <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                    LeadFlow<span className="text-indigo-400 ml-0.5">CRM</span>
                </span>
            </div>

            {/* Main Navigation */}
            <div className="px-3 mb-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Main</span>
            </div>
            <nav className="space-y-1 px-2">
                <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive('/dashboard')} />
                <NavItem href="/pipeline" icon={<KanbanSquare size={20} />} label="Pipeline" active={isActive('/pipeline')} />
                <NavItem href="/analytics" icon={<BarChart3 size={20} />} label="Analytics" active={isActive('/analytics')} />
            </nav>

            {/* Tools Section */}
            <div className="px-3 mt-6 mb-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Tools</span>
            </div>
            <nav className="space-y-1 px-2">
                <NavItem href="/activity" icon={<ClipboardList size={20} />} label="Activity Log" active={isActive('/activity')} />
                <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" active={isActive('/settings')} />
            </nav>

            {/* Bottom Section */}
            <div className="px-2 mt-auto">
                <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <UserButton afterSignOutUrl="/sign-in" />
                    <div className="min-w-0 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                        <p className="text-sm font-medium text-slate-200 truncate">Account</p>
                        <p className="text-[11px] text-slate-500">Manage profile</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const NavItem = ({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) => (
    <Link
        href={href}
        className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium ${active
            ? 'bg-indigo-500/15 text-indigo-400 shadow-sm shadow-indigo-500/10'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
    >
        {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-lg shadow-indigo-500/50 animate-slideIn" />
        )}
        <span className={`min-w-[20px] transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
            {icon}
        </span>
        <span className="text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">{label}</span>
    </Link>
);
