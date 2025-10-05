"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    // @ts-ignore
    if (window.navigator.standalone) return true;
    return false;
}

function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

{/* Button der Anzeigt das man die PWA installieren soll */}
export default function PWAInstallButton() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(false);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (isStandalone()) {
            setInstalled(true);
            return;
        }

        const onBIP = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            setShow(true);
        };

        const onInstalled = () => {
            setInstalled(true);
            setShow(false);
            setDeferred(null);
        };

        window.addEventListener("beforeinstallprompt", onBIP);
        window.addEventListener("appinstalled", onInstalled);

        if (isIOS()) setShow(true);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBIP);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    if (installed) return null;
    if (!show) return null;

    return (
        <div className="fixed bottom-4 left-1/2 z-40 w-[90%] max-w-md -translate-x-1/2 rounded-2xl border bg-background p-4 shadow-xl">
            <div className="mb-2 text-sm font-medium">Installiere diese App</div>

            {deferred && !isIOS() && (
                <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                        Füge die App deinem Startbildschirm hinzu.
                    </p>
                    <button
                        className="ml-auto rounded-xl border px-3 py-2 text-sm"
                        onClick={async () => {
                            await deferred.prompt();
                            const choice = await deferred.userChoice;
                            if (choice.outcome === "accepted") {
                                setShow(false);
                                setDeferred(null);
                            }
                        }}
                    >
                        App installieren
                    </button>
                </div>
            )}

            {isIOS() && (
                <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                        Öffne diese Seite in <strong>Safari</strong>, tippe auf{" "}
                        <span aria-label="Teilen">Teilen&nbsp;▵</span> und wähle{" "}
                        <strong>Zum Home-Bildschirm</strong>.
                    </p>
                    <button
                        className="ml-auto rounded-xl border px-3 py-2 text-sm"
                        onClick={() => setShow(false)}
                    >
                        Okay
                    </button>
                </div>
            )}
        </div>
    );
}
