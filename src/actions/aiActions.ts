"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─── Fast Gemini caller — speed-optimized, single attempt ─────────────
async function callGemini(prompt: string, maxTokens = 1024): Promise<string> {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError: Error | null = null;

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: maxTokens,
                    topP: 0.9,
                },
            });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: unknown) {
            lastError = error as Error;
            console.warn(`[Gemini] ${modelName} failed:`, (error as Error).message);
            continue; // Try next model immediately — no delay
        }
    }

    throw lastError || new Error("AI service unavailable");
}

// ─── Robust JSON extraction from AI text ──────────────────────────────
function safeJsonParse<T>(text: string): T {
    // Step 1: Strip markdown code fences
    let cleaned = text.replace(/```(?:json)?\n?/g, '').trim();

    // Step 2: Try direct parse
    try { return JSON.parse(cleaned) as T; } catch { /* proceed to fallback */ }

    // Step 3: Extract first JSON array or object via bracket matching
    const startIdx = cleaned.search(/[\[{]/);
    if (startIdx === -1) throw new Error('No JSON found in AI response');

    const openChar = cleaned[startIdx];
    const closeChar = openChar === '[' ? ']' : '}';
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < cleaned.length; i++) {
        if (cleaned[i] === openChar) depth++;
        else if (cleaned[i] === closeChar) depth--;
        if (depth === 0) { endIdx = i; break; }
    }
    if (endIdx === -1) throw new Error('Malformed JSON in AI response');

    const jsonStr = cleaned.slice(startIdx, endIdx + 1);
    return JSON.parse(jsonStr) as T;
}

export type AIAnalysisResult = {
    score: number;
    temperature: 'Hot' | 'Warm' | 'Lukewarm' | 'Cold';
    tier: '100k_Under' | '101k_500k' | '500k_Plus';
    reasoning: string[];
};

export async function generateLeadScore(businessName: string, revenue: number, industry?: string): Promise<AIAnalysisResult | null> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set. Using heuristic scoring.");
        const score = revenue >= 500000 ? 85 : revenue >= 100000 ? 62 : revenue > 0 ? 38 : 20;
        const temp = score >= 80 ? 'Hot' as const : score >= 60 ? 'Warm' as const : score >= 40 ? 'Lukewarm' as const : 'Cold' as const;
        const tier = revenue >= 500000 ? '500k_Plus' as const : revenue >= 100000 ? '101k_500k' as const : '100k_Under' as const;
        return {
            score, temperature: temp, tier,
            reasoning: [
                `Revenue of $${revenue.toLocaleString()} places this in the ${tier.replace(/_/g, '-')} tier.`,
                `${businessName} in ${industry || 'General'} sector — ${score >= 60 ? 'strong' : 'moderate'} conversion potential.`,
                'Score generated using heuristic model (AI unavailable).'
            ]
        };
    }

    try {
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

        const text = await callGemini(prompt);

        return safeJsonParse<AIAnalysisResult>(text);
    } catch (error) {
        console.error("AI Generation Failed:", error);
        // Return heuristic fallback instead of null
        const score = revenue >= 500000 ? 85 : revenue >= 100000 ? 62 : revenue > 0 ? 38 : 20;
        const temp = score >= 80 ? 'Hot' as const : score >= 60 ? 'Warm' as const : score >= 40 ? 'Lukewarm' as const : 'Cold' as const;
        const tier = revenue >= 500000 ? '500k_Plus' as const : revenue >= 100000 ? '101k_500k' as const : '100k_Under' as const;
        return {
            score, temperature: temp, tier,
            reasoning: [
                `Revenue of $${revenue.toLocaleString()} places this in the ${tier.replace(/_/g, '-')} tier.`,
                `${businessName} in ${industry || 'General'} sector — ${score >= 60 ? 'strong' : 'moderate'} conversion potential.`,
                'Score generated using heuristic model (AI temporarily unavailable).'
            ]
        };
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
    quality?: 'complete' | 'partial' | 'minimal';
};

export async function extractLeadsFromText(rawText: string): Promise<ExtractedLead[] | null> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set.");
        return null;
    }

    // Guard: reject empty or excessively large input
    const trimmed = rawText.trim();
    if (!trimmed) return null;
    if (trimmed.length > 100_000) {
        console.warn(`Input too large (${trimmed.length} chars). Truncating to 100K.`);
    }

    try {
        const prompt = `
      You are an expert Data Extraction AI specializing in MCA (Merchant Cash Advance), broker, and B2B lead data.
      Parse the following data and extract lead information into a structured JSON array.

      INPUT FORMAT AWARENESS — the data may come from:
      • Spreadsheets (CSV, tab-delimited, Google Sheets copy-paste)
      • Emails (forwarded or pasted) — look for From/To/Subject/CC headers, email signatures, and body text
      • Contact lists, CRM exports, or raw text
      • Web pages or scraped content

      EMAIL-SPECIFIC PATTERNS to recognize:
      • "From: Name <email@domain.com>" → extract contact name and email
      • Email signatures: Name, Title, Company, Phone, Email at the bottom of messages
      • "Forwarded message" or "-----Original Message-----" markers
      • Multiple emails in a thread — extract each unique contact
      • "CC:" and "BCC:" fields — extract all email addresses
      • Body mentions of businesses, revenue figures, phone numbers

      COLUMN NAME AWARENESS — the data may use any of these header variations:
      • Business: "DBA", "Legal Name", "Merchant", "Business Name", "Company", "Corp", "Entity"
      • Revenue: "Monthly Vol", "Avg Revenue", "Annual Sales", "Gross Revenue", "Funded Amount", "Volume", "Sales"
      • Phone: "Cell", "Mobile", "Work Phone", "Tel", "Phone Number", "Contact Phone"  
      • Email: "Contact Email", "Email Address", "Owner Email", "E-mail"
      • State: "ST", "State", "Location", "Territory"
      • Industry: "Industry", "SIC", "Business Type", "Sector", "Vertical", "Category"
      • Contact: "Owner", "Principal", "Agent", "Rep", "Contact Name", "Full Name", "Manager", "Person"
      • First Name: "First Name", "First", "FName", "Given Name"
      • Last Name: "Last Name", "Last", "LName", "Surname", "Family Name"

      CRITICAL — NAME MERGING:
      • If the data has SEPARATE "First Name" and "Last Name" columns, you MUST combine them into a single contactName: "John" + "Smith" → "John Smith"
      • Always return the COMPLETE full name (first + last). Never return just a first name if a last name exists.
      • If only a first name is found, still include it — a partial name is better than "Unknown"

      REVENUE NORMALIZATION RULES:
      • "15K/mo" or "$15,000/month" → multiply by 12 → 180000
      • "$500K" or "500k" → 500000
      • "$1.2M" → 1200000
      • "Monthly: $45,000" → multiply by 12 → 540000
      • If only a funded amount (e.g. "$75,000 funded"), use as-is
      • Strip all $, commas, spaces before converting
      • Default to 0 if truly unknown

      DATA QUALITY — for each lead, assess quality:
      • "complete" = has businessName + email + phone + revenue > 0
      • "partial" = has businessName + at least one of (email, phone) 
      • "minimal" = only businessName or very sparse data

      Extract these fields for EACH lead/row/contact found:
      - businessName (string): Company or DBA name
      - email (string): email address, or "unknown" if not found
      - phone (string): phone number, or "unknown" if not found
      - revenue (number): ANNUAL revenue in USD (apply monthly→annual conversion)
      - state (string): US State code (NY, CA, FL). Infer from area code or address if not explicit. "Unknown" if can't determine.
      - industry (string): business type/industry. "Unknown" if not found.
      - contactName (string): FULL name of the owner or contact person (first AND last name). If data has separate first/last columns, merge them. "Unknown" ONLY if no name data exists at all.
      - quality (string): "complete", "partial", or "minimal"

      RAW TEXT TO PARSE:
      """
      ${rawText.slice(0, 50000)} 
      """

      Return ONLY raw JSON array. No markdown, no explanation.
      [
        { "businessName": "...", "email": "...", "phone": "...", "revenue": 180000, "state": "NY", "industry": "Restaurant", "contactName": "John Smith", "quality": "complete" }
      ]
    `;

        const text = await callGemini(prompt);
        const leads = safeJsonParse<ExtractedLead[]>(text);

        // Validate: ensure result is an array
        if (!Array.isArray(leads)) {
            console.error('AI returned non-array:', typeof leads);
            return null;
        }

        return leads;
    } catch (error) {
        console.error("AI Extraction Failed:", error);
        return null;
    }
}

/* ─── URL Scraping ─────────────────────────────────────────────────── */

function isUrl(text: string): boolean {
    const trimmed = text.trim();
    // Single line that looks like a URL
    if (trimmed.includes('\n')) return false;
    return /^https?:\/\/.+/i.test(trimmed);
}

export async function scrapeUrlContent(url: string): Promise<{ text: string; title: string } | null> {
    try {
        const cleanUrl = url.trim();
        if (!isUrl(cleanUrl)) return null;

        const response = await fetch(cleanUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LeadFlowBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml,text/plain,application/json',
            },
            signal: AbortSignal.timeout(15000), // 15s timeout
        });

        if (!response.ok) {
            console.error(`URL fetch failed: ${response.status} ${response.statusText}`);
            return null;
        }

        const contentType = response.headers.get('content-type') || '';
        const raw = await response.text();

        // JSON response — return as-is (could be API data)
        if (contentType.includes('application/json')) {
            return { text: raw.slice(0, 50000), title: cleanUrl };
        }

        // HTML — strip to readable text
        let text = raw;

        // Remove script and style blocks entirely
        text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
        text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
        text = text.replace(/<header[\s\S]*?<\/header>/gi, '');

        // Extract title
        const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : cleanUrl;

        // Convert table cells to tab-separated (preserves tabular data)
        text = text.replace(/<\/th>\s*<th/gi, '\t');
        text = text.replace(/<\/td>\s*<td/gi, '\t');
        text = text.replace(/<\/tr>/gi, '\n');

        // Convert block elements to newlines
        text = text.replace(/<\/(p|div|li|h[1-6]|tr|br)[^>]*>/gi, '\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');

        // Strip remaining HTML tags
        text = text.replace(/<[^>]+>/g, ' ');

        // Decode HTML entities
        text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

        // Clean up whitespace
        text = text.replace(/[ \t]+/g, ' ');
        text = text.replace(/\n\s*\n/g, '\n');
        text = text.split('\n').map(l => l.trim()).filter(Boolean).join('\n');

        return { text: text.slice(0, 50000), title };
    } catch (error) {
        console.error('URL scrape failed:', error);
        return null;
    }
}

/* ─── Smart Import: Unified Processing ─────────────────────────────── */

type ContentType = 'structured' | 'unstructured';

function detectContentType(text: string): ContentType {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return 'unstructured';

    const firstLine = lines[0];

    // Check for tab-delimited or comma-delimited with consistent column counts
    const delim = firstLine.includes('\t') ? '\t' : ',';
    const headerCols = firstLine.split(delim).length;

    // If header has 3+ columns and at least 60% of rows match that column count → structured
    if (headerCols >= 3) {
        const sampleRows = lines.slice(1, Math.min(lines.length, 10));
        const matchingRows = sampleRows.filter(r => {
            const cols = r.split(delim).length;
            return Math.abs(cols - headerCols) <= 1; // allow ±1 column tolerance
        });
        if (matchingRows.length / sampleRows.length >= 0.6) return 'structured';
    }

    return 'unstructured';
}

export type SmartImportResult = {
    leads: ExtractedLead[];
    method: 'ai' | 'csv';
    totalFound: number;
    warnings: string[];
};

export async function processSmartImport(rawText: string): Promise<SmartImportResult> {
    const contentType = detectContentType(rawText);
    const warnings: string[] = [];

    // Input size guard
    if (rawText.trim().length > 100_000) {
        warnings.push('Input truncated to 100K characters for processing.');
    }

    const extractAndDedupe = async (text: string): Promise<ExtractedLead[] | null> => {
        const leads = await extractLeadsFromText(text);
        if (!leads || leads.length === 0) return null;

        // Post-process: assign quality
        const qualityLeads = leads.map(l => ({
            ...l,
            businessName: (l.businessName || '').trim(),
            email: (l.email || '').trim().toLowerCase(),
            phone: (l.phone || '').trim(),
            contactName: (l.contactName || '').trim(),
            quality: l.quality || assessQuality(l),
        }));

        // Deduplicate by business name (case-insensitive)
        const seen = new Set<string>();
        const unique = qualityLeads.filter(l => {
            const key = l.businessName.toLowerCase();
            if (!key || key === 'unknown' || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const dupeCount = qualityLeads.length - unique.length;
        if (dupeCount > 0) warnings.push(`${dupeCount} duplicate lead(s) removed.`);

        return unique;
    };

    if (contentType === 'unstructured') {
        const leads = await extractAndDedupe(rawText);
        if (!leads || leads.length === 0) {
            return { leads: [], method: 'ai', totalFound: 0, warnings: ['AI could not find any lead data in the text. Try pasting data with names, emails, or phone numbers.'] };
        }

        const lowQuality = leads.filter(l => l.quality === 'minimal').length;
        if (lowQuality > 0) warnings.push(`${lowQuality} leads have minimal data (missing most fields).`);

        return { leads, method: 'ai', totalFound: leads.length, warnings };
    }

    // Structured data — try AI extraction for better intelligence
    const leads = await extractAndDedupe(rawText);
    if (leads && leads.length > 0) {
        const lowQuality = leads.filter(l => l.quality === 'minimal').length;
        if (lowQuality > 0) warnings.push(`${lowQuality} leads have minimal data.`);

        return { leads, method: 'ai', totalFound: leads.length, warnings };
    }

    // AI failed — return empty with a message (client will fall back to CSV parse)
    return { leads: [], method: 'csv', totalFound: 0, warnings: ['AI extraction unavailable. File was parsed using column mapping.'] };
}

function assessQuality(lead: ExtractedLead): 'complete' | 'partial' | 'minimal' {
    const hasName = lead.businessName && lead.businessName !== 'Unknown' && lead.businessName !== 'unknown';
    const hasEmail = lead.email && lead.email !== 'unknown' && lead.email !== 'no-email@provided.com';
    const hasPhone = lead.phone && lead.phone !== 'unknown' && lead.phone !== '555-000-0000';
    const hasRevenue = lead.revenue > 0;

    if (hasName && hasEmail && hasPhone && hasRevenue) return 'complete';
    if (hasName && (hasEmail || hasPhone)) return 'partial';
    return 'minimal';
}

export type DeepAnalysisResult = {
    competitors: { name: string; strength: string; weakness: string }[];
    trends: string[];
    opportunities: string[];
    painPoints: string[];
    targetingStrategy: string;
    strategic_advice: string;
};

export async function generateDeepAnalysis(
    businessName: string,
    industry?: string,
    revenue?: number,
    contactName?: string,
    temperature?: string,
    score?: number,
    pipelineStage?: string,
    state?: string,
): Promise<DeepAnalysisResult | null> {
    const ind = industry || 'General Services';
    const revStr = revenue ? '$' + revenue.toLocaleString() : 'Unknown';
    const revenueContext = revenue
        ? revenue >= 500000 ? 'enterprise-level company' : revenue >= 100000 ? 'mid-market business' : 'small business / startup'
        : 'business of unknown scale';

    const fallback: DeepAnalysisResult = {
        competitors: [
            { name: `${ind} Market Leader`, strength: 'Established brand recognition and large customer base', weakness: 'Slower to adapt to emerging digital trends' },
            { name: `Regional ${ind} Provider`, strength: 'Strong local market presence and customer loyalty', weakness: 'Limited geographic reach and scalability' },
            { name: `${ind} Digital Disruptor`, strength: 'Modern tech stack and lower operational costs', weakness: 'Lacks established track record and trust' },
        ],
        trends: [
            `AI-powered automation transforming ${ind.toLowerCase()} operations`,
            'Customer experience and personalization becoming key differentiators',
            'Shift toward subscription and recurring revenue models',
        ],
        opportunities: [
            `Leverage technology to capture underserved ${ind.toLowerCase()} market segments`,
            'Build strategic partnerships to accelerate market penetration',
            'Invest in data-driven decision making for competitive advantage',
        ],
        painPoints: [
            'Manual processes slowing operational efficiency',
            'Difficulty tracking and converting leads at scale',
            'Limited visibility into pipeline performance and forecasting',
        ],
        targetingStrategy: `${businessName} is a ${revenueContext} in ${ind.toLowerCase()}. ${temperature === 'Hot' ? 'They are highly engaged — move fast with a direct proposal and demo.' : temperature === 'Cold' ? 'Approach with pure value-add content. Build trust before any sales conversation.' : 'Nurture with relevant case studies and industry insights before proposing a call.'}`,
        strategic_advice: `Focus on differentiation through superior customer experience and operational efficiency. With ${revStr} in revenue, prioritize high-margin opportunities and build a defensible market position in ${ind.toLowerCase()}.`,
    };

    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set. Using fallback strategy.");
        return fallback;
    }

    try {
        const prompt = `You are a SENIOR STRATEGIC INTELLIGENCE ANALYST providing a precise, data-driven assessment for a sales team.

COMPLETE CLIENT PROFILE:
- Company: ${businessName}
- Contact: ${contactName || 'Unknown'}
- Industry: ${ind}
- Annual Revenue: ${revStr} (${revenueContext})
- Lead Score: ${score || 'N/A'}/100
- Temperature: ${temperature || 'Unknown'}
- Pipeline Stage: ${pipelineStage || 'New'}
- Location: ${state || 'Unknown'}

YOUR TASK — be SPECIFIC to this exact client, not generic:

1. COMPETITORS (exactly 3): Name real companies or specific archetypes that compete directly with a ${revenueContext} in ${ind.toLowerCase()}. Each must have a concrete strength and exploitable weakness.

2. MARKET TRENDS (exactly 3): Current 2025-2026 trends specifically affecting ${ind.toLowerCase()} businesses at the ${revStr} revenue level. Be precise — cite technologies, regulations, or market shifts by name.

3. OPPORTUNITIES (exactly 3): Actionable opportunities for ${businessName} specifically. Reference their revenue tier, location${state ? ' (' + state + ')' : ''}, and industry position.

4. PAIN POINTS (exactly 3): The most likely operational pain points for a ${revenueContext} in ${ind.toLowerCase()}. These should be specific enough that the sales team can reference them in conversation.

5. TARGETING STRATEGY (1 paragraph): Exactly how to approach ${contactName || 'this contact'} at ${businessName}. Factor in their ${temperature || 'Warm'} temperature, ${pipelineStage || 'New'} pipeline stage, and ${revStr} revenue. Be tactical — what to say, what to avoid, what channels to use.

6. STRATEGIC ADVICE (1 paragraph): Growth strategy tailored to ${businessName}'s specific situation — their revenue tier, industry, and competitive position.

RULES:
- Every array MUST have exactly 3 items
- Be SPECIFIC — never use generic placeholder text
- Reference the client's actual data in your analysis
- Keep each item concise (1-2 sentences max)

Return ONLY raw JSON:
{
  "competitors": [{"name": "string", "strength": "string", "weakness": "string"}],
  "trends": ["string", "string", "string"],
  "opportunities": ["string", "string", "string"],
  "painPoints": ["string", "string", "string"],
  "targetingStrategy": "string",
  "strategic_advice": "string"
}`;

        const text = await callGemini(prompt, 1200);
        return safeJsonParse<DeepAnalysisResult>(text);
    } catch (error) {
        console.error("Deep Analysis Failed:", error);
        return fallback;
    }
}

// ─── Email Draft ──────────────────────────────────────────────────────
export type EmailPurpose = 'outreach' | 'follow_up' | 'proposal' | 're_engage' | 'meeting';

export type EmailDraftResult = {
    subject: string;
    body: string;
    tone: string;
    purpose: string;
};

export async function generateEmailDraft(
    businessName: string,
    contactName?: string,
    industry?: string,
    revenue?: number,
    temperature?: 'Hot' | 'Warm' | 'Lukewarm' | 'Cold',
    score?: number,
    purpose?: EmailPurpose,
    pipelineStage?: string,
): Promise<EmailDraftResult | null> {
    const name = contactName || 'there';
    const firstName = contactName ? contactName.split(' ')[0] : 'there';
    const temp = temperature || 'Warm';
    const emailPurpose = purpose || 'outreach';

    const fallbackBody = (() => {
        switch (emailPurpose) {
            case 'follow_up': return `Hi ${firstName},\n\nI wanted to follow up on my earlier message. I understand ${businessName} is busy${industry ? ' in the ' + industry + ' space' : ''}, and I don't want to be a nuisance — just checking if there's a good time to connect.\n\nIf the timing isn't right, no worries at all. I'm happy to reconnect whenever it makes sense.\n\nBest,\n[Your Name]`;
            case 'proposal': return `Hi ${firstName},\n\nBased on our conversations, I've put together some thoughts on how LeadFlow could specifically help ${businessName}${revenue ? ' at your current scale' : ''}.\n\nI'd love to walk you through the details — would a brief call this week work for you?\n\nBest,\n[Your Name]`;
            case 're_engage': return `Hi ${firstName},\n\nIt's been a while since we last connected, and I wanted to check in. A lot has changed in ${industry || 'the market'} recently, and I thought of ${businessName}.\n\nWould you be open to a quick catch-up? No agenda — just curious how things are going.\n\nBest,\n[Your Name]`;
            case 'meeting': return `Hi ${firstName},\n\nI'd love to find 15 minutes to chat about what ${businessName} is working on${industry ? ' in ' + industry : ''}. I have some ideas that might be relevant to your current priorities.\n\nWould any of these times work?\n• [Option 1]\n• [Option 2]\n\nBest,\n[Your Name]`;
            default: return `Hi ${firstName},\n\nI came across ${businessName}${industry ? ' in the ' + industry + ' space' : ''} and was genuinely impressed by what you're building. ${temp === 'Hot' ? 'I think there\'s a real opportunity for us to collaborate — would a quick call this week make sense?' : temp === 'Warm' ? 'I thought our approach to pipeline intelligence might resonate with what you\'re working on.' : temp === 'Cold' ? 'Just wanted to share a quick insight — no strings attached.' : 'Happy to share more if this resonates with your current priorities.'}\n\nBest,\n[Your Name]`;
        }
    })();

    if (!process.env.GEMINI_API_KEY) {
        return {
            subject: emailPurpose === 'follow_up' ? `Following up — ${businessName}` : emailPurpose === 'proposal' ? `Proposal for ${businessName}` : emailPurpose === 'meeting' ? `Quick call — ${businessName}` : `Quick note for ${businessName}`,
            body: fallbackBody,
            tone: temp,
            purpose: emailPurpose,
        };
    }

    const purposeInstructions: Record<EmailPurpose, string> = {
        outreach: `PURPOSE: Initial outreach — first impression matters. 
Reference something specific about their business or industry. Make it clear why you're reaching out specifically to THEM, not a mass email.
${temp === 'Cold' ? 'DO NOT sell. Share a useful insight only.' : temp === 'Hot' ? 'Be direct — propose a call or meeting.' : 'Be consultative — offer value before asking for anything.'}`,
        follow_up: `PURPOSE: Follow-up on a previous message.
Be respectful of their time. Reference the previous outreach. Offer one new piece of value or insight they didn't have before.
Keep it SHORT — under 80 words. Don't repeat the first email's pitch.`,
        proposal: `PURPOSE: Soft proposal — position the value.
You've had some engagement. Now frame a clear value proposition specific to their ${industry || 'business'} at the ${revenue ? '$' + revenue.toLocaleString() + ' revenue level' : 'their scale'}.
Include 2-3 specific benefits. Propose a call to discuss details. Be confident but not pushy.`,
        re_engage: `PURPOSE: Re-engagement — they went quiet.
Be warm and human. Don't guilt-trip. Share something new — an industry insight, a product update, or a relevant case study.
Make it easy to respond: yes/no question or simple CTA.`,
        meeting: `PURPOSE: Meeting request — be specific.
Propose a concrete reason for meeting. Reference their business context. Suggest 2 time options.
Keep it under 80 words. Be direct about what you want to discuss and why it matters to THEM.`,
    };

    const toneGuides: Record<string, string> = {
        Hot: `TONE: Confident, warm, and direct. Score: ${score || '80+'}/100.
They're engaged — be assertive but genuine. Propose a specific next step (call, demo, or meeting).
Use their first name. Write as if you've already had a positive interaction. Match urgency to their engagement.`,
        Warm: `TONE: Professional and consultative. Score: ${score || '50-77'}/100.
Build trust by leading with relevant value specific to their ${industry || 'field'}. Soft CTA — suggest a conversation, not a commitment.
Be helpful first, salesy never.`,
        Lukewarm: `TONE: Curious and helpful. Score: ${score || '28-49'}/100.
Ask a thoughtful question about their business or share one useful insight. Zero pressure.
Goal: earn a reply, not a meeting. Keep it SHORT.`,
        Cold: `TONE: Gentle, value-first. Score: ${score || '<28'}/100.
Share something genuinely useful — a relevant insight, stat, or trend in ${industry || 'their market'}.
NO product pitch. NO CTA beyond "thought you'd find this interesting." Let curiosity do the work.`,
    };

    try {
        const isUnknown = !contactName || businessName.toLowerCase().includes('unknown');

        const prompt = `You are a top-performing B2B sales writer who sounds like a real human, not a bot.

CLIENT:
- Company: ${businessName}
- Contact: ${contactName || 'Business Owner'} (use first name "${firstName}" in greeting)
- Industry: ${industry || 'General'}
- Revenue: ${revenue ? '$' + revenue.toLocaleString() : 'Unknown'}
- Score: ${score || 'N/A'}/100 | Temperature: ${temp}
- Pipeline Stage: ${pipelineStage || 'New'}

${purposeInstructions[emailPurpose]}

${toneGuides[temp]}

TONE × PURPOSE CROSS-MATCH:
The tone controls HOW assertive you are. The purpose controls WHAT you're writing about.
- Hot + Meeting = assertive meeting request with confident language
- Cold + Re-Engage = gentle check-in, zero pressure, share value
- Hot + Re-Engage = confident check-in, propose reconnecting with energy
- Cold + Outreach = share a useful insight only, no ask
Always blend BOTH the tone intensity AND the purpose structure.

PIPELINE CONTEXT:
- Stage "${pipelineStage || 'New'}" means: ${pipelineStage === 'Engagement' ? 'they know who you are — reference prior touchpoints' : pipelineStage === 'Proposal' ? 'they are evaluating — be specific about value' : pipelineStage === 'Negotiation' ? 'they are close to buying — be decisive and clear' : pipelineStage === 'Closed' ? 'they are a client — be warm and relationship-focused' : 'this is a new lead — make a strong first impression'}

${isUnknown ? `IMPORTANT: The contact name or company is generic/unknown. Do NOT pretend to know them or their work. Instead:
- Use "Hi there" as greeting
- Focus on the industry (${industry || 'their field'}) rather than company-specific details
- Keep it shorter than usual — you have less context to work with
` : ''}
WRITING RULES:
1. Under 120 words — every word must earn its place
2. Sound like a real person writing to ONE person — conversational, not corporate
3. NO clichés: no "hope this finds you well", no "I wanted to reach out", no "leverage", no "synergy", no "game-changer", no "touching base", no "circle back"
4. Subject line must be specific and intriguing — would YOU open this email?
5. Reference their actual industry (${industry || 'their field'}) or business context naturally
6. One clear CTA max (or none for Cold tone)
7. Sign off with: "Best,\\n[Your Name]"
8. The body MUST feel different for each tone — Hot emails are 2-3× more assertive than Cold ones

Return ONLY raw JSON:
{"subject": "string", "body": "string", "tone": "${temp}", "purpose": "${emailPurpose}"}`.trim();

        const text = await callGemini(prompt, 800);
        return safeJsonParse<EmailDraftResult>(text);
    } catch (error) {
        console.error("Email Gen Failed:", error);
        return {
            subject: emailPurpose === 'follow_up' ? `Following up — ${businessName}` : emailPurpose === 'proposal' ? `Proposal for ${businessName}` : `Quick note for ${businessName}`,
            body: fallbackBody,
            tone: temp,
            purpose: emailPurpose,
        };
    }
}

