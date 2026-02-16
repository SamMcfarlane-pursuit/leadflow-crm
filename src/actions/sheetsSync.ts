"use server";

import { BulkLeadData, bulkCreateLeads } from './leadActions';
import { revalidatePath } from 'next/cache';

// ─── CONFIG ──────────────────────────────────────────────────────────
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1_box_uFrWDKRLhpRO3Gt789T1XajdzIa3sNqb_Ws4kQ';
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

// Three different Google Sheets CSV export strategies (tried in order)
function getSheetURLs(sheetId: string = SHEET_ID): string[] {
    return [
        // Strategy 1: gviz endpoint (most common)
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`,
        // Strategy 2: direct export endpoint (follows 307 redirect)
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`,
        // Strategy 3: published web endpoint (if sheet is "Published to the web")
        `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=0`,
    ];
}

// Try each URL strategy until one returns valid CSV
async function fetchSheetCSV(sheetId?: string): Promise<{ csv: string | null; error: string | null }> {
    const urls = getSheetURLs(sheetId);
    const errors: string[] = [];

    for (const url of urls) {
        try {
            const response = await fetch(url, {
                next: { revalidate: 0 },
                headers: { 'User-Agent': 'LeadFlow-CRM/1.0' },
                redirect: 'follow',
            });

            if (!response.ok) {
                errors.push(`${response.status} ${response.statusText}`);
                continue; // try next URL
            }

            const text = await response.text();

            // Google returns HTML login page if sheet isn't accessible
            if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
                errors.push('received login page (sheet not publicly shared)');
                continue; // try next URL
            }

            // Verify it looks like CSV (has commas or quoted values)
            if (text.trim().length === 0) {
                errors.push('empty response');
                continue;
            }

            return { csv: text, error: null };
        } catch (err) {
            errors.push(err instanceof Error ? err.message : 'network error');
            continue;
        }
    }

    // All strategies failed
    return {
        csv: null,
        error: `All access methods failed. Make sure the sheet is shared as "Anyone with the link → Viewer". Details: ${errors.join('; ')}`,
    };
}


// ─── CSV PARSER ──────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSV(text: string): string[][] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return lines.map(parseCSVLine);
}

// ─── SCORING ENGINE ──────────────────────────────────────────────────
// Column indices (0-based):
// A=0: Phone Number, B=1: First name, C=2: Last name, D=3: Company
// E=4: Email, F=5: Phone2, G=6: Address, H=7: City, I=8: State
// J=9: Zip, K=10: Time in business, L=11: Monthly revenue
// M=12: Requested amount, N=13: Purpose of Funds

function parseRevenue(raw: string): number {
    const num = parseFloat(raw?.replace(/[^0-9.]/g, '') || '0');
    // Values are in thousands (e.g., "20" = $20,000/month)
    return num * 1000;
}

