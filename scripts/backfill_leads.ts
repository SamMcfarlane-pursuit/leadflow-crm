import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_USER_ID = 'user_39Q4gI5hwVhSDnun8zaatHQYRDK';

async function backfill() {
  console.log(`Starting backfill for target user: ${TARGET_USER_ID}`);
  
  const unassigned = await prisma.lead.count({ where: { userId: null as any } });
  console.log(`Found ${unassigned} unassigned leads.`);
  
  if (unassigned === 0) {
    console.log("Nothing to backfill.");
    return;
  }
  
  const { count } = await prisma.lead.updateMany({
    where: { userId: null as any },
    data: { userId: TARGET_USER_ID }
  });
  
  console.log(`Successfully assigned ${count} leads to ${TARGET_USER_ID}.`);
  
  const remaining = await prisma.lead.count({ where: { userId: null as any } });
  console.log(`Remaining unassigned leads: ${remaining}`);
}

backfill()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
