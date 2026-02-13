import { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';
import { UserProfile } from '@clerk/nextjs';

export const metadata: Metadata = {
    title: 'Settings | LeadFlow CRM',
};

export default function SettingsPage() {
    return (
        <AppShell>
            <SettingsView />
        </AppShell>
    );
}

function SettingsView() {
    return (
        <div className="p-6 max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#181004' }}>Settings</h1>
                <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>Manage your account and preferences</p>
            </header>

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
        </div>
    );
}
