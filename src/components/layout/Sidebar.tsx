"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, KanbanSquare, Zap, ClipboardList, Settings, Plus } from 'lucide-react';
import { UserButton } from "@clerk/nextjs";
import { useModal } from '@/context/ModalContext';

export const Sidebar = () => {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;
    const { openAddLead } = useModal();

    return (
        <aside className="hidden md:flex w-16 hover:w-52 flex-shrink-0 flex-col py-5 sticky top-0 h-screen z-20 transition-all duration-300 overflow-hidden group/sidebar" style={{ background: 'linear-gradient(to bottom, #1a1108, #1a1108, #0f0a04)' }}>
            {/* Logo */}
            <div className="px-3 mb-6 flex items-center gap-3 min-w-0">
                <div className="relative w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #e09f36, #c8891e)', boxShadow: '0 4px 14px rgba(224,159,54,0.3)' }}>
                    <Zap size={18} strokeWidth={2.5} />
                    <div className="absolute inset-0 rounded-xl blur-lg opacity-40" style={{ background: 'linear-gradient(135deg, #e09f36, #c8891e)' }} />
                </div>
                <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                    LeadFlow<span className="ml-0.5" style={{ color: '#e09f36' }}>CRM</span>
                </span>
            </div>

            {/* Quick Add Button */}
            <div className="px-2 mb-4">
                <button
                    onClick={openAddLead}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold text-white group/add"
                    style={{ background: 'linear-gradient(135deg, #e09f36, #c8891e)', boxShadow: '0 2px 8px rgba(224,159,54,0.3)' }}
                >
                    <span className="min-w-[20px] flex items-center justify-center">
                        <Plus size={18} strokeWidth={2.5} />
                    </span>
                    <span className="text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">Add Lead</span>
                </button>
            </div>

            {/* Main Navigation */}
            <div className="px-3 mb-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: '#5a4631' }}>Main</span>
            </div>
            <nav className="space-y-1 px-2">
                <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive('/dashboard')} />
                <NavItem href="/pipeline" icon={<KanbanSquare size={20} />} label="Pipeline" active={isActive('/pipeline')} />
                <NavItem href="/analytics" icon={<BarChart3 size={20} />} label="Analytics" active={isActive('/analytics')} />
            </nav>

            {/* Tools Section */}
            <div className="px-3 mt-6 mb-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: '#5a4631' }}>Tools</span>
            </div>
            <nav className="space-y-1 px-2">
                <NavItem href="/activity" icon={<ClipboardList size={20} />} label="Activity Log" active={isActive('/activity')} />
                <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" active={isActive('/settings')} />
            </nav>

            {/* Bottom Section */}
            <div className="px-2 mt-auto">
                <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl border" style={{ backgroundColor: 'rgba(42,30,20,0.5)', borderColor: 'rgba(90,70,49,0.5)' }} suppressHydrationWarning>
                    <UserButton afterSignOutUrl="/sign-in" />
                    <div className="min-w-0 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                        <p className="text-sm font-medium text-slate-200 truncate">Account</p>
                        <p className="text-[11px]" style={{ color: '#5a4631' }}>Manage profile</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const NavItem = ({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) => (
    <Link
        href={href}
        className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium`}
        style={active ? {
            backgroundColor: 'rgba(224,159,54,0.12)',
            color: '#e09f36',
            boxShadow: '0 1px 3px rgba(224,159,54,0.1)'
        } : {
            color: '#8a7a6a'
        }}
    >
        {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full animate-slideIn" style={{ backgroundColor: '#e09f36', boxShadow: '0 0 12px rgba(224,159,54,0.5)' }} />
        )}
        <span className={`min-w-[20px] transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
            {icon}
        </span>
        <span className="text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">{label}</span>
    </Link>
);
