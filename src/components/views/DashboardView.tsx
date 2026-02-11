"use client";

import React, { useState } from 'react';
import { useLeads } from '@/context/LeadContext';
import { Plus, Bell, Sparkles } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import RecentLeads from '@/components/RecentLeads';
import AddLeadModal from '@/components/AddLeadModal';
import LeadIntelligenceModal from '@/components/LeadIntelligenceModal';
import { SessionReplayModal } from '@/components/Placeholders';
import { Lead } from '@/types';

export default function DashboardView() {
    const { leads, stats, addLead, addLog } = useLeads();
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [analyzingLead, setAnalyzingLead] = useState<{ lead: Lead; type: 'strategy' | 'email' } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAnalyze = (lead: Lead, type: 'strategy' | 'email') => {
        setAnalyzingLead({ lead, type });
    };

    // Time-of-day greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <>
            {/* MODALS */}
            {isModalOpen && (
                <AddLeadModal
                    onLeadProcessed={addLead}
                    addLog={addLog}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
            {selectedLead && <SessionReplayModal onClose={() => setSelectedLead(null)} />}
            {analyzingLead && (
                <LeadIntelligenceModal
                    lead={analyzingLead.lead}
                    initialTab={analyzingLead.type}
                    onClose={() => setAnalyzingLead(null)}
                />
            )}

            {/* HEADER */}
            <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between">
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
                            <Sparkles size={12} className="text-indigo-500" />
                            <span className="font-semibold text-slate-700">{stats.total}</span>
                            <span className="text-slate-400">leads</span>
                            <span className="w-px h-3 bg-slate-200 mx-1" />
                            <span className="font-semibold text-emerald-600">{stats.hot}</span>
                            <span className="text-slate-400">hot</span>
                        </div>
                    )}

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 text-sm"
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
