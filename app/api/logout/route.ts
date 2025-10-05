import { NextResponse } from "next/server"

{/*Logout Funktion wo die Cokies resettet werden und man zum Homescreen kommt */}
export async function GET() {
    const res = NextResponse.json({ok: true});
    res.cookies.set({
        name: "session",
        value: "",
        path: "/",
        expires: new Date(0),
    });
    return  res
}