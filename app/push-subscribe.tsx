"use client";
import { useState } from "react";

const b64ToU8 = (b64: string) => {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(s);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

{/* Essentielle Funktion für Push Nachrichten */}
export default function PushSubscribe() {
    const [perm, setPerm] = useState<NotificationPermission>(Notification.permission);

    const subscribe = async () => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            alert("Push wird nicht unterstützt.");
            return;
        }

        const p = await Notification.requestPermission();
        setPerm(p);
        if (p !== "granted") return;

        const reg = await navigator.serviceWorker.ready;

        const existing = await reg.pushManager.getSubscription();
        const sub =
            existing ??
            (await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: b64ToU8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
            }));

        await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub)
        });

        alert("Push-Abo aktiv.");
    };

    return (
        <button onClick={subscribe}>
            Push aktivieren (Status: {perm})
        </button>
    );
}
