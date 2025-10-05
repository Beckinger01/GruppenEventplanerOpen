import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* GET-Funktion, um die User + Gesamtanzahl zu bekommen */
export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, username: true },
  });

  const totalUsers = users.length;

  return NextResponse.json({
    users,
    totalUsers,
  });
}
