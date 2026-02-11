import React from 'react';
import { LogEntry } from '../types';

export const Campaigns = () => (
    <div className="p-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
        Campaign management module coming in V2.1
    </div>
);

export const Terminal = ({ logs }: { logs: LogEntry[] }) => (
    <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 h-[400px] overflow-y-auto">
        {logs.length === 0 && <div className="text-slate-600">System ready. Waiting for events...</div>}
        {logs.slice().reverse().map(log => (
            <div key={log.id} className="mb-1 border-b border-slate-800/50 pb-1">
                <span className="text-slate-500">[{log.timestamp.toLocaleTimeString()}]</span>{' '}
                <span className={log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-amber-400' : 'text-emerald-400'}>
                    [{log.module}]
                </span>{' '}
                {log.message}
            </div>
        ))}
    </div>
);

export const AdminTelemetry = () => null; // Hidden for now
export const SessionReplayModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white p-8 rounded-xl">
            <h3 className="text-lg font-bold">Session Replay</h3>
            <p className="text-slate-500">Simulation replay coming soon.</p>
        </div>
    </div>
);
export const VoiceAssistant = () => null; // Hidden for now
