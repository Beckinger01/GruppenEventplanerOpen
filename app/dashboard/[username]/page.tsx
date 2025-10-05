"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CalendarComponent from "@/components/CalendarComponent";
import SideBar from "@/components/SideBar";
import { useMemo, useState, useEffect } from "react";
import MessagesSection from "@/components/GlobaloMessage";

const b64ToU8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? atob(s) : "";
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

{/* Das Dashboard für den jeweiligen User */}
export default function DashboardByUser() {
  const router = useRouter();
  const { username } = useParams<{ username: string }>();
  const decodedUsername = decodeURIComponent(username ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>({});

  const vapidKey = useMemo(
    () => (typeof window !== "undefined" ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY : undefined),
    []
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPerm(Notification.permission);
      checkPWAInstallation();
      checkDeviceInfo();
      checkSubscription();
    }
  }, []);

  const checkPWAInstallation = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSStandalone = isIOS && (window.navigator as any).standalone === true;

    setIsPWAInstalled(isStandalone || isIOSStandalone);
  };

  const checkDeviceInfo = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
    const isFirefox = userAgent.includes('firefox');
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    const isEdge = userAgent.includes('edg');

    const isAndroid = userAgent.includes('android');
    const isIOS = /ipad|iphone|ipod/.test(userAgent);

    setDeviceInfo({
      isChrome,
      isFirefox,
      isSafari,
      isEdge,
      isAndroid,
      isIOS,
      isMobile: isAndroid || isIOS,
      userAgent
    });
  };

  const checkSubscription = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "GET", cache: "no-store" });
      router.replace("/");
    } catch (e) {
      console.error(e);
    }
  };

  const enablePush = async () => {
    try {
      if (!decodedUsername) {
        alert("Kein Username gefunden.");
        return;
      }

      if (!isPWAInstalled && deviceInfo.isMobile) {
        alert("⚠️ Für Push Notifications muss die App erst installiert werden!\n\nTippe auf 'Zur Startseite hinzufügen' in deinem Browser-Menü.");
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("Push wird von diesem Browser nicht unterstützt.");
        return;
      }

      if (!vapidKey) {
        alert("VAPID Public Key fehlt (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
        return;
      }

      if (deviceInfo.isIOS && deviceInfo.isSafari) {
        if (!(window as any).PushManager) {
          alert("Push Notifications werden auf diesem iOS Gerät nicht unterstützt. Mindestens iOS 16.4 erforderlich.");
          return;
        }
      }

      console.log('Requesting permission...');
      const permission = await Notification.requestPermission();
      setPerm(permission);

      if (permission === "denied") {
        alert("❌ Push Notifications wurden blockiert!\n\nBitte gehe in die Browser-Einstellungen und erlaube Notifications für diese Seite.");
        return;
      }

      if (permission !== "granted") {
        alert("Push Notifications sind nicht aktiviert.");
        return;
      }

      console.log('Waiting for service worker...');
      const reg = await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        console.log('Using existing subscription');
      }

      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToU8(vapidKey),
      });

      console.log('Subscription created/found:', sub);

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: decodedUsername,
          subscription: sub,
          deviceInfo: {
            ...deviceInfo,
            isPWAInstalled,
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      setIsSubscribed(true);
      alert("✅ Push Notifications aktiviert!");

      if (confirm("Möchtest du eine Test-Notification erhalten?")) {
        await testNotification();
      }

    } catch (err: any) {
      console.error('Push activation error:', err);
      alert(`❌ Fehler beim Aktivieren: ${err?.message || 'Unbekannter Fehler'}`);
    }
  };

  const testNotification = async () => {
    try {
      if (Notification.permission === 'granted') {
        new Notification('Test - Lokale Notification', {
          body: 'Das funktioniert schon mal! 🎉',
          icon: '/images/Icon.png'
        });

        setTimeout(async () => {
          try {
            await fetch("/api/push/broadcast", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Test - Server Push 🚀",
                body: "Perfekt! Push Notifications funktionieren.",
                url: "/",
                tag: "test-notification",
              }),
            });
          } catch (e) {
            console.error('Test push failed:', e);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Test notification failed:', error);
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-dvh w-full overflow-hidden bg-background text-foreground">
      <header className="h-12 sm:h-14 w-full border-b border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 relative z-50">
        <div className="h-full w-full max-w-full px-3 sm:px-4 lg:px-6 xl:px-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant={sidebarOpen ? "ghost" : "outline"}
              size="sm"
              className="md:hidden px-3 h-8 gap-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="text-xs font-medium">
                {sidebarOpen ? "Schließen" : "Aktionen"}
              </span>
            </Button>

            {deviceInfo.isMobile && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted">
                {isPWAInstalled ? "📱 PWA" : "🌐 Browser"}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={enablePush}
              size="sm"
              variant={isSubscribed ? "default" : "outline"}
              className="focus-visible:ring-ring text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
              title={`Berechtigung: ${perm} | PWA: ${isPWAInstalled} | Browser: ${deviceInfo.isChrome ? 'Chrome' : deviceInfo.isSafari ? 'Safari' : 'Other'}`}
            >
              {isSubscribed ? "✅ Push aktiv" : "🔔 Push aktivieren"}
            </Button>

            <Button
              onClick={handleLogout}
              size="sm"
              className="focus-visible:ring-ring text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* PWA Install Warnung für Handy */}
      {deviceInfo.isMobile && !isPWAInstalled && (
        <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <span>⚠️</span>
            <span>Für Push Notifications installiere die App über dein Browser-Menü</span>
          </div>
        </div>
      )}

      <main className="h-[calc(100dvh-3rem)] sm:h-[calc(100dvh-3.5rem)] w-full flex overflow-hidden relative">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`w-64 sm:w-72 shrink-0 overflow-y-auto bg-secondary border-r border-border z-50
          absolute md:relative inset-y-0 left-0
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        >
          <SideBar />
        </aside>

        <Separator orientation="vertical" className="mx-0 hidden md:block" />

        {/* Main */}
        <section className="flex-1 min-w-0 overflow-y-auto">
          <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
            <div className="w-full">
              <CalendarComponent />
            </div>

            <Separator className="my-3 sm:my-4" />

            {/* Legend Card */}
            <div className="w-full rounded-lg border border-border bg-card shadow-sm p-3 sm:p-4">
              <h2 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Legende</h2>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm">
                <div className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-amber-200 border border-amber-500" />
                  <span className="text-foreground">Gelb: 1-2 Leute haben keine Zeit </span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-red-500 border border-red-600" />
                  <span className="text-foreground">Rot: Mehr als 2 haben keine Zeit!!! </span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-green-400 border border-green-500" />
                  <span className="text-foreground">Grün: Fast Alle haben Zeit</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-purple-400 border border-purple-500" />
                  <span className="text-foreground">Lila: JEDER hat Zeit!</span>
                </div>
              </div>
            </div>
            <MessagesSection />
            <div className="h-4 md:hidden" />
          </div>
        </section>
      </main>
    </div>
  );
}