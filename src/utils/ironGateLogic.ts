import { Lead, TierType, LogEntry, SystemAction, SessionData, Point } from '../types';

// --- SHARED UTILS ---

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const normalizePhone = (phone: string): string => {
    return phone.replace(/[^0-9]/g, '');
};

// --- CONFIGURATION ---
export const COMPLIANCE_CONFIG = {
    // Exact numbers to block (Simulating a database hit)
    blocklist: [
        '999-888-7777',
        '123-456-7890',
        '000-000-0000',
        '888-888-8888'
    ],
    // Patterns/Area codes to block (e.g., test exchanges or premium lines)
    blockedPatterns: [
        '555', // Standard US Test Exchange
        '900', // Premium rate lines
        '976', // Premium rate lines (local)
        '700', // Carrier specific services
        '911', // Emergency services
        '411', // Information services
        '809'  // International spam risk
    ]
};

// --- DOMAIN LOGIC (Ported from Rust) ---

// 1. Revenue Tier Calculator — Unified scoring with proper matching
export const calculateTier = (revenue: number): { tier: TierType; temperature: 'Hot' | 'Warm' | 'Lukewarm' | 'Cold'; score: number; templateId: number } => {
    // --- SCORE: Power curve (MCA-calibrated) ---
    // $25K→34, $50K→42, $85K→49, $179K→58, $450K→72, $850K→84, $1.2M→91, $1.5M→95
    let score: number;
    if (revenue <= 0) {
        score = 5;
    } else {
        score = Math.round(15 * Math.pow(revenue / 10000, 0.42));
        score = Math.min(98, Math.max(5, score));
    }

    // --- TIER: Based on revenue bands ---
    const tier: TierType = revenue > 500000 ? '500k_Plus'
        : revenue > 100000 ? '101k_500k'
            : '100k_Under';

    // --- TEMPERATURE: Derived from score to guarantee match ---
    const temperature: 'Hot' | 'Warm' | 'Lukewarm' | 'Cold' =
        score >= 78 ? 'Hot'
            : score >= 50 ? 'Warm'
                : score >= 28 ? 'Lukewarm'
                    : 'Cold';

    // --- TEMPLATE: Tier-based email template ---
    const templateId = tier === '500k_Plus' ? 3 : tier === '101k_500k' ? 2 : 1;

    return { tier, temperature, score, templateId };
};

// 2. DNC Compliance Check
export const checkDnc = (
    phone: string,
    customBlocklist?: string[]
): { status: 'SAFE' | 'RESTRICTED'; isSafe: boolean; reason?: string; code: 'SAFE' | 'DNC_BLOCK' | 'PATTERN_BLOCK' | 'CUSTOM_BLOCK' } => {
    // REMOVED: Artificial network delay for bulk performance
    // await new Promise((resolve) => setTimeout(resolve, 600));

    const { blocklist, blockedPatterns } = COMPLIANCE_CONFIG;
    const cleanInput = normalizePhone(phone);

    // 1. Check Custom Blocklist (passed dynamically)
    if (customBlocklist && customBlocklist.length > 0) {
        const customMatch = customBlocklist.find(blocked => normalizePhone(blocked) === cleanInput);
        if (customMatch) {
            return {
                status: 'RESTRICTED',
                isSafe: false,
                reason: `Custom Blocklist Match: Number '${customMatch}' flagged by admin`,
                code: 'CUSTOM_BLOCK'
            };
        }
    }

    // 2. Check Global Blocklist (normalizing items in list for comparison)
    const blocklistMatch = blocklist.find(blocked => normalizePhone(blocked) === cleanInput);
    if (blocklistMatch) {
        return {
            status: 'RESTRICTED',
            isSafe: false,
            reason: `Blocklist Match: Number '${blocklistMatch}' found in database`,
            code: 'DNC_BLOCK'
        };
    }

    // 3. Check blocked patterns (normalizing pattern)
    const patternMatch = blockedPatterns.find(pattern => {
        const cleanPattern = normalizePhone(pattern);
        return cleanInput.includes(cleanPattern);
    });

    if (patternMatch) {
        return {
            status: 'RESTRICTED',
            isSafe: false,
            reason: `Pattern Match: Number contains restricted sequence '${patternMatch}'`,
            code: 'PATTERN_BLOCK'
        };
    }

    return { status: 'SAFE', isSafe: true, code: 'SAFE' };
};

// --- SESSION SIMULATION ---

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

