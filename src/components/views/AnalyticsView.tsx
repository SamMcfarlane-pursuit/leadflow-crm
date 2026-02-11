"use client";

import React from 'react';
import { useLeads } from '@/context/LeadContext';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsView() {
    const { leads } = useLeads();

    return (
        <div className="flex flex-col h-screen overflow-y-auto scrollbar-hide">
            <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-slate-800">Analytics</h1>
                    <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-600">
                        <BarChart3 size={12} /> Live Data
                    </span>
                </div>
            </header>
            <div className="p-4 md:p-8">
                <AnalyticsDashboard leads={leads} />
            </div>
        </div>
    );
}
