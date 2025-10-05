import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDayParam(day: string){
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    return new Date(`${day}T00:00:00.000Z`);
}

{/* Get Funktion die den Tag des Eventes wo abgestimmt wurde wiedergibt und die User ide dort gevoted haben */}
export async function GET(req: Request, ctx: {params: Promise<{day: string}>}) {
    try{
        const { day } = await ctx.params;
        const uniqueDay = parseDayParam(day);
        if(!uniqueDay) return NextResponse.json({error: "Bad day Format!"}, {status: 400});
        const rec = await prisma.eventDate.findUnique({
            where: {day: uniqueDay},
            include: {
                availabilities: {
                    include: {
                        user: { select: {id: true, username: true}}
                    }
                }
            }
        });

        if (!rec) return NextResponse.json({ day, votes: [] });

        const votes = rec?.availabilities.map(u => ({
            userId: u.userId,
            username: u.user.username,
            status: u.status,
            comment: u.comment ?? null,
        }));

        return NextResponse.json({day, votes});

    } catch(e) {
        console.error(e);
        return NextResponse.json({error: "Fetching failed"}, {status: 500});
    }
}