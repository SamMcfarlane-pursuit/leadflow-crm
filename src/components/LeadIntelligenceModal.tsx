import React, { useState, useEffect, useCallback } from 'react';
import { Lead } from '../types';
import { generateDeepAnalysis, generateEmailDraft, DeepAnalysisResult, EmailDraftResult, EmailPurpose } from '../actions/aiActions';
import { sendEmail } from '../actions/emailActions';
import { X, Sparkles, Copy, Check, AlertTriangle, Mail, TrendingUp, Target, Lightbulb, Send, RefreshCw, Building2, User, DollarSign, Crosshair, Flame, FileText, MessageSquare, RotateCcw, Calendar, ArrowRight, Phone } from 'lucide-react';

type ToneType = 'Hot' | 'Warm' | 'Lukewarm' | 'Cold';

const TONE_CONFIG: Record<ToneType, { emoji: string; label: string; color: string; description: string }> = {
    Hot: { emoji: '🔥', label: 'Hot', color: 'rose', description: 'Direct — propose a call' },
    Warm: { emoji: '🌤', label: 'Warm', color: 'amber', description: 'Consultative — soft CTA' },
    Lukewarm: { emoji: '☁️', label: 'Lukewarm', color: 'sky', description: 'Curious — lead with value' },
    Cold: { emoji: '❄️', label: 'Cold', color: 'slate', description: 'Gentle — zero pressure' },
};

const PURPOSE_CONFIG: Record<EmailPurpose, { icon: React.ReactNode; label: string; short: string }> = {
    outreach: { icon: <Mail size={13} />, label: 'Initial Outreach', short: 'Outreach' },
    follow_up: { icon: <RotateCcw size={13} />, label: 'Follow-Up', short: 'Follow-Up' },
    proposal: { icon: <FileText size={13} />, label: 'Proposal', short: 'Proposal' },
    re_engage: { icon: <MessageSquare size={13} />, label: 'Re-Engage', short: 'Re-Engage' },
    meeting: { icon: <Calendar size={13} />, label: 'Book Meeting', short: 'Meeting' },
};

interface LeadIntelligenceModalProps {
    lead: Lead;
    initialTab: 'strategy' | 'email';
    onClose: () => void;
}

