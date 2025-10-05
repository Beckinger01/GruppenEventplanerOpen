import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username: rawUsername } = await params;
        const username = decodeURIComponent(rawUsername);

        const user = await prisma.user.findUnique({
            where: {
                username: username
            },
            select: {
                id: true,
                username: true,
                avatarBytes: true,
                avatarMime: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: "Benutzer nicht gefunden" },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Fehler beim Laden des Benutzers:", error);
        return NextResponse.json(
            { error: "Fehler beim Laden des Benutzers" },
            { status: 500 }
        );
    }
}