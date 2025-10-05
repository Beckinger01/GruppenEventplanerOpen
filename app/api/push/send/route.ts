import { NextRequest, NextResponse } from "next/server";
import { sendPushToUserIds } from "@/app/api/push/_helper";

export const runtime = "nodejs";

{/* Post Funktion die eine Nachricht sended wenn die aktivierung von Push Nachrichten Funktioniert hat */}
export async function POST(req: NextRequest) {
  const { title = "Hallo!", body = "Es klappt 🎉", data, tag, icon, userIds } =
    await req.json().catch(() => ({}));

  if (!userIds || !Array.isArray(userIds)) {
    return NextResponse.json({ ok: false, error: "userIds[] required" }, { status: 400 });
  }

  await sendPushToUserIds(userIds, {
    title,
    body,
    data,
    tag,
    icon: icon ?? "/icons/icon-192.png",
  });

  return NextResponse.json({ ok: true, sent: userIds.length });
}
