"use client";
import { useEffect } from "react";
{/*Service Worker für PWA offline Funktion */}
export default function SWRegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            const ready = () =>
                navigator.serviceWorker.register("/sw.js").catch(console.error);
            window.addEventListener("load", ready);
            return () => window.removeEventListener("load", ready);
        }
    }, []);
    return null;
}
