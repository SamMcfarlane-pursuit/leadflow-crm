"use client";

import React, { useState, useMemo } from 'react';
import { useLeads } from '@/context/LeadContext';
import { Search, Filter, CheckCircle2, AlertTriangle, XCircle, Info, Terminal as TermIcon, Cpu } from 'lucide-react';
import { LogEntry } from '@/types';

type LogLevel = 'ALL' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
type LogModule = 'ALL' | 'API' | 'CORE' | 'HUBSPOT' | 'BREVO';

export default function SystemView() {
    const { logs } = useLeads();
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState<LogLevel>('ALL');
    const [moduleFilter, setModuleFilter] = useState<LogModule>('ALL');

    const filteredLogs = useMemo(() => {
        return logs
            .filter(log => {
                if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
                if (moduleFilter !== 'ALL' && log.module !== moduleFilter) return false;
                if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
                return true;
            })
            .slice()
            .reverse();
    }, [logs, levelFilter, moduleFilter, search]);

    const counts = useMemo(() => ({
        total: logs.length,
        success: logs.filter(l => l.level === 'SUCCESS').length,
        warn: logs.filter(l => l.level === 'WARN').length,
        error: logs.filter(l => l.level === 'ERROR').length,
        info: logs.filter(l => l.level === 'INFO').length,
    }), [logs]);

    const levelIcon = (level: LogEntry['level']) => {
        switch (level) {
            case 'SUCCESS': return <CheckCircle2 size={13} className="text-emerald-400" />;
            case 'WARN': return <AlertTriangle size={13} className="text-amber-400" />;
            case 'ERROR': return <XCircle size={13} className="text-red-400" />;
            default: return <Info size={13} className="text-blue-400" />;
        }
    };

    const levelTextColor = (level: LogEntry['level']) => {
        switch (level) {
            case 'SUCCESS': return 'text-emerald-400';
            case 'WARN': return 'text-amber-400';
            case 'ERROR': return 'text-red-400';
            default: return 'text-blue-400';
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Cpu size={20} className="text-slate-400" />
                    <h1 className="text-xl font-bold text-slate-800">System Logs</h1>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-full text-slate-500">{logs.length} events</span>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-8 gap-4">
                {/* Stats Strip */}
                <div className="grid grid-cols-4 gap-3 shrink-0">
                    <button onClick={() => setLevelFilter('ALL')} className={`rounded-xl p-3 border transition-all text-center ${levelFilter === 'ALL' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <div className="text-xl font-bold">{counts.total}</div>
                        <div className="text-[10px] uppercase font-bold opacity-60">Total</div>
                    </button>
                    <button onClick={() => setLevelFilter(levelFilter === 'SUCCESS' ? 'ALL' : 'SUCCESS')} className={`rounded-xl p-3 border transition-all text-center ${levelFilter === 'SUCCESS' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white border-slate-200 hover:bg-emerald-50 text-emerald-600'}`}>
                        <div className="text-xl font-bold">{counts.success}</div>
                        <div className="text-[10px] uppercase font-bold opacity-60">Success</div>
                    </button>
                    <button onClick={() => setLevelFilter(levelFilter === 'WARN' ? 'ALL' : 'WARN')} className={`rounded-xl p-3 border transition-all text-center ${levelFilter === 'WARN' ? 'bg-amber-500 border-amber-400 text-white' : 'bg-white border-slate-200 hover:bg-amber-50 text-amber-600'}`}>
                        <div className="text-xl font-bold">{counts.warn}</div>
                        <div className="text-[10px] uppercase font-bold opacity-60">Warnings</div>
                    </button>
                    <button onClick={() => setLevelFilter(levelFilter === 'ERROR' ? 'ALL' : 'ERROR')} className={`rounded-xl p-3 border transition-all text-center ${levelFilter === 'ERROR' ? 'bg-red-600 border-red-500 text-white' : 'bg-white border-slate-200 hover:bg-red-50 text-red-600'}`}>
                        <div className="text-xl font-bold">{counts.error}</div>
                        <div className="text-[10px] uppercase font-bold opacity-60">Errors</div>
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="flex gap-3 items-center shrink-0">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value as LogModule)}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 focus:outline-none"
                    >
                        <option value="ALL">All Modules</option>
                        <option value="API">API</option>
                        <option value="CORE">Core</option>
                        <option value="HUBSPOT">HubSpot</option>
                        <option value="BREVO">Brevo</option>
                    </select>
                </div>

                {/* Terminal */}
                <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden flex flex-col min-h-0">
                    {/* Terminal Header */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <span className="text-xs text-slate-500 font-mono ml-2 flex items-center gap-1">
                            <TermIcon size={12} /> leadflow-system
                        </span>
                        <span className="ml-auto text-xs text-slate-600">{filteredLogs.length} entries</span>
                    </div>

                    {/* Log Content */}
                    <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
                        {filteredLogs.length === 0 ? (
                            <div className="text-slate-600 py-8 text-center">
                                {logs.length === 0
                                    ? '$ System ready. Waiting for events...'
                                    : '$ No matching logs for current filters.'}
                            </div>
                        ) : (
                            filteredLogs.map(log => (
                                <div key={log.id} className="flex items-start gap-2 py-1 px-2 rounded hover:bg-slate-800/60 transition-colors group">
                                    <span className="text-slate-600 shrink-0 w-[70px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className="shrink-0">{levelIcon(log.level)}</span>
                                    <span className={`shrink-0 w-[52px] font-bold ${levelTextColor(log.level)}`}>[{log.module}]</span>
                                    <span className="text-slate-300">{log.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
