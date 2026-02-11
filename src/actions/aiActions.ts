"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export type AIAnalysisResult = {
    score: number;
    temperature: 'Hot' | 'Warm' | 'Lukewarm' | 'Cold';
    tier: '100k_Under' | '101k_500k' | '500k_Plus';
    reasoning: string[];
};

export async function generateLeadScore(businessName: string, revenue: number, industry?: string): Promise<AIAnalysisResult | null> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set. Returning mock data.");
        return null; // Fallback to simulation will be handled by client or here
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
      You are a Senior Venture Capital Analyst and Lead Scorer. 
      Analyze the following lead and provide a scoring assessment.

      Lead Details:
      - Business Name: ${businessName}
      - Annual Revenue: $${revenue.toLocaleString()}
      ${industry ? `- Industry: ${industry}` : ''}

      Task:
      1. Estimate the potential value and viability of this business as a B2B customer.
      2. Assign a Score from 0 to 100.
      3. Determine Temperature: 'Hot' (80+), 'Warm' (60-79), 'Lukewarm' (40-59), or 'Cold' (<40).
      4. Determine Tier: '100k_Under', '101k_500k', or '500k_Plus' based on revenue.
      5. Provide 3 short reasoning bullet points explaining the score.

      Return ONLY raw JSON with no markdown formatting:
      {
        "score": number,
        "temperature": "Hot" | "Warm" | "Lukewarm" | "Cold",
        "tier": "100k_Under" | "101k_500k" | "500k_Plus",
        "reasoning": ["string", "string", "string"]
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString) as AIAnalysisResult;
    } catch (error) {
        console.error("AI Generation Failed:", error);
        return null;
    }
}

export type ExtractedLead = {
    businessName: string;
    email: string;
    phone: string;
    revenue: number;
    state: string;
    industry: string;
    contactName: string;
};

export async function extractLeadsFromText(rawText: string): Promise<ExtractedLead[] | null> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set.");
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
      You are an expert Data Extraction AI specializing in MCA (Merchant Cash Advance), broker, and B2B lead spreadsheets.
      Parse the following data and extract lead information into a structured JSON array.

      COLUMN NAME AWARENESS — the data may use any of these header variations:
      • Business: "DBA", "Legal Name", "Merchant", "Business Name", "Company", "Corp", "Entity"
      • Revenue: "Monthly Vol", "Avg Revenue", "Annual Sales", "Gross Revenue", "Funded Amount", "Volume", "Sales"
      • Phone: "Cell", "Mobile", "Work Phone", "Tel", "Phone Number", "Contact Phone"  
      • Email: "Contact Email", "Email Address", "Owner Email", "E-mail"
      • State: "ST", "State", "Location", "Territory"
      • Industry: "Industry", "SIC", "Business Type", "Sector", "Vertical", "Category"
      • Contact: "Owner", "Principal", "Agent", "Rep", "Contact Name", "First Name + Last Name"

      REVENUE NORMALIZATION RULES:
      • "15K/mo" or "$15,000/month" → multiply by 12 → 180000
      • "$500K" or "500k" → 500000
      • "$1.2M" → 1200000
      • "Monthly: $45,000" → multiply by 12 → 540000
      • If only a funded amount (e.g. "$75,000 funded"), use as-is
      • Strip all $, commas, spaces before converting
      • Default to 0 if truly unknown

      Extract these fields for EACH lead/row found:
      - businessName (string): Company or DBA name
      - email (string): email address, or "unknown" if not found
      - phone (string): phone number, or "unknown" if not found
      - revenue (number): ANNUAL revenue in USD (apply monthly→annual conversion)
      - state (string): US State code (NY, CA, FL). Infer from area code or address if not explicit. "Unknown" if can't determine.
      - industry (string): business type/industry. "Unknown" if not found.
      - contactName (string): owner or contact person name. "Unknown" if not found.

      RAW TEXT TO PARSE:
      """
      ${rawText.slice(0, 30000)} 
      """

      Return ONLY raw JSON array. No markdown, no explanation.
      [
        { "businessName": "...", "email": "...", "phone": "...", "revenue": 180000, "state": "NY", "industry": "Restaurant", "contactName": "John Smith" }
      ]
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString) as ExtractedLead[];
    } catch (error) {
        console.error("AI Extraction Failed:", error);
        return null;
    }
}
export type DeepAnalysisResult = {
    competitors: { name: string; strength: string; weakness: string }[];
    trends: string[];
    opportunities: string[];
    strategic_advice: string;
};