const LeadIntelligenceModal: React.FC<LeadIntelligenceModalProps> = ({ lead, initialTab, onClose }) => {
    const [activeTab, setActiveTab] = useState<'strategy' | 'email'>(initialTab);

    // Data
    const [strategyData, setStrategyData] = useState<DeepAnalysisResult | null>(null);
    const [emailData, setEmailData] = useState<EmailDraftResult | null>(null);
    const [strategyLoading, setStrategyLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);

    // Email editing
    const [editSubject, setEditSubject] = useState('');
    const [editBody, setEditBody] = useState('');
    const [selectedTone, setSelectedTone] = useState<ToneType>((lead.temperature as ToneType) || 'Warm');
    const [selectedPurpose, setSelectedPurpose] = useState<EmailPurpose>('outreach');
    const [drafting, setDrafting] = useState(false);
    const [draftCount, setDraftCount] = useState(0);

    // Sender info — persisted in localStorage
    const [senderEmail, setSenderEmail] = useState('');
    const [senderPhone, setSenderPhone] = useState('');

    // UI
    const [copied, setCopied] = useState(false);
    const [sending, setSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [emailMode, setEmailMode] = useState<'mock' | 'real' | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load sender info from localStorage on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem('leadflow_sender_email') || '';
        const savedPhone = localStorage.getItem('leadflow_sender_phone') || '';
        setSenderEmail(savedEmail);
        setSenderPhone(savedPhone);
    }, []);

    // Persist sender info on change
    const handleSenderEmailChange = (val: string) => {
        setSenderEmail(val);
        localStorage.setItem('leadflow_sender_email', val);
    };
    const handleSenderPhoneChange = (val: string) => {
        setSenderPhone(val);
        localStorage.setItem('leadflow_sender_phone', val);
    };

    // Sync editable fields when emailData changes
    useEffect(() => {
        if (emailData) {
            setEditSubject(emailData.subject);
            setEditBody(emailData.body);
        }
    }, [emailData]);

    // Load BOTH tabs in parallel on mount — instant switching
    useEffect(() => {
        const loadAll = async () => {
            // Strategy
            setStrategyLoading(true);
            generateDeepAnalysis(
                lead.businessName, lead.industry, lead.revenue,
                lead.contactName, lead.temperature, lead.score,
                lead.pipelineStage, lead.state,
            ).then(data => {
                if (data) setStrategyData(data);
                setStrategyLoading(false);
            }).catch(() => setStrategyLoading(false));

            // Email
            setEmailLoading(true);
            generateEmailDraft(
                lead.businessName, lead.contactName, lead.industry, lead.revenue,
                selectedTone, lead.score, selectedPurpose, lead.pipelineStage,
            ).then(data => {
                if (data) { setEmailData(data); setDraftCount(1); }
                setEmailLoading(false);
            }).catch(() => setEmailLoading(false));
        };
        loadAll();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Regenerate email
    const handleRegenerateDraft = useCallback(async (tone?: ToneType, purpose?: EmailPurpose) => {
        const useTone = tone || selectedTone;
        const usePurpose = purpose || selectedPurpose;
        setDrafting(true);
        setError(null);
        try {
            const data = await generateEmailDraft(
                lead.businessName, lead.contactName, lead.industry, lead.revenue,
                useTone, lead.score, usePurpose, lead.pipelineStage,
            );
            if (data) { setEmailData(data); setDraftCount(prev => prev + 1); }
        } catch { setError('Failed to regenerate. Try again.'); }
        finally { setDrafting(false); }
    }, [lead, selectedTone, selectedPurpose]);

    const handleToneChange = (tone: ToneType) => { setSelectedTone(tone); handleRegenerateDraft(tone); };
    const handlePurposeChange = (purpose: EmailPurpose) => { setSelectedPurpose(purpose); handleRegenerateDraft(undefined, purpose); };

    const handleCopy = () => {
        navigator.clipboard.writeText(`Subject: ${editSubject}\n\n${editBody}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendEmail = async () => {
        if (!editSubject || !editBody) return;
        setSending(true);
        try {
            const result = await sendEmail(lead.email, editSubject, editBody);
            if (result.success) { setEmailSent(true); setEmailMode(result.mode === 'mock' ? 'mock' : 'real'); }
        } catch { alert("Failed to send email"); }
        finally { setSending(false); }
    };

    const fmtRev = (r?: number) => !r ? '—' : r >= 1e6 ? `$${(r / 1e6).toFixed(1)}M` : r >= 1e3 ? `$${(r / 1e3).toFixed(0)}K` : `$${r}`;
    const isLoading = activeTab === 'strategy' ? strategyLoading : emailLoading;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{lead.businessName}</h3>
                            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                                <span>{lead.contactName || 'No contact'}</span>
                                <span>·</span>
                                <span>{lead.industry || 'General'}</span>
                                <span>·</span>
                                <span>{fmtRev(lead.revenue)}</span>
                                {lead.state && <><span>·</span><span>{lead.state}</span></>}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs — only 2 */}
                <div className="flex border-b border-slate-100 shrink-0">
                    <button onClick={() => setActiveTab('strategy')} className={`flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'strategy' ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/40' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Target size={15} /> Strategy
                        {strategyLoading && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                    </button>
                    <button onClick={() => setActiveTab('email')} className={`flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'email' ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/40' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Mail size={15} /> Draft Email
                        {emailLoading && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto min-h-[400px]">
                    {isLoading && !strategyData && !emailData ? (
                        <div className="h-full flex flex-col items-center justify-center py-16 gap-4">
                            <div className="relative">
                                <div className="w-14 h-14 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                                <Sparkles size={16} className="text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-slate-400 animate-pulse text-sm">Analyzing {lead.businessName}...</p>
                        </div>
                    ) : error && !strategyData && !emailData ? (
                        <div className="h-full flex flex-col items-center justify-center py-16 gap-4 text-center">
                            <AlertTriangle size={28} className="text-amber-500" />
                            <p className="text-slate-600 text-sm max-w-xs">{error}</p>
                        </div>
                    ) : (
                        <>
                            {/* ═══ STRATEGY TAB ═══ */}
                            {activeTab === 'strategy' && (strategyLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="w-12 h-12 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                                    <p className="text-slate-400 text-sm animate-pulse">Building strategy...</p>
                                </div>
                            ) : strategyData && (
                                <div className="space-y-5">
                                    {/* Targeting Strategy */}
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200/60">
                                        <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Crosshair size={13} /> How to Approach This Lead
                                        </h4>
                                        <p className="text-sm text-amber-900 leading-relaxed">{strategyData.targetingStrategy}</p>
                                    </div>

                                    {/* Pain Points */}
                                    {strategyData.painPoints && strategyData.painPoints.length > 0 && (
                                        <div>
                                            <h4 className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <Flame size={13} /> Key Pain Points
                                            </h4>
                                            <div className="grid gap-2">
                                                {strategyData.painPoints.map((p, i) => (
                                                    <div key={i} className="flex gap-2.5 items-start p-2.5 bg-rose-50/60 rounded-lg border border-rose-100 text-sm text-rose-800">
                                                        <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                                                        {p}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Competitors */}
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Target size={13} /> Competitors
                                        </h4>
                                        <div className="grid gap-2">
                                            {strategyData.competitors.map((c, i) => (
                                                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                    <div className="font-bold text-slate-800 text-sm mb-1">{c.name}</div>
                                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                        <div className="text-emerald-600"><span className="font-semibold">+</span> {c.strength}</div>
                                                        <div className="text-rose-600"><span className="font-semibold">−</span> {c.weakness}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Trends + Opportunities side by side */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <TrendingUp size={13} /> Trends
                                            </h4>
                                            <div className="space-y-1.5">
                                                {strategyData.trends.map((t, i) => (
                                                    <div key={i} className="text-[11px] text-slate-600 p-2 bg-blue-50/50 rounded-lg border border-blue-100/60">
                                                        <ArrowRight size={10} className="inline mr-1 text-blue-400" />{t}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <Lightbulb size={13} /> Opportunities
                                            </h4>
                                            <div className="space-y-1.5">
                                                {strategyData.opportunities.map((o, i) => (
                                                    <div key={i} className="text-[11px] text-slate-600 p-2 bg-emerald-50/50 rounded-lg border border-emerald-100/60">
                                                        <ArrowRight size={10} className="inline mr-1 text-emerald-400" />{o}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Strategic Advice */}
                                    <div className="bg-slate-900 p-4 rounded-xl text-white">
                                        <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Lightbulb size={13} /> Strategic Advice
                                        </h4>
                                        <p className="text-sm text-slate-300 leading-relaxed">{strategyData.strategic_advice}</p>
                                    </div>
                                </div>
                            ))}

                            {/* ═══ EMAIL TAB ═══ */}
                            {activeTab === 'email' && (emailLoading && !emailData ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="w-12 h-12 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                                    <p className="text-slate-400 text-sm animate-pulse">Drafting email...</p>
                                </div>
                            ) : emailData && (
                                <div className="space-y-3 flex flex-col">
                                    {emailSent ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <Send size={32} className="text-emerald-600 mb-4" />
                                            <h3 className="text-xl font-bold text-emerald-800 mb-2">Email Sent!</h3>
                                            <p className="text-emerald-600 text-sm max-w-xs">
                                                {emailMode === 'mock' ? "MOCK send — check server console." : "Sent successfully."}
                                            </p>
                                            <button onClick={() => { setEmailSent(false); handleRegenerateDraft(); }} className="mt-6 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50">
                                                Draft Another
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Purpose Selector */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Purpose</label>
                                                    <span className="text-[10px] text-slate-400 font-medium">Draft #{draftCount}</span>
                                                </div>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {(Object.keys(PURPOSE_CONFIG) as EmailPurpose[]).map(p => {
                                                        const cfg = PURPOSE_CONFIG[p];
                                                        const active = selectedPurpose === p;
                                                        return (
                                                            <button
                                                                key={p}
                                                                onClick={() => handlePurposeChange(p)}
                                                                disabled={drafting}
                                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${active
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200'
                                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                                    } disabled:opacity-50`}
                                                            >
                                                                {cfg.icon} {cfg.short}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Tone Selector — compact row */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Tone:</span>
                                                <div className="flex gap-1.5">
                                                    {(Object.keys(TONE_CONFIG) as ToneType[]).map(t => {
                                                        const cfg = TONE_CONFIG[t];
                                                        const active = selectedTone === t;
                                                        return (
                                                            <button
                                                                key={t}
                                                                onClick={() => handleToneChange(t)}
                                                                disabled={drafting}
                                                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border ${active
                                                                    ? `bg-${cfg.color}-50 text-${cfg.color}-700 border-${cfg.color}-300 ring-1 ring-${cfg.color}-200`
                                                                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                                                    } disabled:opacity-50`}
                                                                title={cfg.description}
                                                            >
                                                                {cfg.emoji} {cfg.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Drafting overlay */}
                                            {drafting ? (
                                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                                    <RefreshCw size={20} className="text-amber-500 animate-spin" />
                                                    <p className="text-sm text-slate-400 animate-pulse">Regenerating draft...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* From — Sender info */}
                                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">From (Your Info)</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="relative">
                                                                <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    value={senderEmail}
                                                                    onChange={e => handleSenderEmailChange(e.target.value)}
                                                                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all placeholder:text-slate-300"
                                                                    placeholder="your@email.com"
                                                                    type="email"
                                                                />
                                                            </div>
                                                            <div className="relative">
                                                                <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    value={senderPhone}
                                                                    onChange={e => handleSenderPhoneChange(e.target.value)}
                                                                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all placeholder:text-slate-300"
                                                                    placeholder="(555) 123-4567"
                                                                    type="tel"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* To */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">To</label>
                                                        <input readOnly value={`${lead.contactName || lead.businessName} <${lead.email}>`} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 focus:outline-none" />
                                                    </div>

                                                    {/* Subject */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Subject</label>
                                                        <input
                                                            value={editSubject}
                                                            onChange={e => setEditSubject(e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all"
                                                            placeholder="Subject..."
                                                        />
                                                    </div>

                                                    {/* Body */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Message</label>
                                                        <textarea
                                                            value={editBody}
                                                            onChange={e => setEditBody(e.target.value)}
                                                            className="w-full h-44 bg-white border border-slate-200 rounded-lg px-3 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none leading-relaxed transition-all"
                                                            placeholder="Compose..."
                                                        />
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-2 pt-1">
                                                        <button onClick={() => handleRegenerateDraft()} disabled={drafting} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                                                            <RefreshCw size={14} /> Re-draft
                                                        </button>
                                                        <button onClick={handleCopy} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                                            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                                                        </button>
                                                        <button onClick={handleSendEmail} disabled={sending || !editSubject || !editBody} className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all">
                                                            {sending ? 'Sending...' : <><Send size={16} /> Send Email</>}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeadIntelligenceModal;
