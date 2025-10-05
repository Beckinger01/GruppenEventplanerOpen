// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

async function main() {
  // Users
  await prisma.user.createMany({
    data: [
      { username: "Niklas" },
      { username: "Bjarne" },
      { username: "Mark" },
      { username: "Charlotte" },
      { username: "Jan-Erik" },
      { username: "Jano" },
    ],
    skipDuplicates: true,
  });

  // Event-Tage
  await prisma.eventDate.createMany({
    data: [
      { day: d("2025-08-15") },
      { day: d("2025-08-16") },
      { day: d("2025-08-23") },
    ],
    skipDuplicates: true,
  });

  // IDs laden
  const [users, dates] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true } }),
    prisma.eventDate.findMany({ select: { id: true, day: true } }),
  ]);

  const byName = Object.fromEntries(users.map(u => [u.username, u.id]));
  const byDay = Object.fromEntries(dates.map(dd => [dd.day.toISOString().slice(0, 10), dd.id]));

  // Votes
  await prisma.availability.createMany({
    data: [
      { userId: byName["Niklas"], eventDateId: byDay["2025-08-15"], status: "AVAILABLE" },
      { userId: byName["Bjarne"], eventDateId: byDay["2025-08-15"], status: "MAYBE" },
      { userId: byName["Charlotte"], eventDateId: byDay["2025-08-16"], status: "AVAILABLE" },
      { userId: byName["Mark"], eventDateId: byDay["2025-08-16"], status: "UNAVAILABLE" },
      { userId: byName["Jano"], eventDateId: byDay["2025-08-23"], status: "AVAILABLE" },
      { userId: byName["Jan-Erik"], eventDateId: byDay["2025-08-23"], status: "MAYBE" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed done ✅");
}

main()
  .catch((e) => {
    console.error("Seed failed ❌", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
