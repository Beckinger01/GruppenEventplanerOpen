import { prisma } from "@/lib/prisma";

let configured = false;
let _webpush: any | null = null;


{/* Helper Funktion, damit die Push Nachrichten ahc richtig gesendet werden. */}
async function getWebPush() {
  if (!_webpush) {
    const mod = await import("web-push");
    _webpush = (mod as any).default ?? mod;
  }
  if (!configured) {
    const subject = process.env.VAPID_SUBJECT;
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!subject || !pub || !priv) {
      throw new Error("Missing VAPID env vars (VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).");
    }
    _webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
  return _webpush as typeof import("web-push");
}

export async function sendPushToUserIds(userIds: number[], payload: any) {
  if (!userIds.length) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, endpoint: true, p256dh: true, auth: true },
  });

  const webpush = await getWebPush();
  const json = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
          json
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => { });
        } else {
          console.error("push error", s.userId, err?.statusCode, err?.body);
        }
      }
    })
  );
}
