import PipelineView from '@/components/views/PipelineView';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pipeline | LeadFlow V2',
};

export default function PipelinePage() {
    return <PipelineView />;
}