export async function generateDeepAnalysis(businessName: string, industry?: string, revenue?: number): Promise<DeepAnalysisResult | null> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set.");
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
      You are a Strategic Business Consultant.
      Analyze the following business and provide a deep strategic assessment.

      Business: ${businessName}
      ${industry ? `Industry: ${industry}` : ''}
      ${revenue ? `Annual Revenue: $${revenue.toLocaleString()}` : ''}

      Task:
      1. Identify 3 potential direct or indirect competitors (real or archetypal).
      2. Identify 3 key market trends affecting this industry right now.
      3. profound strategic advice for growth.

      Return ONLY raw JSON:
      {
        "competitors": [
          { "name": "string", "strength": "string", "weakness": "string" }
        ],
        "trends": ["string", "string", "string"],
        "opportunities": ["string", "string", "string"],
        "strategic_advice": "string"
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString) as DeepAnalysisResult;
    } catch (error) {
        console.error("Deep Analysis Failed:", error);
        return null;
    }
}

export type EmailDraftResult = {
    subject: string;
    body: string;
    tone: string;
};

export async function generateEmailDraft(
    businessName: string,
    contactName?: string,
    industry?: string,
    revenue?: number,
    temperature?: 'Hot' | 'Warm' | 'Lukewarm' | 'Cold',
    score?: number
): Promise<EmailDraftResult | null> {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    const toneGuides: Record<string, string> = {
        Hot: `TONE: Confident and direct. This is a HIGH-VALUE lead (score ${score || '80+'}). 
They are likely ready to buy. Be professional but assertive. Reference their industry success, propose a quick call or demo. 
Use phrases like "I noticed your growth in...", "Teams like yours typically see...", "Would this week work for a quick 15-min call?"
DO NOT be pushy or use fake urgency. Be genuinely helpful and specific.`,

        Warm: `TONE: Professional and inviting. This is a MID-TIER lead (score ${score || '50-77'}).
They have potential but may need nurturing. Highlight specific, relevant benefits. Use a soft call-to-action.
Use phrases like "I thought this might be relevant to...", "Many businesses in ${industry || 'your space'} are finding...", "Happy to share more if this resonates."
DO NOT be aggressive or assume they need your product. Be consultative.`,

        Lukewarm: `TONE: Curious and low-pressure. This is an EARLY-STAGE lead (score ${score || '28-49'}).
Focus on asking questions and offering value FIRST before pitching. Make it feel like a conversation, not a sales email.
Use phrases like "I'm curious how you currently handle...", "I came across an insight about ${industry || 'your industry'} that...", "No pressure at all — just thought this might be useful."
DO NOT pitch the product directly. Lead with value and curiosity.`,

        Cold: `TONE: Gentle introduction with ZERO sales pressure. This is a COLD lead (score ${score || '<28'}).
This email should share a genuinely useful insight or resource — NO product mention in the body. 
The goal is simply to get on their radar and provide value.
Use phrases like "Hi ${contactName || 'there'}, I came across something about ${industry || 'your field'} that...", "Thought you might find this interesting...", "No reply needed — just sharing in case it's helpful."
DO NOT mention pricing, demos, calls, or your product features. Pure value-add only.`
    };

    const toneInstruction = toneGuides[temperature || 'Warm'];

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
You are a senior B2B relationship builder (NOT a hard-sell salesperson). 
Write a personalized outreach email that matches the tone guide below EXACTLY.

TARGET LEAD:
- Business: ${businessName}
- Contact Name: ${contactName || 'Business Owner'}
- Industry: ${industry || 'General'}
- Annual Revenue: ${revenue ? '$' + revenue.toLocaleString() : 'Unknown'}
- Lead Score: ${score || 'N/A'}/100
- Temperature: ${temperature || 'Warm'}

${toneInstruction}

PRODUCT CONTEXT (use only if tone allows):
"LeadFlow CRM" — AI-powered pipeline management with intelligent lead scoring.

EMAIL RULES:
1. Keep the email under 150 words
2. Use the contact's first name if available
3. Sound human, not robotic — no corporate jargon
4. One clear call-to-action (or none for Cold leads)
5. No fake urgency, no "limited time" language
6. Professional signature: "Best, [Your Name]" 

Return ONLY raw JSON:
{
    "subject": "string",
    "body": "string",
    "tone": "${temperature || 'Warm'}"
}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString) as EmailDraftResult;
    } catch (error) {
        console.error("Email Gen Failed:", error);
        return null;
    }
}
