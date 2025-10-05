"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useParams } from "next/navigation";

interface User {
    username: string;
    avatarBytes: string | null;
    avatarMime: string | null;
}

interface Message {
    id: string;
    text: string;
    createdAt: string;
    user: User;
}

export default function MessagesSection() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [visibleCount, setVisibleCount] = useState(3);
    const [loading, setLoading] = useState(false);
    const { username } = useParams<{ username: string }>();
    const decodedUsername = username ? decodeURIComponent(username) : "";

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/globalmessage");
                const data = await res.json();
                setMessages(data);
            } catch (err) {
                console.error("Fehler beim Abrufen:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, []);

    const handleLoadMore = () => {
        setVisibleCount((prev) => prev + 5);
    };

    return (
        <div className="w-full rounded-lg border border-border bg-card shadow-sm p-3 sm:p-4 space-y-3">
            <h2 className="text-xs sm:text-sm font-medium">Nachrichten</h2>

            {loading ? (
                <p className="text-sm text-muted-foreground">Lade Nachrichten...</p>
            ) : (
                <>
                    <div className="flex flex-col gap-3">
                        {messages.slice(0, visibleCount).map((msg) => (
                            <div
                                key={msg.id}
                                className="flex items-start gap-3 p-2 rounded-md border border-border bg-background"
                            >
                                {/* Avatar */}
                                <Avatar className="size-6 sm:size-8 md:size-10 ring-1 ring-background">
                                    <AvatarImage
                                        src={`/images/${encodeURIComponent(decodedUsername)}.jpg`}
                                        alt={decodedUsername}
                                    />
                                    <AvatarFallback className="text-base sm:text-lg font-medium">
                                        <img src="/images/PlaceholderAvatar.png" alt={decodedUsername} />
                                    </AvatarFallback>
                                </Avatar>

                                {/* Text */}
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{msg.user.username}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(msg.createdAt).toLocaleDateString("de-DE", {
                                            timeZone: "Europe/Berlin",
                                        })}
                                    </span>
                                    <p className="text-sm text-foreground">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {visibleCount < messages.length && (
                        <div className="flex justify-center">
                            <Button variant="outline" size="sm" onClick={handleLoadMore}>
                                Mehr laden
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
