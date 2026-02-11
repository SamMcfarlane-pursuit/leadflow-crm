export type PipelineStage = 'New' | 'Engagement' | 'Proposal' | 'Negotiation' | 'Closed';

export interface Lead {
    id: string;
    email: string;
    phone: string;
    revenue: number;
    businessName: string;
    timestamp: Date;
    tier: TierType;
    temperature: 'Hot' | 'Warm' | 'Lukewarm' | 'Cold';
    score: number;
    dncStatus: 'SAFE' | 'RESTRICTED';
    actions: SystemAction[];
    pipelineStage: PipelineStage;
    state?: string;
    industry?: string;
    contactName?: string;
    logs?: LogEntry[];
    session?: SessionData; // Made optional as it might not always be present
}

export type TierType = '100k_Under' | '101k_500k' | '500k_Plus';

export interface SystemAction {
    type: 'HUBSPOT_SYNC' | 'BREVO_EMAIL' | 'ADMIN_ALERT' | 'DNC_CHECK' | 'TIER_CALC';
    status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'PENDING';
    message: string;
    timestamp: Date;
}

export interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
    message: string;
    module: 'API' | 'CORE' | 'HUBSPOT' | 'BREVO';
}

export interface SimulationConfig {
    mockDncDelay: number;
    mockApiDelay: number;
}

export interface Point {
    x: number;
    y: number;
    timestamp: number;
    type?: 'move' | 'click' | 'stop';
}

export interface SessionData {
    durationSeconds: number;
    mousePath: Point[];
    clicks: Point[];
    hesitations: Point[]; // Where the user "stopped"
    deviceType: 'Desktop' | 'Mobile';
    screenResolution: string;
}