function parseYearsInBusiness(raw: string): number {
    const match = raw?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

function formatPhone(raw: string): string {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === '1') {
        return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return raw || '';
}

function calculateScore(row: string[]): number {
    const monthlyRev = parseFloat(row[11]?.replace(/[^0-9.]/g, '') || '0');
    const yearsInBiz = parseYearsInBusiness(row[10]);
    const hasEmail = isValidEmail(row[4]);
    const hasPhone = (row[0] || '').replace(/\D/g, '').length >= 10;
    const requestedAmt = parseFloat(row[12]?.replace(/[^0-9.]/g, '') || '0');

    let score = 0;

    // Revenue factor (35%) — monthly rev in thousands
    if (monthlyRev >= 50) score += 35;
    else if (monthlyRev >= 25) score += 28;
    else if (monthlyRev >= 10) score += 20;
    else if (monthlyRev >= 5) score += 12;
    else score += 5;

    // Time in business (25%)
    if (yearsInBiz >= 10) score += 25;
    else if (yearsInBiz >= 5) score += 20;
    else if (yearsInBiz >= 3) score += 15;
    else if (yearsInBiz >= 1) score += 8;
    else score += 3;

    // Valid email (15%)
    if (hasEmail) score += 15;

    // Has phone (10%)
    if (hasPhone) score += 10;

    // Revenue-to-request ratio (15%) — lower ratio = healthier
    if (requestedAmt > 0 && monthlyRev > 0) {
        const ratio = requestedAmt / monthlyRev;
        if (ratio <= 2) score += 15;
        else if (ratio <= 5) score += 10;
        else if (ratio <= 10) score += 5;
        else score += 2;
    } else {
        score += 7; // partial credit
    }

    return Math.min(100, Math.max(0, score));
}

function getTemperature(score: number): 'Hot' | 'Warm' | 'Lukewarm' | 'Cold' {
    if (score >= 78) return 'Hot';
    if (score >= 50) return 'Warm';
    if (score >= 28) return 'Lukewarm';
    return 'Cold';
}

function getTier(revenue: number): '100k_Under' | '101k_500k' | '500k_Plus' {
    const annual = revenue * 12;
    if (annual > 500000) return '500k_Plus';
    if (annual > 100000) return '101k_500k';
    return '100k_Under';
}

function mapPurposeToIndustry(purpose: string): string {
    const p = (purpose || '').toLowerCase();
    if (p.includes('truck') || p.includes('transport') || p.includes('fleet')) return 'Transportation';
    if (p.includes('construct') || p.includes('build')) return 'Construction';
    if (p.includes('restaurant') || p.includes('food')) return 'Food & Beverage';
    if (p.includes('retail') || p.includes('store')) return 'Retail';
    if (p.includes('medical') || p.includes('health') || p.includes('dental')) return 'Healthcare';
    if (p.includes('tech') || p.includes('software') || p.includes('it')) return 'Technology';
    if (p.includes('real estate') || p.includes('property')) return 'Real Estate';
    if (p.includes('work') || p.includes('capital') || p.includes('cash')) return 'Working Capital';
    if (p.includes('equip') || p.includes('machine')) return 'Equipment';
    if (p.includes('expan') || p.includes('grow')) return 'Expansion';
    return 'General';
}

// ─── SHEET ROW → LEAD ───────────────────────────────────────────────
function rowToLead(row: string[]): BulkLeadData | null {
    const company = (row[3] || '').trim();
    if (!company) return null; // skip rows with no company

    const firstName = (row[1] || '').trim();
    const lastName = (row[2] || '').trim();
    const contactName = [firstName, lastName].filter(Boolean).join(' ') || undefined;

    const email = (row[4] || '').trim();
    const phone = formatPhone(row[0]);
    const revenue = parseRevenue(row[11]);
    const state = (row[8] || '').trim() || undefined;
    const industry = mapPurposeToIndustry(row[13]);

    const score = calculateScore(row);
    const temperature = getTemperature(score);
    const tier = getTier(revenue);

    return {
        businessName: company,
        contactName,
        email: isValidEmail(email) ? email : `${company.toLowerCase().replace(/\s+/g, '')}@lead.pending`,
        phone,
        revenue,
        state,
        industry,
        score,
        temperature,
        tier,
        dncStatus: 'SAFE',
        pipelineStage: 'New',
    };
}

// ─── MAIN SYNC FUNCTION ─────────────────────────────────────────────
export type SyncResult = {
    success: boolean;
    totalRows: number;
    imported: number;
    skipped: number;
    error?: string;
    syncedAt: string;
};

export async function syncFromGoogleSheets(
    maxRows: number = 500  // limit for performance; increase for full sync
): Promise<SyncResult> {
    const syncedAt = new Date().toISOString();

    try {
        // Use resilient multi-strategy fetch
        const { csv: csvText, error: fetchError } = await fetchSheetCSV();

        if (!csvText || fetchError) {
            return {
                success: false,
                totalRows: 0,
                imported: 0,
                skipped: 0,
                error: fetchError || 'Failed to fetch sheet data',
                syncedAt,
            };
        }

        const rows = parseCSV(csvText);

        if (rows.length < 2) {
            return {
                success: false,
                totalRows: 0,
                imported: 0,
                skipped: 0,
                error: 'Sheet appears empty (no data rows found)',
                syncedAt,
            };
        }

        // Skip header row (row 0), take up to maxRows
        const dataRows = rows.slice(1, maxRows + 1);
        const leads: BulkLeadData[] = [];
        let skipped = 0;

        for (const row of dataRows) {
            const lead = rowToLead(row);
            if (lead) {
                leads.push(lead);
            } else {
                skipped++;
            }
        }

        // Bulk insert using existing pipeline
        if (leads.length > 0) {
            const CHUNK = 500;
            let totalInserted = 0;

            for (let i = 0; i < leads.length; i += CHUNK) {
                const chunk = leads.slice(i, i + CHUNK);
                const result = await bulkCreateLeads(chunk);
                if (result.success) {
                    totalInserted += result.count;
                }
            }

            revalidatePath('/dashboard');
            revalidatePath('/pipeline');
            revalidatePath('/analytics');

            return {
                success: true,
                totalRows: rows.length - 1,
                imported: totalInserted,
                skipped,
                syncedAt,
            };
        }

        return {
            success: true,
            totalRows: rows.length - 1,
            imported: 0,
            skipped,
            error: 'No valid leads found in sheet',
            syncedAt,
        };

    } catch (error) {
        console.error('Sheets sync error:', error);
        return {
            success: false,
            totalRows: 0,
            imported: 0,
            skipped: 0,
            error: error instanceof Error ? error.message : 'Unknown sync error',
            syncedAt,
        };
    }
}

// ─── SYNC STATUS CHECK ──────────────────────────────────────────────
export async function checkSheetAccess(sheetId?: string): Promise<{ accessible: boolean; rowCount: number; error?: string }> {
    try {
        const { csv, error } = await fetchSheetCSV(sheetId);
        if (!csv || error) {
            return { accessible: false, rowCount: 0, error: error || 'Cannot access sheet' };
        }

        const lines = csv.split('\n').filter(l => l.trim());
        return { accessible: true, rowCount: Math.max(0, lines.length - 1) };
    } catch {
        return { accessible: false, rowCount: 0, error: 'Network error' };
    }
}

// ─── GET CURRENT SHEET ID (for display in Settings) ─────────────────
export async function getConfiguredSheetId(): Promise<string> {
    return SHEET_ID;
}
