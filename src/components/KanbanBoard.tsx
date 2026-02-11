import React from 'react';
import { Lead, PipelineStage } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, CheckCircle2, DollarSign, Activity, Inbox, MessageSquare, FileText, Handshake, Trophy } from 'lucide-react';

interface KanbanBoardProps {
    leads: Lead[];
    onStageChange: (leadId: string, newStage: PipelineStage) => void;
}

const STAGES: PipelineStage[] = ['New', 'Engagement', 'Proposal', 'Negotiation', 'Closed'];

const STAGE_CONFIG: Record<PipelineStage, { color: string; bg: string; icon: React.ReactNode; headerBg: string }> = {
    'New': { color: 'text-slate-600', bg: 'bg-slate-100', icon: <Inbox size={14} />, headerBg: 'bg-gradient-to-r from-slate-50 to-slate-100/80' },
    'Engagement': { color: 'text-blue-600', bg: 'bg-blue-100', icon: <MessageSquare size={14} />, headerBg: 'bg-gradient-to-r from-blue-50 to-sky-50' },
    'Proposal': { color: 'text-amber-600', bg: 'bg-amber-100', icon: <FileText size={14} />, headerBg: 'bg-gradient-to-r from-amber-50 to-orange-50' },
    'Negotiation': { color: 'text-purple-600', bg: 'bg-purple-100', icon: <Handshake size={14} />, headerBg: 'bg-gradient-to-r from-purple-50 to-violet-50' },
    'Closed': { color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <Trophy size={14} />, headerBg: 'bg-gradient-to-r from-emerald-50 to-teal-50' },
};

const TEMP_DOT: Record<string, string> = {
    Hot: 'bg-rose-500',
    Warm: 'bg-amber-500',
    Lukewarm: 'bg-sky-400',
    Cold: 'bg-slate-400',
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onStageChange }) => {
    const columns = STAGES.reduce((acc, stage) => {
        acc[stage] = leads.filter(l => l.pipelineStage === stage || (!l.pipelineStage && stage === 'New'));
        return acc;
    }, {} as Record<PipelineStage, Lead[]>);

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) onStageChange(leadId, stage);
    };

    return (
        <div className="flex h-full overflow-x-auto pb-4 gap-4 px-1 min-w-full">
            {STAGES.map(stage => {
                const config = STAGE_CONFIG[stage];
                const stageRevenue = columns[stage].reduce((s, l) => s + l.revenue, 0);

                return (
                    <div
                        key={stage}
                        className="flex-shrink-0 w-72 flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, stage)}
                    >
                        {/* Column Header */}
                        <div className={`p-4 flex items-center justify-between border-b border-slate-100 ${config.headerBg}`}>
                            <div className="flex items-center gap-2.5">
                                <span className={`p-1.5 rounded-lg ${config.bg} ${config.color}`}>
                                    {config.icon}
                                </span>
                                <div>
                                    <h3 className="font-bold text-slate-700 text-sm">{stage}</h3>
                                    {stageRevenue > 0 && (
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            ${(stageRevenue / 1000).toFixed(0)}K
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                                {columns[stage].length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="flex-1 p-3 overflow-y-auto min-h-[120px] space-y-2.5">
                            <AnimatePresence>
                                {columns[stage].map(lead => (
                                    <motion.div
                                        key={lead.id}
                                        layoutId={lead.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, lead.id)}
                                        className="bg-white p-3.5 rounded-xl border border-slate-200/80 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative"
                                    >
                                        {/* Drag Handle */}
                                        <div className="absolute top-3.5 right-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <GripVertical size={14} />
                                        </div>

                                        <h4 className="font-semibold text-slate-800 text-sm mb-2 pr-5 truncate">{lead.businessName}</h4>

                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full ${TEMP_DOT[lead.temperature] || TEMP_DOT.Cold}`} />
                                                <span className="text-[11px] font-medium text-slate-500">{lead.temperature}</span>
                                            </div>
                                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <Activity size={10} /> {lead.score}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                                            <div className="flex items-center gap-1 text-slate-600 font-semibold text-xs">
                                                <DollarSign size={12} className="text-slate-400" />
                                                {lead.revenue >= 1_000_000
                                                    ? `${(lead.revenue / 1_000_000).toFixed(1)}M`
                                                    : `${(lead.revenue / 1_000).toFixed(0)}K`
                                                }
                                            </div>
                                            {lead.dncStatus === 'SAFE' && (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {columns[stage].length === 0 && (
                                <div className="h-24 border-2 border-dashed border-slate-200/60 rounded-xl flex flex-col items-center justify-center text-slate-300 text-xs text-center p-4 gap-1">
                                    <span className={`${config.color} opacity-40`}>{config.icon}</span>
                                    <span>Drop leads here</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
