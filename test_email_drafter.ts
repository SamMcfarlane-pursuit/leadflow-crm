import * as dotenv from 'dotenv';
dotenv.config();

// Mock the Clerk auth function before importing the action
const m = require('module');
const originalRequire = m.prototype.require;
m.prototype.require = function (this: any, path: string) {
    if (path === '@clerk/nextjs/server') {
        return { auth: async () => ({ userId: 'test_user_123' }) };
    }
    return originalRequire.call(this, path);
};

// Now import the action
import { generateEmailDraft } from './src/actions/aiActions';

async function runTests() {
    console.log("=== AI EMAIL DRAFTING TEST SUITE ===");
    console.log("Validating different tones and purposes...\n");

    const testCases = [
        { name: "Hot Meeting", tone: 'Hot', purpose: 'meeting', business: "Acme Corp", contact: "Alice" },
        { name: "Cold Outreach", tone: 'Cold', purpose: 'outreach', business: "Beta Inc", contact: "Bob" },
        { name: "Warm Proposal", tone: 'Warm', purpose: 'proposal', business: "Gamma LLC", contact: "Charlie", revenue: 500000 },
        { name: "Lukewarm Follow-Up", tone: 'Lukewarm', purpose: 'follow_up', business: "Delta Co", contact: "Diana", industry: "SaaS" },
        { name: "Hot Re-Engage", tone: 'Hot', purpose: 're_engage', business: "Epsilon Ltd", contact: "Eve" },
        { name: "Cold Meeting (Unknown)", tone: 'Cold', purpose: 'meeting', business: "Unknown Corp" },
    ];

    for (const tc of testCases) {
        console.log(`\n--- Test Case: ${tc.name} [${tc.tone} / ${tc.purpose}] ---`);
        try {
            const result = await generateEmailDraft(
                tc.business,
                tc.contact,
                tc.industry,
                tc.revenue,
                tc.tone as any,
                undefined,
                tc.purpose as any,
                undefined
            );

            if (!result) {
                console.log("❌ Failed to generate draft (returned null)");
                continue;
            }

            console.log(`Subject: ${result.subject}`);
            console.log(`Body:\n${result.body}\n`);

            const wordCount = result.body.split(/\s+/).length;
            console.log(`Word Count: ${wordCount}`);
            if (wordCount > 120) {
                console.log("⚠️ WARNING: Exceeded 120 word constraint");
            } else {
                console.log("✅ Passed length constraint (under 120 words)");
            }

        } catch (e: any) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

runTests();
