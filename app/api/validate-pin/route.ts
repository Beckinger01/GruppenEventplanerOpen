import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


{/*POST Funktion zum überprüfen der PIN in der Daten bank und wenn keine existiert dann wird eine neue angelegt */}
export async function POST(req: Request) {
    try {
        const { username, pin } = await req.json();

        const user = await prisma.user.findFirst({
            where: {
                username: username
            }
        });

        if (!user) {
            return NextResponse.json({ valid: false, error: "User nicht gefunden" }, {status: 404});
        }

        if (!user?.pin) {
            await prisma.user.update({
                where: { id: user?.id },
                data: {
                    pin: pin
                }
            });

            const res = NextResponse.json({ valid: true, message: "PIN wurde erfolgreich erstellt" });
            res.cookies.set("session", `${encodeURIComponent(username)}:${encodeURIComponent(pin)}`, {
                path: "/",
                maxAge: 30 * 24 * 60 * 60,
                sameSite: "lax",
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true
            });

            return res;

        } else {
            if (user.pin === pin) {
                const res = NextResponse.json({ valid: true, message: "Anmeldung erfolgreich" });
                res.cookies.set("session", `${encodeURIComponent(username)}:${encodeURIComponent(pin)}`, {
                    path: "/",
                    maxAge: 30 * 24 * 60 * 60,
                    sameSite: "lax",
                    secure: process.env.NODE_ENV === 'production',
                    httpOnly: true
                });

                return res;
            } else {
                return NextResponse.json({ valid: false, error: "Falsche Pin" }, {status: 401});
            }
        }


    } catch (error) {
        return NextResponse.json({valid: false, error: "Server failed"}, {status: 500});
    }
}
