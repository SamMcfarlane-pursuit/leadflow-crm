import { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
    title: 'Activity Log | LeadFlow CRM',
};

export default function ActivityPage() {
    return (
        <AppShell>
            <ActivityView />
        </AppShell>
    );
}

function ActivityView() {
    return (
        <div className="p-6 max-w-5xl mx-auto">
            <header className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#181004' }}>Activity Log</h1>
                <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>Track all lead interactions and system events</p>
            </header>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(224,159,54,0.1)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e09f36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold mb-1" style={{ color: '#181004' }}>No activity yet</h2>
                    <p className="text-sm max-w-sm" style={{ color: '#8a7a6a' }}>
                        Activity will appear here as you add leads, sync data, and interact with your pipeline.
                    </p>
                </div>
            </div>
        </div>
    );
}
