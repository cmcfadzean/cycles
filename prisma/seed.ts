import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clean existing data
  await prisma.assignment.deleteMany();
  await prisma.engineerCycleCapacity.deleteMany();
  await prisma.pitch.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.engineer.deleteMany();

  // Create Engineers
  const engineers = await Promise.all([
    prisma.engineer.create({
      data: { name: "Alice Chen", email: "alice@company.com" },
    }),
    prisma.engineer.create({
      data: { name: "Bob Martinez", email: "bob@company.com" },
    }),
    prisma.engineer.create({
      data: { name: "Carol Johnson", email: "carol@company.com" },
    }),
    prisma.engineer.create({
      data: { name: "David Kim", email: "david@company.com" },
    }),
    prisma.engineer.create({
      data: { name: "Eva Patel", email: "eva@company.com" },
    }),
    prisma.engineer.create({
      data: { name: "Frank Wilson", email: "frank@company.com" },
    }),
    prisma.engineer.create({
      data: { name: "Grace Lee", email: "grace@company.com" },
    }),
    prisma.engineer.create({
      data: { name: "Henry Brown", email: "henry@company.com" },
    }),
  ]);

  console.log(`✅ Created ${engineers.length} engineers`);

  // Create Cycle
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + 42); // 6 weeks

  const cycle = await prisma.cycle.create({
    data: {
      name: "Q1 2024 - Cycle 1",
      startDate,
      endDate,
      description:
        "First cycle of the year. Focus on performance improvements and new user features.",
    },
  });

  console.log(`✅ Created cycle: ${cycle.name}`);

  // Create Capacities for Engineers in this Cycle
  const capacityData = [
    { engineer: engineers[0], weeks: 6 }, // Alice - full capacity
    { engineer: engineers[1], weeks: 5.5 }, // Bob - some PTO
    { engineer: engineers[2], weeks: 6 }, // Carol - full
    { engineer: engineers[3], weeks: 4 }, // David - part-time
    { engineer: engineers[4], weeks: 5 }, // Eva - some PTO
    { engineer: engineers[5], weeks: 6 }, // Frank - full
    { engineer: engineers[6], weeks: 5.5 }, // Grace - some PTO
    { engineer: engineers[7], weeks: 4.5 }, // Henry - part-time + PTO
  ];

  const capacities = await Promise.all(
    capacityData.map(({ engineer, weeks }) =>
      prisma.engineerCycleCapacity.create({
        data: {
          engineerId: engineer.id,
          cycleId: cycle.id,
          availableWeeks: weeks,
        },
      })
    )
  );

  console.log(`✅ Created ${capacities.length} capacity records`);

  // Create Pitches
  const pitches = await Promise.all([
    prisma.pitch.create({
      data: {
        cycleId: cycle.id,
        title: "Performance Dashboard Overhaul",
        pitchDocUrl: "https://docs.example.com/pitch/perf-dashboard",
        estimateWeeks: 8,
        status: "PLANNED",
        priority: 1,
        notes: "Critical for enterprise customers. Need metrics visualization.",
      },
    }),
    prisma.pitch.create({
      data: {
        cycleId: cycle.id,
        title: "User Onboarding Flow v2",
        pitchDocUrl: "https://docs.example.com/pitch/onboarding-v2",
        estimateWeeks: 6,
        status: "PLANNED",
        priority: 2,
        notes: "Reduce time-to-first-value by 40%.",
      },
    }),
    prisma.pitch.create({
      data: {
        cycleId: cycle.id,
        title: "API Rate Limiting",
        pitchDocUrl: "https://docs.example.com/pitch/rate-limiting",
        estimateWeeks: 4,
        status: "PLANNED",
        priority: 3,
        notes: "Security requirement for SOC2 compliance.",
      },
    }),
    prisma.pitch.create({
      data: {
        cycleId: cycle.id,
        title: "Mobile Push Notifications",
        pitchDocUrl: "https://docs.example.com/pitch/push-notif",
        estimateWeeks: 5,
        status: "PLANNED",
        priority: 4,
      },
    }),
    prisma.pitch.create({
      data: {
        cycleId: cycle.id,
        title: "Search Improvements",
        pitchDocUrl: "https://docs.example.com/pitch/search",
        estimateWeeks: 7,
        status: "PLANNED",
        priority: 5,
        notes: "Elasticsearch integration and fuzzy matching.",
      },
    }),
    prisma.pitch.create({
      data: {
        cycleId: cycle.id,
        title: "Billing System Migration",
        pitchDocUrl: "https://docs.example.com/pitch/billing",
        estimateWeeks: 6,
        status: "PLANNED",
        priority: 6,
        notes: "Move from Stripe v1 to v3 API.",
      },
    }),
  ]);

  console.log(`✅ Created ${pitches.length} pitches`);

  // Create some sample Assignments
  const assignments = await Promise.all([
    // Performance Dashboard - Alice and Bob
    prisma.assignment.create({
      data: {
        cycleId: cycle.id,
        engineerId: engineers[0].id, // Alice
        pitchId: pitches[0].id, // Perf Dashboard
        weeksAllocated: 4,
      },
    }),
    prisma.assignment.create({
      data: {
        cycleId: cycle.id,
        engineerId: engineers[1].id, // Bob
        pitchId: pitches[0].id, // Perf Dashboard
        weeksAllocated: 3,
      },
    }),
    // User Onboarding - Carol
    prisma.assignment.create({
      data: {
        cycleId: cycle.id,
        engineerId: engineers[2].id, // Carol
        pitchId: pitches[1].id, // Onboarding
        weeksAllocated: 4,
      },
    }),
    // API Rate Limiting - David
    prisma.assignment.create({
      data: {
        cycleId: cycle.id,
        engineerId: engineers[3].id, // David
        pitchId: pitches[2].id, // Rate Limiting
        weeksAllocated: 3,
      },
    }),
  ]);

  console.log(`✅ Created ${assignments.length} assignments`);

  // Summary
  const totalCapacity = capacityData.reduce((sum, c) => sum + c.weeks, 0);
  const totalEstimate = pitches.reduce(
    (sum, p) => sum + Number(p.estimateWeeks),
    0
  );

  console.log("\n📊 Cycle Summary:");
  console.log(`   Total Available Weeks: ${totalCapacity}`);
  console.log(`   Total Pitch Weeks: ${totalEstimate}`);
  console.log(`   Surplus/Deficit: ${totalCapacity - totalEstimate}`);
  console.log("\n✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

