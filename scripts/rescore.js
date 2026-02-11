// Quick rescore script — run with: node scripts/rescore.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function calculateTier(revenue) {
    let score;
    if (revenue <= 0) {
        score = 5;
    } else {
        score = Math.round(15 * Math.pow(revenue / 10000, 0.42));
        score = Math.min(98, Math.max(5, score));
    }

    const tier = revenue > 500000 ? '500k_Plus'
        : revenue > 100000 ? '101k_500k'
            : '100k_Under';

    const temperature = score >= 78 ? 'Hot'
        : score >= 50 ? 'Warm'
            : score >= 28 ? 'Lukewarm'
                : 'Cold';

    return { tier, temperature, score };
}

async function main() {
    const leads = await prisma.lead.findMany({ select: { id: true, businessName: true, revenue: true, score: true, temperature: true } });
    console.log(`Rescoring ${leads.length} leads...\n`);

    for (const lead of leads) {
        const { tier, temperature, score } = calculateTier(lead.revenue);
        await prisma.lead.update({
            where: { id: lead.id },
            data: { tier, temperature, score },
        });
        console.log(`  ${lead.businessName}: $${lead.revenue.toLocaleString()} → Score ${score} (${temperature}) [was ${lead.score}/${lead.temperature}]`);
    }

    console.log(`\n✅ Rescored ${leads.length} leads.`);
    await prisma.$disconnect();
}

main().catch(console.error);
