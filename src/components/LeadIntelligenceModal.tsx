import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { generateLeadScore, generateDeepAnalysis, generateEmailDraft, AIAnalysisResult, DeepAnalysisResult, EmailDraftResult } from '../actions/aiActions';
import { sendEmail } from '../actions/emailActions';
import { X, Sparkles, Copy, Check, AlertTriangle, Mail, TrendingUp, Target, Lightbulb, Send } from 'lucide-react';

interface LeadIntelligenceModalProps {
    lead: Lead;
    initialTab: 'strategy' | 'email';
    onClose: () => void;
}

const LeadIntelligenceModal: React.FC<LeadIntelligenceModalProps> = ({ lead, initialTab, onClose }) => {
    const [activeTab, setActiveTab] = useState<'score' | 'strategy' | 'email'>(initialTab === 'strategy' ? 'strategy' : initialTab);
    const [loading, setLoading] = useState(true);
    const [scoreData, setScoreData] = useState<AIAnalysisResult | null>(null);
    const [strategyData, setStrategyData] = useState<DeepAnalysisResult | null>(null);
    const [emailData, setEmailData] = useState<EmailDraftResult | null>(null);

    // UI States
    const [copied, setCopied] = useState(false);
    const [sending, setSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [emailMode, setEmailMode] = useState<'mock' | 'real' | null>(null);

    useEffect(() => {
        const analyze = async () => {
            setLoading(true);
            try {
                if (activeTab === 'score' && !scoreData) {
                    const data = await generateLeadScore(lead.businessName, lead.revenue);
                    setScoreData(data);
                } else if (activeTab === 'strategy' && !strategyData) {
                    const data = await generateDeepAnalysis(lead.businessName, undefined, lead.revenue);
                    setStrategyData(data);
                } else if (activeTab === 'email' && !emailData) {
                    const data = await generateEmailDraft(lead.businessName, undefined, lead.revenue);
                    setEmailData(data);
                }
            } catch (error) {
                console.error("Analysis Error", error);
            } finally {
                setLoading(false);
            }
        };
        analyze();
    }, [activeTab, lead, scoreData, strategyData, emailData]);

    const handleCopy = () => {
        if (!emailData) return;
        const text = `Subject: ${emailData.subject}\n\n${emailData.body}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendEmail = async () => {
        if (!emailData) return;
        setSending(true);
        try {
            const result = await sendEmail(lead.email, emailData.subject, emailData.body);
            if (result.success) {
                setEmailSent(true);
                setEmailMode(result.mode === 'mock' ? 'mock' : 'real');
            }
        } catch (error) {
            console.error(error);
            alert("Failed to send email");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                            <Sparkles size={20} className="text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Lead Intelligence</h3>
                            <p className="text-slate-400 text-xs">AI Analysis for {lead.businessName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 shrink-0">
                    <button onClick={() => setActiveTab('score')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'score' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}>
                        Score
                    </button>
                    <button onClick={() => setActiveTab('strategy')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'strategy' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}>
                        Strategy & Competitors
                    </button>
                    <button onClick={() => setActiveTab('email')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'email' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}>
                        Draft Email
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto min-h-[400px]">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-slate-400 animate-pulse text-sm">Gemini is analyzing {activeTab}...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'score' && scoreData && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-center py-4">
                                        <div className="relative">
                                            <svg className="w-32 h-32 transform -rotate-90">
                                                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                                                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className={`${scoreData.score > 80 ? 'text-emerald-500' : scoreData.score > 50 ? 'text-amber-500' : 'text-red-500'}`} strokeDasharray={351.86} strokeDashoffset={351.86 - (351.86 * scoreData.score) / 100} strokeLinecap="round" />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-3xl font-bold">{scoreData.score}</span>
                                                <span className={`text-[10px] uppercase font-bold ${scoreData.score > 80 ? 'text-emerald-500' : scoreData.score > 50 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                    {scoreData.temperature}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Reasoning</h4>
                                        {scoreData.reasoning?.map((r, i) => (
                                            <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <Check size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                                                <span className="text-sm text-slate-700">{r}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'strategy' && strategyData && (
                                <div className="space-y-6">
                                    {/* Competitors */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Target size={14} /> Competitor Landscape
                                        </h4>
                                        <div className="grid gap-3">
                                            {strategyData.competitors.map((comp, i) => (
                                                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                    <div className="font-bold text-slate-800 text-sm mb-1">{comp.name}</div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="text-emerald-600"><span className="font-bold">Strength:</span> {comp.strength}</div>
                                                        <div className="text-rose-600"><span className="font-bold">Weakness:</span> {comp.weakness}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Trends */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <TrendingUp size={14} /> Market Trends
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {strategyData.trends.map((trend, i) => (
                                                <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100">
                                                    {trend}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Strategic Advice */}
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                        <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Lightbulb size={14} /> Strategic Advice
                                        </h4>
                                        <p className="text-sm text-amber-900 leading-relaxed italic">
                                            "{strategyData.strategic_advice}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'email' && emailData && (
                                <div className="space-y-4 h-full flex flex-col">
                                    {emailSent ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in zoom-in">
                                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
                                                <Send size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-emerald-800 mb-2">Email Sent!</h3>
                                            <p className="text-emerald-600 text-sm max-w-xs">
                                                {emailMode === 'mock'
                                                    ? "This was a MOCK send. Check your server console to see the email content."
                                                    : "The email has been successfully sent to the recipient."}
                                            </p>
                                            <button onClick={() => setEmailSent(false)} className="mt-6 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50">
                                                Send Another
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Subject</label>
                                                <input readOnly value={emailData.subject} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none" />
                                            </div>
                                            <div className="space-y-2 flex-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Message Body</label>
                                                <textarea readOnly value={emailData.body} className="w-full h-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-sm text-slate-600 focus:outline-none resize-none font-mono leading-relaxed"></textarea>
                                            </div>
                                            <div className="flex gap-3 pt-2">
                                                <button onClick={handleCopy} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                                    {copied ? <><Check size={18} /> Copied</> : <><Copy size={18} /> Copy Text</>}
                                                </button>
                                                <button
                                                    onClick={handleSendEmail}
                                                    disabled={sending}
                                                    className="flex-[2] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                                                >
                                                    {sending ? 'Sending...' : <><Send size={18} /> Send Email</>}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeadIntelligenceModal;
