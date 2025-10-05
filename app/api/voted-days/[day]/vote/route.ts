import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUserIds } from "@/app/api/push/_helper";

const toUTCDate = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T00:00:00.000Z`);
const isValidDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

type AvailabilityStatus = "AVAILABLE" | "MAYBE" | "UNAVAILABLE";
const ALLOWED: AvailabilityStatus[] = ["AVAILABLE", "MAYBE", "UNAVAILABLE"];

{/* Get Funktion die den Tag des Eventes wo abgestimmt wurde wiedergibt und die User ide dort gevoted haben */}
export async function GET(_req: Request, ctx: { params: Promise<{ day: string }> }) {
    const { day } = await ctx.params;
    if (!isValidDay(day)) return NextResponse.json({ error: "Bad 'day' (YYYY-MM-DD)" }, { status: 400 });
    const date = toUTCDate(day);
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    const eventDate = await prisma.eventDate.findUnique({
        where: { day: date },
        select: {
            id: true,
            availabilities: {
                select: {
                    status: true,
                    comment: true,
                    user: { select: { id: true, username: true } },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    const votes = (eventDate?.availabilities ?? []).map((a) => ({
        userId: a.user.id,
        username: a.user.username,
        status: a.status as AvailabilityStatus,
        avatarUrl: null as string | null,
        comment: a.comment ?? null,
    }));

    return NextResponse.json({ day, votes });
}

{/*POST Funktion zum abstimmen  und gegebenen Falls dann automatisch Push Notification senden*/}
export async function POST(req: Request, ctx: { params: Promise<{ day: string }> }) {
    const { day } = await ctx.params;
    if (!isValidDay(day)) return NextResponse.json({ error: "Bad 'day' (YYYY-MM-DD)" }, { status: 400 });
    const date = toUTCDate(day);
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    const body = await req.json();
    const username = (body?.username ?? "").trim();
    const status = body?.status as AvailabilityStatus;
    const comment: string | null = body?.comment === undefined ? null : body.comment ?? null;

    if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });
    if (!ALLOWED.includes(status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });

    const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true, username: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
        const ev = await tx.eventDate.upsert({
            where: { day: date },
            update: {},
            create: { day: date },
            select: { id: true, day: true },
        });

        const prev = await tx.availability.findUnique({
            where: { userId_eventDateId: { userId: user.id, eventDateId: ev.id } },
            select: { status: true },
        });

        const beforeAvail = await tx.availability.count({
            where: { eventDateId: ev.id, status: "AVAILABLE" },
        });

        await tx.availability.upsert({
            where: { userId_eventDateId: { userId: user.id, eventDateId: ev.id } },
            create: { userId: user.id, eventDateId: ev.id, status, comment },
            update: { status, comment },
        });

        const afterAvail = await tx.availability.count({
            where: { eventDateId: ev.id, status: "AVAILABLE" },
        });

        const totalVotes = await tx.availability.count({
            where: { eventDateId: ev.id },
        });

        const justCrossed = beforeAvail < 3 && afterAvail >= 3;

        const clientPayload = {
            userId: user.id,
            username: user.username,
            status,
            avatarUrl: null as string | null,
            comment,
            eventDateId: ev.id,
            justCrossed,
            afterAvail,
            totalVotes,
        };

        let targetUserIds: number[] = [];
        if (justCrossed) {
            const notVotedUsers = await tx.user.findMany({
                where: { availabilities: { none: { eventDateId: ev.id } } },
                select: { id: true },
            });

            if (notVotedUsers.length) {
                const alreadyReminded = await tx.reminderSent.findMany({
                    where: { day: date, userId: { in: notVotedUsers.map((u) => u.id) } },
                    select: { userId: true },
                });
                const remindedSet = new Set(alreadyReminded.map((r) => r.userId));

                targetUserIds = notVotedUsers.map((u) => u.id).filter((id) => !remindedSet.has(id));

                if (targetUserIds.length) {
                    await tx.reminderSent.createMany({
                        data: targetUserIds.map((id) => ({ userId: id, day: date })),
                        skipDuplicates: true,
                    });
                }
            }
        }

        const progressTargetUserIds = await tx.user.findMany({
            where: { availabilities: { none: { eventDateId: ev.id } } },
            select: { id: true },
        }).then(rows => rows.map(r => r.id));

        return { clientPayload, targetUserIds, progressTargetUserIds };
    });

    if (result.clientPayload.justCrossed && result.targetUserIds.length) {
        await sendPushToUserIds(result.targetUserIds, {
            title: "Termin hat 3 Zusagen 🎉",
            body: `Für den ${day} gibt’s jetzt mindestens ${result.clientPayload.afterAvail} Zusagen. Magst du auch abstimmen?`,
            tag: `reminder-${day}`,
            data: { url: `/events/${day}` },
            icon: "/icons/icon-192.png",
        });
    }

    if (result.clientPayload.afterAvail >= 3 && result.progressTargetUserIds.length) {
        await sendPushToUserIds(result.progressTargetUserIds, {
            title: `Bitte Abstimmen für den ${day}`,
            body: `Für den ${day} haben jetzt ${result.clientPayload.totalVotes} Leute abgestimmt.`,
            tag: `progress-${day}`,
            data: { url: `/events/${day}` },
            icon: "/icons/icon-192.png",
        });
    }

    const { userId, username: uname, status: st, avatarUrl, comment: cmt } = result.clientPayload;
    return NextResponse.json({ userId, username: uname, status: st, avatarUrl, comment: cmt });
}

