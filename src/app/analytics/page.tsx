import AnalyticsView from '@/components/views/AnalyticsView';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Analytics | LeadFlow V2',
};

export default function AnalyticsPage() {
    return <AnalyticsView />;
}
