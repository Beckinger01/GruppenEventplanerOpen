// GET Route - Nachrichten abrufen
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUserIds } from "@/app/api/push/_helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const messages = await prisma.globalMessages.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        username: true,
                        avatarBytes: true,
                        avatarMime: true
                    }
                }
            },
            take: 50
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Fehler beim Laden der Nachrichten:", error);
        return NextResponse.json(
            { error: "Fehler beim Laden der Nachrichten" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { userId, text } = await request.json();

        if (!userId || !text) {
            return NextResponse.json(
                { error: "userId und text sind erforderlich" },
                { status: 400 }
            );
        }

        if (text.length > 500) {
            return NextResponse.json(
                { error: "Nachricht ist zu lang (max. 500 Zeichen)" },
                { status: 400 }
            );
        }

        const message = await prisma.globalMessages.create({
            data: {
                userId,
                text,
                createdAt: new Date()
            },
            include: {
                user: {
                    select: {
                        username: true,
                        avatarBytes: true,
                        avatarMime: true
                    }
                }
            }
        });

        const users = await prisma.user.findMany({
            where: { pushSubscriptions: { some: {} } },
            select: { id: true },
        });
        const userIds = users.map((u) => u.id);
        if (!userIds.length) {
            return NextResponse.json({ ok: false, error: "no recipients" }, { status: 201 });
        }

        await sendPushToUserIds(userIds, {
            title: ("Neu Nachricht").toString().slice(0, 120),
            body: ("Öffne die App!!!!!!!").toString().slice(0, 500),
            tag: ("GlobaleNachricht").toString().slice(0, 64),
            data: { url: "/" },
            icon: ("/images/Icon.png").toString(),
        });

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error("Fehler beim Erstellen der Nachricht:", error);
        return NextResponse.json(
            { error: "Fehler beim Erstellen der Nachricht" },
            { status: 500 }
        );
    }
}