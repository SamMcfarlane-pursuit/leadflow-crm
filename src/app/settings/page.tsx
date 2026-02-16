import { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';
import SettingsView from '@/components/views/SettingsView';

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
