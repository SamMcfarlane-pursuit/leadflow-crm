"use client";

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@clerk/nextjs';
import { checkSheetAccess, getConfiguredSheetId } from '@/actions/sheetsSync';
import { CloudDownload, CheckCircle2, XCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

export default function SettingsView() {
    const [sheetId, setSheetId] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
    const [rowCount, setRowCount] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Load current sheet ID on mount
    useEffect(() => {
        const loadSheetId = async () => {
            const id = await getConfiguredSheetId();
            setSheetId(id);
        };
        loadSheetId();
    }, []);

    const handleTestConnection = async () => {
        setConnectionStatus('testing');
        setErrorMessage('');
        try {
            const result = await checkSheetAccess();
            if (result.accessible) {
                setConnectionStatus('connected');
                setRowCount(result.rowCount);
            } else {
                setConnectionStatus('error');
                setErrorMessage(result.error || 'Cannot access sheet');
            }
        } catch {
            setConnectionStatus('error');
            setErrorMessage('Network error — check your internet connection');
        }
    };

    const sheetUrl = sheetId
        ? `https://docs.google.com/spreadsheets/d/${sheetId}`
        : '';

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#181004' }}>Settings</h1>
                <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>Manage your account, integrations, and preferences</p>
            </header>

            {/* ─── GOOGLE SHEETS INTEGRATION ─── */}
            <section
                className="rounded-2xl border p-6 space-y-5"
                style={{
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    borderColor: 'rgba(224,159,54,0.15)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34a853 0%, #0f9d58 100%)' }}>
                        <CloudDownload size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Google Sheets Integration</h2>
                        <p className="text-xs text-slate-400">Sync lead data from your spreadsheet</p>
                    </div>

                    {/* Status badge */}
                    <div className="ml-auto">
                        {connectionStatus === 'connected' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
                                <CheckCircle2 size={12} /> Connected
                            </span>
                        )}
                        {connectionStatus === 'error' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#b91c1c' }}>
                                <XCircle size={12} /> Disconnected
                            </span>
                        )}
                    </div>
                </div>

                {/* Sheet ID Display */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sheet ID</label>
                    <div className="flex items-center gap-2">
                        <div
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono truncate"
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.03)',
                                border: '1px solid rgba(0,0,0,0.06)',
                                color: '#475569',
                            }}
                        >
                            {sheetId || 'Loading...'}
                        </div>
                        {sheetUrl && (
                            <a
                                href={sheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                                style={{
                                    backgroundColor: 'rgba(34,168,83,0.08)',
                                    color: '#15803d',
                                    border: '1px solid rgba(34,168,83,0.2)',
                                }}
                            >
                                <ExternalLink size={12} /> Open Sheet
                            </a>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                        Set via <code className="px-1 py-0.5 rounded bg-slate-100 text-[10px]">GOOGLE_SHEET_ID</code> environment variable. Default sheet is pre-configured.
                    </p>
                </div>

                {/* Test Connection */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleTestConnection}
                        disabled={connectionStatus === 'testing'}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                        style={{
                            background: connectionStatus === 'testing'
                                ? 'rgba(0,0,0,0.04)'
                                : 'linear-gradient(to right, #e09f36, #c8891e)',
                            color: connectionStatus === 'testing' ? '#64748b' : '#fff',
                            boxShadow: connectionStatus === 'testing' ? 'none' : '0 2px 8px rgba(224,159,54,0.25)',
                        }}
                    >
                        {connectionStatus === 'testing' ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <RefreshCw size={14} />
                        )}
                        {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                    </button>

                    {connectionStatus === 'connected' && (
                        <span className="text-sm text-emerald-600 font-medium">
                            ✓ {rowCount} data row{rowCount !== 1 ? 's' : ''} found
                        </span>
                    )}
                </div>

                {/* Error Message */}
                {connectionStatus === 'error' && errorMessage && (
                    <div
                        className="px-4 py-3 rounded-xl text-sm"
                        style={{
                            backgroundColor: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.15)',
                            color: '#b91c1c',
                        }}
                    >
                        <p className="font-medium mb-1">Connection failed</p>
                        <p className="text-xs opacity-80">{errorMessage}</p>
                    </div>
                )}

                {/* Access Requirements */}
                <div
                    className="px-4 py-3 rounded-xl text-xs space-y-1"
                    style={{
                        backgroundColor: 'rgba(224,159,54,0.04)',
                        border: '1px solid rgba(224,159,54,0.1)',
                        color: '#8a7a6a',
                    }}
                >
                    <p className="font-semibold text-slate-600">Access Requirements</p>
                    <ul className="space-y-0.5 list-disc list-inside">
                        <li>Sheet must be shared as <strong>&quot;Anyone with the link → Viewer&quot;</strong></li>
                        <li>LeadFlow tries 3 access methods automatically (gviz, export, pub)</li>
                        <li>If all fail, check your sheet&apos;s sharing settings</li>
                    </ul>
                </div>
            </section>

            {/* ─── CLERK PROFILE ─── */}
            <section>
                <div className="flex justify-center">
                    <UserProfile
                        routing="hash"
                        appearance={{
                            elements: {
                                rootBox: "w-full max-w-3xl",
                                card: "shadow-none border border-slate-200/60 rounded-2xl bg-white/80 backdrop-blur-sm",
                                navbarButton: "text-sm font-medium",
                                formButtonPrimary: "rounded-xl font-semibold shadow-none",
                                formFieldInput: "rounded-xl border-slate-200",
                            },
                            variables: {
                                colorPrimary: '#e09f36',
                                borderRadius: '0.75rem',
                            },
                        }}
                    />
                </div>
            </section>
        </div>
    );
}
