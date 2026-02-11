import { Lead } from '../types';

export interface LeadScore {
    score: number;
    reasoning: string[];
    tier: 'High' | 'Medium' | 'Low';
}

export interface EmailDraft {
    subject: string;
    body: string;
}

// ADVANCED LOGIC ENGINE
const assessIndustry = (businessName: string): string => {
    const lower = businessName.toLowerCase();
    if (lower.includes('tech') || lower.includes('soft') || lower.includes('data') || lower.includes('cyber')) return 'Technology';
    if (lower.includes('logistic') || lower.includes('transport') || lower.includes('freight') || lower.includes('ship')) return 'Logistics';
    if (lower.includes('health') || lower.includes('med') || lower.includes('clinic') || lower.includes('care')) return 'Healthcare';
    if (lower.includes('construct') || lower.includes('build') || lower.includes('contract')) return 'Construction';
    if (lower.includes('bakery') || lower.includes('food') || lower.includes('cafe') || lower.includes('rest')) return 'Hospitality';
    return 'General Business';
};

const simulateLeadScore = async (lead: Lead): Promise<LeadScore> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let score = 40; // Base Score
            const reasoning: string[] = [];
            const industry = assessIndustry(lead.businessName);

            // 1. REVENUE EVALUATION
            if (lead.revenue > 5000000) {
                score += 40;
                reasoning.push(`💰 Enterprise-grade revenue ($${(lead.revenue / 1000000).toFixed(1)}M)`);
            } else if (lead.revenue > 1000000) {
                score += 25;
                reasoning.push(`Previous year revenue strong ($${(lead.revenue / 1000000).toFixed(1)}M)`);
            } else if (lead.revenue < 100000) {
                score -= 10;
                reasoning.push("⚠️ Early-stage revenue (<$100k)");
            }

            // 2. INDUSTRY FIT
            if (['Technology', 'Logistics', 'Healthcare'].includes(industry)) {
                score += 15;
                reasoning.push(`🚀 High-growth sector detected: ${industry}`);
            } else if (industry === 'Hospitality') {
                score -= 5;
                reasoning.push(`📉 Lower margin sector: ${industry}`);
            }

            // 3. COMPLIANCE & RISK
            if (lead.dncStatus === 'SAFE') {
                score += 10;
                reasoning.push("✅ DNC Safe - Ready for immediate call");
            } else {
                score -= 30; // Heavy penalty for DNC in v2
                reasoning.push("⛔ DNC Restricted - Email only");
            }

            // Cap score
            const finalScore = Math.max(0, Math.min(100, score));

            resolve({
                score: finalScore,
                reasoning,
                tier: finalScore > 80 ? 'High' : finalScore > 50 ? 'Medium' : 'Low'
            });
        }, 1200);
    });
};

const simulateEmailDraft = async (lead: Lead): Promise<EmailDraft> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const industry = assessIndustry(lead.businessName);
            const isHighValue = lead.revenue > 1000000;

            // TEMPLATE SELECTION
            let subject = `Question regarding ${lead.businessName}`;
            let focus = "growth";

            if (industry === 'Logistics') {
                subject = `Streamlining freight ops at ${lead.businessName}`;
                focus = "supply chain efficiency";
            } else if (industry === 'Technology') {
                subject = `Scaling dev capacity for ${lead.businessName}`;
                focus = "technical resource optimization";
            } else if (industry === 'Construction') {
                subject = `Project pipeline for ${lead.businessName}`;
                focus = "contract management";
            } else if (isHighValue) {
                subject = `Strategic Partnership: LeadFlow x ${lead.businessName}`;
                focus = "enterprise revenue operations";
            }

            resolve({
                subject: subject,
                body: `Hi Team at ${lead.businessName},

I've been following your work in the ${industry} space and noticed the impressive traction you've gained${isHighValue ? " (passing the $" + (lead.revenue / 1000000).toFixed(1) + "M mark is no small feat)" : ""}.

Given your focus on ${focus}, I suspect you might be looking for ways to maximize lead conversion without increasing headcount.

At LeadFlow, we help ${industry} companies automate their pipeline.${lead.dncStatus === 'RESTRICTED' ? " (Note: Our system handles DNC compliance automatically, so you never have to worry about regulatory risks)." : ""}

Are you open to a brief 15-minute demo to see how we could add 20% to your bottom line this quarter?

Best,
Samuel
LeadFlow Growth Team`
            });
        }, 1500);
    });
};

// MAIN SERVICE
export const aiService = {
    augmentLead: async (lead: Lead) => {
        // TODO: Switch to real Gemini API if key is present
        const score = await simulateLeadScore(lead);
        const email = await simulateEmailDraft(lead);
        return { score, email };
    },

    getScore: simulateLeadScore,
    getDraft: simulateEmailDraft
};
