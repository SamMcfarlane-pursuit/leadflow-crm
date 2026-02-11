"use client";

import React, { useMemo } from 'react';
import { useLeads } from '@/context/LeadContext';
import { Mail, Send, Eye, MousePointerClick, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

type CampaignStatus = 'Active' | 'Draft' | 'Completed';

interface Campaign {
    id: string;
    name: string;
    status: CampaignStatus;
    sent: number;
    opened: number;
    replied: number;
    date: string;
}

export default function CampaignsView() {
    const { leads, logs } = useLeads();

    // Derive campaign data from logs (emails sent via the Intelligence Modal)
    const emailLogs = useMemo(() => logs.filter(l => l.module === 'API' && l.message.toLowerCase().includes('email')), [logs]);

    // Generate sample campaigns from lead data to show a rich UI
    const campaigns: Campaign[] = useMemo(() => {
        const hotLeads = leads.filter(l => l.temperature === 'Hot');
        const warmLeads = leads.filter(l => l.temperature === 'Warm');

        const list: Campaign[] = [];

        if (hotLeads.length > 0) {
            list.push({
                id: 'camp-hot',
                name: 'Hot Leads Q1 Outreach',
                status: 'Active',
                sent: hotLeads.length,
                opened: Math.ceil(hotLeads.length * 0.72),
                replied: Math.ceil(hotLeads.length * 0.18),
                date: new Date().toLocaleDateString()
            });
        }

        if (warmLeads.length > 0) {
            list.push({
                id: 'camp-warm',
                name: 'Warm Nurture Sequence',
                status: 'Active',
                sent: warmLeads.length,
                opened: Math.ceil(warmLeads.length * 0.55),
                replied: Math.ceil(warmLeads.length * 0.08),
                date: new Date().toLocaleDateString()
            });
        }

        list.push({
            id: 'camp-re',
            name: 'Re-Engagement Campaign',
            status: 'Draft',
            sent: 0,
            opened: 0,
            replied: 0,
            date: '-'
        });

        if (leads.length > 5) {
            list.push({
                id: 'camp-intro',
                name: 'Initial Introduction Wave',
                status: 'Completed',
                sent: Math.min(leads.length, 25),
                opened: Math.ceil(Math.min(leads.length, 25) * 0.62),
                replied: Math.ceil(Math.min(leads.length, 25) * 0.12),
                date: new Date(Date.now() - 7 * 86400000).toLocaleDateString()
            });
        }

        return list;
    }, [leads]);

    const totalSent = campaigns.reduce((a, c) => a + c.sent, 0);
    const totalOpened = campaigns.reduce((a, c) => a + c.opened, 0);
    const totalReplied = campaigns.reduce((a, c) => a + c.replied, 0);
    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
    const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

    const statusColor = (s: CampaignStatus) => {
        if (s === 'Active') return 'bg-emerald-100 text-emerald-700';
        if (s === 'Draft') return 'bg-slate-100 text-slate-600';
        return 'bg-blue-100 text-blue-700';
    };

    const statusIcon = (s: CampaignStatus) => {
        if (s === 'Active') return <Send size={12} />;
        if (s === 'Draft') return <Clock size={12} />;
        return <CheckCircle2 size={12} />;
    };

    return (
        <div className="flex flex-col h-screen overflow-y-auto scrollbar-hide">
            <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between flex-shrink-0">
                <h1 className="text-xl font-bold text-slate-800">Email Campaigns</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
                    <Mail size={16} /> New Campaign
                </button>
            </header>

            <div className="p-4 md:p-8 space-y-6">
                {/* Stats Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                            <Send size={14} /> Total Sent
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{totalSent}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                            <Eye size={14} /> Open Rate
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">{openRate}%</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                            <MousePointerClick size={14} /> Reply Rate
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{replyRate}%</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                            <TrendingUp size={14} /> Campaigns
                        </div>
                        <div className="text-2xl font-bold text-slate-800">{campaigns.length}</div>
                    </div>
                </div>

                {/* Campaign Cards */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">All Campaigns</h2>

                    {campaigns.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                            <Mail size={40} className="mx-auto text-slate-300 mb-3" />
                            <h3 className="text-lg font-medium text-slate-700">No campaigns yet</h3>
                            <p className="text-slate-400 text-sm mt-1">Start by sending an AI-drafted email from the Intelligence Modal.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {campaigns.map(camp => (
                                <div key={camp.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Mail size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{camp.name}</h3>
                                                <p className="text-xs text-slate-400">{camp.date}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusColor(camp.status)}`}>
                                            {statusIcon(camp.status)} {camp.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                                            <div className="text-lg font-bold text-slate-700">{camp.sent}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Sent</div>
                                        </div>
                                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                                            <div className="text-lg font-bold text-emerald-600">{camp.sent > 0 ? Math.round((camp.opened / camp.sent) * 100) : 0}%</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Opened</div>
                                        </div>
                                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                                            <div className="text-lg font-bold text-blue-600">{camp.sent > 0 ? Math.round((camp.replied / camp.sent) * 100) : 0}%</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Replied</div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {camp.sent > 0 && (
                                        <div className="mt-4">
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${Math.round((camp.opened / camp.sent) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Email Activity Log */}
                {emailLogs.length > 0 && (
                    <div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Email Activity</h2>
                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                            {emailLogs.slice(0, 10).map(log => (
                                <div key={log.id} className="px-5 py-3 flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${log.level === 'SUCCESS' ? 'bg-emerald-500' : log.level === 'ERROR' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                    <span className="text-sm text-slate-700 flex-1">{log.message}</span>
                                    <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
