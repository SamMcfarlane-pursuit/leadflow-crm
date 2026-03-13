import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkLeads() {
  const total = await prisma.lead.count();
  const unassigned = await prisma.lead.count({ where: { userId: null as any } });
  
  console.log(`Total Leads: ${total}`);
  console.log(`Unassigned Leads (userId: null): ${unassigned}`);
  
  if (unassigned > 0) {
    const samples = await prisma.lead.findMany({
      where: { userId: null as any },
      take: 5,
      select: { id: true, businessName: true, email: true }
    });
    console.log("Samples of unassigned leads:", JSON.stringify(samples, null, 2));
  }
}

checkLeads()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
