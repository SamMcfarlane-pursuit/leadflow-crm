"use client";

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import { useLeads } from '@/context/LeadContext';
import { useModal } from '@/context/ModalContext';
import { ClipboardList, Sparkles, Mail, RefreshCw, UserPlus, Plus, ArrowUpDown } from 'lucide-react';

export default function ActivityPage() {
    return (
        <AppShell>
            <ActivityView />
        </AppShell>
    );
}

const ICON_MAP: Record<string, React.ReactNode> = {
    API: <Sparkles size={14} className="text-amber-500" />,
    CORE: <ArrowUpDown size={14} className="text-emerald-500" />,
    HUBSPOT: <RefreshCw size={14} className="text-blue-500" />,
    BREVO: <Mail size={14} className="text-purple-500" />,
};

const LEVEL_STYLES: Record<string, string> = {
    INFO: 'bg-slate-50 border-slate-200 text-slate-600',
    SUCCESS: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    WARN: 'bg-amber-50 border-amber-200 text-amber-700',
    ERROR: 'bg-red-50 border-red-200 text-red-700',
};

function ActivityView() {
    const { logs } = useLeads();
    const { openAddLead } = useModal();

    return (
        <div className="flex flex-col h-screen overflow-y-auto scrollbar-hide">
            <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-slate-800">Activity Log</h1>
                    <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-500">
                        <ClipboardList size={12} /> {logs.length} events
                    </span>
                </div>
                <button
                    onClick={openAddLead}
                    className="text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all text-sm"
                    style={{ background: 'linear-gradient(to right, #e09f36, #c8891e)', boxShadow: '0 4px 14px rgba(224,159,54,0.25)' }}
                >
                    <Plus size={16} strokeWidth={2.5} />
                    <span className="hidden sm:inline">Add Lead</span>
                </button>
            </header>

            <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
                {logs.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(224,159,54,0.1)' }}>
                                <ClipboardList size={24} className="text-amber-500" />
                            </div>
                            <h2 className="text-lg font-semibold mb-1 text-slate-800">No activity yet</h2>
                            <p className="text-sm max-w-sm text-slate-500">
                                Activity will appear here as you add leads, sync data, run AI analysis, and send emails.
                            </p>
                            <button
                                onClick={openAddLead}
                                className="mt-4 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all text-sm"
                                style={{ background: 'linear-gradient(to right, #e09f36, #c8891e)', boxShadow: '0 4px 14px rgba(224,159,54,0.25)' }}
                            >
                                <UserPlus size={16} /> Import Your First Leads
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {logs.slice().reverse().map(log => (
                            <div
                                key={log.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO}`}
                            >
                                <div className="mt-0.5">
                                    {ICON_MAP[log.module] || <ClipboardList size={14} className="text-slate-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{log.message}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{log.module}</span>
                                        <span className="w-px h-3 bg-current opacity-20" />
                                        <span className="text-[10px] opacity-50">
                                            {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${LEVEL_STYLES[log.level]}`}>
                                    {log.level}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
