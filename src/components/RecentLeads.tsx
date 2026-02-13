import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { Phone, Mail, Ban, CheckCircle2, Search, ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react';
import { useLeads } from '@/context/LeadContext';

interface RecentLeadsProps {
    onViewSession: (lead: Lead) => void;
    onAnalyze: (lead: Lead) => void;
}

type TempFilter = 'All' | 'Hot' | 'Warm' | 'Lukewarm' | 'Cold';

function formatRevenue(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
}

const TEMP_STYLES: Record<string, string> = {
    Hot: 'bg-rose-50 text-rose-700 border-rose-200',
    Warm: 'bg-amber-50 text-amber-700 border-amber-200',
    Lukewarm: 'bg-sky-50 text-sky-700 border-sky-200',
    Cold: 'bg-slate-50 text-slate-600 border-slate-200',
};

const RecentLeads: React.FC<RecentLeadsProps> = ({ onViewSession, onAnalyze }) => {
    const { leads, totalLeads, page, totalPages, isLoading, goToPage, setFilters, filters } = useLeads();

    const [searchInput, setSearchInput] = useState('');
    const [tempFilter, setTempFilter] = useState<TempFilter>('All');
    const [scoreFilter, setScoreFilter] = useState<string>('All');

    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters({
                ...filters,
                search: searchInput || undefined,
                temperature: tempFilter !== 'All' ? tempFilter : undefined,
                minScore: scoreFilter !== 'All' ? Number(scoreFilter) : undefined,
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, tempFilter, scoreFilter]);

    const handleExport = () => {
        if (!leads.length) return;
        const headers = ["Business Name", "Email", "Phone", "Revenue", "Score", "Temperature", "Status", "State", "Date"];
        const csvContent = [
            headers.join(','),
            ...leads.map(lead => [
                `"${lead.businessName}"`, lead.email, lead.phone, lead.revenue,
                lead.score, lead.temperature, lead.dncStatus, lead.state || '',
                new Date(lead.timestamp).toLocaleDateString()
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (totalLeads === 0 && !isLoading) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="mx-auto w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                    <Search size={24} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">No leads yet</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                    Start by adding a single lead or importing a batch to see them here.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Leads</h3>
                        <span className="text-[11px] font-semibold px-2.5 py-1 bg-amber-50 rounded-full text-amber-600 border border-amber-100">
                            {totalLeads.toLocaleString()}
                        </span>
                    </div>
                    <button
                        onClick={handleExport}
                        className="text-xs font-semibold text-slate-500 hover:text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <Download size={12} /> Export CSV
                    </button>
                </div>
                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, email, state..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-300 bg-slate-50/50 transition-all"
                        />
                    </div>
                    <select
                        value={tempFilter}
                        onChange={(e) => setTempFilter(e.target.value as TempFilter)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
                    >
                        <option value="All">All Temps</option>
                        <option value="Hot">🔥 Hot</option>
                        <option value="Warm">🌤 Warm</option>
                        <option value="Lukewarm">☁️ Lukewarm</option>
                        <option value="Cold">❄️ Cold</option>
                    </select>
                    <select
                        value={scoreFilter}
                        onChange={(e) => setScoreFilter(e.target.value)}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${scoreFilter !== 'All'
                            ? scoreFilter === '78' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : scoreFilter === '50' ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : scoreFilter === '28' ? 'bg-sky-50 border-sky-200 text-sky-700'
                                        : 'bg-slate-100 border-slate-200 text-slate-600'
                            : 'bg-white border-slate-200 text-slate-500'
                            }`}
                    >
                        <option value="All">All Scores</option>
                        <option value="78">🔥 78+ Hot</option>
                        <option value="50">🌤 50+ Warm</option>
                        <option value="28">☁️ 28+ Lukewarm</option>
                        <option value="1">❄️ All Scored</option>
                    </select>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-amber-500" />
                    <span className="ml-3 text-sm text-slate-500 font-medium">Loading leads...</span>
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <table className="w-full text-left text-sm table-fixed">
                            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                                <tr>
                                    <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider w-[18%]">Business</th>
                                    <th className="px-2 py-2.5 text-[10px] uppercase tracking-wider w-[12%]">Contact</th>
                                    <th className="px-2 py-2.5 text-[10px] uppercase tracking-wider w-[11%]">Phone</th>
                                    <th className="px-2 py-2.5 text-[10px] uppercase tracking-wider w-[6%]">State</th>
                                    <th className="px-2 py-2.5 text-[10px] uppercase tracking-wider w-[14%]">Status</th>
                                    <th className="px-2 py-2.5 text-[10px] uppercase tracking-wider w-[9%]">Revenue</th>
                                    <th className="px-2 py-2.5 text-[10px] uppercase tracking-wider w-[12%]">Score</th>
                                    <th className="px-2 py-2.5 text-[10px] uppercase tracking-wider text-right w-[18%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {leads.map((lead: Lead) => (
                                    <tr key={lead.id} className="hover:bg-amber-50/30 transition-colors group">
                                        {/* Business */}
                                        <td className="px-3 py-2.5">
                                            <div className="font-semibold text-slate-800 text-xs truncate">{lead.businessName}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{lead.email}</div>
                                            {lead.industry && (
                                                <span className="inline-block mt-0.5 px-1 py-px text-[8px] font-semibold uppercase bg-violet-50 text-violet-500 border border-violet-100 rounded">
                                                    {lead.industry}
                                                </span>
                                            )}
                                        </td>
                                        {/* Contact */}
                                        <td className="px-2 py-2.5">
                                            {lead.contactName ? (
                                                <span className="text-xs text-slate-700 font-medium truncate block">{lead.contactName}</span>
                                            ) : (
                                                <span className="text-[10px] text-slate-300">—</span>
                                            )}
                                        </td>
                                        {/* Phone */}
                                        <td className="px-2 py-2.5">
                                            <span className="text-[11px] text-slate-600 font-mono">{lead.phone}</span>
                                        </td>
                                        {/* State */}
                                        <td className="px-2 py-2.5">
                                            {lead.state ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">{lead.state}</span>
                                            ) : (
                                                <span className="text-[10px] text-slate-300">—</span>
                                            )}
                                        </td>
                                        {/* Status */}
                                        <td className="px-2 py-2.5">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${TEMP_STYLES[lead.temperature] || TEMP_STYLES.Cold}`}>
                                                    {lead.temperature}
                                                </span>
                                                {lead.dncStatus === 'RESTRICTED' && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-red-50 text-red-600 border border-red-200">
                                                        <Ban size={8} /> DNC
                                                    </span>
                                                )}
                                                {lead.dncStatus === 'SAFE' && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                        <CheckCircle2 size={8} /> Safe
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {/* Revenue */}
                                        <td className="px-2 py-2.5">
                                            <span className="text-xs font-semibold text-slate-700">{formatRevenue(lead.revenue)}</span>
                                        </td>
                                        {/* Score */}
                                        <td className="px-2 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-black text-xs border-2 shadow-sm
                                                    ${lead.score >= 78 ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                                        : lead.score >= 50 ? 'bg-amber-50 border-amber-300 text-amber-700'
                                                            : lead.score >= 28 ? 'bg-sky-50 border-sky-300 text-sky-700'
                                                                : 'bg-slate-50 border-slate-300 text-slate-500'}`}>
                                                    {lead.score}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500
                                                                ${lead.score >= 78 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                                    : lead.score >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                                                        : lead.score >= 28 ? 'bg-gradient-to-r from-sky-400 to-sky-500'
                                                                            : 'bg-slate-300'}`}
                                                            style={{ width: `${lead.score}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[8px] font-semibold uppercase
                                                        ${lead.score >= 78 ? 'text-emerald-500'
                                                            : lead.score >= 50 ? 'text-amber-500'
                                                                : lead.score >= 28 ? 'text-sky-500'
                                                                    : 'text-slate-400'}`}>
                                                        {lead.score >= 78 ? 'Hot' : lead.score >= 50 ? 'Warm' : lead.score >= 28 ? 'Lukewarm' : 'Cold'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-2 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => onAnalyze(lead)}
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
                                                    title="Draft Email">
                                                    <Mail size={10} /> Email
                                                </button>
                                                <button
                                                    onClick={() => onViewSession(lead)}
                                                    className="inline-flex items-center px-1.5 py-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                                                    title="View Session">
                                                    <Phone size={10} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3 px-4 py-4">
                        {leads.map((lead: Lead) => (
                            <div key={lead.id} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/80 card-glow">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-slate-800 truncate">{lead.businessName}</h4>
                                        {lead.contactName && (
                                            <p className="text-xs text-slate-600 font-medium mt-0.5">{lead.contactName}</p>
                                        )}
                                        <p className="text-[11px] text-slate-400 mt-0.5">{lead.email}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ml-2 ${TEMP_STYLES[lead.temperature] || TEMP_STYLES.Cold}`}>
                                        {lead.temperature}
                                    </span>
                                </div>
                                {/* Phone + State + Industry row */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono">
                                        <Phone size={11} className="text-slate-400" /> {lead.phone}
                                    </span>
                                    {lead.state && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded uppercase">{lead.state}</span>
                                    )}
                                    {lead.industry && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-violet-50 text-violet-500 border border-violet-100 rounded">{lead.industry}</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-slate-700">{formatRevenue(lead.revenue)}</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-black text-xs border-2 shadow-sm
                                            ${lead.score >= 78 ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                                : lead.score >= 50 ? 'bg-amber-50 border-amber-300 text-amber-700'
                                                    : lead.score >= 28 ? 'bg-sky-50 border-sky-300 text-sky-700'
                                                        : 'bg-slate-50 border-slate-300 text-slate-500'}`}>
                                            {lead.score}
                                        </div>
                                        <div className="w-14 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500
                                                    ${lead.score >= 78 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                        : lead.score >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                                            : lead.score >= 28 ? 'bg-gradient-to-r from-sky-400 to-sky-500'
                                                                : 'bg-slate-300'}`}
                                                style={{ width: `${lead.score}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 border-t border-slate-200/60 pt-3">
                                    <button onClick={() => onAnalyze(lead)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-semibold active:scale-95 transition-transform">
                                        <Mail size={13} /> Email
                                    </button>
                                    <button onClick={() => onViewSession(lead)} className="w-12 flex items-center justify-center bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 active:scale-95 transition-transform">
                                        <Phone size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <span className="text-xs text-slate-500">
                                Page <strong>{page}</strong> of <strong>{totalPages}</strong> · {totalLeads.toLocaleString()} leads
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => goToPage(page - 1)}
                                    disabled={page <= 1}
                                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={14} className="text-slate-600" />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (page <= 3) pageNum = i + 1;
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = page - 2 + i;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => goToPage(pageNum)}
                                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${pageNum === page
                                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => goToPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={14} className="text-slate-600" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RecentLeads;
