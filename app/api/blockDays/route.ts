import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Body = {
    username: string;
    weekdays: number[];
    range?: { start: string; end: string };
    monthsAhead?: number;
    note?: string;
};

const asUTCDate = (isoDate: string) => new Date(isoDate + "T00:00:00.000Z");
const toOurWeekday = (jsWd: number) => (jsWd + 6) % 7;

function* iterateDays(start: Date, end: Date) {
    const d = new Date(start.getTime());
    while (d <= end) {
        yield new Date(d.getTime());
        d.setUTCDate(d.getUTCDate() + 1);
    }
}

{/*POST Funktion um bestimmte Wochentage über einen bestimmten Zeitraum zu Blocken*/}
export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Body;

        if (!body.username) return NextResponse.json({ error: "username required" }, { status: 400 });
        if (!Array.isArray(body.weekdays) || body.weekdays.length === 0)
            return NextResponse.json({ error: "weekdays required" }, { status: 400 });
        if (body.weekdays.some((wd) => wd < 0 || wd > 6))
            return NextResponse.json({ error: "weekdays must be 0..6 (Mo..So)" }, { status: 400 });

        const user = await prisma.user.findUnique({ where: { username: body.username }, select: { id: true } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const note = (body.note ?? "").trim();
        const hasNote = note.length > 0;

        let start: Date, end: Date;
        if (body.range?.start && body.range?.end) {
            start = asUTCDate(body.range.start);
            end = asUTCDate(body.range.end);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
            }
        } else {
            const months = Math.max(1, Math.min(body.monthsAhead ?? 6, 24));
            const now = new Date();
            start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()));
        }

        const wanted = new Set<number>(body.weekdays);
        const dayDates: Date[] = [];
        for (const d of iterateDays(start, end)) {
            const wd = toOurWeekday(d.getUTCDay());
            if (wanted.has(wd)) dayDates.push(d);
        }
        if (dayDates.length === 0) {
            return NextResponse.json({ ok: true, affectedDays: 0 });
        }

        await prisma.eventDate.createMany({
            data: dayDates.map((day) => ({ day })),
            skipDuplicates: true,
        });
        const eventDates = await prisma.eventDate.findMany({
            where: { day: { in: dayDates } },
            select: { id: true, day: true },
        });

        const idByIso = new Map<string, number>(eventDates.map((ed) => [ed.day.toISOString().slice(0, 10), ed.id]));

        const isoDays = dayDates.map((d) => d.toISOString().slice(0, 10));
        const missing = isoDays.filter((iso) => !idByIso.has(iso));
        if (missing.length) {
            console.warn("EventDate IDs missing for:", missing);
        }

        const ops = isoDays
            .filter((iso) => idByIso.has(iso))
            .map((iso) => {
                const eventDateId = idByIso.get(iso)!;
                return prisma.availability.upsert({
                    where: { userId_eventDateId: { userId: user.id, eventDateId } },
                    create: { userId: user.id, eventDateId, status: "UNAVAILABLE", comment: hasNote ? note : null },
                    update: hasNote ? { status: "UNAVAILABLE", comment: note } : { status: "UNAVAILABLE" },
                });
            });

        const chunkSize = 200;
        for (let i = 0; i < ops.length; i += chunkSize) {
            await prisma.$transaction(ops.slice(i, i + chunkSize));
        }

        return NextResponse.json({ ok: true, affectedDays: ops.length });
    } catch (e) {
        console.error("bulk/unavailable error:", e);
        return NextResponse.json({ error: "Bulk unavailable failed" }, { status: 500 });
    }
}