const generateMockSession = (revenue: number): SessionData => {
    // simplified session generation for bulk speed - only generate full path if single
    // For now keeping it but we might skip it for bulk if too slow
    // Define simulated form fields coordinates (0-100 scale for simplicity)
    const fields = {
        email: { x: 50, y: 20 },
        business: { x: 50, y: 40 },
        revenue: { x: 50, y: 60 },
        phone: { x: 50, y: 80 },
        submit: { x: 50, y: 95 }
    };

    const path: Point[] = [];
    const clicks: Point[] = [];
    const hesitations: Point[] = [];

    let currentTime = 0;
    let currentPos = { x: 50 + (Math.random() * 40 - 20), y: 0 }; // Start top center-ish

    // Helper to move cursor to a target
    const moveTo = (target: { x: number, y: number }, duration: number, isHesitant: boolean) => {
        const steps = 5; // Reduced steps for performance
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Add some bezier curve randomness
            const noiseX = Math.sin(t * Math.PI) * (Math.random() * 10 - 5);
            const noiseY = Math.sin(t * Math.PI) * (Math.random() * 5);

            const x = lerp(currentPos.x, target.x, t) + noiseX;
            const y = lerp(currentPos.y, target.y, t) + noiseY;

            currentTime += duration / steps;
            path.push({ x, y, timestamp: currentTime, type: 'move' });
        }
        currentPos = target;

        // Simulate interaction
        clicks.push({ x: target.x, y: target.y, timestamp: currentTime, type: 'click' });

        // Simulate hesitation (User thinking)
        if (isHesitant || Math.random() > 0.7) {
            const hesitationTime = 100 + Math.random() * 500; // Faster simulation
            currentTime += hesitationTime;
            hesitations.push({ x: target.x, y: target.y, timestamp: currentTime, type: 'stop' });
        }
    };

    // Simulate filling out form
    moveTo(fields.email, 100, false);
    moveTo(fields.business, 100, false);
    moveTo(fields.revenue, 100, revenue > 100000);
    moveTo(fields.phone, 100, false);
    moveTo(fields.submit, 100, false);

    return {
        durationSeconds: Math.floor(currentTime / 1000),
        mousePath: path,
        clicks,
        hesitations,
        deviceType: Math.random() > 0.8 ? 'Mobile' : 'Desktop',
        screenResolution: '1920x1080'
    };
};


// --- SIMULATION RUNNER ---

export const processLeadSimulation = (
    formData: { email: string; phone: string; revenue: number; businessName: string; state?: string },
    addLog?: (log: LogEntry) => void
): Lead => {
    const leadId = generateId();
    const actions: SystemAction[] = [];

    if (addLog) {
        addLog({
            id: generateId(),
            timestamp: new Date(),
            level: 'INFO',
            module: 'CORE',
            message: `📥 INGEST: ${formData.email} | Rev: $${formData.revenue.toLocaleString()}`
        });
    }

    // 1. Calculate Tier
    const { tier, temperature, score, templateId } = calculateTier(formData.revenue);
    actions.push({
        type: 'TIER_CALC',
        status: 'SUCCESS',
        message: `Classified as ${tier} (${temperature}) - Score: ${score}`,
        timestamp: new Date()
    });

    // 2. DNC Check (Sync now)
    const { status: dncStatus, isSafe, reason, code } = checkDnc(formData.phone);

    if (!isSafe && addLog) {
        addLog({
            id: generateId(),
            timestamp: new Date(),
            level: 'WARN',
            module: 'CORE',
            message: `🚫 DNC HIT: ${formData.phone} Reason: ${reason}`
        });
    } else if (addLog) {
        /* Skip success logs for bulk to prevent spam? keeping for now */
    }

    actions.push({
        type: 'DNC_CHECK',
        status: isSafe ? 'SUCCESS' : 'FAILURE',
        message: isSafe ? `Status: ${dncStatus}` : `Status: ${dncStatus} - ${reason}`,
        timestamp: new Date()
    });

    // 3. Generate Session Data
    const sessionData = generateMockSession(formData.revenue);

    // 4. HubSpot Sync
    if (addLog) {
        addLog({
            id: generateId(),
            timestamp: new Date(),
            level: 'SUCCESS',
            module: 'HUBSPOT',
            message: `✅ HubSpot Sync: ${formData.email} (Status: 201 Created)`
        });
    }
    actions.push({
        type: 'HUBSPOT_SYNC',
        status: 'SUCCESS',
        message: `Synced properties: tier=${tier}, temp=${temperature}, dnc=${dncStatus}`,
        timestamp: new Date()
    });

    // 5. Brevo Trigger
    if (tier === '500k_Plus') {
        if (addLog) {
            addLog({
                id: generateId(),
                timestamp: new Date(),
                level: 'WARN',
                module: 'BREVO',
                message: `🚨 WHALE DETECTED. Triggering Admin Alert (Template 3).`
            });
        }
        actions.push({
            type: 'ADMIN_ALERT',
            status: 'SUCCESS',
            message: 'Admin notified of High Value Target',
            timestamp: new Date()
        });
    } else {
        if (isSafe) {
            actions.push({
                type: 'BREVO_EMAIL',
                status: 'SUCCESS',
                message: `Sent Template ${templateId}`,
                timestamp: new Date()
            });
        } else {
            actions.push({
                type: 'BREVO_EMAIL',
                status: 'SKIPPED',
                message: `DNC Restricted`,
                timestamp: new Date()
            });
        }
    }

    return {
        id: leadId,
        ...formData,
        timestamp: new Date(),
        tier,
        temperature,
        score,
        dncStatus,
        actions,
        session: sessionData,
        pipelineStage: 'New'
    };
};

export const processBatch = (
    leads: { email: string; phone: string; revenue: number; businessName: string; state?: string }[],
): Lead[] => {
    return leads.map(lead => processLeadSimulation(lead));
};
