"use client";

import React, { useState } from 'react';
import { useLeads } from '@/context/LeadContext';
import { useModal } from '@/context/ModalContext';
import { Plus, Bell, Sparkles, RefreshCw, CloudDownload } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import RecentLeads from '@/components/RecentLeads';
import LeadIntelligenceModal from '@/components/LeadIntelligenceModal';
import { SessionReplayModal } from '@/components/Placeholders';
import { Lead } from '@/types';

export default function DashboardView() {
    const { leads, stats, addLead, addLog, syncSheets, isSyncing, lastSyncTime } = useLeads();
    const { openAddLead } = useModal();
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [analyzingLead, setAnalyzingLead] = useState<{ lead: Lead; type: 'strategy' | 'email' } | null>(null);

    const handleAnalyze = (lead: Lead, type: 'strategy' | 'email') => {
        setAnalyzingLead({ lead, type });
    };

    // Time-of-day greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <>
            {/* MODALS */}
            {selectedLead && <SessionReplayModal onClose={() => setSelectedLead(null)} />}
            {analyzingLead && (
                <LeadIntelligenceModal
                    lead={analyzingLead.lead}
                    initialTab={analyzingLead.type}
                    onClose={() => setAnalyzingLead(null)}
                />
            )}

            {/* HEADER */}
            <header className="h-16 backdrop-blur-xl border-b sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between" style={{ backgroundColor: 'rgba(253,247,240,0.7)', borderColor: 'rgba(224,159,54,0.15)' }}>
                <div className="hidden md:block">
                    <h1 className="text-lg font-bold text-slate-800">{greeting}</h1>
                    <p className="text-xs text-slate-400 -mt-0.5">Here&apos;s your lead pipeline overview</p>
                </div>

                {/* Mobile Title */}
                <div className="md:hidden flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-lg">Dashboard</span>
                </div>

                <div className="flex items-center gap-2 md:gap-3 ml-auto">
                    {/* Quick Stats Pill */}
                    {stats && (
                        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs">
                            <Sparkles size={12} style={{ color: '#e09f36' }} />
                            <span className="font-semibold text-slate-700">{stats.total}</span>
                            <span className="text-slate-400">leads</span>
                            <span className="w-px h-3 bg-slate-200 mx-1" />
                            <span className="font-semibold text-emerald-600">{stats.hot}</span>
                            <span className="text-slate-400">hot</span>
                        </div>
                    )}

                    {/* Sheets Sync Button */}
                    <button
                        onClick={() => syncSheets(500)}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-50"
                        style={{
                            borderColor: 'rgba(128,235,162,0.4)',
                            backgroundColor: isSyncing ? 'rgba(128,235,162,0.08)' : 'rgba(128,235,162,0.06)',
                            color: '#2d8a54',
                        }}
                        title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Sync leads from Google Sheets'}
                    >
                        {isSyncing ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <CloudDownload size={14} />
                        )}
                        <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                    </button>

                    {/* Last Sync Indicator */}
                    {lastSyncTime && !isSyncing && (
                        <span className="hidden lg:inline text-[10px] text-slate-400">
                            ⟳ {new Date(lastSyncTime).toLocaleTimeString()}
                        </span>
                    )}

                    <button
                        onClick={openAddLead}
                        className="text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all text-sm"
                        style={{ background: 'linear-gradient(to right, #e09f36, #c8891e)', boxShadow: '0 4px 14px rgba(224,159,54,0.25)' }}
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span className="hidden sm:inline">Add Lead</span>
                    </button>

                    <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                        <Bell size={18} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                    </button>
                </div>
            </header>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
                <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
                    {/* ANALYTICS DASHBOARD */}
                    <section>
                        <AnalyticsDashboard leads={leads} />
                    </section>

                    {/* RECENT LEADS */}
                    <section>
                        <RecentLeads
                            onViewSession={setSelectedLead}
                            onAnalyze={handleAnalyze}
                        />
                    </section>
                </div>
            </div>
        </>
    );
}
