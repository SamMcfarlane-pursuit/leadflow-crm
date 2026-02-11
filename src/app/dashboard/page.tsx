import DashboardView from '@/components/views/DashboardView';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Command Center | LeadFlow V2',
};

export default function DashboardPage() {
    return <DashboardView />;
}
