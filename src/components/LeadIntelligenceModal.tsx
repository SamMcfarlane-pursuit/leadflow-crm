import React, { useState, useEffect, useCallback } from 'react';
import { Lead } from '../types';
import { generateEmailDraft, EmailDraftResult, EmailPurpose, generateSMSDraft, SMSDraftResult, generateCallScript, CallScriptResult } from '../actions/aiActions';
import { sendEmail } from '../actions/emailActions';
import { X, Sparkles, Copy, Check, AlertTriangle, Mail, Send, RefreshCw, FileText, MessageSquare, RotateCcw, Calendar, Phone, Zap } from 'lucide-react';

type ToneType = 'Hot' | 'Warm' | 'Lukewarm' | 'Cold';

const TONE_CONFIG: Record<ToneType, { emoji: string; label: string; description: string; activeStyle: React.CSSProperties; }> = {
    Hot: { emoji: '🔥', label: 'Hot', description: 'Direct — propose a call', activeStyle: { backgroundColor: '#fff1f2', color: '#be123c', borderColor: '#fda4af', boxShadow: '0 0 0 1px #fecdd3' } },
    Warm: { emoji: '🌤', label: 'Warm', description: 'Consultative — soft CTA', activeStyle: { backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fcd34d', boxShadow: '0 0 0 1px #fde68a' } },
    Lukewarm: { emoji: '☁️', label: 'Lukewarm', description: 'Curious — lead with value', activeStyle: { backgroundColor: '#f0f9ff', color: '#0369a1', borderColor: '#7dd3fc', boxShadow: '0 0 0 1px #bae6fd' } },
    Cold: { emoji: '❄️', label: 'Cold', description: 'Gentle — zero pressure', activeStyle: { backgroundColor: '#f1f5f9', color: '#334155', borderColor: '#94a3b8', boxShadow: '0 0 0 1px #cbd5e1' } },
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
    initialTab?: 'email' | 'sms' | 'call';
    onClose: () => void;
}

const LeadIntelligenceModal: React.FC<LeadIntelligenceModalProps> = ({ lead, initialTab = 'email', onClose }) => {
    // Email data
    const [emailData, setEmailData] = useState<EmailDraftResult | null>(null);
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
    const [senderName, setSenderName] = useState('');

    // UI
    const [copied, setCopied] = useState(false);
    const [sending, setSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [emailMode, setEmailMode] = useState<'mock' | 'real' | null>(null);
    const [activeTab, setActiveTab] = useState<'email' | 'sms' | 'call'>(initialTab);
    const [error, setError] = useState<string | null>(null);

    // SMS & Call data
    const [smsData, setSmsData] = useState<SMSDraftResult | null>(null);
    const [smsLoading, setSmsLoading] = useState(false);
    const [callData, setCallData] = useState<CallScriptResult | null>(null);
    const [callLoading, setCallLoading] = useState(false);

    // Load sender info from localStorage on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem('leadflow_sender_email') || '';
        const savedPhone = localStorage.getItem('leadflow_sender_phone') || '';
        const savedName = localStorage.getItem('leadflow_sender_name') || '';
        setSenderEmail(savedEmail);
        setSenderPhone(savedPhone);
        setSenderName(savedName);
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
    const handleSenderNameChange = (val: string) => {
        setSenderName(val);
        localStorage.setItem('leadflow_sender_name', val);
    };

    // Sync editable fields when emailData changes — auto-replace [Your Name]
    useEffect(() => {
        if (emailData) {
            setEditSubject(emailData.subject);
            const name = senderName || localStorage.getItem('leadflow_sender_name') || '';
            const body = name ? emailData.body.replace(/\[Your Name\]/g, name) : emailData.body;
            setEditBody(body);
        }
    }, [emailData, senderName]);

    // Load email draft on mount
    useEffect(() => {
        setEmailLoading(true);
        generateEmailDraft(
            lead.businessName, lead.contactName, lead.industry, lead.revenue,
            selectedTone, lead.score, selectedPurpose, lead.pipelineStage,
        ).then(data => {
            if (data) { setEmailData(data); setDraftCount(1); }
            setEmailLoading(false);
        }).catch(() => setEmailLoading(false));
    }, [lead, selectedTone, selectedPurpose]); 

    // Regenerate drafts based on active tab
    const handleRegenerateDraft = useCallback(async (tone?: ToneType, purpose?: EmailPurpose) => {
        const useTone = tone || selectedTone;
        const usePurpose = purpose || selectedPurpose;
        setError(null);

        if (activeTab === 'email') {
            setDrafting(true);
            try {
                const data = await generateEmailDraft(
                    lead.businessName, lead.contactName, lead.industry, lead.revenue,
                    useTone, lead.score, usePurpose, lead.pipelineStage,
                );
                if (data) { setEmailData(data); setDraftCount(prev => prev + 1); }
            } catch { setError('Failed to regenerate email draft.'); }
            finally { setDrafting(false); }
        } else if (activeTab === 'sms') {
            setSmsLoading(true);
            try {
                const data = await generateSMSDraft(
                    lead.businessName, lead.contactName, lead.industry,
                    useTone, usePurpose
                );
                if (data) setSmsData(data);
            } catch { setError('Failed to regenerate SMS draft.'); }
            finally { setSmsLoading(false); }
        } else if (activeTab === 'call') {
            setCallLoading(true);
            try {
                const data = await generateCallScript(
                    lead.businessName, lead.contactName, lead.industry, useTone
                );
                if (data) setCallData(data);
            } catch { setError('Failed to generate call script.'); }
            finally { setCallLoading(false); }
        }
    }, [lead, selectedTone, selectedPurpose, activeTab]);

    // Effect to auto-load data when switching tabs
    useEffect(() => {
        if (activeTab === 'sms' && !smsData) handleRegenerateDraft();
        if (activeTab === 'call' && !callData) handleRegenerateDraft();
    }, [activeTab, smsData, callData, handleRegenerateDraft]);

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
                    <div className="flex items-center gap-1">
                        {lead.phone && lead.phone !== 'unknown' && lead.phone !== '555-000-0000' && (
                            <>
                                <a href={`tel:${lead.phone}`} className="p-2 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 rounded-full transition-colors" title="Call">
                                    <Phone size={18} />
                                </a>
                                <a href={`sms:${lead.phone}`} className="p-2 hover:bg-violet-500/20 text-slate-300 hover:text-violet-400 rounded-full transition-colors" title="Message">
                                    <MessageSquare size={18} />
                                </a>
                            </>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white ml-2" title="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex px-2 pt-2 bg-slate-900 shrink-0 gap-1 border-t border-slate-800">
                    {[
                        { id: 'email', icon: <Mail size={14} />, label: 'Email Intelligence' },
                        { id: 'sms', icon: <MessageSquare size={14} />, label: 'SMS Outreach' },
                        { id: 'call', icon: <Phone size={14} />, label: 'Lead Scoring Call' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'email' | 'sms' | 'call')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all ${activeTab === tab.id
                                ? 'bg-white text-slate-900'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 bg-amber-50/30 shrink-0">
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-500 fill-amber-500" />
                        <span className="text-[11px] font-bold text-amber-700 uppercase tracking-tight">AI Generated Assistant</span>
                        {(emailLoading || smsLoading || callLoading) && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
                    </div>
                    {activeTab === 'email' && <span className="text-[10px] text-slate-400 font-medium">Draft #{draftCount}</span>}
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto min-h-[440px]">
                    {activeTab === 'email' ? (
                        /* EMAIL TAB CONTENT */
                        emailLoading && !emailData ? (
                            <div className="h-full flex flex-col items-center justify-center py-24 gap-4">
                                <RefreshCw size={32} className="text-amber-500 animate-spin" />
                                <p className="text-slate-400 animate-pulse text-sm">Crafting precision email for {lead.businessName}...</p>
                            </div>
                        ) : emailData && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {emailSent ? (
                                    <div className="flex flex-col items-center justify-center text-center p-12 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-inner">
                                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                                            <Send size={32} className="text-emerald-600" />
                                        </div>
                                        <h3 className="text-2xl font-black text-emerald-800 mb-2">Message Delivered</h3>
                                        <p className="text-emerald-600 text-sm max-w-xs leading-relaxed">
                                            {emailMode === 'mock' ? "[MOCK] Simulation complete. Content logged to terminal." : "Inquiry has been successfully dispatched."}
                                        </p>
                                        <button onClick={() => { setEmailSent(false); handleRegenerateDraft(); }} className="mt-8 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                                            Draft New sequence
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Configuration Row */}
                                        <div className="grid grid-cols-2 gap-4 items-end">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Tone</label>
                                                <div className="flex gap-1">
                                                    {(Object.keys(TONE_CONFIG) as ToneType[]).map(t => {
                                                        const cfg = TONE_CONFIG[t];
                                                        return (
                                                            <button key={t} onClick={() => handleToneChange(t)}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${selectedTone === t ? 'border-transparent' : 'bg-white border-slate-100 text-slate-400'}`}
                                                                style={selectedTone === t ? cfg.activeStyle : {}}
                                                            >
                                                                {cfg.emoji}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign Purpose</label>
                                                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                                    {(Object.keys(PURPOSE_CONFIG) as EmailPurpose[]).map(p => (
                                                        <button key={p} onClick={() => handlePurposeChange(p)}
                                                            className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold transition-all ${selectedPurpose === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            {PURPOSE_CONFIG[p].short}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Editor Area */}
                                        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight ml-1">Subject Line</label>
                                                <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight ml-1">Message Body</label>
                                                <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                                                    className="w-full h-48 bg-white border border-slate-200 rounded-xl px-4 py-4 text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none font-medium" />
                                            </div>
                                        </div>

                                        {/* From info */}
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Signing as</label>
                                                <input value={senderName} onChange={e => handleSenderNameChange(e.target.value)} placeholder="Your Name"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold" />
                                            </div>
                                            <div className="flex-[1.5] space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Sender ID</label>
                                                <input value={senderEmail} onChange={e => handleSenderEmailChange(e.target.value)} placeholder="email@example.com"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium" />
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={handleCopy} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all border ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                                {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy to Clipboard</>}
                                            </button>
                                            <button onClick={handleSendEmail} disabled={sending || !editSubject || !editBody}
                                                className="flex-1 rounded-xl font-black text-sm flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-200 disabled:opacity-50 transition-all transform active:scale-[0.98]">
                                                {sending ? 'Processing...' : <><Send size={16} /> Dispatch Sequence</>}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    ) : activeTab === 'sms' ? (
                        /* SMS TAB CONTENT */
                        smsLoading ? (
                            <div className="h-full flex flex-col items-center justify-center py-24 gap-4">
                                <MessageSquare size={32} className="text-violet-500 animate-bounce" />
                                <p className="text-slate-400 animate-pulse text-sm font-medium">Drafting punchy SMS for {lead.businessName}...</p>
                            </div>
                        ) : smsData && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 flex items-start gap-3">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <Zap size={16} className="text-violet-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-violet-900">SMS Master Draft</h4>
                                        <p className="text-xs text-violet-600 leading-tight">Optimized for high-open rates and direct response. Best sent between 9AM-4PM.</p>
                                    </div>
                                </div>

                                <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Smartphone Preview</span>
                                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[9px] font-bold text-slate-400">160 Chars</span>
                                        </div>
                                        <textarea
                                            value={smsData.message}
                                            onChange={e => setSmsData({ ...smsData, message: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 text-white text-lg font-medium leading-relaxed focus:ring-0 resize-none h-32 scrollbar-hide"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(smsData.message);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-black transition-all border ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-sm'}`}
                                    >
                                        {copied ? <><Check size={18} /> Copied</> : <><Copy size={18} /> Copy Message</>}
                                    </button>
                                    <a
                                        href={`sms:${lead.phone}?&body=${encodeURIComponent(smsData.message)}`}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-violet-600 text-white font-black text-sm hover:bg-violet-700 shadow-xl shadow-violet-100 transition-all transform active:scale-95"
                                    >
                                        <Send size={18} /> Send to Phone
                                    </a>
                                </div>
                            </div>
                        )
                    ) : (
                        /* CALL TAB CONTENT */
                        callLoading ? (
                            <div className="h-full flex flex-col items-center justify-center py-24 gap-4">
                                <Phone size={32} className="text-blue-500 animate-pulse" />
                                <p className="text-slate-400 animate-pulse text-sm font-medium">Strategizing call opener for {lead.businessName}...</p>
                            </div>
                        ) : callData && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-1">
                                        <span className="text-[10px] font-black text-blue-500 uppercase">Target Persona</span>
                                        <p className="text-sm font-bold text-blue-900">{lead.contactName || 'Business Principal'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Industry Pulse</span>
                                        <p className="text-sm font-bold text-slate-800">{lead.industry || 'General Sector'}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { label: 'The Opening Hook', text: callData.opener, color: 'emerald' },
                                        { label: 'The Value Anchor', text: callData.valueProp, color: 'blue' },
                                        { label: 'Handling Resistance', text: callData.handling, color: 'amber' },
                                        { label: 'The Hard CTA', text: callData.cta, color: 'rose' },
                                    ].map((step, idx) => (
                                        <div key={idx} className="group relative pl-8 pb-1 last:pb-0">
                                            <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-100 group-last:bg-transparent" />
                                            <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full border-2 border-slate-300 bg-white" />
                                            <div className="space-y-1.5">
                                                <h5 className={`text-[10px] font-black uppercase tracking-widest text-${step.color}-500`}>{step.label}</h5>
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium bg-white border border-slate-100 p-3 rounded-xl shadow-sm italic peer-hover:border-blue-300 transition-all">
                                                    &quot;{step.text}&quot;
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4">
                                    <a
                                        href={`tel:${lead.phone}`}
                                        className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-3xl bg-blue-600 text-white font-black text-lg hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all transform hover:-translate-y-1 active:scale-95"
                                    >
                                        <Phone size={24} className="fill-white" /> Start Discovery Call
                                    </a>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeadIntelligenceModal;
