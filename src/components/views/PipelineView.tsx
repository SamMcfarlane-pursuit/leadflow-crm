"use client";

import React from 'react';
import { useLeads } from '@/context/LeadContext';
import { useModal } from '@/context/ModalContext';
import { KanbanBoard } from '@/components/KanbanBoard';
import { KanbanSquare, TrendingUp, Plus } from 'lucide-react';

export default function PipelineView() {
    const { leads, updateLeadStage, stats } = useLeads();
    const { openAddLead } = useModal();

    const stageCount = (stage: string) => leads.filter(l => l.pipelineStage === stage).length;

    return (
        <div className="flex flex-col h-screen">
            <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-8 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-slate-800">Pipeline</h1>
                    {stats && (
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs">
                            <TrendingUp size={12} className="text-amber-500" />
                            <span className="font-semibold text-emerald-600">{stageCount('Closed')}</span>
                            <span className="text-slate-400">closed</span>
                            <span className="w-px h-3 bg-slate-200 mx-1" />
                            <span className="font-semibold text-amber-600">{stageCount('Negotiation')}</span>
                            <span className="text-slate-400">negotiating</span>
                        </div>
                    )}
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
            <div className="flex-1 overflow-hidden p-4 md:p-6">
                <KanbanBoard leads={leads} onStageChange={updateLeadStage} />
            </div>
        </div>
    );
}
