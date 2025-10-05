import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SubJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

type DeviceInfo = {
  isChrome?: boolean;
  isFirefox?: boolean;
  isSafari?: boolean;
  isEdge?: boolean;
  isAndroid?: boolean;
  isIOS?: boolean;
  isMobile?: boolean;
  isPWAInstalled?: boolean;
  userAgent?: string;
  timestamp?: string;
};

export const runtime = "nodejs";

{/* Post Funktion die die user, welche die Push Nachrichten aktivert haben, der Datenbank übergibt */}
export async function POST(req: Request) {
  const { username, subscription, deviceInfo } = (await req.json()) as {
    username?: string;
    subscription?: SubJSON;
    deviceInfo?: DeviceInfo;
  };

  if (!username || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "username + subscription required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userId: user.id,
    },
  });

  // Nur zum debuggen
  console.log(`Push subscription saved for user ${username}:`, {
    endpoint: subscription.endpoint.substring(0, 50) + '...',
    deviceInfo: deviceInfo ? {
      browser: deviceInfo.isChrome ? 'Chrome' : deviceInfo.isSafari ? 'Safari' : 'Other',
      mobile: deviceInfo.isMobile,
      pwa: deviceInfo.isPWAInstalled
    } : 'none'
  });

  return NextResponse.json({ ok: true });
}