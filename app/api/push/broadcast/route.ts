import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUserIds } from "@/app/api/push/_helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["niklas", "charlotte"]);

{/* POST Funktion zum senden von Push Nachrichten. Funktion ist vorbehalten für bestimmte User */}

export async function POST(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const username = (searchParams.get("username") || "").trim().toLowerCase();

    if (!ALLOWED.has(username)) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { title, body, tag, url, icon } = await req.json().catch(() => ({}));

    const users = await prisma.user.findMany({
        where: { pushSubscriptions: { some: {} } },
        select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (!userIds.length) {
        return NextResponse.json({ ok: false, error: "no recipients" }, { status: 400 });
    }

    await sendPushToUserIds(userIds, {
        title: (title ?? "Broadcast 📣").toString().slice(0, 120),
        body: (body ?? "Hallo zusammen!").toString().slice(0, 500),
        tag: (tag ?? "broadcast").toString().slice(0, 64),
        data: { url: (url ?? "/").toString() },
        icon: (icon ?? "/images/Icon.png").toString(),
    });

    return NextResponse.json({ ok: true, sentToUsers: userIds.length });
}
