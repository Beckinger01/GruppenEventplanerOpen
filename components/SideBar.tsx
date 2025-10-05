"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QuickBlockButton } from "./BlockWeekdaysButton";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import PWAInstallButton from "./PWAInstallButton";
import PushSubscribe from "@/app/push-subscribe";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

{/* Sidebar des Dashboards mit WochentageBlocken Funktion und PushNachrichten senden für spezielle User */ }
const SideBar = () => {
  const [showNot, setShowNot] = useState<boolean>(false);
  const [showGlo, setShowGlob] = useState<boolean>(false);
  const [globalMessageText, setGlobalMessageText] = useState("");
  const { username } = useParams<{ username: string }>();
  const decodedUsername = username ? decodeURIComponent(username) : "";

  if (!decodedUsername) {
    return (
      <div className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
        Lade Benutzer…
      </div>
    );
  }

  const [payload, setPayload] = useState({
    title: "Hallo zusammen 👋",
    body: "Kurzes Update – bitte Kalender checken.",
    url: "/",
    tag: "admin-broadcast",
    icon: "/images/Icon.png",
  });

  const onChange =
    (key: keyof typeof payload) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setPayload((p) => ({ ...p, [key]: e.target.value }));

  const broadcast = async (u: string) => {
    try {
      const res = await fetch(`/api/push/broadcast?username=${encodeURIComponent(u)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Fehler beim Senden");
      alert(`Gesendet an ${json.sentToUsers} Nutzer ✅`);
    } catch (e: any) {
      console.error(e);
      alert(e.message ?? "Fehler beim Senden");
    }
  };

  const globalMessage = async (u: string) => {
    if (!globalMessageText.trim()) {
      alert("Bitte gib eine Nachricht ein!");
      return;
    }

    try {
      // First fetch - get user
      const userRes = await fetch(`/api/users/${encodeURIComponent(u)}`);

      if (!userRes.ok) {
        // Check if response has content before parsing
        const contentType = userRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await userRes.json();
          throw new Error(errorData.error || "Benutzer nicht gefunden");
        } else {
          throw new Error("Benutzer nicht gefunden");
        }
      }

      const user = await userRes.json();

      const res = await fetch(`/api/globalmessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          text: globalMessageText.trim()
        }),
      });

      if (!res.ok) {

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Fehler beim Senden der globalen Nachricht");
        } else {
          throw new Error(`HTTP Error: ${res.status}`);
        }
      }

      const result = await res.json();
      alert("Globale Nachricht erfolgreich gesendet! ✅");
      setGlobalMessageText("");
      window.dispatchEvent(new Event("global-messages-refetch"));

    } catch (e: any) {
      console.error('Full error:', e);
      alert(e.message ?? "Fehler beim Senden der globalen Nachricht");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 sm:p-4 border-b border-border bg-card/30">
        <h3 className="text-sm sm:text-base font-medium text-foreground mb-1">
          Aktionen
        </h3>
          <div className="flex-col gap-2 mt-2">
            <Button
              onClick={() => {
                setShowNot(!showNot);
                if (showGlo) setShowGlob(false);
              }}
              size="sm"
              variant={showNot ? "default" : "outline"}
              className="text-xs px-2 h-7"
            >
              Benachrichtigung Senden
            </Button>
            <Button
              onClick={() => {
                setShowGlob(!showGlo);
                if (showNot) setShowNot(false);
              }}
              size="sm"
              variant={showGlo ? "default" : "outline"}
              className="text-xs px-2 h-7"
            >
              Nachricht anpinnen
            </Button>
          </div>
      </div>

        <>
          {showNot && (
            <div className="p-3 sm:p-4 border-b border-border bg-card/30 space-y-3">
              <h3 className="text-sm sm:text-base font-medium text-foreground">
                Push Benachrichtigung
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="title">Titel</Label>
                  <Input id="title" value={payload.title} onChange={onChange("title")} />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="body">Nachricht</Label>
                  <Textarea id="body" rows={4} value={payload.body} onChange={onChange("body")} />
                  <div className="text-xs text-muted-foreground">{payload.body.length}/500</div>
                </div>
              </div>

              <Button
                onClick={() => { void broadcast(decodedUsername); }}
                size="sm"
                variant="outline"
                className="focus-visible:ring-ring text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                disabled={!payload.title || !payload.body}
                title={!payload.title || !payload.body ? "Titel und Nachricht erforderlich" : undefined}
              >
                Sende Push
              </Button>
            </div>
          )}

          {showGlo && (
            <div className="p-3 sm:p-4 border-b border-border bg-card/30 space-y-3">
              <h3 className="text-sm sm:text-base font-medium text-foreground">
                Globale Nachricht
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="globalMsg">Nachricht</Label>
                  <Textarea
                    id="globalMsg"
                    rows={4}
                    value={globalMessageText}
                    onChange={(e) => setGlobalMessageText(e.target.value)}
                    placeholder="Schreibe eine Nachricht für alle Benutzer..."
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground">
                    {globalMessageText.length}/500
                  </div>
                </div>

                <Button
                  onClick={() => { void globalMessage(decodedUsername); }}
                  size="sm"
                  variant="outline"
                  className="focus-visible:ring-ring text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9"
                  disabled={!globalMessageText.trim()}
                  title={!globalMessageText.trim() ? "Nachricht erforderlich" : undefined}
                >
                  Sende Nachricht
                </Button>
              </div>
            </div>
          )}
        </>

      <div className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <QuickBlockButton
            username={decodedUsername}
            onDone={() => {
              window.dispatchEvent(new Event("calendar-refetch"));
            }}
          />
        </div>

        <div className="space-y-2 pt-2 sm:pt-4 border-t border-border">
          <h4 className="text-xs sm:text-sm font-medium text-foreground">Tipps</h4>
          <div className="space-y-1 sm:space-y-2 text-xs text-muted-foreground">
            <p className="leading-relaxed">• Klicke auf einen Tag im Kalender um abzustimmen</p>
            <p className="leading-relaxed hidden sm:block">• Nutze "Wochentage blocken" für wiederkehrende Termine</p>
            <p className="leading-relaxed sm:hidden">• Nutze "Blocken" für feste Termine</p>
          </div>
        </div>

        <div className="space-y-2 pt-2 sm:pt-4 border-t border-border">
          <h4 className="text-xs sm:text-sm font-medium text-foreground">Angemeldet als</h4>
          <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-muted/50 border border-border">
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs sm:text-sm font-medium text-primary">
                <Avatar className="size-6 sm:size-8 md:size-10 ring-1 ring-background">
                  <AvatarImage
                    src={`/images/${encodeURIComponent(decodedUsername)}.jpg`}
                    alt={decodedUsername}
                  />
                  <AvatarFallback className="text-base sm:text-lg font-medium">
                    <img src="/images/PlaceholderAvatar.png" alt={decodedUsername} />
                  </AvatarFallback>
                </Avatar>
              </span>
            </div>
            <span className="text-xs sm:text-sm font-medium text-foreground truncate">
              {decodedUsername}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 border-t border-border bg-muted/30 hidden lg:block">
        <p className="text-xs text-muted-foreground text-center">Kalender v1.2</p>
      </div>
    </div>
  );
};

export default SideBar;