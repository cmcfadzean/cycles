import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLERK_USER_ID = "user_37rCuYPrfwXqhUoYl0K8XzRe69g";
const ORGANIZATION_NAME = "My Team";

async function main() {
  console.log("Starting migration...\n");

  // Step 1: Find or create organization for this user
  let organization = await prisma.organization.findUnique({
    where: { clerkUserId: CLERK_USER_ID },
  });

  if (!organization) {
    console.log("Creating organization for user...");
    organization = await prisma.organization.create({
      data: {
        clerkUserId: CLERK_USER_ID,
        name: ORGANIZATION_NAME,
      },
    });
    console.log(`✓ Created organization: ${organization.id}\n`);
  } else {
    console.log(`✓ Found existing organization: ${organization.id}\n`);
  }

  const orgId = organization.id;

  // Step 2: Update all Engineers without an organizationId
  const engineerResult = await prisma.engineer.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId },
  });
  console.log(`✓ Updated ${engineerResult.count} engineers`);

  // Step 3: Update all Product Managers without an organizationId
  const pmResult = await prisma.productManager.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId },
  });
  console.log(`✓ Updated ${pmResult.count} product managers`);

  // Step 4: Update all Product Designers without an organizationId
  const pdResult = await prisma.productDesigner.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId },
  });
  console.log(`✓ Updated ${pdResult.count} product designers`);

  // Step 5: Update all Cycles without an organizationId
  const cycleResult = await prisma.cycle.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId },
  });
  console.log(`✓ Updated ${cycleResult.count} cycles`);

  // Step 6: Update all Pitches without an organizationId
  const pitchResult = await prisma.pitch.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId },
  });
  console.log(`✓ Updated ${pitchResult.count} pitches`);

  console.log("\n✅ Migration complete!");
  console.log(`   Organization ID: ${orgId}`);
  console.log(`   Clerk User ID: ${CLERK_USER_ID}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

