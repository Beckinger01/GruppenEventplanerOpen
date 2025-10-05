import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AvailabilityStatus = "AVAILABLE" | "MAYBE" | "UNAVAILABLE";

{/* GET Funktion die alle Tage wieder gibt an denen gevoted wurde */ }
export async function GET() {
    try {
        const rows = await prisma.eventDate.findMany({
            where: { availabilities: { some: {} } },
            select: {
                day: true,
                availabilities: {
                    select: {
                        status: true,
                        user: { select: { username: true } }
                    }
                },
            },
            orderBy: { day: "asc" },
        });

        const dates = rows.map((r) => {
            const counts: Record<AvailabilityStatus, number> = {
                AVAILABLE: 0,
                MAYBE: 0,
                UNAVAILABLE: 0,
            };

            const votes = r.availabilities.map(a => ({
                status: a.status,
                username: a.user.username
            }));

            votes.forEach((a) => {
                counts[a.status as AvailabilityStatus]++;
            });

            return {
                day: r.day.toISOString().slice(0, 10),
                counts,
                votes
            };
        });

        return NextResponse.json({ dates });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to fetch event date counts" }, { status: 500 });
    }
}