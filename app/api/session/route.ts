import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

{/* Get Funktion um durch Cookies den Session User zu bekommen */}
export async function GET() {
  const cookieStore = await cookies();

  const raw = cookieStore.get("session")?.value ?? null;

  if (!raw) {
    return Response.json({ ok: false });
  }

  const [u, p] = raw.split(":").map(decodeURIComponent);

  if (!u || !p) {
    return Response.json({ ok: false });
  }

  const user = await prisma.user.findUnique({
    where: { username: u },
    select: { username: true, pin: true },
  });

  if (!user || user.pin !== p) {
    return Response.json({ ok: false });
  }

  return Response.json({ ok: true, username: u });
}
